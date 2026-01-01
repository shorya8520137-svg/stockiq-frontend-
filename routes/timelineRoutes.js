const express = require('express');
const router = express.Router();
const TimelineController = require('../controllers/timelineController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All timeline routes require authentication
router.use(authMiddleware);

// Get product timeline by barcode
router.get('/inventory/timeline/:barcode', 
    permissionMiddleware('inventory.view'),
    TimelineController.getProductTimeline
);

// Get inventory timeline summary
router.get('/inventory/summary', 
    permissionMiddleware('inventory.view'),
    TimelineController.getInventoryTimelineSummary
);

// Get warehouse activity timeline
router.get('/warehouse/:warehouse', 
    permissionMiddleware('inventory.view'),
    TimelineController.getWarehouseTimeline
);

// Get system-wide activity timeline
router.get('/system/activities', 
    permissionMiddleware('system.audit_log'),
    TimelineController.getSystemTimeline
);

module.exports = router;