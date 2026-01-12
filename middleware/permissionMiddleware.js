const db = require('../db/connection');

// Permission middleware for database-level enforcement
class PermissionMiddleware {
    
    // Check if user has specific permission
    static checkPermission(permission) {
        return (req, res, next) => {
            const userId = req.user?.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const query = `
                SELECT 1 as has_permission
                FROM (
                    -- Direct user permissions
                    SELECT up.permission_id
                    FROM user_permissions up
                    JOIN permissions p ON up.permission_id = p.id
                    WHERE up.user_id = ? AND p.name = ?
                    
                    UNION
                    
                    -- Role-based permissions
                    SELECT rp.permission_id
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    JOIN role_permissions rp ON r.id = rp.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE u.id = ? AND p.name = ?
                ) as user_perms
                LIMIT 1
            `;
            
            db.query(query, [userId, permission, userId, permission], (error, results) => {
                if (error) {
                    console.error('Permission check error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Permission check failed'
                    });
                }
                
                if (results.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied. Required permission: ${permission}`
                    });
                }
                
                // Log the access attempt
                this.logAccess(userId, permission, req.path, req.method);
                next();
            });
        };
    }
    
    // Check if user has access to specific component
    static checkComponentAccess(component) {
        return (req, res, next) => {
            const userId = req.user?.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const query = `
                SELECT 1 as has_access
                FROM (
                    -- Check direct component permissions
                    SELECT 1
                    FROM user_permissions up
                    JOIN permissions p ON up.permission_id = p.id
                    WHERE up.user_id = ? AND p.category = ?
                    
                    UNION
                    
                    -- Check role-based component permissions
                    SELECT 1
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    JOIN role_permissions rp ON r.id = rp.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE u.id = ? AND p.category = ?
                ) as component_access
                LIMIT 1
            `;
            
            db.query(query, [userId, component, userId, component], (error, results) => {
                if (error) {
                    console.error('Component access check error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Component access check failed'
                    });
                }
                
                if (results.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied to component: ${component}`
                    });
                }
                
                // Log the component access
                this.logAccess(userId, `component:${component}`, req.path, req.method);
                next();
            });
        };
    }
    
    // Check multiple permissions (user must have ALL)
    static checkMultiplePermissions(permissions) {
        return (req, res, next) => {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const placeholders = permissions.map(() => '?').join(',');
            const query = `
                SELECT COUNT(DISTINCT p.name) as permission_count
                FROM (
                    -- Direct user permissions
                    SELECT p.name
                    FROM user_permissions up
                    JOIN permissions p ON up.permission_id = p.id
                    WHERE up.user_id = ? AND p.name IN (${placeholders})
                    
                    UNION
                    
                    -- Role-based permissions
                    SELECT p.name
                    FROM user_roles ur
                    JOIN role_permissions rp ON ur.role_id = rp.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE ur.user_id = ? AND p.name IN (${placeholders})
                ) as user_perms
            `;
            
            const params = [userId, ...permissions, userId, ...permissions];
            
            db.query(query, params, (error, results) => {
                if (error) {
                    console.error('Multiple permissions check error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Permission check failed'
                    });
                }
                
                const hasAllPermissions = results[0].permission_count === permissions.length;
                
                if (!hasAllPermissions) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied. Required permissions: ${permissions.join(', ')}`
                    });
                }
                
                // Log the access attempt
                this.logAccess(userId, permissions.join(','), req.path, req.method);
                next();
            });
        };
    }
    
    // Check if user has ANY of the specified permissions
    static checkAnyPermission(permissions) {
        return (req, res, next) => {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const placeholders = permissions.map(() => '?').join(',');
            const query = `
                SELECT 1 as has_permission
                FROM (
                    -- Direct user permissions
                    SELECT up.permission_id
                    FROM user_permissions up
                    JOIN permissions p ON up.permission_id = p.id
                    WHERE up.user_id = ? AND p.name IN (${placeholders})
                    
                    UNION
                    
                    -- Role-based permissions
                    SELECT rp.permission_id
                    FROM user_roles ur
                    JOIN role_permissions rp ON ur.role_id = rp.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE ur.user_id = ? AND p.name IN (${placeholders})
                ) as user_perms
                LIMIT 1
            `;
            
            const params = [userId, ...permissions, userId, ...permissions];
            
            db.query(query, params, (error, results) => {
                if (error) {
                    console.error('Any permission check error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Permission check failed'
                    });
                }
                
                if (results.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied. Required any of: ${permissions.join(', ')}`
                    });
                }
                
                // Log the access attempt
                this.logAccess(userId, `any:${permissions.join(',')}`, req.path, req.method);
                next();
            });
        };
    }
    
    // Role-based access control
    static requireRole(roles) {
        return (req, res, next) => {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const rolesArray = Array.isArray(roles) ? roles : [roles];
            const placeholders = rolesArray.map(() => '?').join(',');
            
            const query = `
                SELECT 1 as has_role
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = ? AND r.name IN (${placeholders})
                LIMIT 1
            `;
            
            db.query(query, [userId, ...rolesArray], (error, results) => {
                if (error) {
                    console.error('Role check error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Role check failed'
                    });
                }
                
                if (results.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied. Required role: ${rolesArray.join(' or ')}`
                    });
                }
                
                // Log the role-based access
                this.logAccess(userId, `role:${rolesArray.join(',')}`, req.path, req.method);
                next();
            });
        };
    }
    
    // Log access attempts for audit trail
    static logAccess(userId, permission, path, method) {
        const query = `
            INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, ip_address, user_agent, created_at)
            VALUES (?, 'ACCESS_GRANTED', 'PERMISSION_CHECK', ?, ?, ?, ?, NOW())
        `;
        
        const accessData = JSON.stringify({
            permission: permission,
            path: path,
            method: method,
            timestamp: new Date().toISOString()
        });
        
        db.query(query, [userId, null, accessData, null, null], (error) => {
            if (error) {
                console.error('Failed to log access:', error);
            }
        });
    }
    
    // Update user activity tracking
    static trackActivity(component, action) {
        return (req, res, next) => {
            const userId = req.user?.id;
            
            if (userId) {
                const query = `
                    INSERT INTO user_activity_tracking (user_id, is_online, last_activity, current_action, current_component, session_data)
                    VALUES (?, 1, NOW(), ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        is_online = 1,
                        last_activity = NOW(),
                        current_action = VALUES(current_action),
                        current_component = VALUES(current_component),
                        session_data = VALUES(session_data)
                `;
                
                const sessionData = JSON.stringify({
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    user_agent: req.get('User-Agent')
                });
                
                db.query(query, [userId, action, component, sessionData], (error) => {
                    if (error) {
                        console.error('Failed to track user activity:', error);
                    }
                });
            }
            
            next();
        };
    }
}

module.exports = PermissionMiddleware;