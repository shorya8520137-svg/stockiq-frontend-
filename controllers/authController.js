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
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Get user with role information
            const [users] = await db.execute(`
                SELECT u.*, r.name as role_name, r.display_name as role_display_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.email = ? AND u.status = 'active'
            `, [email]);

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const user = users[0];

            // Verify password - check both password and password_hash columns
            let isValidPassword = false;
            if (user.password_hash) {
                isValidPassword = await bcrypt.compare(password, user.password_hash);
            } else if (user.password) {
                // For plain text passwords (temporary - should be hashed)
                isValidPassword = (password === user.password);
            }

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Get user permissions
            const [permissions] = await db.execute(`
                SELECT p.name, p.display_name, p.category
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ? AND p.is_active = true
            `, [user.role_id]);

            // Update last login
            await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role_name,
                    roleId: user.role_id
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    roleDisplayName: user.role_display_name,
                    permissions: permissions.map(p => p.name)
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
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
                JOIN users u ON rp.role_id = u.role_id
                WHERE u.id = ? AND p.is_active = true
            `, [req.user.userId]);

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
    }

    // ===============================================
    // UPDATE USER PROFILE
    // ===============================================
    static async updateProfile(req, res) {
        try {
            const { name, email } = req.body;

            await db.execute(`
                UPDATE users SET name = ?, email = ?, updated_at = NOW()
                WHERE id = ?
            `, [name, email, req.user.userId]);

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
    }

    // ===============================================
    // CHANGE PASSWORD
    // ===============================================
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;

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
    }
}

module.exports = AuthController;