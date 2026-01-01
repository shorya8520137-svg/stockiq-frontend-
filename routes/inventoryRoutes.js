const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All inventory routes require authentication
router.use(authMiddleware);

// Get inventory by warehouse
router.get('/by-warehouse', 
    permissionMiddleware('inventory.view'),
    InventoryController.getByWarehouse
);

// Get product tracking by barcode
router.get('/product-tracking/:barcode', 
    permissionMiddleware('inventory.view'),
    InventoryController.getProductTracking
);

// Create or update inventory item
router.post('/', 
    permissionMiddleware('inventory.create'),
    InventoryController.createOrUpdate
);

// Transfer inventory between warehouses
router.post('/transfer', 
    permissionMiddleware('inventory.transfer'),
    InventoryController.transfer
);

// Get warehouses
router.get('/warehouses', 
    permissionMiddleware('inventory.view'),
    InventoryController.getWarehouses
);

module.exports = router;