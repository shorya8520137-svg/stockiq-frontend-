const express = require('express');
const router = express.Router();
const selfTransferController = require('../controllers/selfTransferController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all self transfer routes
router.use(authenticateToken);

/**
 * =====================================================
 * SELF TRANSFER ROUTES
 * =====================================================
 */

// Create new self transfer
router.post('/create', selfTransferController.createSelfTransfer);

// Get all self transfers with filters
router.get('/', selfTransferController.getSelfTransfers);

module.exports = router;