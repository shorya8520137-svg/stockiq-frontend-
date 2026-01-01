const db = require('../db/connection');

class DispatchController {
    // Get warehouses
    static async getWarehouses(req, res) {
        try {
            const warehouses = [
                { code: "GGM_WH", name: "Gurgaon Warehouse" },
                { code: "BLR_WH", name: "Bangalore Warehouse" },
                { code: "MUM_WH", name: "Mumbai Warehouse" },
                { code: "AMD_WH", name: "Ahmedabad Warehouse" },
                { code: "HYD_WH", name: "Hyderabad Warehouse" }
            ];

            res.json({
                success: true,
                data: warehouses
            });

        } catch (error) {
            console.error('Get warehouses error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get logistics providers
    static async getLogistics(req, res) {
        try {
            const logistics = [
                { id: 1, name: "Blue Dart", code: "BD" },
                { id: 2, name: "DTDC", code: "DTDC" },
                { id: 3, name: "Delhivery", code: "DEL" },
                { id: 4, name: "Ecom Express", code: "ECOM" },
                { id: 5, name: "FedEx", code: "FEDEX" },
                { id: 6, name: "Aramex", code: "ARAMEX" },
                { id: 7, name: "Professional Couriers", code: "PC" },
                { id: 8, name: "Xpressbees", code: "XB" },
                { id: 9, name: "Shadowfax", code: "SF" },
                { id: 10, name: "Ekart", code: "EKART" }
            ];

            res.json({
                success: true,
                data: logistics
            });

        } catch (error) {
            console.error('Get logistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get processed persons (executives)
    static async getProcessedPersons(req, res) {
        try {
            const persons = [
                { id: 1, name: "Rahul Sharma", department: "Operations" },
                { id: 2, name: "Priya Singh", department: "Dispatch" },
                { id: 3, name: "Amit Kumar", department: "Warehouse" },
                { id: 4, name: "Sneha Patel", department: "Operations" },
                { id: 5, name: "Vikash Gupta", department: "Dispatch" },
                { id: 6, name: "Anjali Verma", department: "Warehouse" },
                { id: 7, name: "Rohit Jain", department: "Operations" },
                { id: 8, name: "Kavya Reddy", department: "Dispatch" }
            ];

            res.json({
                success: true,
                data: persons
            });

        } catch (error) {
            console.error('Get processed persons error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Search products
    static async searchProducts(req, res) {
        try {
            const { query } = req.query;

            if (!query || query.length < 2) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const searchTerm = `%${query}%`;

            // Search in inventory for products
            const [products] = await db.execute(`
                SELECT DISTINCT
                    product as name,
                    barcode,
                    SUM(stock) as totalStock,
                    GROUP_CONCAT(CONCAT(warehouse, ':', stock) SEPARATOR '|') as warehouseStock
                FROM inventory 
                WHERE (product LIKE ? OR barcode LIKE ?) AND is_active = 1 AND stock > 0
                GROUP BY product, barcode
                ORDER BY product ASC
                LIMIT 20
            `, [searchTerm, searchTerm]);

            // Format the response with warehouse stock breakdown
            const formattedProducts = products.map(product => {
                const warehouseStocks = {};
                if (product.warehouseStock) {
                    product.warehouseStock.split('|').forEach(item => {
                        const [warehouse, stock] = item.split(':');
                        warehouseStocks[warehouse] = parseInt(stock);
                    });
                }

                return {
                    name: product.name,
                    barcode: product.barcode,
                    totalStock: product.totalStock,
                    warehouseStock: warehouseStocks
                };
            });

            res.json({
                success: true,
                data: formattedProducts
            });

        } catch (error) {
            console.error('Search products error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create dispatch
    static async createDispatch(req, res) {
        try {
            const {
                orderType, warehouse, orderRef, customerName, awb,
                logistics, paymentMode, processedBy, invoiceAmount,
                weight, length, width, height, remarks, products
            } = req.body;

            // Validate required fields
            if (!orderType || !warehouse || !customerName || !products || products.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Order type, warehouse, customer name, and products are required'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Create dispatch record
                const [dispatchResult] = await db.execute(`
                    INSERT INTO dispatches (
                        order_type, warehouse, order_ref, customer_name, awb,
                        logistics, payment_mode, processed_by, invoice_amount,
                        weight, length, width, height, remarks, products,
                        status, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
                `, [
                    orderType, warehouse, orderRef, customerName, awb,
                    logistics, paymentMode, processedBy, invoiceAmount,
                    weight, length, width, height, remarks,
                    JSON.stringify(products), req.user.userId
                ]);

                const dispatchId = dispatchResult.insertId;

                // Update inventory for each product
                for (const product of products) {
                    const { name, qty } = product;

                    // Check if enough stock is available
                    const [stockCheck] = await db.execute(`
                        SELECT id, stock FROM inventory 
                        WHERE product = ? AND warehouse = ? AND is_active = 1
                    `, [name, warehouse]);

                    if (stockCheck.length === 0) {
                        throw new Error(`Product "${name}" not found in ${warehouse}`);
                    }

                    if (stockCheck[0].stock < qty) {
                        throw new Error(`Insufficient stock for "${name}". Available: ${stockCheck[0].stock}, Required: ${qty}`);
                    }

                    // Update inventory
                    await db.execute(`
                        UPDATE inventory 
                        SET stock = stock - ?, updated_at = NOW()
                        WHERE id = ?
                    `, [qty, stockCheck[0].id]);
                }

                // Create corresponding order record
                const dimensions = length && width && height ? `${length}×${width}×${height}` : '';
                const totalQuantity = products.reduce((sum, p) => sum + p.qty, 0);
                const productNames = products.map(p => `${p.name} (${p.qty})`).join(', ');

                await db.execute(`
                    INSERT INTO orders (
                        customer, product_name, quantity, dimensions,
                        length, width, height, awb, order_ref, warehouse,
                        status, payment_mode, invoice_amount, remark,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dispatched', ?, ?, ?, NOW(), NOW())
                `, [
                    customerName, productNames, totalQuantity, dimensions,
                    length, width, height, awb, orderRef, warehouse,
                    paymentMode, invoiceAmount, remarks
                ]);

                // Log dispatch creation
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                    VALUES (?, 'CREATE', 'DISPATCH', ?, ?, ?, ?)
                `, [
                    req.user.userId,
                    dispatchId,
                    JSON.stringify({
                        orderType, warehouse, customerName, awb, orderRef,
                        products, invoiceAmount, logistics
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'Dispatch created successfully',
                    data: {
                        id: dispatchId,
                        orderRef,
                        customerName,
                        awb,
                        warehouse,
                        products
                    }
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Create dispatch error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get dispatch by ID
    static async getDispatchById(req, res) {
        try {
            const { id } = req.params;

            const [dispatches] = await db.execute(`
                SELECT 
                    d.*,
                    u.name as created_by_name
                FROM dispatches d
                LEFT JOIN users u ON d.created_by = u.id
                WHERE d.id = ? AND d.is_active = 1
            `, [id]);

            if (dispatches.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Dispatch not found'
                });
            }

            const dispatch = dispatches[0];
            
            // Parse products JSON
            if (dispatch.products) {
                try {
                    dispatch.products = JSON.parse(dispatch.products);
                } catch (e) {
                    dispatch.products = [];
                }
            }

            res.json({
                success: true,
                data: dispatch
            });

        } catch (error) {
            console.error('Get dispatch error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get all dispatches
    static async getAllDispatches(req, res) {
        try {
            const { warehouse, status, limit = 100, offset = 0 } = req.query;

            let query = `
                SELECT 
                    d.*,
                    u.name as created_by_name
                FROM dispatches d
                LEFT JOIN users u ON d.created_by = u.id
                WHERE d.is_active = 1
            `;
            const params = [];

            if (warehouse) {
                query += ` AND d.warehouse = ?`;
                params.push(warehouse);
            }

            if (status) {
                query += ` AND d.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [dispatches] = await db.execute(query, params);

            // Parse products JSON for each dispatch
            dispatches.forEach(dispatch => {
                if (dispatch.products) {
                    try {
                        dispatch.products = JSON.parse(dispatch.products);
                    } catch (e) {
                        dispatch.products = [];
                    }
                }
            });

            res.json({
                success: true,
                data: dispatches
            });

        } catch (error) {
            console.error('Get dispatches error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = DispatchController;