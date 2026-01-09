const db = require('../db/connection');

/**
 * =====================================================
 * TIMELINE CONTROLLER
 * Controller-level fix:
 * - OPENING is a marker only
 * - Only first OPENING per warehouse is considered
 * - OPENING qty NEVER affects stock
 * =====================================================
 */

exports.getProductTimeline = (req, res) => {
    const { productCode } = req.params;
    const { warehouse, dateFrom, dateTo, limit = 50 } = req.query;

    if (!productCode) {
        return res.status(400).json({
            success: false,
            message: 'Product code/barcode is required'
        });
    }

    const filters = ['barcode = ?'];
    const values = [productCode];

    if (warehouse && warehouse !== 'ALL') {
        filters.push('location_code = ?');
        values.push(warehouse);
    }

    if (dateFrom) {
        filters.push('event_time >= ?');
        values.push(`${dateFrom} 00:00:00`);
    }

    if (dateTo) {
        filters.push('event_time <= ?');
        values.push(`${dateTo} 23:59:59`);
    }

    const timelineSql = `
        SELECT
            id,
            event_time AS timestamp,
            movement_type AS type,
            barcode,
            product_name,
            location_code AS warehouse,
            qty AS quantity,
            direction,
            reference
        FROM inventory_ledger_base
        WHERE ${filters.join(' AND ')}
        ORDER BY event_time ASC
        LIMIT ?
    `;

    db.query(timelineSql, [...values, parseInt(limit)], (err, rows) => {
        if (err) {
            console.error('Timeline error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }

        /**
         * ==============================
         * CONTROLLER-LEVEL FIX START
         * ==============================
         * OPENING = initial stock (counted ONCE per warehouse)
         * BULK_UPLOAD = additional stock additions
         */

        const openingSeen = {}; // key = barcode|warehouse
        let runningBalance = 0;
        let openingStock = 0;

        const cleanedTimeline = [];

        for (const row of rows) {
            const key = `${row.barcode}|${row.warehouse}`;
            const qty = parseInt(row.quantity) || 0;

            // Handle OPENING - use as initial stock (only first one per warehouse)
            if (row.type === 'OPENING') {
                if (openingSeen[key]) {
                    continue; // ignore duplicate OPENING
                }

                openingSeen[key] = true;
                openingStock += qty;
                runningBalance += qty; // OPENING sets initial balance

                cleanedTimeline.push({
                    ...row,
                    quantity: qty,
                    balance_after: runningBalance,
                    description: `Opening stock: ${qty} units`
                });

                continue;
            }

            // Normal stock movement
            if (row.direction === 'IN') {
                runningBalance += qty;
            } else if (row.direction === 'OUT') {
                runningBalance -= qty;
            }

            cleanedTimeline.push({
                ...row,
                quantity: qty,
                balance_after: runningBalance,
                description: getTimelineDescription(row)
            });
        }

        /**
         * ==============================
         * SUMMARY
         * ==============================
         */

        const totalIn = cleanedTimeline
            .filter(i => i.direction === 'IN' && i.type !== 'OPENING')
            .reduce((s, i) => s + i.quantity, 0);

        const totalOut = cleanedTimeline
            .filter(i => i.direction === 'OUT')
            .reduce((s, i) => s + i.quantity, 0);

        res.json({
            success: true,
            data: {
                product_code: productCode,
                warehouse_filter: warehouse,
                timeline: cleanedTimeline.reverse(), // newest first
                summary: {
                    opening_stock: openingStock,
                    total_in: totalIn,
                    total_out: totalOut,
                    net_movement: totalIn - totalOut,
                    current_stock: runningBalance,
                    breakdown: {
                        opening: openingStock,
                        bulk_upload: cleanedTimeline
                            .filter(i => i.type === 'BULK_UPLOAD')
                            .reduce((s, i) => s + i.quantity, 0),
                        dispatch: cleanedTimeline
                            .filter(i => i.type === 'DISPATCH')
                            .reduce((s, i) => s + i.quantity, 0),
                        damage: cleanedTimeline
                            .filter(i => i.type === 'DAMAGE')
                            .reduce((s, i) => s + i.quantity, 0),
                        recovery: cleanedTimeline
                            .filter(i => i.type === 'RECOVER')
                            .reduce((s, i) => s + i.quantity, 0),
                        returns: cleanedTimeline
                            .filter(i => i.type === 'RETURN')
                            .reduce((s, i) => s + i.quantity, 0),
                        self_transfer_in: cleanedTimeline
                            .filter(i => i.type === 'SELF_TRANSFER' && i.direction === 'IN')
                            .reduce((s, i) => s + i.quantity, 0),
                        self_transfer_out: cleanedTimeline
                            .filter(i => i.type === 'SELF_TRANSFER' && i.direction === 'OUT')
                            .reduce((s, i) => s + i.quantity, 0)
                    }
                }
            }
        });
    });
};

/**
 * TIMELINE SUMMARY (unchanged)
 */
exports.getTimelineSummary = (req, res) => {
    const { warehouse } = req.query;

    const filters = [];
    const values = [];

    if (warehouse) {
        filters.push('location_code = ?');
        values.push(warehouse);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
        SELECT
            barcode,
            product_name,
            COUNT(*) AS total_movements,
            SUM(CASE WHEN direction='IN' THEN qty ELSE 0 END) AS total_in,
            SUM(CASE WHEN direction='OUT' THEN qty ELSE 0 END) AS total_out
        FROM inventory_ledger_base
        ${whereClause}
        GROUP BY barcode, product_name
        ORDER BY MAX(event_time) DESC
        LIMIT 100
    `;

    db.query(sql, values, (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        res.json({
            success: true,
            data: data.map(d => ({
                ...d,
                net_movement: d.total_in - d.total_out
            }))
        });
    });
};

/**
 * Helper
 */
function getTimelineDescription(item) {
    const qty = item.quantity || 0;

    switch (item.type) {
        case 'BULK_UPLOAD':
            return `Added ${qty} units (bulk upload)`;
        case 'DISPATCH':
            return `Dispatched ${qty} units`;
        case 'DAMAGE':
            return `Damaged ${qty} units`;
        case 'RECOVER':
            return `Recovered ${qty} units`;
        case 'RETURN':
            return `Returned ${qty} units`;
        case 'SELF_TRANSFER':
            return `Self transfer ${qty} units (${item.direction})`;
        default:
            return `${item.type} ${qty} units`;
    }
}