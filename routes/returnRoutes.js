const express = require('express');
const router = express.Router();
const ReturnController = require('../controllers/returnController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All return routes require authentication
router.use(authMiddleware);

// Create return
router.post('/', 
    permissionMiddleware('operations.return'),
    ReturnController.createReturn
);

// Get warehouse suggestions
router.get('/suggest/warehouses', 
    permissionMiddleware('operations.return'),
    ReturnController.getWarehouseSuggestions
);

// Get product suggestions
router.get('/suggest/products', 
    permissionMiddleware('operations.return'),
    ReturnController.getProductSuggestions
);

// Get returns history
router.get('/', 
    permissionMiddleware('operations.return'),
    ReturnController.getReturns
);

// Update return status
router.put('/:returnId/status', 
    permissionMiddleware('operations.return'),
    ReturnController.updateReturnStatus
);

// Get return statistics
router.get('/statistics', 
    permissionMiddleware('operations.return'),
    ReturnController.getReturnStatistics
);

module.exports = router;