const db = require('../db/connection');

class InventoryController {
    // Get inventory by warehouse
    static async getByWarehouse(req, res) {
        try {
            const { warehouse } = req.query;

            if (!warehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'Warehouse parameter is required'
                });
            }

            const [items] = await db.execute(`
                SELECT 
                    product,
                    barcode,
                    stock,
                    warehouse,
                    updated_at
                FROM inventory 
                WHERE warehouse = ? AND is_active = 1
                ORDER BY product ASC
            `, [warehouse]);

            res.json({
                success: true,
                data: items
            });

        } catch (error) {
            console.error('Get inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get product tracking by barcode
    static async getProductTracking(req, res) {
        try {
            const { barcode } = req.params;

            if (!barcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Barcode is required'
                });
            }

            // Get inventory across all warehouses for this product
            const [inventory] = await db.execute(`
                SELECT 
                    product,
                    barcode,
                    stock,
                    warehouse,
                    updated_at
                FROM inventory 
                WHERE barcode = ? AND is_active = 1
                ORDER BY warehouse ASC
            `, [barcode]);

            // Get recent order history for this product
            const [orders] = await db.execute(`
                SELECT 
                    id,
                    customer,
                    quantity,
                    warehouse,
                    status,
                    timestamp,
                    order_ref
                FROM orders 
                WHERE product_name LIKE ? OR order_ref LIKE ?
                ORDER BY timestamp DESC
                LIMIT 10
            `, [`%${barcode}%`, `%${barcode}%`]);

            // Get recent dispatch history
            const [dispatches] = await db.execute(`
                SELECT 
                    id,
                    customer_name,
                    warehouse,
                    awb,
                    created_at,
                    status
                FROM dispatches 
                WHERE products LIKE ?
                ORDER BY created_at DESC
                LIMIT 10
            `, [`%${barcode}%`]);

            res.json({
                success: true,
                data: {
                    inventory,
                    recentOrders: orders,
                    recentDispatches: dispatches,
                    totalStock: inventory.reduce((sum, item) => sum + item.stock, 0)
                }
            });

        } catch (error) {
            console.error('Get product tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create or update inventory item
    static async createOrUpdate(req, res) {
        try {
            const { product, barcode, stock, warehouse } = req.body;

            if (!product || !barcode || stock === undefined || !warehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'Product, barcode, stock, and warehouse are required'
                });
            }

            // Check if item exists
            const [existing] = await db.execute(`
                SELECT id FROM inventory 
                WHERE barcode = ? AND warehouse = ?
            `, [barcode, warehouse]);

            let result;
            if (existing.length > 0) {
                // Update existing item
                [result] = await db.execute(`
                    UPDATE inventory 
                    SET product = ?, stock = ?, updated_at = NOW()
                    WHERE barcode = ? AND warehouse = ?
                `, [product, stock, barcode, warehouse]);
            } else {
                // Create new item
                [result] = await db.execute(`
                    INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                    VALUES (?, ?, ?, ?, NOW(), NOW())
                `, [product, barcode, stock, warehouse]);
            }

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, ?, 'INVENTORY', ?, ?, ?, ?)
            `, [
                req.user.userId,
                existing.length > 0 ? 'UPDATE' : 'CREATE',
                existing.length > 0 ? existing[0].id : result.insertId,
                JSON.stringify({ product, barcode, stock, warehouse }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: existing.length > 0 ? 'Inventory updated successfully' : 'Inventory created successfully',
                data: {
                    id: existing.length > 0 ? existing[0].id : result.insertId,
                    product,
                    barcode,
                    stock,
                    warehouse
                }
            });

        } catch (error) {
            console.error('Create/update inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Transfer inventory between warehouses
    static async transfer(req, res) {
        try {
            const { barcode, fromWarehouse, toWarehouse, quantity } = req.body;

            if (!barcode || !fromWarehouse || !toWarehouse || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Barcode, from warehouse, to warehouse, and quantity are required'
                });
            }

            if (fromWarehouse === toWarehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'Source and destination warehouses cannot be the same'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Check source inventory
                const [sourceItems] = await db.execute(`
                    SELECT id, product, stock 
                    FROM inventory 
                    WHERE barcode = ? AND warehouse = ? AND is_active = 1
                `, [barcode, fromWarehouse]);

                if (sourceItems.length === 0) {
                    throw new Error('Product not found in source warehouse');
                }

                const sourceItem = sourceItems[0];
                if (sourceItem.stock < quantity) {
                    throw new Error('Insufficient stock in source warehouse');
                }

                // Update source inventory
                await db.execute(`
                    UPDATE inventory 
                    SET stock = stock - ?, updated_at = NOW()
                    WHERE id = ?
                `, [quantity, sourceItem.id]);

                // Check if destination inventory exists
                const [destItems] = await db.execute(`
                    SELECT id FROM inventory 
                    WHERE barcode = ? AND warehouse = ? AND is_active = 1
                `, [barcode, toWarehouse]);

                if (destItems.length > 0) {
                    // Update destination inventory
                    await db.execute(`
                        UPDATE inventory 
                        SET stock = stock + ?, updated_at = NOW()
                        WHERE id = ?
                    `, [quantity, destItems[0].id]);
                } else {
                    // Create destination inventory
                    await db.execute(`
                        INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                        VALUES (?, ?, ?, ?, NOW(), NOW())
                    `, [sourceItem.product, barcode, quantity, toWarehouse]);
                }

                // Log transfer activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
                    VALUES (?, 'TRANSFER', 'INVENTORY', ?, ?, ?)
                `, [
                    req.user.userId,
                    JSON.stringify({
                        barcode,
                        product: sourceItem.product,
                        quantity,
                        fromWarehouse,
                        toWarehouse
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'Inventory transferred successfully'
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Transfer inventory error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get all warehouses
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
}

module.exports = InventoryController;