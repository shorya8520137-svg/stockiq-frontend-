const express = require('express');
const router = express.Router();
const DispatchController = require('../controllers/dispatchController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All dispatch routes require authentication
router.use(authMiddleware);

// Get warehouses
router.get('/warehouses', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.getWarehouses
);

// Get logistics providers
router.get('/logistics', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.getLogistics
);

// Get processed persons (executives)
router.get('/processed-persons', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.getProcessedPersons
);

// Search products
router.get('/search-products', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.searchProducts
);

// Create dispatch (beta endpoint for compatibility)
router.post('/dispatch-beta/create', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.createDispatch
);

// Create dispatch (standard endpoint)
router.post('/', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.createDispatch
);

// Get dispatch by ID
router.get('/:id', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.getDispatchById
);

// Get all dispatches
router.get('/', 
    permissionMiddleware('operations.dispatch'),
    DispatchController.getAllDispatches
);

module.exports = router;