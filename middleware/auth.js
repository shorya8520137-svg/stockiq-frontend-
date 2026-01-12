const jwt = require('jsonwebtoken');
const db = require('../db/connection');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

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

// Permission checking middleware
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // Super admin has all permissions
        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'admin') {
            return next();
        }

        // For now, allow all authenticated users
        // TODO: Implement proper permission checking with database
        next();
    };
};

// Multiple permissions check (user needs at least one)
const checkAnyPermission = (requiredPermissions) => {
    return (req, res, next) => {
        // Super admin has all permissions
        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'admin') {
            return next();
        }

        // For now, allow all authenticated users
        next();
    };
};

// Role checking middleware
const checkRole = (requiredRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role;

        if (Array.isArray(requiredRoles)) {
            if (requiredRoles.includes(userRole)) {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    message: `Insufficient role. Required one of: ${requiredRoles.join(', ')}`
                });
            }
        } else {
            if (userRole === requiredRoles) {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    message: `Insufficient role. Required: ${requiredRoles}`
                });
            }
        }
    };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

// Audit logging helper
const createAuditLog = (userId, action, resource, resourceId, details, req, callback) => {
    const sql = `
        INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        userId,
        action,
        resource,
        resourceId,
        JSON.stringify(details),
        req?.ip || req?.connection?.remoteAddress,
        req?.get('User-Agent')
    ];
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Create audit log error:', err);
        }
        if (callback) callback(err, result);
    });
};

module.exports = {
    authenticateToken,
    checkPermission,
    checkAnyPermission,
    checkRole,
    optionalAuth,
    createAuditLog
};