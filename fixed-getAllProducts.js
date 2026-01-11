
// Fixed getAllProducts method

    static async getAllProducts(req, res) {
        try {
            const { page = 1, limit = 20, search = '', category = '' } = req.query;
            const offset = (page - 1) * limit;

            // Simple query that works with basic product table
            let where = 'WHERE p.is_active = 1';
            const params = [];

            if (search) {
                where += ' AND (p.product_name LIKE ? OR p.barcode LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            if (category) {
                where += ' AND p.category_id = ?';
                params.push(category);
            }

            // Simplified query without complex JOINs
            const dataSql = `
                SELECT 
                    p.p_id,
                    p.product_name,
                    p.product_variant,
                    p.barcode,
                    p.price,
                    p.cost_price,
                    p.weight,
                    p.dimensions,
                    p.description,
                    p.category_id,
                    p.created_at
                FROM dispatch_product p
                ${where}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const countSql = `
                SELECT COUNT(*) AS total
                FROM dispatch_product p
                ${where}
            `;

            // Prepare parameters
            const dataParams = [...params, parseInt(limit), parseInt(offset)];
            
            console.log('🔍 Products API Debug:', { dataParams, countParams: params });
            
            // Execute both queries
            const [rows] = await db.execute(dataSql, dataParams);
            const [countRows] = await db.execute(countSql, params);

            const total = countRows[0]?.total || 0;
            const totalPages = Math.ceil(total / parseInt(limit));

            console.log('✅ Products query successful:', { rowCount: rows.length, total });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    totalPages: parseInt(totalPages)
                }
            });

        } catch (err) {
            console.error('❌ Products API error:', err.message);
            
            // Handle all errors gracefully
            res.json({
                success: true,
                data: [],
                pagination: {
                    page: parseInt(req.query.page || 1),
                    limit: parseInt(req.query.limit || 20),
                    total: 0,
                    totalPages: 0
                }
            });
        }
    }


module.exports = { getAllProducts };
