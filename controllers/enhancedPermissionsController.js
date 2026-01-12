const db = require('../db/connection');

// Enhanced Permissions Controller with Database-Level Enforcement
class EnhancedPermissionsController {
    
    // ===== USER MANAGEMENT =====
    
    // Get all users with their roles and permissions
    static getAllUsers(req, res) {
        console.log('🔍 Enhanced Permissions - getAllUsers called');
        console.log('   User from middleware:', req.user);
        
        const query = `
            SELECT 
                u.id,
                u.name as username,
                u.email,
                u.status,
                u.created_at,
                u.last_login,
                r.display_name as role_name,
                r.id as role_id,
                'online' as is_online,
                NOW() as last_activity
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.is_active = 1
            ORDER BY u.created_at DESC
        `;
        
        db.query(query, (error, results) => {
            if (error) {
                console.error('Error fetching users:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch users',
                    error: error.message 
                });
            }
            
            console.log('✅ Users fetched successfully:', results.length);
            
            res.json({
                success: true,
                users: results.map(user => ({
                    ...user,
                    permissions: [],
                    is_online: Boolean(user.is_online)
                }))
            });
        });
    }
    
    // Create new user with role assignment
    static createUser(req, res) {
        const { username, email, password, full_name, role_id, permissions = [] } = req.body;
        const created_by = req.user?.userId || req.user?.id;
        
        if (!username || !email || !password || !role_id) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, password, and role are required'
            });
        }
        
        // Start transaction
        db.beginTransaction((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Transaction failed' });
            }
            
            // 1. Create user
            const createUserQuery = `
                INSERT INTO users (username, email, password, full_name, status, created_by, created_at)
                VALUES (?, ?, ?, ?, 'active', ?, NOW())
            `;
            
            db.query(createUserQuery, [username, email, password, full_name, created_by], (error, userResult) => {
                if (error) {
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
                    });
                }
                
                const userId = userResult.insertId;
                
                // 2. Assign role
                const assignRoleQuery = `INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, ?, NOW())`;
                
                db.query(assignRoleQuery, [userId, role_id, created_by], (error) => {
                    if (error) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Failed to assign role', error: error.message });
                        });
                    }
                    
                    // 3. Assign additional permissions if provided
                    if (permissions.length > 0) {
                        const permissionQueries = permissions.map(permissionId => 
                            new Promise((resolve, reject) => {
                                const assignPermQuery = `INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at) VALUES (?, ?, ?, NOW())`;
                                db.query(assignPermQuery, [userId, permissionId, created_by], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            })
                        );
                        
                        Promise.all(permissionQueries)
                            .then(() => {
                                // 4. Log audit trail
                                this.logAuditAction(created_by, 'USER_CREATED', `Created user: ${username}`, { user_id: userId });
                                
                                // 5. Send notification to all admins
                                this.sendNotificationToAdmins('USER_CREATED', `New user created: ${username}`, created_by);
                                
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            res.status(500).json({ success: false, message: 'Failed to commit transaction' });
                                        });
                                    }
                                    
                                    res.json({
                                        success: true,
                                        message: 'User created successfully',
                                        user_id: userId
                                    });
                                });
                            })
                            .catch((error) => {
                                db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Failed to assign permissions', error: error.message });
                                });
                            });
                    } else {
                        // No additional permissions, just commit
                        this.logAuditAction(created_by, 'USER_CREATED', `Created user: ${username}`, { user_id: userId });
                        this.sendNotificationToAdmins('USER_CREATED', `New user created: ${username}`, created_by);
                        
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Failed to commit transaction' });
                                });
                            }
                            
                            res.json({
                                success: true,
                                message: 'User created successfully',
                                user_id: userId
                            });
                        });
                    }
                });
            });
        });
    }
    
    // Update user permissions
    static updateUserPermissions(req, res) {
        const { userId } = req.params;
        const { role_id, permissions = [], action } = req.body; // action: 'grant' or 'revoke'
        const updated_by = req.user?.userId || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        
        db.beginTransaction((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Transaction failed' });
            }
            
            const promises = [];
            
            // Update role if provided
            if (role_id) {
                promises.push(new Promise((resolve, reject) => {
                    const updateRoleQuery = `
                        UPDATE user_roles 
                        SET role_id = ?, updated_by = ?, updated_at = NOW() 
                        WHERE user_id = ?
                    `;
                    db.query(updateRoleQuery, [role_id, updated_by, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }));
            }
            
            // Handle permissions
            if (permissions.length > 0) {
                if (action === 'grant') {
                    // Grant permissions
                    permissions.forEach(permissionId => {
                        promises.push(new Promise((resolve, reject) => {
                            const grantQuery = `
                                INSERT IGNORE INTO user_permissions (user_id, permission_id, granted_by, granted_at)
                                VALUES (?, ?, ?, NOW())
                            `;
                            db.query(grantQuery, [userId, permissionId, updated_by], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        }));
                    });
                } else if (action === 'revoke') {
                    // Revoke permissions
                    permissions.forEach(permissionId => {
                        promises.push(new Promise((resolve, reject) => {
                            const revokeQuery = `DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`;
                            db.query(revokeQuery, [userId, permissionId], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        }));
                    });
                }
            }
            
            Promise.all(promises)
                .then(() => {
                    // Log audit action
                    this.logAuditAction(updated_by, 'PERMISSIONS_UPDATED', `Updated permissions for user ID: ${userId}`, { 
                        user_id: userId, 
                        action, 
                        permissions 
                    });
                    
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Failed to commit transaction' });
                            });
                        }
                        
                        res.json({
                            success: true,
                            message: 'User permissions updated successfully'
                        });
                    });
                })
                .catch((error) => {
                    db.rollback(() => {
                        res.status(500).json({ 
                            success: false, 
                            message: 'Failed to update permissions', 
                            error: error.message 
                        });
                    });
                });
        });
    }
    
    // ===== PERMISSION CHECKING =====
    
    // Check if user has specific permission
    static checkUserPermission(req, res) {
        const { userId, permission } = req.params;
        
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
                FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = ? AND p.name = ?
            ) as user_perms
            LIMIT 1
        `;
        
        db.query(query, [userId, permission, userId, permission], (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to check permission',
                    error: error.message 
                });
            }
            
            res.json({
                success: true,
                has_permission: results.length > 0,
                permission: permission
            });
        });
    }
    
    // Get user's effective permissions (role + direct permissions)
    static getUserEffectivePermissions(req, res) {
        const { userId } = req.params;
        
        const query = `
            SELECT DISTINCT p.id, p.name, p.description, p.component, p.action
            FROM (
                -- Direct user permissions
                SELECT up.permission_id
                FROM user_permissions up
                WHERE up.user_id = ?
                
                UNION
                
                -- Role-based permissions
                SELECT rp.permission_id
                FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                WHERE ur.user_id = ?
            ) as effective_perms
            JOIN permissions p ON effective_perms.permission_id = p.id
            ORDER BY p.component, p.action
        `;
        
        db.query(query, [userId, userId], (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to get user permissions',
                    error: error.message 
                });
            }
            
            // Group permissions by component
            const permissionsByComponent = {};
            results.forEach(perm => {
                if (!permissionsByComponent[perm.component]) {
                    permissionsByComponent[perm.component] = [];
                }
                permissionsByComponent[perm.component].push({
                    id: perm.id,
                    name: perm.name,
                    description: perm.description,
                    action: perm.action
                });
            });
            
            res.json({
                success: true,
                permissions: results,
                permissions_by_component: permissionsByComponent
            });
        });
    }
    
    // ===== AUDIT LOGGING =====
    
    static logAuditAction(userId, action, description, metadata = {}) {
        const query = `
            INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        db.query(query, [
            userId, 
            action, 
            'PERMISSION_SYSTEM',
            metadata.resource_id || null,
            metadata.old_values ? JSON.stringify(metadata.old_values) : null,
            metadata.new_values ? JSON.stringify(metadata.new_values) : description,
            metadata.ip_address || null,
            metadata.user_agent || null
        ], (error) => {
            if (error) {
                console.error('Failed to log audit action:', error);
            }
        });
    }
    
    // Get audit logs with filtering
    static getAuditLogs(req, res) {
        const { 
            user_id, 
            action, 
            start_date, 
            end_date, 
            page = 1, 
            limit = 50 
        } = req.query;
        
        let query = `
            SELECT 
                al.id,
                al.user_id,
                u.username,
                u.full_name,
                al.action,
                al.description,
                al.metadata,
                al.ip_address,
                al.created_at
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (user_id) {
            query += ` AND al.user_id = ?`;
            params.push(user_id);
        }
        
        if (action) {
            query += ` AND al.action = ?`;
            params.push(action);
        }
        
        if (start_date) {
            query += ` AND al.created_at >= ?`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND al.created_at <= ?`;
            params.push(end_date);
        }
        
        query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        
        db.query(query, params, (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch audit logs',
                    error: error.message 
                });
            }
            
            res.json({
                success: true,
                audit_logs: results.map(log => ({
                    ...log,
                    metadata: log.metadata ? JSON.parse(log.metadata) : {}
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        });
    }
    
    // ===== USER ACTIVITY TRACKING =====
    
    // Update user online status
    static updateUserActivity(req, res) {
        const { userId } = req.params;
        const { action, component, metadata = {} } = req.body;
        
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
        
        db.query(query, [userId, action, component, JSON.stringify(metadata)], (error) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to update user activity',
                    error: error.message 
                });
            }
            
            res.json({
                success: true,
                message: 'User activity updated'
            });
        });
    }
    
    // Get online users
    static getOnlineUsers(req, res) {
        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                uat.last_activity,
                uat.current_action,
                uat.current_component,
                r.name as role_name
            FROM user_activity_tracking uat
            JOIN users u ON uat.user_id = u.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE uat.is_online = 1 
            AND uat.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ORDER BY uat.last_activity DESC
        `;
        
        db.query(query, (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch online users',
                    error: error.message 
                });
            }
            
            res.json({
                success: true,
                online_users: results,
                count: results.length
            });
        });
    }
    
    // ===== NOTIFICATIONS =====
    
    static sendNotificationToAdmins(type, message, sender_id) {
        // Get all admin users
        const getAdminsQuery = `
            SELECT DISTINCT u.id
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'super_admin')
            AND u.status = 'active'
            AND u.id != ?
        `;
        
        db.query(getAdminsQuery, [sender_id], (error, admins) => {
            if (error || admins.length === 0) {
                return;
            }
            
            // Send notification to each admin
            const notifications = admins.map(admin => 
                new Promise((resolve) => {
                    const insertNotificationQuery = `
                        INSERT INTO notifications (user_id, type, title, message, sender_id, created_at)
                        VALUES (?, ?, ?, ?, ?, NOW())
                    `;
                    
                    db.query(insertNotificationQuery, [
                        admin.id,
                        type,
                        `System Notification: ${type}`,
                        message,
                        sender_id
                    ], () => resolve());
                })
            );
            
            Promise.all(notifications);
        });
    }
    
    // ===== COMPONENT PERMISSIONS =====
    
    // Check component access
    static checkComponentAccess(req, res) {
        const { userId, component } = req.params;
        
        const query = `
            SELECT 1 as has_access
            FROM (
                -- Check direct component permissions
                SELECT 1
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = ? AND p.component = ?
                
                UNION
                
                -- Check role-based component permissions
                SELECT 1
                FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = ? AND p.component = ?
            ) as component_access
            LIMIT 1
        `;
        
        db.query(query, [userId, component, userId, component], (error, results) => {
            if (error) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to check component access',
                    error: error.message 
                });
            }
            
            res.json({
                success: true,
                has_access: results.length > 0,
                component: component
            });
        });
    }
}

module.exports = EnhancedPermissionsController;