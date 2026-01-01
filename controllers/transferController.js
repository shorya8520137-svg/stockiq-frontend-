const db = require('../db/connection');

class TransferController {
    // Create FIFO transfer
    static async createFIFOTransfer(req, res) {
        try {
            const { 
                fromWarehouse, 
                toWarehouse, 
                products, // Array of {barcode, quantity}
                transferType = 'FIFO',
                notes 
            } = req.body;

            if (!fromWarehouse || !toWarehouse || !products || products.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'From warehouse, to warehouse, and products are required'
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
                const transferResults = [];

                for (const productTransfer of products) {
                    const { barcode, quantity } = productTransfer;

                    if (!barcode || !quantity || quantity <= 0) {
                        throw new Error(`Invalid product transfer data: ${JSON.stringify(productTransfer)}`);
                    }

                    // Get source inventory
                    const [sourceItems] = await db.execute(`
                        SELECT id, product, stock 
                        FROM inventory 
                        WHERE barcode = ? AND warehouse = ? AND is_active = 1
                        ORDER BY created_at ASC -- FIFO: First In, First Out
                    `, [barcode, fromWarehouse]);

                    if (sourceItems.length === 0) {
                        throw new Error(`Product ${barcode} not found in ${fromWarehouse}`);
                    }

                    // Calculate total available stock
                    const totalAvailableStock = sourceItems.reduce((sum, item) => sum + item.stock, 0);
                    
                    if (totalAvailableStock < quantity) {
                        throw new Error(`Insufficient stock for ${barcode}. Available: ${totalAvailableStock}, Required: ${quantity}`);
                    }

                    let remainingQuantity = quantity;
                    const productName = sourceItems[0].product;

                    // Process FIFO transfer
                    for (const sourceItem of sourceItems) {
                        if (remainingQuantity <= 0) break;

                        const transferQuantity = Math.min(sourceItem.stock, remainingQuantity);

                        // Update source inventory
                        await db.execute(`
                            UPDATE inventory 
                            SET stock = stock - ?, updated_at = NOW()
                            WHERE id = ?
                        `, [transferQuantity, sourceItem.id]);

                        remainingQuantity -= transferQuantity;
                    }

                    // Update or create destination inventory
                    const [destItems] = await db.execute(`
                        SELECT id FROM inventory 
                        WHERE barcode = ? AND warehouse = ? AND is_active = 1
                    `, [barcode, toWarehouse]);

                    if (destItems.length > 0) {
                        // Update existing destination inventory
                        await db.execute(`
                            UPDATE inventory 
                            SET stock = stock + ?, updated_at = NOW()
                            WHERE id = ?
                        `, [quantity, destItems[0].id]);
                    } else {
                        // Create new destination inventory
                        await db.execute(`
                            INSERT INTO inventory (product, barcode, stock, warehouse, created_at, updated_at)
                            VALUES (?, ?, ?, ?, NOW(), NOW())
                        `, [productName, barcode, quantity, toWarehouse]);
                    }

                    transferResults.push({
                        barcode,
                        productName,
                        quantity,
                        fromWarehouse,
                        toWarehouse
                    });
                }

                // Create transfer record
                const [transferResult] = await db.execute(`
                    INSERT INTO transfers (
                        from_warehouse, to_warehouse, transfer_type, products,
                        total_items, status, notes, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, NOW(), NOW())
                `, [
                    fromWarehouse, 
                    toWarehouse, 
                    transferType,
                    JSON.stringify(transferResults),
                    transferResults.length,
                    notes,
                    req.user.userId
                ]);

                // Log activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                    VALUES (?, 'CREATE', 'TRANSFERS', ?, ?, ?, ?)
                `, [
                    req.user.userId,
                    transferResult.insertId,
                    JSON.stringify({
                        fromWarehouse,
                        toWarehouse,
                        transferType,
                        totalItems: transferResults.length,
                        products: transferResults
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'FIFO transfer completed successfully',
                    data: {
                        transferId: transferResult.insertId,
                        fromWarehouse,
                        toWarehouse,
                        transferType,
                        products: transferResults,
                        totalItems: transferResults.length
                    }
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Create FIFO transfer error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get transfer history
    static async getTransferHistory(req, res) {
        try {
            const { warehouse, status, limit = 100, offset = 0 } = req.query;

            let query = `
                SELECT 
                    t.*,
                    u.name as created_by_name
                FROM transfers t
                LEFT JOIN users u ON t.created_by = u.id
                WHERE 1=1
            `;
            const params = [];

            if (warehouse) {
                query += ` AND (t.from_warehouse = ? OR t.to_warehouse = ?)`;
                params.push(warehouse, warehouse);
            }

            if (status) {
                query += ` AND t.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [transfers] = await db.execute(query, params);

            // Parse products JSON
            transfers.forEach(transfer => {
                if (transfer.products) {
                    try {
                        transfer.products = JSON.parse(transfer.products);
                    } catch (e) {
                        transfer.products = [];
                    }
                }
            });

            res.json({
                success: true,
                data: transfers
            });

        } catch (error) {
            console.error('Get transfer history error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get transfer by ID
    static async getTransferById(req, res) {
        try {
            const { transferId } = req.params;

            const [transfers] = await db.execute(`
                SELECT 
                    t.*,
                    u.name as created_by_name
                FROM transfers t
                LEFT JOIN users u ON t.created_by = u.id
                WHERE t.id = ?
            `, [transferId]);

            if (transfers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Transfer not found'
                });
            }

            const transfer = transfers[0];

            // Parse products JSON
            if (transfer.products) {
                try {
                    transfer.products = JSON.parse(transfer.products);
                } catch (e) {
                    transfer.products = [];
                }
            }

            res.json({
                success: true,
                data: transfer
            });

        } catch (error) {
            console.error('Get transfer by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get transfer statistics
    static async getTransferStatistics(req, res) {
        try {
            const { warehouse, dateFrom, dateTo } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (warehouse) {
                whereClause += ' AND (from_warehouse = ? OR to_warehouse = ?)';
                params.push(warehouse, warehouse);
            }

            if (dateFrom) {
                whereClause += ' AND created_at >= ?';
                params.push(dateFrom);
            }

            if (dateTo) {
                whereClause += ' AND created_at <= ?';
                params.push(dateTo);
            }

            // Get transfer statistics
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_transfers,
                    SUM(total_items) as total_items_transferred,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transfers
                FROM transfers 
                ${whereClause}
            `, params);

            // Get top transfer routes
            const [routes] = await db.execute(`
                SELECT 
                    from_warehouse,
                    to_warehouse,
                    COUNT(*) as transfer_count,
                    SUM(total_items) as total_items
                FROM transfers 
                ${whereClause}
                GROUP BY from_warehouse, to_warehouse
                ORDER BY transfer_count DESC
                LIMIT 10
            `, params);

            res.json({
                success: true,
                data: {
                    statistics: stats[0],
                    topRoutes: routes
                }
            });

        } catch (error) {
            console.error('Get transfer statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get warehouse stock for transfer planning
    static async getWarehouseStockForTransfer(req, res) {
        try {
            const { fromWarehouse, barcode } = req.query;

            if (!fromWarehouse) {
                return res.status(400).json({
                    success: false,
                    message: 'From warehouse is required'
                });
            }

            let query = `
                SELECT 
                    product,
                    barcode,
                    stock,
                    created_at
                FROM inventory 
                WHERE warehouse = ? AND is_active = 1 AND stock > 0
            `;
            const params = [fromWarehouse];

            if (barcode) {
                query += ` AND barcode = ?`;
                params.push(barcode);
            }

            query += ` ORDER BY created_at ASC`; // FIFO order

            const [stockItems] = await db.execute(query, params);

            res.json({
                success: true,
                data: stockItems
            });

        } catch (error) {
            console.error('Get warehouse stock for transfer error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = TransferController;