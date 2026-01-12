const bcrypt = require('bcrypt');
const db = require('../db/connection');

class PermissionsController {
    
    static getUsers(req, res) {
        const sql = `
            SELECT u.id, u.name, u.email, u.status, u.last_login, u.created_at,
                   r.name as role_name, r.display_name as role_display_name, r.color as role_color
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `;
        
        db.query(sql, (err, users) => {
            if (err) {
                console.error('Get users error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch users'
                });
            }
            
            res.json({
                success: true,
                data: users || []
            });
        });
    }
    
    static createUser(req, res) {
        const { name, email, password, role_id } = req.body;
        
        if (!name || !email || !password || !role_id) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and role are required'
            });
        }
        
        // Check if email exists
        db.query('SELECT id FROM users WHERE email = ?', [email], (err, existingUsers) => {
            if (err) {
                console.error('Check email error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            if (existingUsers && existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            // Hash password
            bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    console.error('Hash password error:', hashErr);
                    return res.status(500).json({
                        success: false,
                        message: 'Password hashing failed'
                    });
                }
                
                // Insert user
                const insertSql = 'INSERT INTO users (name, email, password, role_id, status) VALUES (?, ?, ?, ?, "active")';
                
                db.query(insertSql, [name, email, hashedPassword, role_id], (insertErr, result) => {
                    if (insertErr) {
                        console.error('Create user error:', insertErr);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to create user'
                        });
                    }
                    
                    res.status(201).json({
                        success: true,
                        message: 'User created successfully',
                        data: { id: result.insertId, name, email, role_id }
                    });
                });
            });
        });
    }
    
    static getRoles(req, res) {
        const sql = 'SELECT * FROM roles WHERE is_active = true ORDER BY name';
        
        db.query(sql, (err, roles) => {
            if (err) {
                console.error('Get roles error:', err);
                return res.json({
                    success: true,
                    data: [
                        { id: 1, name: 'admin', display_name: 'Administrator' },
                        { id: 2, name: 'user', display_name: 'User' }
                    ]
                });
            }
            
            res.json({
                success: true,
                data: roles || []
            });
        });
    }
    
    static updateUser(req, res) {
        const { userId } = req.params;
        const { name, email, role_id, status } = req.body;
        
        const sql = 'UPDATE users SET name = ?, email = ?, role_id = ?, status = ? WHERE id = ?';
        
        db.query(sql, [name, email, role_id, status, userId], (err, result) => {
            if (err) {
                console.error('Update user error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update user'
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'User updated successfully'
            });
        });
    }
    
    static deleteUser(req, res) {
        const { userId } = req.params;
        
        db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
            if (err) {
                console.error('Delete user error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete user'
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        });
    }

    static getPermissions(req, res) {
        const sql = 'SELECT * FROM permissions ORDER BY category, name';
        
        db.query(sql, (err, permissions) => {
            if (err) {
                console.error('Get permissions error:', err);
                return res.json({
                    success: true,
                    data: []
                });
            }
            
            res.json({
                success: true,
                data: permissions || []
            });
        });
    }

    static getAuditLogs(req, res) {
        const sql = `
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 100
        `;
        
        db.query(sql, (err, logs) => {
            if (err) {
                console.error('Get audit logs error:', err);
                return res.json({
                    success: true,
                    data: []
                });
            }
            
            res.json({
                success: true,
                data: logs || []
            });
        });
    }

    static createAuditLogRoute(req, res) {
        const { action, entity_type, entity_id, details } = req.body;
        const userId = req.user?.userId;
        
        this.createAuditLog(userId, action, entity_type, entity_id, details)
            .then(() => {
                res.json({
                    success: true,
                    message: 'Audit log created'
                });
            })
            .catch(error => {
                console.error('Create audit log error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create audit log'
                });
            });
    }

    static async createAuditLog(userId, action, entityType, entityId, details = {}) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
            
            db.query(sql, [userId, action, entityType, entityId, JSON.stringify(details)], (err, result) => {
                if (err) {
                    console.error('Audit log error:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    static getSystemStats(req, res) {
        const stats = {
            users: { total: 0, active: 0 },
            roles: { total: 0 },
            permissions: { total: 0 },
            auditLogs: { total: 0 }
        };

        // Get user stats
        db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM users', (err, userStats) => {
            if (!err && userStats && userStats[0]) {
                stats.users = userStats[0];
            }

            // Get role stats
            db.query('SELECT COUNT(*) as total FROM roles WHERE is_active = true', (err, roleStats) => {
                if (!err && roleStats && roleStats[0]) {
                    stats.roles = roleStats[0];
                }

                // Get permission stats
                db.query('SELECT COUNT(*) as total FROM permissions', (err, permStats) => {
                    if (!err && permStats && permStats[0]) {
                        stats.permissions = permStats[0];
                    }

                    // Get audit log stats
                    db.query('SELECT COUNT(*) as total FROM audit_logs', (err, auditStats) => {
                        if (!err && auditStats && auditStats[0]) {
                            stats.auditLogs = auditStats[0];
                        }

                        res.json({
                            success: true,
                            data: stats
                        });
                    });
                });
            });
        });
    }
}

module.exports = PermissionsController;