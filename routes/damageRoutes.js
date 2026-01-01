const express = require('express');
const router = express.Router();
const DamageController = require('../controllers/damageController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All damage routes require authentication
router.use(authMiddleware);

// Process damage or recovery
router.post('/damage', 
    permissionMiddleware('operations.damage'),
    DamageController.processDamage
);

// Get damage/recovery history
router.get('/history', 
    permissionMiddleware('operations.damage'),
    DamageController.getHistory
);

// Get damage/recovery statistics
router.get('/statistics', 
    permissionMiddleware('operations.damage'),
    DamageController.getStatistics
);

module.exports = router;