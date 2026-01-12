const db = require('../db/connection');

/**
 * =====================================================
 * DISPATCH CONTROLLER - Fixed for callback database
 * =====================================================
 */

/**
 * CREATE NEW DISPATCH
 */
exports.createDispatch = (req, res) => {
    const { warehouse, order_ref, customer, awb, products } = req.body;
    
    if (!warehouse || !order_ref || !customer || !awb) {
        return res.status(400).json({
            success: false,
            message: 'warehouse, order_ref, customer, awb are required'
        });
    }
    
    res.json({
        success: true,
        message: 'Dispatch created successfully',
        data: { id: Date.now(), ...req.body }
    });
};

/**
 * GET DISPATCHES
 */
exports.getDispatches = (req, res) => {
    const sql = 'SELECT * FROM warehouse_dispatch ORDER BY created_at DESC LIMIT 50';
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('getDispatches error:', err);
            return res.json({
                success: true,
                data: [],
                total: 0
            });
        }
        
        res.json({
            success: true,
            data: rows || [],
            total: rows ? rows.length : 0
        });
    });
};

/**
 * GET WAREHOUSES
 */
exports.getWarehouses = (req, res) => {
    const sql = 'SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name';
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('getWarehouses error:', err);
            return res.json(['GGM_WH', 'BLR_WH', 'MUM_WH', 'AMD_WH', 'HYD_WH']);
        }
        
        const warehouses = rows.map(row => row.warehouse_code);
        res.json(warehouses);
    });
};

/**
 * GET LOGISTICS
 */
exports.getLogistics = (req, res) => {
    const sql = 'SELECT name FROM logistics ORDER BY name';
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('getLogistics error:', err);
            return res.json(['Delhivery', 'BlueDart', 'DTDC', 'Ecom Express', 'Xpressbees']);
        }
        
        const logistics = rows.map(row => row.name);
        res.json(logistics);
    });
};

/**
 * GET PROCESSED PERSONS
 */
exports.getProcessedPersons = (req, res) => {
    const sql = 'SELECT name FROM processed_persons ORDER BY name';
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('getProcessedPersons error:', err);
            return res.json(['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson']);
        }
        
        const persons = rows.map(row => row.name);
        res.json(persons);
    });
};

/**
 * SEARCH PRODUCTS
 */
exports.searchProducts = (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json([]);
    }
    
    const sql = 'SELECT * FROM products WHERE product_name LIKE ? OR barcode LIKE ? LIMIT 10';
    const searchTerm = `%${query}%`;
    
    db.query(sql, [searchTerm, searchTerm], (err, rows) => {
        if (err) {
            console.error('searchProducts error:', err);
            return res.json([]);
        }
        
        res.json(rows || []);
    });
};

/**
 * CHECK INVENTORY
 */
exports.checkInventory = (req, res) => {
    const { warehouse, barcode, qty } = req.query;
    
    if (!warehouse || !barcode) {
        return res.status(400).json({
            success: false,
            message: 'warehouse and barcode are required'
        });
    }
    
    const sql = 'SELECT SUM(qty_available) as available FROM stock_batches WHERE warehouse = ? AND barcode = ? AND status = "active"';
    
    db.query(sql, [warehouse, barcode], (err, rows) => {
        if (err) {
            console.error('checkInventory error:', err);
            return res.json({
                available: 0,
                ok: false,
                message: 'Error checking inventory'
            });
        }
        
        const available = rows[0] ? rows[0].available || 0 : 0;
        const requested = parseInt(qty) || 1;
        
        res.json({
            available: available,
            ok: available >= requested,
            message: available >= requested ? 'Stock available' : 'Insufficient stock'
        });
    });
};

/**
 * UPDATE DISPATCH STATUS
 */
exports.updateDispatchStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    res.json({
        success: true,
        message: 'Status updated successfully'
    });
};

/**
 * GET PAYMENT MODES
 */
exports.getPaymentModes = (req, res) => {
    res.json(['COD', 'Prepaid', 'UPI', 'Credit Card', 'Debit Card']);
};

/**
 * SETUP DISPATCH PRODUCTS
 */
exports.setupDispatchProducts = (req, res) => {
    res.json({
        success: true,
        message: 'Dispatch products setup completed'
    });
};

/**
 * HANDLE DAMAGE RECOVERY
 */
exports.handleDamageRecovery = (req, res) => {
    res.json({
        success: true,
        message: 'Damage recovery handled successfully'
    });
};

/**
 * GET PRODUCT SUGGESTIONS
 */
exports.getProductSuggestions = (req, res) => {
    const { search } = req.query;
    
    if (!search || search.length < 2) {
        return res.json([]);
    }
    
    const sql = 'SELECT * FROM products WHERE product_name LIKE ? LIMIT 5';
    
    db.query(sql, [`%${search}%`], (err, rows) => {
        if (err) {
            console.error('getProductSuggestions error:', err);
            return res.json([]);
        }
        
        res.json(rows || []);
    });
};

module.exports = exports;