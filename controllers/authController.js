const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

class AuthController {
    // Login user
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
                WHERE u.email = ? AND u.is_active = 1
            `, [email]);

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const user = users[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Get user permissions
            const [permissions] = await db.execute(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ? AND p.is_active = 1
            `, [user.role_id]);

            // Update last login
            await db.execute(`
                UPDATE users 
                SET last_login = NOW(), login_count = login_count + 1 
                WHERE id = ?
            `, [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email, 
                    role: user.role_name 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Log login activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
                VALUES (?, 'LOGIN', 'AUTH', ?, ?, ?)
            `, [
                user.id,
                JSON.stringify({ email: user.email }),
                req.ip,
                req.get('User-Agent')
            ]);

            // Return user data without password
            const userData = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role_name,
                roleDisplayName: user.role_display_name,
                loginTime: new Date().toISOString(),
                permissions: permissions.map(p => p.name)
            };

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: userData
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Logout user
    static async logout(req, res) {
        try {
            const userId = req.user?.userId;

            if (userId) {
                // Log logout activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
                    VALUES (?, 'LOGOUT', 'AUTH', ?, ?, ?)
                `, [
                    userId,
                    JSON.stringify({ email: req.user.email }),
                    req.ip,
                    req.get('User-Agent')
                ]);
            }

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

    // Refresh JWT token
    static async refreshToken(req, res) {
        try {
            const userId = req.user.userId;

            // Get fresh user data
            const [users] = await db.execute(`
                SELECT u.*, r.name as role_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ? AND u.is_active = 1
            `, [userId]);

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            // Generate new token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email, 
                    role: user.role_name 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = AuthController;