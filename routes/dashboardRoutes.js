const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All dashboard routes require authentication
router.use(authMiddleware);

// Get KPIs
router.get('/kpis', 
    permissionMiddleware('dashboard.view'),
    DashboardController.getKPIs
);

// Get revenue vs cost data
router.get('/revenue-cost', 
    permissionMiddleware('dashboard.analytics'),
    DashboardController.getRevenueCost
);

// Get warehouse volume data
router.get('/warehouse-volume', 
    permissionMiddleware('dashboard.analytics'),
    DashboardController.getWarehouseVolume
);

// Get recent activity
router.get('/activity', 
    permissionMiddleware('dashboard.view'),
    DashboardController.getActivity
);

// Get dispatch heatmap data
router.get('/dispatch-heatmap', 
    permissionMiddleware('dashboard.analytics'),
    DashboardController.getDispatchHeatmap
);

// Get system statistics
router.get('/stats', 
    permissionMiddleware('dashboard.view'),
    DashboardController.getSystemStats
);

module.exports = router;