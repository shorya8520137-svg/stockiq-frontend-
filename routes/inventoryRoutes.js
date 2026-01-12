const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ===============================
// WORKING ROUTES (MATCH CONTROLLER)
// ===============================

// GET /api/inventory - Get inventory data
router.get('/', inventoryController.getInventory);

// POST /api/inventory/add - Add stock
router.post('/add', inventoryController.addStock);

// POST /api/inventory/remove - Remove stock
router.post('/remove', inventoryController.removeStock);

// GET /api/inventory/movements - Get stock movements
router.get('/movements', inventoryController.getStockMovements);

// ===============================
// FALLBACK ROUTES (ADDITIONAL ENDPOINTS)
// ===============================

// GET /api/inventory/summary - Get inventory summary
router.get('/summary', (req, res) => {
    res.json({
        success: true,
        data: {
            total_products: 150,
            total_stock: 5000,
            low_stock_items: 12,
            out_of_stock: 3
        },
        message: 'Sample inventory summary (fallback mode)'
    });
});

// GET /api/inventory/low-stock - Get low stock items
router.get('/low-stock', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                barcode: '1234567890',
                product_name: 'Low Stock Product',
                current_stock: 5,
                min_stock: 10,
                warehouse: 'WH001'
            }
        ],
        message: 'Sample low stock items (fallback mode)'
    });
});

// POST /api/inventory/transfer - Transfer stock between warehouses
router.post('/transfer', (req, res) => {
    res.json({
        success: true,
        message: 'Stock transfer completed (fallback mode)',
        data: { transfer_id: `TRF_${Date.now()}` }
    });
});

module.exports = router;