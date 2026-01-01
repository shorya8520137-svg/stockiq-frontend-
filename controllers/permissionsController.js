const db = require('../db/connection');

class PermissionsController {
    // Get all roles
    static async getRoles(req, res) {
        try {
            const [roles] = await db.execute(`
                SELECT 
                    r.*,
                    COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role_id AND u.is_active = 1
                WHERE r.is_active = 1
                GROUP BY r.id
                ORDER BY r.priority ASC, r.name ASC
            `);

            res.json({
                success: true,
                data: roles
            });

        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get all permissions
    static async getPermissions(req, res) {
        try {
            const [permissions] = await db.execute(`
                SELECT *
                FROM permissions
                WHERE is_active = 1
                ORDER BY category ASC, name ASC
            `);

            // Group permissions by category
            const groupedPermissions = {};
            permissions.forEach(permission => {
                if (!groupedPermissions[permission.category]) {
                    groupedPermissions[permission.category] = [];
                }
                groupedPermissions[permission.category].push(permission);
            });

            res.json({
                success: true,
                data: groupedPermissions
            });

        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get role permissions
    static async getRolePermissions(req, res) {
        try {
            const { roleId } = req.params;

            const [permissions] = await db.execute(`
                SELECT p.*
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ? AND p.is_active = 1
                ORDER BY p.category ASC, p.name ASC
            `, [roleId]);

            res.json({
                success: true,
                data: permissions
            });

        } catch (error) {
            console.error('Get role permissions error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update role permissions
    static async updateRolePermissions(req, res) {
        try {
            const { roleId } = req.params;
            const { permissionIds } = req.body;

            if (!Array.isArray(permissionIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission IDs must be an array'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Get role name for logging
                const [roles] = await db.execute(`
                    SELECT name FROM roles WHERE id = ?
                `, [roleId]);

                if (roles.length === 0) {
                    throw new Error('Role not found');
                }

                // Remove existing permissions
                await db.execute(`
                    DELETE FROM role_permissions WHERE role_id = ?
                `, [roleId]);

                // Add new permissions
                if (permissionIds.length > 0) {
                    const values = permissionIds.map(permissionId => 
                        `(${roleId}, ${permissionId}, ${req.user.userId})`
                    ).join(', ');

                    await db.execute(`
                        INSERT INTO role_permissions (role_id, permission_id, granted_by)
                        VALUES ${values}
                    `);
                }

                // Log activity
                await db.execute(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                    VALUES (?, 'UPDATE', 'ROLE_PERMISSIONS', ?, ?, ?, ?)
                `, [
                    req.user.userId,
                    roleId,
                    JSON.stringify({
                        roleName: roles[0].name,
                        permissionCount: permissionIds.length,
                        permissionIds
                    }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'Role permissions updated successfully'
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Update role permissions error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    // Get all users
    static async getUsers(req, res) {
        try {
            const [users] = await db.execute(`
                SELECT 
                    u.id,
                    u.email,
                    u.name,
                    u.is_active,
                    u.last_login,
                    u.login_count,
                    u.created_at,
                    r.name as role_name,
                    r.display_name as role_display_name,
                    r.color as role_color
                FROM users u
                JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC
            `);

            res.json({
                success: true,
                data: users
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create user
    static async createUser(req, res) {
        try {
            const { email, password, name, roleId } = req.body;

            if (!email || !password || !name || !roleId) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, password, name, and role are required'
                });
            }

            // Check if user already exists
            const [existingUsers] = await db.execute(`
                SELECT id FROM users WHERE email = ?
            `, [email]);

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Hash password
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(password, 10);

            // Create user
            const [result] = await db.execute(`
                INSERT INTO users (email, password_hash, name, role_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [email, passwordHash, name, roleId]);

            // Get role name for logging
            const [roles] = await db.execute(`
                SELECT name FROM roles WHERE id = ?
            `, [roleId]);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'CREATE', 'USERS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                result.insertId,
                JSON.stringify({
                    email,
                    name,
                    roleName: roles[0]?.name || 'Unknown'
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'User created successfully',
                data: {
                    id: result.insertId,
                    email,
                    name,
                    roleId
                }
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { name, roleId, isActive } = req.body;

            // Get current user data
            const [currentUsers] = await db.execute(`
                SELECT email, name, role_id, is_active FROM users WHERE id = ?
            `, [userId]);

            if (currentUsers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const currentUser = currentUsers[0];
            const updates = [];
            const params = [];

            if (name && name !== currentUser.name) {
                updates.push('name = ?');
                params.push(name);
            }

            if (roleId && roleId !== currentUser.role_id) {
                updates.push('role_id = ?');
                params.push(roleId);
            }

            if (isActive !== undefined && isActive !== currentUser.is_active) {
                updates.push('is_active = ?');
                params.push(isActive);
            }

            if (updates.length === 0) {
                return res.json({
                    success: true,
                    message: 'No changes to update'
                });
            }

            updates.push('updated_at = NOW()');
            params.push(userId);

            await db.execute(`
                UPDATE users SET ${updates.join(', ')} WHERE id = ?
            `, params);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'UPDATE', 'USERS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                userId,
                JSON.stringify({
                    email: currentUser.email,
                    changes: { name, roleId, isActive }
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'User updated successfully'
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get audit logs
    static async getAuditLogs(req, res) {
        try {
            const { limit = 100, offset = 0, action, resource, userId } = req.query;

            let query = `
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (action) {
                query += ` AND al.action = ?`;
                params.push(action);
            }

            if (resource) {
                query += ` AND al.resource = ?`;
                params.push(resource);
            }

            if (userId) {
                query += ` AND al.user_id = ?`;
                params.push(userId);
            }

            query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [logs] = await db.execute(query, params);

            // Parse details JSON
            logs.forEach(log => {
                if (log.details) {
                    try {
                        log.details = JSON.parse(log.details);
                    } catch (e) {
                        log.details = {};
                    }
                }
            });

            res.json({
                success: true,
                data: logs
            });

        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = PermissionsController;