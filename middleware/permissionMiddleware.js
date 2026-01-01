const permissionMiddleware = (requiredPermission) => {
    return (req, res, next) => {
        try {
            // Check if user is authenticated (should be set by authMiddleware)
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super admin has all permissions
            if (req.user.role === 'super_admin') {
                return next();
            }

            // Check if user has the required permission
            if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: requiredPermission,
                    userPermissions: req.user.permissions || []
                });
            }

            next();

        } catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };
};

module.exports = permissionMiddleware;