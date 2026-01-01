const db = require('../db/connection');

class ReturnController {
    // Create return
    static async createReturn(req, res) {
        try {
            const { product_type, barcode, warehouse, quantity, subtype } = req.body;

            if (!product_type || !barcode || !warehouse || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Product type, barcode, warehouse, and quantity are required'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Create return record
                const [returnResult] = await db.execute(`
                    INSERT INTO returns (
                        product_type, barcode, warehouse, quantity, subtype,
                        status, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
                `, [product_type, barcode, warehouse, quantity, subtype, req.user.userId]);

                // Update inventory (add returned quantity back to stock)
                const [inventoryItems] = await db.execute(`
                    SELECT id, stock FROM inventory 
                    WHERE barcode = ? AND warehouse = ? AND is_active = 1
                `, [barcode, warehouse]);

                if (inventoryItems.length > 0) {
                    // Update existing inventory
                    await db.execute(`
                        UPDATE inventory 
                        SET stock = stock + ?, updated_at = NOW()
                        WHERE id = ?
                    `, [quantity, inventoryItems[0].id]);
                } else {
                    // Create new inventory item
                    await db.execute(`
                        INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                        VALUES (?, ?, ?, ?, NOW(), NOW())
                    `, [product_type, barcode, quantity, warehouse]);
                }

                // Log activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                    VALUES (?, 'CREATE', 'RETURNS', ?, ?, ?, ?)
                `, [
                    req.user.userId,
                    returnResult.insertId,
                    JSON.stringify({
                        product_type,
                        barcode,
                        warehouse,
                        quantity,
                        subtype
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'Return created successfully',
                    data: {
                        id: returnResult.insertId,
                        product_type,
                        barcode,
                        warehouse,
                        quantity,
                        subtype,
                        status: 'pending'
                    }
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Create return error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get warehouse suggestions
    static async getWarehouseSuggestions(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json([]);
            }

            const warehouses = [
                { warehouse_code: "GGM_WH", Warehouse_name: "Gurgaon Warehouse" },
                { warehouse_code: "BLR_WH", Warehouse_name: "Bangalore Warehouse" },
                { warehouse_code: "MUM_WH", Warehouse_name: "Mumbai Warehouse" },
                { warehouse_code: "AMD_WH", Warehouse_name: "Ahmedabad Warehouse" },
                { warehouse_code: "HYD_WH", Warehouse_name: "Hyderabad Warehouse" }
            ];

            const filtered = warehouses.filter(w => 
                w.Warehouse_name.toLowerCase().includes(q.toLowerCase()) ||
                w.warehouse_code.toLowerCase().includes(q.toLowerCase())
            );

            res.json(filtered);

        } catch (error) {
            console.error('Get warehouse suggestions error:', error);
            res.status(500).json([]);
        }
    }

    // Get product suggestions
    static async getProductSuggestions(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json([]);
            }

            const searchTerm = `%${q}%`;

            const [products] = await db.execute(`
                SELECT DISTINCT
                    id as p_id,
                    product as product_name,
                    barcode
                FROM inventory 
                WHERE (product LIKE ? OR barcode LIKE ?) AND is_active = 1
                ORDER BY product ASC
                LIMIT 20
            `, [searchTerm, searchTerm]);

            res.json(products);

        } catch (error) {
            console.error('Get product suggestions error:', error);
            res.status(500).json([]);
        }
    }

    // Get returns history
    static async getReturns(req, res) {
        try {
            const { warehouse, status, limit = 100, offset = 0 } = req.query;

            let query = `
                SELECT 
                    r.*,
                    u.name as created_by_name
                FROM returns r
                LEFT JOIN users u ON r.created_by = u.id
                WHERE 1=1
            `;
            const params = [];

            if (warehouse) {
                query += ` AND r.warehouse = ?`;
                params.push(warehouse);
            }

            if (status) {
                query += ` AND r.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [returns] = await db.execute(query, params);

            res.json({
                success: true,
                data: returns
            });

        } catch (error) {
            console.error('Get returns error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update return status
    static async updateReturnStatus(req, res) {
        try {
            const { returnId } = req.params;
            const { status, notes } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            const validStatuses = ['pending', 'approved', 'rejected', 'processed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }

            // Get current return details
            const [returns] = await db.execute(`
                SELECT * FROM returns WHERE id = ?
            `, [returnId]);

            if (returns.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Return not found'
                });
            }

            // Update return status
            await db.execute(`
                UPDATE returns 
                SET status = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            `, [status, notes, returnId]);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'UPDATE', 'RETURNS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                returnId,
                JSON.stringify({
                    oldStatus: returns[0].status,
                    newStatus: status,
                    notes,
                    product_type: returns[0].product_type,
                    barcode: returns[0].barcode
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Return status updated successfully'
            });

        } catch (error) {
            console.error('Update return status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get return statistics
    static async getReturnStatistics(req, res) {
        try {
            const { warehouse, dateFrom, dateTo } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (warehouse) {
                whereClause += ' AND warehouse = ?';
                params.push(warehouse);
            }

            if (dateFrom) {
                whereClause += ' AND created_at >= ?';
                params.push(dateFrom);
            }

            if (dateTo) {
                whereClause += ' AND created_at <= ?';
                params.push(dateTo);
            }

            // Get return statistics by status
            const [statusStats] = await db.execute(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(quantity) as total_quantity
                FROM returns 
                ${whereClause}
                GROUP BY status
            `, params);

            // Get top returned products
            const [topReturned] = await db.execute(`
                SELECT 
                    product_type,
                    barcode,
                    COUNT(*) as return_count,
                    SUM(quantity) as total_returned
                FROM returns 
                ${whereClause}
                GROUP BY product_type, barcode
                ORDER BY return_count DESC
                LIMIT 10
            `, params);

            res.json({
                success: true,
                data: {
                    statusBreakdown: statusStats,
                    topReturnedProducts: topReturned
                }
            });

        } catch (error) {
            console.error('Get return statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = ReturnController;