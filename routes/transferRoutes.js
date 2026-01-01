const express = require('express');
const router = express.Router();
const TransferController = require('../controllers/transferController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All transfer routes require authentication
router.use(authMiddleware);

// Create FIFO transfer
router.post('/fifo', 
    permissionMiddleware('inventory.transfer'),
    TransferController.createFIFOTransfer
);

// Get transfer history
router.get('/history', 
    permissionMiddleware('inventory.transfer'),
    TransferController.getTransferHistory
);

// Get transfer by ID
router.get('/:transferId', 
    permissionMiddleware('inventory.transfer'),
    TransferController.getTransferById
);

// Get transfer statistics
router.get('/statistics', 
    permissionMiddleware('inventory.transfer'),
    TransferController.getTransferStatistics
);

// Get warehouse stock for transfer planning
router.get('/warehouse-stock', 
    permissionMiddleware('inventory.transfer'),
    TransferController.getWarehouseStockForTransfer
);

module.exports = router;