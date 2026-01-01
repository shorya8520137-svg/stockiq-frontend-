const db = require('../db/connection');
const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    }
});

class InventoryEntryController {
    // Get warehouse suggestions
    static async getWarehouseSuggestions(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json([]);
            }

            const warehouses = [
                { warehouse_code: "GGM_WH", warehouse_name: "Gurgaon Warehouse" },
                { warehouse_code: "BLR_WH", warehouse_name: "Bangalore Warehouse" },
                { warehouse_code: "MUM_WH", warehouse_name: "Mumbai Warehouse" },
                { warehouse_code: "AMD_WH", warehouse_name: "Ahmedabad Warehouse" },
                { warehouse_code: "HYD_WH", warehouse_name: "Hyderabad Warehouse" }
            ];

            const filtered = warehouses.filter(w => 
                w.warehouse_name.toLowerCase().includes(q.toLowerCase()) ||
                w.warehouse_code.toLowerCase().includes(q.toLowerCase())
            );

            res.json(filtered);

        } catch (error) {
            console.error('Get warehouse suggestions error:', error);
            res.status(500).json([]);
        }
    }

    // Process bulk inventory upload
    static async processInventoryUpload(req, res) {
        try {
            const { warehouse } = req.body;
            const file = req.file;

            if (!warehouse) {
                return res.status(400).json({
                    success: false,
                    error: 'Warehouse is required'
                });
            }

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File is required'
                });
            }

            let inventoryData = [];

            try {
                // Parse file based on type
                if (file.mimetype === 'text/csv') {
                    // Parse CSV
                    inventoryData = await InventoryEntryController.parseCSV(file.path);
                } else {
                    // Parse Excel
                    inventoryData = await InventoryEntryController.parseExcel(file.path);
                }

                // Validate data
                const validationResult = InventoryEntryController.validateInventoryData(inventoryData);
                if (!validationResult.isValid) {
                    return res.status(400).json({
                        success: false,
                        error: 'Data validation failed',
                        details: validationResult.errors
                    });
                }

                // Process inventory data
                const result = await InventoryEntryController.processInventoryData(
                    inventoryData, 
                    warehouse, 
                    req.user.userId
                );

                // Clean up uploaded file
                fs.unlinkSync(file.path);

                res.json({
                    success: true,
                    message: 'Inventory uploaded successfully',
                    data: result
                });

            } catch (parseError) {
                // Clean up uploaded file on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                throw parseError;
            }

        } catch (error) {
            console.error('Process inventory upload error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Parse CSV file
    static parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    // Parse Excel file
    static parseExcel(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            return data;
        } catch (error) {
            throw new Error('Failed to parse Excel file: ' + error.message);
        }
    }

    // Validate inventory data
    static validateInventoryData(data) {
        const errors = [];
        const requiredFields = ['Product', 'Barcode', 'Qty'];

        if (!Array.isArray(data) || data.length === 0) {
            return {
                isValid: false,
                errors: ['File is empty or invalid format']
            };
        }

        data.forEach((row, index) => {
            const rowNumber = index + 1;

            // Check required fields
            requiredFields.forEach(field => {
                if (!row[field] || row[field].toString().trim() === '') {
                    errors.push(`Row ${rowNumber}: ${field} is required`);
                }
            });

            // Validate quantity
            if (row.Qty && (isNaN(row.Qty) || parseInt(row.Qty) < 0)) {
                errors.push(`Row ${rowNumber}: Qty must be a positive number`);
            }

            // Validate barcode format (basic check)
            if (row.Barcode && row.Barcode.toString().length < 3) {
                errors.push(`Row ${rowNumber}: Barcode must be at least 3 characters`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Process inventory data and update database
    static async processInventoryData(data, warehouse, userId) {
        const results = {
            processed: 0,
            updated: 0,
            created: 0,
            errors: []
        };

        // Start transaction
        await db.execute('START TRANSACTION');

        try {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNumber = i + 1;

                try {
                    const product = row.Product.toString().trim();
                    const variant = row.Variant ? row.Variant.toString().trim() : '';
                    const barcode = row.Barcode.toString().trim();
                    const qty = parseInt(row.Qty);

                    // Combine product and variant for full product name
                    const fullProductName = variant ? `${product} - ${variant}` : product;

                    // Check if inventory item exists
                    const [existingItems] = await db.execute(`
                        SELECT id, stock FROM inventory 
                        WHERE barcode = ? AND warehouse = ? AND is_active = 1
                    `, [barcode, warehouse]);

                    if (existingItems.length > 0) {
                        // Update existing item
                        await db.execute(`
                            UPDATE inventory 
                            SET product = ?, stock = stock + ?, updated_at = NOW()
                            WHERE id = ?
                        `, [fullProductName, qty, existingItems[0].id]);

                        results.updated++;
                    } else {
                        // Create new item
                        await db.execute(`
                            INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                            VALUES (?, ?, ?, ?, NOW(), NOW())
                        `, [fullProductName, barcode, qty, warehouse]);

                        results.created++;
                    }

                    results.processed++;

                } catch (rowError) {
                    results.errors.push(`Row ${rowNumber}: ${rowError.message}`);
                }
            }

            // Log bulk upload activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
                VALUES (?, 'BULK_UPLOAD', 'INVENTORY', ?, ?, ?)
            `, [
                userId,
                JSON.stringify({
                    warehouse,
                    totalRows: data.length,
                    processed: results.processed,
                    created: results.created,
                    updated: results.updated,
                    errors: results.errors.length
                }),
                null, // IP not available in this context
                null  // User agent not available in this context
            ]);

            await db.execute('COMMIT');

            return results;

        } catch (error) {
            await db.execute('ROLLBACK');
            throw error;
        }
    }

    // Get upload history
    static async getUploadHistory(req, res) {
        try {
            const { warehouse, limit = 50, offset = 0 } = req.query;

            let query = `
                SELECT 
                    al.*,
                    u.name as uploaded_by_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.action = 'BULK_UPLOAD' AND al.resource = 'INVENTORY'
            `;
            const params = [];

            if (warehouse) {
                query += ` AND JSON_EXTRACT(al.details, '$.warehouse') = ?`;
                params.push(warehouse);
            }

            query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [uploads] = await db.execute(query, params);

            // Parse details JSON
            uploads.forEach(upload => {
                if (upload.details) {
                    try {
                        upload.details = JSON.parse(upload.details);
                    } catch (e) {
                        upload.details = {};
                    }
                }
            });

            res.json({
                success: true,
                data: uploads
            });

        } catch (error) {
            console.error('Get upload history error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get upload middleware
    static getUploadMiddleware() {
        return upload.single('file');
    }
}

module.exports = InventoryEntryController;