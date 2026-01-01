const db = require('../db/connection');

class StockController {
    // Universal stock search (warehouses, stores, products)
    static async searchStock(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json({
                    success: true,
                    data: {
                        warehouses: [],
                        stores: [],
                        products: []
                    }
                });
            }

            const searchTerm = `%${q}%`;

            // Search warehouses
            const warehouses = [
                { warehouse_code: "GGM_WH", Warehouse_name: "Gurgaon Warehouse" },
                { warehouse_code: "BLR_WH", Warehouse_name: "Bangalore Warehouse" },
                { warehouse_code: "MUM_WH", Warehouse_name: "Mumbai Warehouse" },
                { warehouse_code: "AMD_WH", Warehouse_name: "Ahmedabad Warehouse" },
                { warehouse_code: "HYD_WH", Warehouse_name: "Hyderabad Warehouse" }
            ].filter(w => 
                w.Warehouse_name.toLowerCase().includes(q.toLowerCase()) ||
                w.warehouse_code.toLowerCase().includes(q.toLowerCase())
            );

            // Search stores (mock data for now)
            const stores = [
                { store_code: "GGM_ST1", store_name: "Gurgaon Store 1" },
                { store_code: "BLR_ST1", store_name: "Bangalore Store 1" },
                { store_code: "MUM_ST1", store_name: "Mumbai Store 1" }
            ].filter(s => 
                s.store_name.toLowerCase().includes(q.toLowerCase()) ||
                s.store_code.toLowerCase().includes(q.toLowerCase())
            );

            // Search products
            const [products] = await db.execute(`
                SELECT DISTINCT
                    id as p_id,
                    product as product_name,
                    barcode,
                    SUM(stock) as total_stock
                FROM inventory 
                WHERE (product LIKE ? OR barcode LIKE ?) AND is_active = 1
                GROUP BY product, barcode
                ORDER BY product ASC
                LIMIT 20
            `, [searchTerm, searchTerm]);

            res.json({
                success: true,
                data: {
                    warehouses,
                    stores,
                    products
                }
            });

        } catch (error) {
            console.error('Search stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get stock details by location and product
    static async getStockDetails(req, res) {
        try {
            const { warehouse, barcode } = req.query;

            if (!warehouse || !barcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Warehouse and barcode are required'
                });
            }

            const [stockDetails] = await db.execute(`
                SELECT 
                    id,
                    product,
                    barcode,
                    stock,
                    warehouse,
                    created_at,
                    updated_at
                FROM inventory 
                WHERE warehouse = ? AND barcode = ? AND is_active = 1
            `, [warehouse, barcode]);

            if (stockDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Stock not found'
                });
            }

            // Get recent stock movements
            const [movements] = await db.execute(`
                SELECT 
                    'damage' as type,
                    action_type as action,
                    quantity,
                    previous_stock,
                    new_stock,
                    created_at
                FROM damage_recovery 
                WHERE warehouse = ? AND barcode = ?
                UNION ALL
                SELECT 
                    'return' as type,
                    'return' as action,
                    quantity,
                    NULL as previous_stock,
                    NULL as new_stock,
                    created_at
                FROM returns 
                WHERE warehouse = ? AND barcode = ?
                ORDER BY created_at DESC
                LIMIT 10
            `, [warehouse, barcode, warehouse, barcode]);

            res.json({
                success: true,
                data: {
                    stock: stockDetails[0],
                    recentMovements: movements
                }
            });

        } catch (error) {
            console.error('Get stock details error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get low stock alerts
    static async getLowStockAlerts(req, res) {
        try {
            const { warehouse, threshold = 10 } = req.query;

            let query = `
                SELECT 
                    product,
                    barcode,
                    stock,
                    warehouse,
                    updated_at
                FROM inventory 
                WHERE stock <= ? AND is_active = 1
            `;
            const params = [parseInt(threshold)];

            if (warehouse) {
                query += ` AND warehouse = ?`;
                params.push(warehouse);
            }

            query += ` ORDER BY stock ASC, product ASC`;

            const [lowStockItems] = await db.execute(query, params);

            res.json({
                success: true,
                data: lowStockItems,
                count: lowStockItems.length
            });

        } catch (error) {
            console.error('Get low stock alerts error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get stock summary by warehouse
    static async getStockSummary(req, res) {
        try {
            const [summary] = await db.execute(`
                SELECT 
                    warehouse,
                    COUNT(*) as total_products,
                    SUM(stock) as total_stock,
                    COUNT(CASE WHEN stock <= 10 THEN 1 END) as low_stock_count,
                    COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count
                FROM inventory 
                WHERE is_active = 1
                GROUP BY warehouse
                ORDER BY warehouse
            `);

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Get stock summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = StockController;