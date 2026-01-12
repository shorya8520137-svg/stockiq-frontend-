const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY AUTH FIX - Bypassing database temporarily');

// Create a temporary auth controller that works without database
const tempAuthController = `const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
    // ===============================================
    // TEMPORARY LOGIN (NO DATABASE)
    // ===============================================
    static login(req, res) {
        const { email, password } = req.body;
        
        console.log('🔍 TEMP LOGIN ATTEMPT:', { email, password: '***' });
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        // Hardcoded credentials for emergency access
        const validCredentials = [
            { email: 'admin@hunyhuny.com', password: 'gfx998sd', role: 'super_admin' },
            { email: 'test@hunyhuny.com', password: 'admin123', role: 'admin' }
        ];
        
        const user = validCredentials.find(u => u.email === email && u.password === password);
        
        if (!user) {
            console.log('❌ TEMP LOGIN FAILED: Invalid credentials');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: 1, 
                email: user.email, 
                role: user.role,
                roleId: 1
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        console.log('✅ TEMP LOGIN SUCCESS:', user.email);
        
        res.json({
            success: true,
            message: 'Login successful (temporary mode)',
            token,
            user: {
                id: 1,
                name: 'Admin User',
                email: user.email,
                role: user.role,
                roleDisplayName: 'Administrator',
                permissions: ['all'] // Grant all permissions temporarily
            }
        });
    }

    // ===============================================
    // USER LOGOUT
    // ===============================================
    static async logout(req, res) {
        try {
            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // ===============================================
    // REFRESH TOKEN
    // ===============================================
    static async refreshToken(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token required'
                });
            }
            
            // Verify token (even if expired)
            const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
            
            // Generate new token
            const newToken = jwt.sign(
                { 
                    userId: decoded.userId, 
                    email: decoded.email, 
                    role: decoded.role,
                    roleId: decoded.roleId
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            
            res.json({
                success: true,
                token: newToken
            });
            
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    }

    // ===============================================
    // GET USER PROFILE
    // ===============================================
    static async getProfile(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    id: 1,
                    name: 'Admin User',
                    email: req.user.email,
                    role: req.user.role,
                    permissions: ['all']
                }
            });
            
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user profile'
            });
        }
    }
}

module.exports = AuthController;
`;

// Backup original auth controller
const originalPath = path.join(__dirname, 'controllers', 'authController.js');
const backupPath = path.join(__dirname, 'controllers', 'authController.js.backup');

if (fs.existsSync(originalPath)) {
    fs.copyFileSync(originalPath, backupPath);
    console.log('✅ Backed up original auth controller');
}

// Write temporary auth controller
fs.writeFileSync(originalPath, tempAuthController);
console.log('✅ Installed temporary auth controller');

console.log('🔄 Restarting server...');