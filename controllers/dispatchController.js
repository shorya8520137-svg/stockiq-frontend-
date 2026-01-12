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
}

module.exports = DispatchController;