const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/refresh', authMiddleware, AuthController.refreshToken);

module.exports = router;