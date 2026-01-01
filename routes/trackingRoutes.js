const express = require('express');
const router = express.Router();
const TrackingController = require('../controllers/trackingController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All tracking routes require authentication
router.use(authMiddleware);

// Get tracking by AWB
router.get('/:awb', 
    permissionMiddleware('tracking.view'),
    TrackingController.getTrackingByAWB
);

// Get today's tracking progress
router.get('/progress/today', 
    permissionMiddleware('tracking.view'),
    TrackingController.getTodayProgress
);

// Get warehouse dispatch summary
router.get('/warehouse/summary', 
    permissionMiddleware('tracking.view'),
    TrackingController.getWarehouseSummary
);

// Get live tracking updates
router.get('/live/updates', 
    permissionMiddleware('tracking.real_time'),
    TrackingController.getLiveUpdates
);

// Get tracking statistics
router.get('/statistics/overview', 
    permissionMiddleware('tracking.view'),
    TrackingController.getTrackingStatistics
);

module.exports = router;