const db = require('../db/connection');

class DamageController {
    // Process damage or recovery
    static async processDamage(req, res) {
        try {
            const { productType, barcode, warehouse, actionType, quantity } = req.body;

            if (!productType || !barcode || !warehouse || !actionType || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Product type, barcode, warehouse, action type, and quantity are required'
                });
            }

            if (!['damage', 'recovery'].includes(actionType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Action type must be either "damage" or "recovery"'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Check if inventory exists
                const [inventoryItems] = await db.execute(`
                    SELECT id, stock FROM inventory 
                    WHERE barcode = ? AND warehouse = ? AND is_active = 1
                `, [barcode, warehouse]);

                let inventoryId;
                let currentStock = 0;

                if (inventoryItems.length > 0) {
                    inventoryId = inventoryItems[0].id;
                    currentStock = inventoryItems[0].stock;
                } else if (actionType === 'recovery') {
                    // Create inventory item for recovery if it doesn't exist
                    const [result] = await db.execute(`
                        INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                        VALUES (?, ?, 0, ?, NOW(), NOW())
                    `, [productType, barcode, warehouse]);
                    inventoryId = result.insertId;
                    currentStock = 0;
                } else {
                    throw new Error(`Product not found in ${warehouse}`);
                }

                // Calculate new stock based on action type
                let newStock;
                if (actionType === 'damage') {
                    if (currentStock < quantity) {
                        throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${quantity}`);
                    }
                    newStock = currentStock - quantity;
                } else { // recovery
                    newStock = currentStock + quantity;
                }

                // Update inventory
                await db.execute(`
                    UPDATE inventory 
                    SET stock = ?, updated_at = NOW()
                    WHERE id = ?
                `, [newStock, inventoryId]);

                // Create damage/recovery record
                const [damageResult] = await db.execute(`
                    INSERT INTO damage_recovery (
                        product_type, barcode, warehouse, action_type, quantity,
                        previous_stock, new_stock, processed_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    productType, barcode, warehouse, actionType, quantity,
                    currentStock, newStock, req.user.userId
                ]);

                // Log activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                    VALUES (?, ?, 'DAMAGE_RECOVERY', ?, ?, ?, ?)
                `, [
                    req.user.userId,
                    actionType.toUpperCase(),
                    damageResult.insertId,
                    JSON.stringify({
                        productType,
                        barcode,
                        warehouse,
                        actionType,
                        quantity,
                        previousStock: currentStock,
                        newStock
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: `${actionType === 'damage' ? 'Damage' : 'Recovery'} processed successfully`,
                    data: {
                        id: damageResult.insertId,
                        productType,
                        barcode,
                        warehouse,
                        actionType,
                        quantity,
                        previousStock: currentStock,
                        newStock
                    }
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Process damage error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get damage/recovery history
    static async getHistory(req, res) {
        try {
            const { warehouse, actionType, limit = 100, offset = 0 } = req.query;

            let query = `
                SELECT 
                    dr.*,
                    u.name as processed_by_name
                FROM damage_recovery dr
                LEFT JOIN users u ON dr.processed_by = u.id
                WHERE 1=1
            `;
            const params = [];

            if (warehouse) {
                query += ` AND dr.warehouse = ?`;
                params.push(warehouse);
            }

            if (actionType) {
                query += ` AND dr.action_type = ?`;
                params.push(actionType);
            }

            query += ` ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [records] = await db.execute(query, params);

            res.json({
                success: true,
                data: records
            });

        } catch (error) {
            console.error('Get damage history error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get damage/recovery statistics
    static async getStatistics(req, res) {
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

            // Get damage statistics
            const [damageStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_damage_records,
                    SUM(quantity) as total_damaged_quantity,
                    COUNT(DISTINCT barcode) as unique_products_damaged
                FROM damage_recovery 
                ${whereClause} AND action_type = 'damage'
            `, params);

            // Get recovery statistics
            const [recoveryStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_recovery_records,
                    SUM(quantity) as total_recovered_quantity,
                    COUNT(DISTINCT barcode) as unique_products_recovered
                FROM damage_recovery 
                ${whereClause} AND action_type = 'recovery'
            `, params);

            // Get top damaged products
            const [topDamaged] = await db.execute(`
                SELECT 
                    product_type,
                    barcode,
                    SUM(quantity) as total_damaged
                FROM damage_recovery 
                ${whereClause} AND action_type = 'damage'
                GROUP BY product_type, barcode
                ORDER BY total_damaged DESC
                LIMIT 10
            `, params);

            res.json({
                success: true,
                data: {
                    damage: damageStats[0],
                    recovery: recoveryStats[0],
                    topDamagedProducts: topDamaged
                }
            });

        } catch (error) {
            console.error('Get damage statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = DamageController;