const db = require('../db/connection');

class OrderController {
    // Universal search for orders
    static async universalSearch(req, res) {
        try {
            const { tokens = [] } = req.body;

            let query = `
                SELECT 
                    id, customer, product_name, quantity, dimensions,
                    length, width, height, awb, order_ref, warehouse,
                    status, payment_mode, invoice_amount, timestamp, remark
                FROM orders 
                WHERE is_active = 1
            `;
            
            const params = [];

            // Add search conditions for each token
            if (tokens && tokens.length > 0) {
                const searchConditions = tokens.map(() => `
                    (customer LIKE ? OR product_name LIKE ? OR awb LIKE ? OR 
                     order_ref LIKE ? OR warehouse LIKE ? OR status LIKE ? OR 
                     payment_mode LIKE ? OR remark LIKE ?)
                `).join(' AND ');

                query += ` AND (${searchConditions})`;

                // Add parameters for each token (8 fields per token)
                tokens.forEach(token => {
                    const searchTerm = `%${token}%`;
                    params.push(searchTerm, searchTerm, searchTerm, searchTerm, 
                               searchTerm, searchTerm, searchTerm, searchTerm);
                });
            }

            query += ` ORDER BY timestamp DESC LIMIT 1000`;

            const [orders] = await db.execute(query, params);

            res.json(orders);

        } catch (error) {
            console.error('Universal search error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get search suggestions
    static async getSearchSuggestions(req, res) {
        try {
            const { query } = req.query;

            if (!query || query.length < 2) {
                return res.json([]);
            }

            const searchTerm = `%${query}%`;

            const [suggestions] = await db.execute(`
                SELECT DISTINCT 
                    customer as value, 'customer' as type
                FROM orders 
                WHERE customer LIKE ? AND is_active = 1
                UNION
                SELECT DISTINCT 
                    product_name as value, 'product' as type
                FROM orders 
                WHERE product_name LIKE ? AND is_active = 1
                UNION
                SELECT DISTINCT 
                    awb as value, 'awb' as type
                FROM orders 
                WHERE awb LIKE ? AND is_active = 1
                UNION
                SELECT DISTINCT 
                    order_ref as value, 'order_ref' as type
                FROM orders 
                WHERE order_ref LIKE ? AND is_active = 1
                UNION
                SELECT DISTINCT 
                    warehouse as value, 'warehouse' as type
                FROM orders 
                WHERE warehouse LIKE ? AND is_active = 1
                UNION
                SELECT DISTINCT 
                    status as value, 'status' as type
                FROM orders 
                WHERE status LIKE ? AND is_active = 1
                LIMIT 20
            `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);

            res.json(suggestions);

        } catch (error) {
            console.error('Get suggestions error:', error);
            res.status(500).json([]);
        }
    }

    // Update order remark
    static async updateRemark(req, res) {
        try {
            const { orderId, remark } = req.body;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID is required'
                });
            }

            // Get current order for logging
            const [currentOrder] = await db.execute(`
                SELECT customer, product_name, remark as old_remark
                FROM orders 
                WHERE id = ? AND is_active = 1
            `, [orderId]);

            if (currentOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Update remark
            await db.execute(`
                UPDATE orders 
                SET remark = ?, updated_at = NOW()
                WHERE id = ?
            `, [remark || '', orderId]);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'UPDATE', 'ORDERS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                orderId,
                JSON.stringify({
                    field: 'remark',
                    oldValue: currentOrder[0].old_remark,
                    newValue: remark,
                    customer: currentOrder[0].customer,
                    product: currentOrder[0].product_name
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Remark updated successfully'
            });

        } catch (error) {
            console.error('Update remark error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Delete order
    static async deleteOrder(req, res) {
        try {
            const { warehouse, id } = req.params;

            if (!warehouse || !id) {
                return res.status(400).json({
                    success: false,
                    message: 'Warehouse and order ID are required'
                });
            }

            // Get order details for logging
            const [order] = await db.execute(`
                SELECT customer, product_name, order_ref, awb
                FROM orders 
                WHERE id = ? AND warehouse = ? AND is_active = 1
            `, [id, warehouse]);

            if (order.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Soft delete the order
            await db.execute(`
                UPDATE orders 
                SET is_active = 0, updated_at = NOW()
                WHERE id = ? AND warehouse = ?
            `, [id, warehouse]);

            // Log deletion
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'DELETE', 'ORDERS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                id,
                JSON.stringify({
                    warehouse,
                    customer: order[0].customer,
                    product: order[0].product_name,
                    orderRef: order[0].order_ref,
                    awb: order[0].awb
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Order deleted successfully'
            });

        } catch (error) {
            console.error('Delete order error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create new order
    static async createOrder(req, res) {
        try {
            const {
                customer, product_name, quantity, dimensions,
                length, width, height, awb, order_ref, warehouse,
                status, payment_mode, invoice_amount, remark
            } = req.body;

            if (!customer || !product_name || !quantity || !warehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer, product name, quantity, and warehouse are required'
                });
            }

            const [result] = await db.execute(`
                INSERT INTO orders (
                    customer, product_name, quantity, dimensions,
                    length, width, height, awb, order_ref, warehouse,
                    status, payment_mode, invoice_amount, remark,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                customer, product_name, quantity, dimensions,
                length, width, height, awb, order_ref, warehouse,
                status || 'pending', payment_mode, invoice_amount, remark || ''
            ]);

            // Log creation
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'CREATE', 'ORDERS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                result.insertId,
                JSON.stringify({
                    customer, product_name, quantity, warehouse, order_ref, awb
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Order created successfully',
                data: {
                    id: result.insertId,
                    customer,
                    product_name,
                    quantity,
                    warehouse,
                    status: status || 'pending'
                }
            });

        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get order by ID
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;

            const [orders] = await db.execute(`
                SELECT 
                    id, customer, product_name, quantity, dimensions,
                    length, width, height, awb, order_ref, warehouse,
                    status, payment_mode, invoice_amount, timestamp, remark,
                    created_at, updated_at
                FROM orders 
                WHERE id = ? AND is_active = 1
            `, [id]);

            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            res.json({
                success: true,
                data: orders[0]
            });

        } catch (error) {
            console.error('Get order error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = OrderController;