const express = require('express');
const router = express.Router();
const StockController = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All stock routes require authentication
router.use(authMiddleware);

// Universal stock search
router.get('/search', 
    permissionMiddleware('inventory.view'),
    StockController.searchStock
);

// Get stock details
router.get('/details', 
    permissionMiddleware('inventory.view'),
    StockController.getStockDetails
);

// Get low stock alerts
router.get('/low-stock', 
    permissionMiddleware('inventory.view'),
    StockController.getLowStockAlerts
);

// Get stock summary by warehouse
router.get('/summary', 
    permissionMiddleware('inventory.view'),
    StockController.getStockSummary
);

module.exports = router;