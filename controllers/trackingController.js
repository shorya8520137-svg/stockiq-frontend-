const db = require('../db/connection');

class TrackingController {
    // Get tracking by AWB
    static async getTrackingByAWB(req, res) {
        try {
            const { awb } = req.params;

            if (!awb) {
                return res.status(400).json({
                    success: false,
                    message: 'AWB is required'
                });
            }

            // Get order details
            const [orders] = await db.execute(`
                SELECT 
                    o.*,
                    d.logistics,
                    d.processed_by,
                    d.weight,
                    d.created_at as dispatch_time
                FROM orders o
                LEFT JOIN dispatches d ON o.awb = d.awb
                WHERE o.awb = ? AND o.is_active = 1
            `, [awb]);

            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const order = orders[0];

            // Get tracking timeline
            const [timeline] = await db.execute(`
                SELECT 
                    'ORDER_CREATED' as event,
                    'Order created' as description,
                    created_at as timestamp,
                    warehouse as location
                FROM orders 
                WHERE awb = ?
                UNION ALL
                SELECT 
                    'DISPATCHED' as event,
                    'Order dispatched' as description,
                    created_at as timestamp,
                    warehouse as location
                FROM dispatches 
                WHERE awb = ?
                UNION ALL
                SELECT 
                    'INVENTORY_DEDUCTED' as event,
                    'Inventory deducted' as description,
                    created_at as timestamp,
                    resource as location
                FROM audit_logs 
                WHERE JSON_EXTRACT(details, '$.awb') = ? AND action = 'CREATE' AND resource = 'DISPATCH'
                ORDER BY timestamp ASC
            `, [awb, awb, awb]);

            // Mock tracking status based on time elapsed
            const dispatchTime = new Date(order.dispatch_time || order.created_at);
            const now = new Date();
            const hoursElapsed = (now - dispatchTime) / (1000 * 60 * 60);

            let status = 'pending';
            let estimatedDelivery = new Date(dispatchTime);
            estimatedDelivery.setDate(estimatedDelivery.getDate() + 3); // 3 days default

            if (hoursElapsed > 72) {
                status = 'delivered';
            } else if (hoursElapsed > 48) {
                status = 'out_for_delivery';
            } else if (hoursElapsed > 24) {
                status = 'in_transit';
            } else if (hoursElapsed > 2) {
                status = 'picked_up';
            } else if (order.status === 'dispatched') {
                status = 'dispatched';
            }

            res.json({
                success: true,
                data: {
                    awb,
                    order: {
                        id: order.id,
                        customer: order.customer,
                        product_name: order.product_name,
                        quantity: order.quantity,
                        warehouse: order.warehouse,
                        status: order.status,
                        invoice_amount: order.invoice_amount,
                        created_at: order.created_at
                    },
                    tracking: {
                        status,
                        logistics: order.logistics || 'Blue Dart',
                        estimatedDelivery,
                        timeline
                    }
                }
            });

        } catch (error) {
            console.error('Get tracking by AWB error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get today's tracking progress
    static async getTodayProgress(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get today's dispatch statistics
            const [dispatchStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_dispatched,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    SUM(CASE WHEN JSON_LENGTH(products) > 0 THEN JSON_LENGTH(products) ELSE 1 END) as total_items
                FROM dispatches 
                WHERE DATE(created_at) = ?
            `, [today]);

            // Get hourly dispatch data for progress chart
            const [hourlyData] = await db.execute(`
                SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as dispatches
                FROM dispatches 
                WHERE DATE(created_at) = ?
                GROUP BY HOUR(created_at)
                ORDER BY hour ASC
            `, [today]);

            // Get warehouse-wise progress
            const [warehouseProgress] = await db.execute(`
                SELECT 
                    warehouse,
                    COUNT(*) as dispatches,
                    SUM(CASE WHEN JSON_LENGTH(products) > 0 THEN JSON_LENGTH(products) ELSE 1 END) as items
                FROM dispatches 
                WHERE DATE(created_at) = ?
                GROUP BY warehouse
                ORDER BY dispatches DESC
            `, [today]);

            // Get top logistics providers
            const [logisticsStats] = await db.execute(`
                SELECT 
                    logistics,
                    COUNT(*) as dispatches
                FROM dispatches 
                WHERE DATE(created_at) = ? AND logistics IS NOT NULL
                GROUP BY logistics
                ORDER BY dispatches DESC
                LIMIT 5
            `, [today]);

            res.json({
                success: true,
                data: {
                    summary: dispatchStats[0],
                    hourlyProgress: hourlyData,
                    warehouseProgress,
                    logisticsStats,
                    date: today
                }
            });

        } catch (error) {
            console.error('Get today progress error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get warehouse dispatch summary
    static async getWarehouseSummary(req, res) {
        try {
            const { warehouse, date } = req.query;
            const targetDate = date || new Date().toISOString().split('T')[0];

            let query = `
                SELECT 
                    warehouse,
                    COUNT(*) as total_dispatches,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_dispatches,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_dispatches,
                    SUM(invoice_amount) as total_value,
                    AVG(invoice_amount) as avg_order_value,
                    SUM(CASE WHEN JSON_LENGTH(products) > 0 THEN JSON_LENGTH(products) ELSE 1 END) as total_items
                FROM dispatches 
                WHERE DATE(created_at) = ?
            `;
            const params = [targetDate];

            if (warehouse) {
                query += ` AND warehouse = ?`;
                params.push(warehouse);
            }

            query += ` GROUP BY warehouse ORDER BY total_dispatches DESC`;

            const [summary] = await db.execute(query, params);

            // Get recent dispatches for the warehouse
            let recentQuery = `
                SELECT 
                    id, customer_name, awb, logistics, invoice_amount,
                    status, created_at, warehouse
                FROM dispatches 
                WHERE DATE(created_at) = ?
            `;
            const recentParams = [targetDate];

            if (warehouse) {
                recentQuery += ` AND warehouse = ?`;
                recentParams.push(warehouse);
            }

            recentQuery += ` ORDER BY created_at DESC LIMIT 10`;

            const [recentDispatches] = await db.execute(recentQuery, recentParams);

            res.json({
                success: true,
                data: {
                    summary,
                    recentDispatches,
                    date: targetDate,
                    warehouse: warehouse || 'All Warehouses'
                }
            });

        } catch (error) {
            console.error('Get warehouse summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get live tracking updates
    static async getLiveUpdates(req, res) {
        try {
            const { limit = 20 } = req.query;

            // Get recent dispatch activities
            const [recentActivities] = await db.execute(`
                SELECT 
                    d.id,
                    d.customer_name,
                    d.awb,
                    d.warehouse,
                    d.logistics,
                    d.status,
                    d.created_at,
                    u.name as processed_by_name
                FROM dispatches d
                LEFT JOIN users u ON d.created_by = u.id
                WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                ORDER BY d.created_at DESC
                LIMIT ?
            `, [parseInt(limit)]);

            // Get system alerts (low stock, failed dispatches, etc.)
            const [alerts] = await db.execute(`
                SELECT 
                    'LOW_STOCK' as type,
                    CONCAT('Low stock: ', product, ' (', stock, ' remaining)') as message,
                    warehouse,
                    updated_at as timestamp
                FROM inventory 
                WHERE stock <= 5 AND is_active = 1
                ORDER BY updated_at DESC
                LIMIT 5
            `);

            res.json({
                success: true,
                data: {
                    recentActivities,
                    alerts,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Get live updates error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get tracking statistics
    static async getTrackingStatistics(req, res) {
        try {
            const { dateFrom, dateTo, warehouse } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (dateFrom) {
                whereClause += ' AND DATE(created_at) >= ?';
                params.push(dateFrom);
            }

            if (dateTo) {
                whereClause += ' AND DATE(created_at) <= ?';
                params.push(dateTo);
            }

            if (warehouse) {
                whereClause += ' AND warehouse = ?';
                params.push(warehouse);
            }

            // Get dispatch statistics
            const [dispatchStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_dispatches,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    AVG(invoice_amount) as avg_order_value,
                    SUM(invoice_amount) as total_value
                FROM dispatches 
                ${whereClause}
            `, params);

            // Get logistics performance
            const [logisticsPerformance] = await db.execute(`
                SELECT 
                    logistics,
                    COUNT(*) as total_dispatches,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100, 2) as success_rate
                FROM dispatches 
                ${whereClause} AND logistics IS NOT NULL
                GROUP BY logistics
                ORDER BY total_dispatches DESC
            `, params);

            // Get daily dispatch trend
            const [dailyTrend] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as dispatches,
                    SUM(invoice_amount) as value
                FROM dispatches 
                ${whereClause}
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `, params);

            res.json({
                success: true,
                data: {
                    statistics: dispatchStats[0],
                    logisticsPerformance,
                    dailyTrend: dailyTrend.reverse() // Show oldest first for chart
                }
            });

        } catch (error) {
            console.error('Get tracking statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = TrackingController;