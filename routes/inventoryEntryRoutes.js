const express = require('express');
const router = express.Router();
const InventoryEntryController = require('../controllers/inventoryEntryController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All inventory entry routes require authentication
router.use(authMiddleware);

// Get warehouse suggestions
router.get('/warehouses/suggest', 
    permissionMiddleware('inventory.bulk_upload'),
    InventoryEntryController.getWarehouseSuggestions
);

// Process bulk inventory upload
router.post('/inventory-entry', 
    permissionMiddleware('inventory.bulk_upload'),
    InventoryEntryController.getUploadMiddleware(),
    InventoryEntryController.processInventoryUpload
);

// Get upload history
router.get('/upload-history', 
    permissionMiddleware('inventory.bulk_upload'),
    InventoryEntryController.getUploadHistory
);

module.exports = router;