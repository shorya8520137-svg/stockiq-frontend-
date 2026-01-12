const db = require('../db/connection');

/**
 * =====================================================
 * ADD STOCK (OPENING / PURCHASE / RETURN)
 * =====================================================
 */
exports.addStock = async (req, res) => {
    const {
        product_name,
        barcode,
        variant,
        warehouse,
        qty,
        unit_cost = 0,
        source_type = 'OPENING'
    } = req.body;

    if (!product_name || !barcode || !warehouse || !qty) {
        return res.status(400).json({
            success: false,
            message: 'product_name, barcode, warehouse, qty are required'
        });
    }

    const quantity = Number(qty);
    if (quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'qty must be greater than 0'
        });
    }

    const reference = `${source_type}_${barcode}_${Date.now()}`;

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        const ledgerSql = `
            INSERT INTO inventory_ledger_base (
                event_time,
                movement_type,
                barcode,
                product_name,
                location_code,
                qty,
                direction,
                reference
            ) VALUES (NOW(), ?, ?, ?, ?, ?, 'IN', ?)
        `;

        db.query(ledgerSql, [
            source_type, barcode, product_name, warehouse, quantity, reference
        ], err => {
            if (err) {
                return db.rollback(() =>
                    res.status(500).json({ success: false, error: err.sqlMessage })
                );
            }

            const batchSql = `
                INSERT INTO stock_batches (
                    product_name,
                    barcode,
                    variant,
                    warehouse,
                    source_type,
                    qty_initial,
                    qty_available,
                    unit_cost,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `;

            db.query(batchSql, [
                product_name,
                barcode,
                variant || null,
                warehouse,
                source_type,
                quantity,
                quantity,
                unit_cost
            ], err => {
                if (err) {
                    return db.rollback(() =>
                        res.status(500).json({ success: false, error: err.sqlMessage })
                    );
                }

                db.commit(err => {
                    if (err) {
                        return db.rollback(() =>
                            res.status(500).json({ success: false, message: err.message })
                        );
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Stock added successfully',
                        reference
                    });
                });
            });
        });
    });
};

/**
 * =====================================================
 * GET INVENTORY (PAGINATION + DATE FILTER)
 * =====================================================
 */
exports.getInventory = async (req, res) => {
    const {
        warehouse,
        page = 1,
        limit = 20,
        dateFrom,
        dateTo,
        search,
        stockFilter,
        sortBy = 'product_name',
        sortOrder = 'asc'
    } = req.query;

    console.log('📦 Inventory API called with filters:', req.query);
    console.log('📦 Request headers:', req.headers);

    const filters = [`status = 'active'`];
    const values = [];

    // Warehouse filter
    if (warehouse) {
        filters.push('warehouse = ?');
        values.push(warehouse);
        console.log('🏢 Filtering by warehouse:', warehouse);
    }

    // Date filters
    if (dateFrom) {
        filters.push('created_at >= ?');
        values.push(`${dateFrom} 00:00:00`);
        console.log('📅 Date from:', dateFrom);
    }

    if (dateTo) {
        filters.push('created_at <= ?');
        values.push(`${dateTo} 23:59:59`);
        console.log('📅 Date to:', dateTo);
    }

    // Search filter
    if (search) {
        filters.push('(product_name LIKE ? OR barcode LIKE ? OR variant LIKE ?)');
        const searchTerm = `%${search}%`;
        values.push(searchTerm, searchTerm, searchTerm);
        console.log('🔍 Search term:', search);
    }

    const offset = (page - 1) * limit;

    // Base SQL for grouped results
    let sql = `
        SELECT
            barcode,
            product_name,
            variant,
            warehouse,
            SUM(qty_available) AS stock,
            MAX(created_at) AS updated_at
        FROM stock_batches
        WHERE ${filters.join(' AND ')}
        GROUP BY barcode, product_name, variant, warehouse
    `;

    // Stock filter (applied after GROUP BY)
    if (stockFilter && stockFilter !== 'all') {
        switch (stockFilter) {
            case 'in-stock':
                sql += ' HAVING SUM(qty_available) > 10';
                break;
            case 'low-stock':
                sql += ' HAVING SUM(qty_available) > 0 AND SUM(qty_available) <= 10';
                break;
            case 'out-of-stock':
                sql += ' HAVING SUM(qty_available) = 0';
                break;
        }
    }

    // Sorting
    const validSortFields = ['product_name', 'stock', 'warehouse', 'updated_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        const sortColumn = sortBy === 'stock' ? 'SUM(qty_available)' : sortBy;
        sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    } else {
        sql += ' ORDER BY product_name ASC';
    }

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    values.push(Number(limit), Number(offset));

    console.log('🔍 Final SQL:', sql);
    console.log('🔍 Values:', values);

    // Test database connection first
    console.log('🔌 Testing database connection...');
    db.query('SELECT 1 as test', (testErr, testResult) => {
        if (testErr) {
            console.error('❌ Database connection test failed:', testErr);
            return res.status(500).json({
                success: false,
                error: 'Database connection failed',
                details: testErr.message
            });
        }

        console.log('✅ Database connection test passed:', testResult);

        // Now execute the main query
        db.query(sql, values, (err, rows) => {
            if (err) {
                console.error('❌ Inventory query error:', err);
                return res.status(500).json({
                    success: false,
                    error: err.sqlMessage || err.message,
                    sql: sql,
                    values: values
                });
            }

            console.log('✅ Query executed successfully');
            console.log('📊 Raw query result:', rows);
            console.log('📊 Result count:', rows ? rows.length : 0);

            // Handle empty results
            if (!rows || rows.length === 0) {
                console.log('⚠️ No data found, returning empty result');
                return res.json({
                    success: true,
                    data: [],
                    total: 0,
                    stats: {
                        totalProducts: 0,
                        totalStock: 0,
                        lowStockItems: 0,
                        outOfStockItems: 0
                    },
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: 0
                    },
                    debug: {
                        sql: sql,
                        values: values,
                        filters: filters
                    }
                });
            }

            // Calculate stats
            const totalProducts = rows.length;
            const totalStock = rows.reduce((sum, item) => sum + parseInt(item.stock || 0), 0);
            const lowStockItems = rows.filter(item => parseInt(item.stock || 0) > 0 && parseInt(item.stock || 0) <= 10).length;
            const outOfStockItems = rows.filter(item => parseInt(item.stock || 0) === 0).length;

            console.log('📊 Calculated stats:', { totalProducts, totalStock, lowStockItems, outOfStockItems });

            res.json({
                success: true,
                data: rows,
                total: totalProducts,
                stats: {
                    totalProducts,
                    totalStock,
                    lowStockItems,
                    outOfStockItems
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalProducts / limit)
                }
            });
        });
    });
};

/**
 * =====================================================
 * GET INVENTORY BY WAREHOUSE (DATE FILTER ADDED)
 * =====================================================
 */
exports.getInventoryByWarehouse = async (req, res) => {
    const { warehouse, dateFrom, dateTo } = req.query;

    if (!warehouse) {
        return res.status(400).json({
            success: false,
            message: 'warehouse is required'
        });
    }

    const filters = ['warehouse = ?', "status = 'active'"];
    const values = [warehouse];

    if (dateFrom) {
        filters.push('created_at >= ?');
        values.push(`${dateFrom} 00:00:00`);
    }

    if (dateTo) {
        filters.push('created_at <= ?');
        values.push(`${dateTo} 23:59:59`);
    }

    const sql = `
        SELECT
            barcode,
            product_name AS product,
            warehouse,
            SUM(qty_available) AS stock,
            MAX(created_at) AS updated_at
        FROM stock_batches
        WHERE ${filters.join(' AND ')}
        GROUP BY barcode, product_name, warehouse
        ORDER BY product_name
    `;

    db.query(sql, values, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json(rows);
    });
};

/**
 * =====================================================
 * EXPORT INVENTORY
 * =====================================================
 */
exports.exportInventory = async (req, res) => {
    const {
        warehouse,
        dateFrom,
        dateTo,
        search,
        stockFilter
    } = req.query;

    const filters = [`status = 'active'`];
    const values = [];

    if (warehouse) {
        filters.push('warehouse = ?');
        values.push(warehouse);
    }

    if (dateFrom) {
        filters.push('created_at >= ?');
        values.push(`${dateFrom} 00:00:00`);
    }

    if (dateTo) {
        filters.push('created_at <= ?');
        values.push(`${dateTo} 23:59:59`);
    }

    if (search) {
        filters.push('(product_name LIKE ? OR barcode LIKE ? OR variant LIKE ?)');
        const searchTerm = `%${search}%`;
        values.push(searchTerm, searchTerm, searchTerm);
    }

    let sql = `
        SELECT
            barcode,
            product_name,
            variant,
            warehouse,
            SUM(qty_available) AS stock,
            MAX(created_at) AS updated_at
        FROM stock_batches
        WHERE ${filters.join(' AND ')}
        GROUP BY barcode, product_name, variant, warehouse
    `;

    if (stockFilter && stockFilter !== 'all') {
        switch (stockFilter) {
            case 'in-stock':
                sql += ' HAVING SUM(qty_available) > 10';
                break;
            case 'low-stock':
                sql += ' HAVING SUM(qty_available) > 0 AND SUM(qty_available) <= 10';
                break;
            case 'out-of-stock':
                sql += ' HAVING SUM(qty_available) = 0';
                break;
        }
    }

    sql += ' ORDER BY product_name ASC';

    db.query(sql, values, (err, rows) => {
        if (err) {
            console.error('❌ Export query error:', err);
            return res.status(500).json({
                success: false,
                error: err.sqlMessage || err.message
            });
        }

        // Generate CSV
        const csvHeader = 'Product Name,Barcode,Variant,Warehouse,Stock,Last Updated\n';
        const csvRows = rows.map(item => 
            `"${item.product_name}","${item.barcode}","${item.variant || ''}","${item.warehouse}",${item.stock},"${item.updated_at}"`
        ).join('\n');
        
        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="inventory-${warehouse || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    });
};