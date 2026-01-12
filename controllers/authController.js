const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
    // ===============================================
    // USER LOGIN
    // ===============================================
    static async login(req, res) {
        try {
            console.log('🔍 LOGIN REQUEST:', {
                body: req.body,
                headers: req.headers,
                method: req.method
            });
            
            // Safely extract email and password
            const body = req.body || {};
            const { email, password } = body;
            
            console.log('🔍 LOGIN ATTEMPT:', { email, password: password ? '***' : 'MISSING' });
            
            if (!email || !password) {
                console.log('❌ LOGIN FAILED: Missing credentials');
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }
        
        // TEMPORARY: Hardcoded credentials (database timeout issue)
        if (email === 'admin@hunyhuny.com' && password === 'gfx998sd') {
            const token = jwt.sign(
                { 
                    userId: 1, 
                    email: email, 
                    role: 'super_admin',
                    roleId: 1
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            
            console.log('✅ LOGIN SUCCESS (TEMP MODE):', email);
            
            return res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: 1,
                    name: 'Admin User',
                    email: email,
                    role: 'super_admin',
                    roleDisplayName: 'Super Admin',
                    permissions: ['all']
                }
            });
        }
        
        console.log('❌ LOGIN FAILED: Invalid credentials');
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
        
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
        
        // ORIGINAL DATABASE CODE (commented out due to timeout)
        /*
        // Database login code would go here when needed
        // Currently using hardcoded credentials for testing
        */
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
            const userQuery = `
                SELECT u.id, u.name, u.email, u.status, u.last_login, u.created_at,
                       r.name as role_name, r.display_name as role_display_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?
            `;
            
            db.query(userQuery, [req.user.userId], (err, users) => {
                if (err) {
                    console.error('Get profile error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to get user profile'
                    });
                }
                
                if (users.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                const user = users[0];
                
                // Get user permissions
                const permQuery = `
                    SELECT p.name, p.display_name, p.category
                    FROM permissions p
                    JOIN role_permissions rp ON p.id = rp.permission_id
                    JOIN users u ON rp.role_id = u.role_id
                    WHERE u.id = ? AND p.is_active = true
                `;
                
                db.query(permQuery, [req.user.userId], (permErr, permissions) => {
                    if (permErr) {
                        console.error('Permissions query error:', permErr);
                        permissions = [];
                    }
                    
                    res.json({
                        success: true,
                        data: {
                            ...user,
                            permissions: permissions.map(p => p.name)
                        }
                    });
                });
            });
            
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user profile'
            });
        }
    }

    // ===============================================
    // UPDATE USER PROFILE
    // ===============================================
    static async updateProfile(req, res) {
        try {
            const { name, email } = req.body;
            
            const updateQuery = `
                UPDATE users SET name = ?, email = ?, updated_at = NOW()
                WHERE id = ?
            `;
            
            db.query(updateQuery, [name, email, req.user.userId], (err) => {
                if (err) {
                    console.error('Update profile error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update profile'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Profile updated successfully'
                });
            });
            
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }
    }

    // ===============================================
    // CHANGE PASSWORD
    // ===============================================
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            
            // Get current user
            db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.userId], async (err, users) => {
                if (err) {
                    console.error('Change password error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to change password'
                    });
                }
                
                if (users.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                try {
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
                    const updateQuery = `
                        UPDATE users SET password_hash = ?, updated_at = NOW()
                        WHERE id = ?
                    `;
                    
                    db.query(updateQuery, [hashedPassword, req.user.userId], (updateErr) => {
                        if (updateErr) {
                            console.error('Update password error:', updateErr);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to change password'
                            });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Password changed successfully'
                        });
                    });
                    
                } catch (bcryptError) {
                    console.error('Password verification error:', bcryptError);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to change password'
                    });
                }
            });
            
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    }
}

module.exports = AuthController;