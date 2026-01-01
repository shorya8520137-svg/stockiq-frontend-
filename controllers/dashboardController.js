const db = require('../db/connection');

class DashboardController {
    // Get KPIs
    static async getKPIs(req, res) {
        try {
            // Get orders dispatched today
            const [ordersToday] = await db.execute(`
                SELECT COUNT(*) as count
                FROM orders 
                WHERE DATE(created_at) = CURDATE() AND status = 'dispatched' AND is_active = 1
            `);

            // Get total revenue today
            const [revenueToday] = await db.execute(`
                SELECT COALESCE(SUM(invoice_amount), 0) as total
                FROM orders 
                WHERE DATE(created_at) = CURDATE() AND is_active = 1
            `);

            // Get total cost today (assuming 70% of revenue as cost)
            const revenue = parseFloat(revenueToday[0].total) || 0;
            const cost = revenue * 0.7;
            const profit = revenue - cost;

            // Get total orders this month
            const [ordersMonth] = await db.execute(`
                SELECT COUNT(*) as count
                FROM orders 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE()) 
                AND is_active = 1
            `);

            // Get total revenue this month
            const [revenueMonth] = await db.execute(`
                SELECT COALESCE(SUM(invoice_amount), 0) as total
                FROM orders 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE()) 
                AND is_active = 1
            `);

            const kpis = {
                ordersDispatched: {
                    today: parseInt(ordersToday[0].count),
                    month: parseInt(ordersMonth[0].count)
                },
                revenue: {
                    today: revenue,
                    month: parseFloat(revenueMonth[0].total) || 0
                },
                cost: {
                    today: cost,
                    month: (parseFloat(revenueMonth[0].total) || 0) * 0.7
                },
                profit: {
                    today: profit,
                    month: (parseFloat(revenueMonth[0].total) || 0) * 0.3
                }
            };

            res.json(kpis);

        } catch (error) {
            console.error('Get KPIs error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get revenue vs cost data
    static async getRevenueCost(req, res) {
        try {
            const [data] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    COALESCE(SUM(invoice_amount), 0) as revenue,
                    COALESCE(SUM(invoice_amount), 0) * 0.7 as cost
                FROM orders 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND is_active = 1
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Format data for chart
            const chartData = data.map(row => ({
                date: row.date.toISOString().split('T')[0],
                revenue: parseFloat(row.revenue) || 0,
                cost: parseFloat(row.cost) || 0
            }));

            res.json(chartData);

        } catch (error) {
            console.error('Get revenue cost error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get warehouse volume data
    static async getWarehouseVolume(req, res) {
        try {
            const [data] = await db.execute(`
                SELECT 
                    warehouse,
                    COUNT(*) as count
                FROM orders 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND is_active = 1
                GROUP BY warehouse
                ORDER BY count DESC
            `);

            res.json(data);

        } catch (error) {
            console.error('Get warehouse volume error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get recent activity
    static async getActivity(req, res) {
        try {
            const [activities] = await db.execute(`
                SELECT 
                    al.action,
                    al.resource,
                    al.details,
                    al.created_at,
                    u.name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 50
            `);

            // Format activities for display
            const formattedActivities = activities.map(activity => {
                let description = '';
                let details = {};

                try {
                    details = JSON.parse(activity.details || '{}');
                } catch (e) {
                    details = {};
                }

                switch (activity.resource) {
                    case 'AUTH':
                        description = activity.action === 'LOGIN' ? 'User logged in' : 'User logged out';
                        break;
                    case 'ORDERS':
                        if (activity.action === 'CREATE') {
                            description = `Created order for ${details.customer || 'customer'}`;
                        } else if (activity.action === 'UPDATE') {
                            description = `Updated order remark`;
                        } else if (activity.action === 'DELETE') {
                            description = `Deleted order for ${details.customer || 'customer'}`;
                        }
                        break;
                    case 'DISPATCH':
                        description = `Created dispatch for ${details.customerName || 'customer'}`;
                        break;
                    case 'INVENTORY':
                        if (activity.action === 'TRANSFER') {
                            description = `Transferred ${details.quantity || 0} units of ${details.product || 'product'} from ${details.fromWarehouse || 'warehouse'} to ${details.toWarehouse || 'warehouse'}`;
                        } else if (activity.action === 'UPDATE') {
                            description = `Updated inventory for ${details.product || 'product'}`;
                        } else if (activity.action === 'CREATE') {
                            description = `Added new inventory item: ${details.product || 'product'}`;
                        }
                        break;
                    default:
                        description = `${activity.action} ${activity.resource}`;
                }

                return {
                    id: activity.id,
                    action: activity.action,
                    resource: activity.resource,
                    description,
                    user: activity.user_name || 'System',
                    timestamp: activity.created_at,
                    details
                };
            });

            res.json(formattedActivities);

        } catch (error) {
            console.error('Get activity error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get dispatch heatmap data
    static async getDispatchHeatmap(req, res) {
        try {
            const { range = 'week' } = req.query;
            
            let dateCondition = '';
            if (range === 'week') {
                dateCondition = 'WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            } else if (range === 'last') {
                dateCondition = 'WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
            }

            const [data] = await db.execute(`
                SELECT 
                    DAYOFWEEK(created_at) as day_of_week,
                    HOUR(created_at) as hour_of_day,
                    COUNT(*) as count
                FROM orders 
                ${dateCondition}
                AND status = 'dispatched' 
                AND is_active = 1
                GROUP BY DAYOFWEEK(created_at), HOUR(created_at)
                ORDER BY day_of_week, hour_of_day
            `);

            // Create heatmap matrix (7 days x 24 hours)
            const heatmap = Array(7).fill().map(() => Array(24).fill(0));

            data.forEach(row => {
                const dayIndex = row.day_of_week - 1; // Convert to 0-based index
                const hour = row.hour_of_day;
                heatmap[dayIndex][hour] = row.count;
            });

            // Convert to format expected by frontend
            const heatmapData = [];
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let day = 0; day < 7; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    heatmapData.push({
                        day: days[day],
                        hour: hour,
                        value: heatmap[day][hour]
                    });
                }
            }

            res.json({
                success: true,
                data: heatmapData,
                maxValue: Math.max(...data.map(d => d.count), 1)
            });

        } catch (error) {
            console.error('Get dispatch heatmap error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get system statistics
    static async getSystemStats(req, res) {
        try {
            // Get total counts
            const [totalOrders] = await db.execute(`
                SELECT COUNT(*) as count FROM orders WHERE is_active = 1
            `);

            const [totalInventory] = await db.execute(`
                SELECT COUNT(*) as count FROM inventory WHERE is_active = 1
            `);

            const [totalDispatches] = await db.execute(`
                SELECT COUNT(*) as count FROM dispatches WHERE is_active = 1
            `);

            const [totalUsers] = await db.execute(`
                SELECT COUNT(*) as count FROM users WHERE is_active = 1
            `);

            // Get low stock items (stock < 10)
            const [lowStock] = await db.execute(`
                SELECT COUNT(*) as count FROM inventory WHERE stock < 10 AND is_active = 1
            `);

            // Get pending orders
            const [pendingOrders] = await db.execute(`
                SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND is_active = 1
            `);

            const stats = {
                totalOrders: parseInt(totalOrders[0].count),
                totalInventory: parseInt(totalInventory[0].count),
                totalDispatches: parseInt(totalDispatches[0].count),
                totalUsers: parseInt(totalUsers[0].count),
                lowStockItems: parseInt(lowStock[0].count),
                pendingOrders: parseInt(pendingOrders[0].count)
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get system stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = DashboardController;