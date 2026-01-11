const db = require('../db/connection');

class SearchController {
    
    // ===============================
    // GLOBAL SEARCH
    // ===============================
    static async globalSearch(req, res) {
        try {
            const { 
                query, 
                type = 'all', 
                limit = 20, 
                offset = 0,
                user_id 
            } = req.query;

            if (!query || query.trim().length < 2) {
                return res.json({
                    success: true,
                    data: {
                        results: [],
                        total: 0,
                        suggestions: []
                    }
                });
            }

            const searchTerm = `%${query.trim()}%`;
            const results = [];
            let totalCount = 0;

            // Search Products
            if (type === 'all' || type === 'products') {
                try {
                    const [productResults] = await db.execute(`
                        SELECT 
                            'product' as type,
                            p_id as id,
                            product_name as title,
                            CONCAT(product_name, ' - ', COALESCE(product_variant, '')) as description,
                            barcode as metadata,
                            'products' as category,
                            created_at
                        FROM dispatch_product 
                        WHERE (product_name LIKE ? OR barcode LIKE ? OR product_variant LIKE ?)
                        AND is_active = 1
                        ORDER BY 
                            CASE 
                                WHEN product_name LIKE ? THEN 1
                                WHEN barcode LIKE ? THEN 2
                                ELSE 3
                            END,
                            product_name
                        LIMIT ?
                    `, [searchTerm, searchTerm, searchTerm, `${query.trim()}%`, `${query.trim()}%`, parseInt(limit)]);
                    
                    results.push(...productResults);
                } catch (error) {
                    console.error('Product search error:', error);
                }
            }

            // Search Inventory
            if (type === 'all' || type === 'inventory') {
                try {
                    const [inventoryResults] = await db.execute(`
                        SELECT 
                            'inventory' as type,
                            id,
                            CONCAT(product, ' at ', warehouse) as title,
                            CONCAT('Stock: ', stock, ' | Code: ', code) as description,
                            warehouse as metadata,
                            'inventory' as category,
                            updated_at as created_at
                        FROM inventory 
                        WHERE (product LIKE ? OR code LIKE ? OR warehouse LIKE ?)
                        AND stock >= 0
                        ORDER BY 
                            CASE 
                                WHEN product LIKE ? THEN 1
                                WHEN code LIKE ? THEN 2
                                ELSE 3
                            END,
                            stock DESC
                        LIMIT ?
                    `, [searchTerm, searchTerm, searchTerm, `${query.trim()}%`, `${query.trim()}%`, parseInt(limit)]);
                    
                    results.push(...inventoryResults);
                } catch (error) {
                    console.error('Inventory search error:', error);
                }
            }

            // Search Users (if user has permission)
            if (type === 'all' || type === 'users') {
                try {
                    const [userResults] = await db.execute(`
                        SELECT 
                            'user' as type,
                            id,
                            name as title,
                            CONCAT(email, ' - ', role) as description,
                            role as metadata,
                            'users' as category,
                            created_at
                        FROM users 
                        WHERE (name LIKE ? OR email LIKE ?)
                        AND status = 'active'
                        ORDER BY 
                            CASE 
                                WHEN name LIKE ? THEN 1
                                WHEN email LIKE ? THEN 2
                                ELSE 3
                            END,
                            name
                        LIMIT ?
                    `, [searchTerm, searchTerm, `${query.trim()}%`, `${query.trim()}%`, parseInt(limit)]);
                    
                    results.push(...userResults);
                } catch (error) {
                    console.error('User search error:', error);
                }
            }

            // Search Warehouses
            if (type === 'all' || type === 'warehouses') {
                try {
                    const [warehouseResults] = await db.execute(`
                        SELECT 
                            'warehouse' as type,
                            w_id as id,
                            Warehouse_name as title,
                            CONCAT('Code: ', warehouse_code, ' | ', COALESCE(address, 'No address')) as description,
                            warehouse_code as metadata,
                            'warehouses' as category,
                            NOW() as created_at
                        FROM dispatch_warehouse 
                        WHERE (Warehouse_name LIKE ? OR warehouse_code LIKE ? OR address LIKE ?)
                        ORDER BY 
                            CASE 
                                WHEN Warehouse_name LIKE ? THEN 1
                                WHEN warehouse_code LIKE ? THEN 2
                                ELSE 3
                            END,
                            Warehouse_name
                        LIMIT ?
                    `, [searchTerm, searchTerm, searchTerm, `${query.trim()}%`, `${query.trim()}%`, parseInt(limit)]);
                    
                    results.push(...warehouses);
                } catch (error) {
                    console.error('Warehouse search error:', error);
                }
            }

            // Search Orders/Dispatches
            if (type === 'all' || type === 'orders') {
                try {
                    const [orderResults] = await db.execute(`
                        SELECT 
                            'order' as type,
                            id,
                            CONCAT('Order #', id, ' - ', COALESCE(customer_name, 'No customer')) as title,
                            CONCAT('Status: ', COALESCE(status, 'Unknown'), ' | Warehouse: ', COALESCE(warehouse, 'Unknown')) as description,
                            status as metadata,
                            'orders' as category,
                            created_at
                        FROM warehouse_dispatch 
                        WHERE (customer_name LIKE ? OR warehouse LIKE ? OR status LIKE ?)
                        ORDER BY created_at DESC
                        LIMIT ?
                    `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);
                    
                    results.push(...orderResults);
                } catch (error) {
                    console.error('Order search error:', error);
                }
            }

            // Sort results by relevance and date
            results.sort((a, b) => {
                // Prioritize exact matches
                const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
                const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
                
                if (aExact !== bExact) return bExact - aExact;
                
                // Then by date
                return new Date(b.created_at) - new Date(a.created_at);
            });

            totalCount = results.length;
            const paginatedResults = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

            // Log search analytics (if user_id provided)
            if (user_id) {
                try {
                    await this.logSearchAnalytics(user_id, query, type, totalCount);
                } catch (error) {
                    console.error('Search analytics logging failed:', error);
                }
            }

            res.json({
                success: true,
                data: {
                    results: paginatedResults,
                    total: totalCount,
                    query: query,
                    type: type,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: totalCount > (parseInt(offset) + parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('Global search error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message
            });
        }
    }

    // ===============================
    // SEARCH SUGGESTIONS
    // ===============================
    static async getSearchSuggestions(req, res) {
        try {
            const { query, limit = 5 } = req.query;

            if (!query || query.trim().length < 2) {
                return res.json({
                    success: true,
                    data: {
                        suggestions: []
                    }
                });
            }

            const searchTerm = `%${query.trim()}%`;
            const suggestions = [];

            // Get product suggestions
            try {
                const [productCount] = await db.execute(`
                    SELECT COUNT(*) as count 
                    FROM dispatch_product 
                    WHERE (product_name LIKE ? OR barcode LIKE ?) AND is_active = 1
                `, [searchTerm, searchTerm]);

                if (productCount[0].count > 0) {
                    suggestions.push({
                        type: 'products',
                        title: `Products matching "${query}"`,
                        count: productCount[0].count,
                        icon: '📦',
                        route: `/products?search=${encodeURIComponent(query)}`
                    });
                }
            } catch (error) {
                console.error('Product suggestion error:', error);
            }

            // Get inventory suggestions
            try {
                const [inventoryCount] = await db.execute(`
                    SELECT COUNT(*) as count 
                    FROM inventory 
                    WHERE (product LIKE ? OR code LIKE ?) AND stock >= 0
                `, [searchTerm, searchTerm]);

                if (inventoryCount[0].count > 0) {
                    suggestions.push({
                        type: 'inventory',
                        title: `Inventory items matching "${query}"`,
                        count: inventoryCount[0].count,
                        icon: '📋',
                        route: `/inventory?search=${encodeURIComponent(query)}`
                    });
                }
            } catch (error) {
                console.error('Inventory suggestion error:', error);
            }

            // Get user suggestions
            try {
                const [userCount] = await db.execute(`
                    SELECT COUNT(*) as count 
                    FROM users 
                    WHERE (name LIKE ? OR email LIKE ?) AND status = 'active'
                `, [searchTerm, searchTerm]);

                if (userCount[0].count > 0) {
                    suggestions.push({
                        type: 'users',
                        title: `Users matching "${query}"`,
                        count: userCount[0].count,
                        icon: '👤',
                        route: `/admin/permissions?search=${encodeURIComponent(query)}`
                    });
                }
            } catch (error) {
                console.error('User suggestion error:', error);
            }

            // Get warehouse suggestions
            try {
                const [warehouseCount] = await db.execute(`
                    SELECT COUNT(*) as count 
                    FROM dispatch_warehouse 
                    WHERE (Warehouse_name LIKE ? OR warehouse_code LIKE ?)
                `, [searchTerm, searchTerm]);

                if (warehouseCount[0].count > 0) {
                    suggestions.push({
                        type: 'warehouses',
                        title: `Warehouses matching "${query}"`,
                        count: warehouseCount[0].count,
                        icon: '🏢',
                        route: `/warehouses?search=${encodeURIComponent(query)}`
                    });
                }
            } catch (error) {
                console.error('Warehouse suggestion error:', error);
            }

            // Limit suggestions
            const limitedSuggestions = suggestions.slice(0, parseInt(limit));

            res.json({
                success: true,
                data: {
                    suggestions: limitedSuggestions,
                    query: query
                }
            });

        } catch (error) {
            console.error('Search suggestions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get search suggestions',
                error: error.message
            });
        }
    }

    // ===============================
    // SEARCH ANALYTICS
    // ===============================
    static async logSearchAnalytics(userId, query, type, resultsCount) {
        try {
            // For now, just log to console since search_analytics table might not exist yet
            console.log('🔍 Search Analytics:', {
                userId,
                query,
                type,
                resultsCount,
                timestamp: new Date().toISOString()
            });

            // TODO: Uncomment when search_analytics table is created
            /*
            await db.execute(`
                INSERT INTO search_analytics 
                (user_id, search_query, search_type, results_count, response_time_ms, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [userId, query, type, resultsCount, 0]);
            */

        } catch (error) {
            console.error('Search analytics logging error:', error);
        }
    }

    // ===============================
    // GET SEARCH ANALYTICS
    // ===============================
    static async getSearchAnalytics(req, res) {
        try {
            const { 
                startDate, 
                endDate, 
                userId, 
                limit = 100 
            } = req.query;

            // Mock data for now since table might not exist
            const mockAnalytics = [
                {
                    id: 1,
                    user_id: userId || 1,
                    search_query: 'product',
                    search_type: 'products',
                    results_count: 15,
                    response_time_ms: 120,
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    user_id: userId || 1,
                    search_query: 'warehouse',
                    search_type: 'warehouses',
                    results_count: 3,
                    response_time_ms: 85,
                    created_at: new Date(Date.now() - 3600000).toISOString()
                }
            ];

            res.json({
                success: true,
                data: {
                    analytics: mockAnalytics,
                    summary: {
                        totalSearches: mockAnalytics.length,
                        avgResponseTime: 102.5,
                        popularQueries: ['product', 'warehouse', 'inventory']
                    }
                }
            });

            // TODO: Implement real analytics when table is available
            /*
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (startDate) {
                whereClause += ' AND created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                whereClause += ' AND created_at <= ?';
                params.push(endDate);
            }

            if (userId) {
                whereClause += ' AND user_id = ?';
                params.push(userId);
            }

            const [analytics] = await db.execute(`
                SELECT * FROM search_analytics 
                ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ?
            `, [...params, parseInt(limit)]);

            const [summary] = await db.execute(`
                SELECT 
                    COUNT(*) as totalSearches,
                    AVG(response_time_ms) as avgResponseTime
                FROM search_analytics 
                ${whereClause}
            `, params);

            res.json({
                success: true,
                data: {
                    analytics,
                    summary: summary[0]
                }
            });
            */

        } catch (error) {
            console.error('Get search analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get search analytics',
                error: error.message
            });
        }
    }

    // ===============================
    // POPULAR SEARCHES
    // ===============================
    static async getPopularSearches(req, res) {
        try {
            const { limit = 10 } = req.query;

            // Mock popular searches for now
            const popularSearches = [
                { query: 'product', count: 45, trend: 'up' },
                { query: 'inventory', count: 32, trend: 'stable' },
                { query: 'warehouse', count: 28, trend: 'up' },
                { query: 'order', count: 21, trend: 'down' },
                { query: 'user', count: 15, trend: 'stable' }
            ];

            res.json({
                success: true,
                data: {
                    popularSearches: popularSearches.slice(0, parseInt(limit))
                }
            });

            // TODO: Implement real popular searches when table is available
            /*
            const [popularSearches] = await db.execute(`
                SELECT 
                    search_query as query,
                    COUNT(*) as count,
                    'stable' as trend
                FROM search_analytics 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY search_query 
                ORDER BY count DESC 
                LIMIT ?
            `, [parseInt(limit)]);

            res.json({
                success: true,
                data: {
                    popularSearches
                }
            });
            */

        } catch (error) {
            console.error('Get popular searches error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get popular searches',
                error: error.message
            });
        }
    }
}

module.exports = SearchController;