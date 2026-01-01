const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get fresh user data from database
            const [users] = await db.execute(`
                SELECT 
                    u.id,
                    u.email,
                    u.name,
                    u.is_active,
                    r.name as role_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ? AND u.is_active = 1
            `, [decoded.userId]);

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or inactive'
                });
            }

            const user = users[0];

            // Get user permissions
            const [permissions] = await db.execute(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN roles r ON rp.role_id = r.id
                JOIN users u ON u.role_id = r.id
                WHERE u.id = ? AND p.is_active = 1
            `, [user.id]);

            // Attach user info to request
            req.user = {
                userId: user.id,
                email: user.email,
                name: user.name,
                role: user.role_name,
                permissions: permissions.map(p => p.name)
            };

            next();

        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            } else {
                throw jwtError;
            }
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = authMiddleware;