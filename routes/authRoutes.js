const express = require('express');
const router = express.Router();
const PermissionsController = require('../controllers/permissionsController');

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
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
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
router.post('/login', PermissionsController.login);

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, PermissionsController.logout);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', PermissionsController.refreshToken);

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const db = require('../db/connection');
        
        const [users] = await db.execute(`
            SELECT u.id, u.name, u.email, u.status, u.last_login, u.created_at,
                   r.name as role_name, r.display_name as role_display_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.user.userId]);
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = users[0];
        
        // Get user permissions
        const [permissions] = await db.execute(`
            SELECT p.name, p.display_name, p.category
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ? AND p.is_active = true
        `, [user.role_id]);
        
        res.json({
            success: true,
            data: {
                ...user,
                permissions: permissions.map(p => p.name)
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        const db = require('../db/connection');
        
        await db.execute(`
            UPDATE users SET name = ?, email = ?, updated_at = NOW()
            WHERE id = ?
        `, [name, email, req.user.userId]);
        
        // Log audit
        await PermissionsController.createAuditLog(req.user.userId, 'UPDATE_PROFILE', 'USER', req.user.userId, {
            name, email
        });
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const bcrypt = require('bcrypt');
        const db = require('../db/connection');
        
        // Get current user
        const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify old password
        const isValidPassword = await bcrypt.compare(oldPassword, users[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.execute(`
            UPDATE users SET password_hash = ?, updated_at = NOW()
            WHERE id = ?
        `, [hashedPassword, req.user.userId]);
        
        // Log audit
        await PermissionsController.createAuditLog(req.user.userId, 'CHANGE_PASSWORD', 'USER', req.user.userId, {});
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

module.exports = router;