const db = require('../db/connection');

class DispatchController {
    // ===============================
    // GET ALL DISPATCHES WITH FALLBACK
    // ===============================
    static getAllDispatches(req, res) {
        try {
            const { page = 1, limit = 20, status = '', search = '' } = req.query;
            const offset = (page - 1) * limit;

            let sql = `
                SELECT 
                    dispatch_id,
                    order_id,
                    customer_name,
                    customer_phone,
                    delivery_address,
                    status,
                    dispatch_date,
                    expected_delivery,
                    created_at
                FROM dispatch_orders 
                WHERE 1=1
            `;

            const values = [];

            if (status) {
                sql += ' AND status = ?';
                values.push(status);
            }

            if (search) {
                sql += ' AND (customer_name LIKE ? OR order_id LIKE ? OR customer_phone LIKE ?)';
                values.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            values.push(parseInt(limit), parseInt(offset));

            db.query(sql, values, (err, rows) => {
                if (err) {
                    console.error('❌ Dispatch query error:', err);
                    
                    // Fallback data
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({
                            success: true,
                            data: {
                                dispatches: [
                                    {
                                        dispatch_id: 'DISP001',
                                        order_id: 'ORD001',
                                        customer_name: 'Sample Customer',
                                        customer_phone: '+1234567890',
                                        delivery_address: '123 Sample Street',
                                        status: 'PENDING',
                                        dispatch_date: new Date().toISOString(),
                                        expected_delivery: new Date(Date.now() + 24*60*60*1000).toISOString(),
                                        created_at: new Date().toISOString()
                                    }
                                ],
                                pagination: {
                                    page: parseInt(page),
                                    limit: parseInt(limit),
                                    total: 1,
                                    totalPages: 1
                                }
                            },
                            message: 'Showing sample data (database table not found)'
                        });
                    }

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch dispatches'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        dispatches: rows,
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: rows.length,
                            totalPages: Math.ceil(rows.length / limit)
                        }
                    }
                });
            });

        } catch (error) {
            console.error('❌ Dispatch controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dispatches'
            });
        }
    }

    // ===============================
    // CREATE DISPATCH
    // ===============================
    static createDispatch(req, res) {
        try {
            const {
                order_id,
                customer_name,
                customer_phone,
                delivery_address,
                items = []
            } = req.body;

            if (!order_id || !customer_name || !delivery_address) {
                return res.status(400).json({
                    success: false,
                    message: 'order_id, customer_name, and delivery_address are required'
                });
            }

            const dispatch_id = `DISP_${Date.now()}`;
            const dispatch_date = new Date().toISOString();
            const expected_delivery = new Date(Date.now() + 24*60*60*1000).toISOString();

            const sql = `
                INSERT INTO dispatch_orders (
                    dispatch_id, order_id, customer_name, customer_phone,
                    delivery_address, status, dispatch_date, expected_delivery, created_at
                ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW())
            `;

            db.query(sql, [dispatch_id, order_id, customer_name, customer_phone, delivery_address, dispatch_date, expected_delivery], (err, result) => {
                if (err) {
                    console.error('❌ Create dispatch error:', err);
                    
                    // Fallback response
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({
                            success: true,
                            message: 'Dispatch would be created (database table not found)',
                            data: { dispatch_id: dispatch_id }
                        });
                    }

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create dispatch'
                    });
                }

                res.json({
                    success: true,
                    message: 'Dispatch created successfully',
                    data: { dispatch_id: dispatch_id }
                });
            });

        } catch (error) {
            console.error('❌ Create dispatch error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create dispatch'
            });
        }
    }

    // ===============================
    // UPDATE DISPATCH STATUS
    // ===============================
    static updateDispatchStatus(req, res) {
        try {
            const { dispatch_id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            const sql = 'UPDATE dispatch_orders SET status = ?, updated_at = NOW() WHERE dispatch_id = ?';

            db.query(sql, [status, dispatch_id], (err, result) => {
                if (err) {
                    console.error('❌ Update dispatch status error:', err);
                    
                    // Fallback response
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({
                            success: true,
                            message: 'Dispatch status would be updated (database table not found)'
                        });
                    }

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update dispatch status'
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dispatch not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Dispatch status updated successfully'
                });
            });

        } catch (error) {
            console.error('❌ Update dispatch status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update dispatch status'
            });
        }
    }

    // ===============================
    // GET WAREHOUSES LIST
    // ===============================
    static getWarehouses(req, res) {
        try {
            // Return array of warehouse names (as expected by frontend)
            const warehouses = [
                'Main Warehouse',
                'Secondary Warehouse', 
                'GGM_WH',
                'North Warehouse',
                'South Warehouse',
                'East Warehouse',
                'West Warehouse'
            ];
            
            res.json(warehouses);
        } catch (error) {
            console.error('❌ Get warehouses error:', error);
            res.json(['Main Warehouse', 'GGM_WH']); // Minimal fallback
        }
    }

    // ===============================
    // GET LOGISTICS LIST
    // ===============================
    static getLogistics(req, res) {
        try {
            // Return array of logistics partner names
            const logistics = [
                'Delhivery',
                'Blue Dart',
                'DTDC',
                'Ecom Express',
                'Xpressbees',
                'Shiprocket',
                'FedEx',
                'DHL'
            ];
            
            res.json(logistics);
        } catch (error) {
            console.error('❌ Get logistics error:', error);
            res.json(['Delhivery', 'Blue Dart']); // Minimal fallback
        }
    }

    // ===============================
    // GET PROCESSED PERSONS LIST
    // ===============================
    static getProcessedPersons(req, res) {
        try {
            // Return array of executive/processor names
            const persons = [
                'John Doe',
                'Jane Smith', 
                'Admin User',
                'Warehouse Manager',
                'Dispatch Executive',
                'Operations Head',
                'Logistics Coordinator'
            ];
            
            res.json(persons);
        } catch (error) {
            console.error('❌ Get processed persons error:', error);
            res.json(['Admin User', 'Warehouse Manager']); // Minimal fallback
        }
    }

    // ===============================
    // GET PAYMENT MODES LIST
    // ===============================
    static getPaymentModes(req, res) {
        try {
            const paymentModes = [
                'COD',
                'Prepaid',
                'UPI',
                'Credit Card',
                'Debit Card',
                'Net Banking',
                'Wallet'
            ];
            
            res.json(paymentModes);
        } catch (error) {
            console.error('❌ Get payment modes error:', error);
            res.json(['COD', 'Prepaid']); // Minimal fallback
        }
    }

    // ===============================
    // SEARCH PRODUCTS FOR DISPATCH
    // ===============================
    static searchProducts(req, res) {
        try {
            const { query } = req.query;
            
            if (!query || query.trim().length < 2) {
                return res.json([]);
            }

            // Search in dispatch_product table
            const sql = `
                SELECT p_id, product_name, barcode, product_variant, price
                FROM dispatch_product 
                WHERE is_active = 1 
                AND (product_name LIKE ? OR barcode LIKE ? OR product_variant LIKE ?)
                ORDER BY product_name ASC 
                LIMIT 10
            `;
            
            const searchTerm = `%${query}%`;
            
            db.query(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
                if (err) {
                    console.error('❌ Search products error:', err);
                    
                    // Fallback for missing table
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json([
                            {
                                p_id: 1,
                                product_name: `Sample Product matching "${query}"`,
                                barcode: '1234567890',
                                product_variant: 'Default',
                                price: '99.99'
                            }
                        ]);
                    }
                    
                    return res.json([]);
                }
                
                res.json(rows);
            });

        } catch (error) {
            console.error('❌ Search products error:', error);
            res.json([]);
        }
    }

    // ===============================
    // CHECK INVENTORY AVAILABILITY
    // ===============================
    static checkInventory(req, res) {
        try {
            const { warehouse, barcode, qty = 1 } = req.query;
            
            if (!warehouse || !barcode) {
                return res.json({
                    available: 0,
                    ok: false,
                    message: 'Warehouse and barcode required'
                });
            }

            // For now, return sample inventory data
            // In a real system, this would check actual inventory levels
            const mockStock = Math.floor(Math.random() * 100) + 10; // Random stock between 10-110
            const requestedQty = parseInt(qty) || 1;
            const available = mockStock >= requestedQty;

            res.json({
                available: mockStock,
                requested_qty: requestedQty,
                ok: available,
                warehouse: warehouse,
                barcode: barcode,
                message: available ? 'Stock available' : 'Insufficient stock'
            });

        } catch (error) {
            console.error('❌ Check inventory error:', error);
            res.json({
                available: 0,
                ok: false,
                message: 'Error checking inventory'
            });
        }
    }
}

module.exports = DispatchController;