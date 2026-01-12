const jwt = require('jsonwebtoken');

// Optional authentication middleware for testing
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token provided - continue without user info
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            // Invalid token - continue without user info
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

module.exports = { optionalAuth };
