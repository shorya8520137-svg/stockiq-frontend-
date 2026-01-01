const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All order routes require authentication
router.use(authMiddleware);

// Universal search for orders
router.post('/ordersheet-universal-search', 
    permissionMiddleware('orders.view'),
    OrderController.universalSearch
);

// Get search suggestions
router.get('/ordersheet-suggest', 
    permissionMiddleware('orders.view'),
    OrderController.getSearchSuggestions
);

// Update order remark
router.post('/update-remark', 
    permissionMiddleware('orders.remarks'),
    OrderController.updateRemark
);

// Delete order
router.delete('/delete/:warehouse/:id', 
    permissionMiddleware('orders.delete'),
    OrderController.deleteOrder
);

// Create new order
router.post('/', 
    permissionMiddleware('orders.create'),
    OrderController.createOrder
);

// Get order by ID
router.get('/:id', 
    permissionMiddleware('orders.view'),
    OrderController.getOrderById
);

module.exports = router;