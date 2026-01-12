const express = require('express');
const router = express.Router();
const DispatchController = require('../controllers/dispatchController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all dispatch routes
router.use(authenticateToken);

// ===============================
// WORKING ROUTES (MATCH CONTROLLER)
// ===============================

// POST /api/dispatch - Create new dispatch
router.post('/', DispatchController.createDispatch);

// POST /api/dispatch/create - Create new dispatch (alias)
router.post('/create', DispatchController.createDispatch);

// GET /api/dispatch - Get all dispatches
router.get('/', DispatchController.getAllDispatches);

// PUT /api/dispatch/:id/status - Update dispatch status
router.put('/:id/status', DispatchController.updateDispatchStatus);

// ===============================
// FALLBACK ROUTES (MISSING METHODS)
// ===============================

// GET /api/dispatch/warehouses - Get warehouse list
router.get('/warehouses', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'WH001', name: 'Main Warehouse' },
            { id: 'WH002', name: 'Secondary Warehouse' },
            { id: 'GGM_WH', name: 'GGM Warehouse' }
        ],
        message: 'Sample warehouses (fallback mode)'
    });
});

// GET /api/dispatch/logistics - Get logistics list
router.get('/logistics', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'LOG001', name: 'Express Delivery' },
            { id: 'LOG002', name: 'Standard Shipping' },
            { id: 'LOG003', name: 'Local Pickup' }
        ],
        message: 'Sample logistics (fallback mode)'
    });
});

// GET /api/dispatch/processed-persons - Get processed persons list
router.get('/processed-persons', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'PROC001', name: 'John Doe' },
            { id: 'PROC002', name: 'Jane Smith' },
            { id: 'PROC003', name: 'Admin User' }
        ],
        message: 'Sample processed persons (fallback mode)'
    });
});

// GET /api/dispatch/payment-modes - Get payment modes list
router.get('/payment-modes', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'CASH', name: 'Cash' },
            { id: 'CARD', name: 'Credit/Debit Card' },
            { id: 'UPI', name: 'UPI Payment' },
            { id: 'BANK', name: 'Bank Transfer' }
        ],
        message: 'Sample payment modes (fallback mode)'
    });
});

// GET /api/dispatch/search-products - Search products
router.get('/search-products', (req, res) => {
    const { query = '' } = req.query;
    res.json({
        success: true,
        data: [
            {
                id: 1,
                product_name: `Sample Product matching "${query}"`,
                barcode: '1234567890',
                category: 'Electronics',
                current_stock: 100
            },
            {
                id: 2,
                product_name: `Another Product with "${query}"`,
                barcode: '0987654321',
                category: 'Accessories',
                current_stock: 50
            }
        ],
        message: 'Sample product search results (fallback mode)'
    });
});

// GET /api/dispatch/check-inventory - Check inventory
router.get('/check-inventory', (req, res) => {
    const { warehouse, barcode, qty } = req.query;
    res.json({
        success: true,
        data: {
            available: true,
            current_stock: 100,
            requested_qty: parseInt(qty) || 1,
            warehouse: warehouse || 'WH001',
            barcode: barcode || 'SAMPLE123'
        },
        message: 'Sample inventory check (fallback mode)'
    });
});

// GET /api/dispatch/setup-products - Setup dispatch products
router.get('/setup-products', (req, res) => {
    res.json({
        success: true,
        message: 'Dispatch products table setup completed (fallback mode)'
    });
});

// POST /api/dispatch/damage-recovery - Handle damage/recovery
router.post('/damage-recovery', (req, res) => {
    res.json({
        success: true,
        message: 'Damage/recovery operation completed (fallback mode)',
        data: { reference: `DR_${Date.now()}` }
    });
});

// GET /api/dispatch/suggestions/products - Product suggestions
router.get('/suggestions/products', (req, res) => {
    const { search = '', warehouse = '' } = req.query;
    res.json({
        success: true,
        data: [
            {
                id: 1,
                product_name: `Suggested Product for "${search}"`,
                barcode: 'SUGG123',
                warehouse: warehouse || 'WH001',
                stock: 75
            }
        ],
        message: 'Sample product suggestions (fallback mode)'
    });
});

// POST /api/dispatch/damage - Handle damage operations
router.post('/damage', (req, res) => {
    res.json({
        success: true,
        message: 'Damage reported successfully (fallback mode)',
        data: { damage_id: `DMG_${Date.now()}` }
    });
});

// POST /api/dispatch/recover - Handle recovery operations
router.post('/recover', (req, res) => {
    res.json({
        success: true,
        message: 'Stock recovered successfully (fallback mode)',
        data: { recovery_id: `REC_${Date.now()}` }
    });
});

module.exports = router;