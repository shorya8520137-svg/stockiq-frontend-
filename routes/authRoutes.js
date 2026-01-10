const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }
    
    const jwt = require('jsonwebtoken');
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// ================= AUTHENTICATION ROUTES ================= //

// POST /api/auth/login - User login
router.post('/login', AuthController.login);

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, AuthController.logout);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', AuthController.refreshToken);

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, AuthController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, AuthController.updateProfile);

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticateToken, AuthController.changePassword);

module.exports = router;