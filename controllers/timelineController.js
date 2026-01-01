const db = require('../db/connection');

class TimelineController {
    // Get product timeline by barcode
    static async getProductTimeline(req, res) {
        try {
            const { barcode } = req.params;
            const { warehouse, limit = 50 } = req.query;

            if (!barcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Barcode is required'
                });
            }

            let timelineEvents = [];

            // Get inventory opening events
            const inventoryQuery = `
                SELECT 
                    'OPENING' as event_type,
                    'Stock added to inventory' as description,
                    stock as quantity,
                    warehouse,
                    created_at as timestamp,
                    'system' as user_type,
                    NULL as user_name
                FROM inventory 
                WHERE barcode = ? AND is_active = 1
                ${warehouse ? 'AND warehouse = ?' : ''}
            `;
            const inventoryParams = warehouse ? [barcode, warehouse] : [barcode];

            // Get order/sale events
            const orderQuery = `
                SELECT 
                    'SALE' as event_type,
                    CONCAT('Sold to ', customer) as description,
                    quantity,
                    warehouse,
                    timestamp,
                    'customer' as user_type,
                    customer as user_name
                FROM orders 
                WHERE product_name LIKE ? AND is_active = 1
                ${warehouse ? 'AND warehouse = ?' : ''}
            `;
            const orderParams = warehouse ? [`%${barcode}%`, warehouse] : [`%${barcode}%`];

            // Get dispatch events
            const dispatchQuery = `
                SELECT 
                    'DISPATCH' as event_type,
                    CONCAT('Dispatched to ', customer_name, ' via ', COALESCE(logistics, 'Unknown')) as description,
                    1 as quantity,
                    warehouse,
                    created_at as timestamp,
                    'dispatch' as user_type,
                    customer_name as user_name
                FROM dispatches 
                WHERE JSON_SEARCH(products, 'one', ?, NULL, '$[*].name') IS NOT NULL
                ${warehouse ? 'AND warehouse = ?' : ''}
            `;
            const dispatchParams = warehouse ? [barcode, warehouse] : [barcode];

            // Get damage events
            const damageQuery = `
                SELECT 
                    action_type as event_type,
                    CASE 
                        WHEN action_type = 'damage' THEN CONCAT('Damaged: ', quantity, ' units')
                        ELSE CONCAT('Recovered: ', quantity, ' units')
                    END as description,
                    quantity,
                    warehouse,
                    created_at as timestamp,
                    'system' as user_type,
                    NULL as user_name
                FROM damage_recovery 
                WHERE barcode = ?
                ${warehouse ? 'AND warehouse = ?' : ''}
            `;
            const damageParams = warehouse ? [barcode, warehouse] : [barcode];

            // Get return events
            const returnQuery = `
                SELECT 
                    'RETURN' as event_type,
                    CONCAT('Return: ', quantity, ' units', CASE WHEN subtype THEN CONCAT(' (', subtype, ')') ELSE '' END) as description,
                    quantity,
                    warehouse,
                    created_at as timestamp,
                    'return' as user_type,
                    NULL as user_name
                FROM returns 
                WHERE barcode = ?
                ${warehouse ? 'AND warehouse = ?' : ''}
            `;
            const returnParams = warehouse ? [barcode, warehouse] : [barcode];

            // Get transfer events (outgoing)
            const transferOutQuery = `
                SELECT 
                    'TRANSFER_OUT' as event_type,
                    CONCAT('Transferred to ', to_warehouse) as description,
                    JSON_UNQUOTE(JSON_EXTRACT(products, CONCAT('$[', idx.idx, '].quantity'))) as quantity,
                    from_warehouse as warehouse,
                    created_at as timestamp,
                    'transfer' as user_type,
                    to_warehouse as user_name
                FROM transfers t
                CROSS JOIN (
                    SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                ) idx
                WHERE JSON_UNQUOTE(JSON_EXTRACT(products, CONCAT('$[', idx.idx, '].barcode'))) = ?
                AND JSON_EXTRACT(products, CONCAT('$[', idx.idx, ']')) IS NOT NULL
                ${warehouse ? 'AND from_warehouse = ?' : ''}
            `;
            const transferOutParams = warehouse ? [barcode, warehouse] : [barcode];

            // Get transfer events (incoming)
            const transferInQuery = `
                SELECT 
                    'TRANSFER_IN' as event_type,
                    CONCAT('Received from ', from_warehouse) as description,
                    JSON_UNQUOTE(JSON_EXTRACT(products, CONCAT('$[', idx.idx, '].quantity'))) as quantity,
                    to_warehouse as warehouse,
                    created_at as timestamp,
                    'transfer' as user_type,
                    from_warehouse as user_name
                FROM transfers t
                CROSS JOIN (
                    SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                ) idx
                WHERE JSON_UNQUOTE(JSON_EXTRACT(products, CONCAT('$[', idx.idx, '].barcode'))) = ?
                AND JSON_EXTRACT(products, CONCAT('$[', idx.idx, ']')) IS NOT NULL
                ${warehouse ? 'AND to_warehouse = ?' : ''}
            `;
            const transferInParams = warehouse ? [barcode, warehouse] : [barcode];

            // Execute all queries
            const [inventoryEvents] = await db.execute(inventoryQuery, inventoryParams);
            const [orderEvents] = await db.execute(orderQuery, orderParams);
            const [dispatchEvents] = await db.execute(dispatchQuery, dispatchParams);
            const [damageEvents] = await db.execute(damageQuery, damageParams);
            const [returnEvents] = await db.execute(returnQuery, returnParams);
            const [transferOutEvents] = await db.execute(transferOutQuery, transferOutParams);
            const [transferInEvents] = await db.execute(transferInQuery, transferInParams);

            // Combine all events
            timelineEvents = [
                ...inventoryEvents,
                ...orderEvents,
                ...dispatchEvents,
                ...damageEvents,
                ...returnEvents,
                ...transferOutEvents,
                ...transferInEvents
            ];

            // Sort by timestamp (newest first)
            timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Limit results
            if (limit) {
                timelineEvents = timelineEvents.slice(0, parseInt(limit));
            }

            // Get current stock levels
            const [currentStock] = await db.execute(`
                SELECT 
                    warehouse,
                    stock,
                    updated_at
                FROM inventory 
                WHERE barcode = ? AND is_active = 1
                ${warehouse ? 'AND warehouse = ?' : ''}
                ORDER BY warehouse
            `, warehouse ? [barcode, warehouse] : [barcode]);

            // Get product details
            const [productDetails] = await db.execute(`
                SELECT DISTINCT
                    product,
                    barcode
                FROM inventory 
                WHERE barcode = ? AND is_active = 1
                LIMIT 1
            `, [barcode]);

            res.json({
                success: true,
                data: {
                    product: productDetails[0] || { product: 'Unknown Product', barcode },
                    currentStock,
                    timeline: timelineEvents,
                    totalEvents: timelineEvents.length,
                    warehouse: warehouse || 'All Warehouses'
                }
            });

        } catch (error) {
            console.error('Get product timeline error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get inventory timeline summary
    static async getInventoryTimelineSummary(req, res) {
        try {
            const { warehouse, dateFrom, dateTo, limit = 100 } = req.query;

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

            // Get recent inventory activities
            const [activities] = await db.execute(`
                SELECT 
                    'INVENTORY_UPDATE' as event_type,
                    CONCAT('Stock updated: ', product) as description,
                    stock as quantity,
                    warehouse,
                    updated_at as timestamp,
                    barcode
                FROM inventory 
                ${whereClause} AND is_active = 1
                ORDER BY updated_at DESC
                LIMIT ?
            `, [...params, parseInt(limit)]);

            // Get activity statistics
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_activities,
                    COUNT(DISTINCT barcode) as unique_products,
                    COUNT(DISTINCT warehouse) as warehouses_involved,
                    SUM(stock) as total_stock
                FROM inventory 
                ${whereClause} AND is_active = 1
            `, params);

            // Get top active products
            const [topProducts] = await db.execute(`
                SELECT 
                    product,
                    barcode,
                    COUNT(*) as activity_count,
                    SUM(stock) as total_stock
                FROM inventory 
                ${whereClause} AND is_active = 1
                GROUP BY product, barcode
                ORDER BY activity_count DESC
                LIMIT 10
            `, params);

            res.json({
                success: true,
                data: {
                    activities,
                    statistics: stats[0],
                    topProducts,
                    filters: {
                        warehouse: warehouse || 'All Warehouses',
                        dateFrom,
                        dateTo
                    }
                }
            });

        } catch (error) {
            console.error('Get inventory timeline summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get warehouse activity timeline
    static async getWarehouseTimeline(req, res) {
        try {
            const { warehouse } = req.params;
            const { date, limit = 50 } = req.query;

            if (!warehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'Warehouse is required'
                });
            }

            const targetDate = date || new Date().toISOString().split('T')[0];

            // Get all activities for the warehouse on the specified date
            let activities = [];

            // Inventory activities
            const [inventoryActivities] = await db.execute(`
                SELECT 
                    'INVENTORY' as category,
                    'STOCK_UPDATE' as event_type,
                    CONCAT('Stock updated: ', product, ' (', stock, ')') as description,
                    stock as quantity,
                    barcode,
                    updated_at as timestamp
                FROM inventory 
                WHERE warehouse = ? AND DATE(updated_at) = ? AND is_active = 1
            `, [warehouse, targetDate]);

            // Dispatch activities
            const [dispatchActivities] = await db.execute(`
                SELECT 
                    'DISPATCH' as category,
                    'ORDER_DISPATCHED' as event_type,
                    CONCAT('Dispatched to ', customer_name, ' (AWB: ', COALESCE(awb, 'N/A'), ')') as description,
                    1 as quantity,
                    awb as barcode,
                    created_at as timestamp
                FROM dispatches 
                WHERE warehouse = ? AND DATE(created_at) = ?
            `, [warehouse, targetDate]);

            // Transfer activities (outgoing)
            const [transferOutActivities] = await db.execute(`
                SELECT 
                    'TRANSFER' as category,
                    'TRANSFER_OUT' as event_type,
                    CONCAT('Transferred to ', to_warehouse, ' (', total_items, ' items)') as description,
                    total_items as quantity,
                    CONCAT('TRF-', id) as barcode,
                    created_at as timestamp
                FROM transfers 
                WHERE from_warehouse = ? AND DATE(created_at) = ?
            `, [warehouse, targetDate]);

            // Transfer activities (incoming)
            const [transferInActivities] = await db.execute(`
                SELECT 
                    'TRANSFER' as category,
                    'TRANSFER_IN' as event_type,
                    CONCAT('Received from ', from_warehouse, ' (', total_items, ' items)') as description,
                    total_items as quantity,
                    CONCAT('TRF-', id) as barcode,
                    created_at as timestamp
                FROM transfers 
                WHERE to_warehouse = ? AND DATE(created_at) = ?
            `, [warehouse, targetDate]);

            // Damage/Recovery activities
            const [damageActivities] = await db.execute(`
                SELECT 
                    'DAMAGE' as category,
                    UPPER(action_type) as event_type,
                    CONCAT(
                        CASE WHEN action_type = 'damage' THEN 'Damaged: ' ELSE 'Recovered: ' END,
                        product_type, ' (', quantity, ')'
                    ) as description,
                    quantity,
                    barcode,
                    created_at as timestamp
                FROM damage_recovery 
                WHERE warehouse = ? AND DATE(created_at) = ?
            `, [warehouse, targetDate]);

            // Return activities
            const [returnActivities] = await db.execute(`
                SELECT 
                    'RETURN' as category,
                    'PRODUCT_RETURNED' as event_type,
                    CONCAT('Return: ', product_type, ' (', quantity, ')') as description,
                    quantity,
                    barcode,
                    created_at as timestamp
                FROM returns 
                WHERE warehouse = ? AND DATE(created_at) = ?
            `, [warehouse, targetDate]);

            // Combine all activities
            activities = [
                ...inventoryActivities,
                ...dispatchActivities,
                ...transferOutActivities,
                ...transferInActivities,
                ...damageActivities,
                ...returnActivities
            ];

            // Sort by timestamp (newest first)
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Limit results
            if (limit) {
                activities = activities.slice(0, parseInt(limit));
            }

            // Get summary statistics
            const summary = {
                totalActivities: activities.length,
                categories: {
                    inventory: inventoryActivities.length,
                    dispatch: dispatchActivities.length,
                    transfer: transferOutActivities.length + transferInActivities.length,
                    damage: damageActivities.length,
                    returns: returnActivities.length
                }
            };

            res.json({
                success: true,
                data: {
                    warehouse,
                    date: targetDate,
                    summary,
                    activities
                }
            });

        } catch (error) {
            console.error('Get warehouse timeline error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get system-wide activity timeline
    static async getSystemTimeline(req, res) {
        try {
            const { limit = 100, category } = req.query;

            let activities = [];

            // Get recent audit log activities
            const [auditActivities] = await db.execute(`
                SELECT 
                    'SYSTEM' as category,
                    action as event_type,
                    CONCAT(
                        CASE 
                            WHEN resource = 'AUTH' AND action = 'LOGIN' THEN 'User logged in'
                            WHEN resource = 'ORDERS' AND action = 'CREATE' THEN 'Order created'
                            WHEN resource = 'DISPATCH' AND action = 'CREATE' THEN 'Dispatch created'
                            WHEN resource = 'INVENTORY' AND action = 'TRANSFER' THEN 'Inventory transferred'
                            WHEN resource = 'DAMAGE_RECOVERY' THEN CONCAT(action, ' processed')
                            ELSE CONCAT(action, ' ', resource)
                        END
                    ) as description,
                    1 as quantity,
                    CONCAT(resource, '-', COALESCE(resource_id, 0)) as barcode,
                    created_at as timestamp,
                    u.name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ${category ? 'AND al.resource = ?' : ''}
                ORDER BY al.created_at DESC
                LIMIT ?
            `, category ? [category.toUpperCase(), parseInt(limit)] : [parseInt(limit)]);

            activities = auditActivities;

            // Get activity statistics
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_activities,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(DISTINCT resource) as resource_types
                FROM audit_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            // Get top active users
            const [topUsers] = await db.execute(`
                SELECT 
                    u.name,
                    u.email,
                    COUNT(*) as activity_count
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND u.name IS NOT NULL
                GROUP BY u.id, u.name, u.email
                ORDER BY activity_count DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    activities,
                    statistics: stats[0],
                    topUsers,
                    timeframe: '24 hours',
                    category: category || 'All Categories'
                }
            });

        } catch (error) {
            console.error('Get system timeline error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = TimelineController;