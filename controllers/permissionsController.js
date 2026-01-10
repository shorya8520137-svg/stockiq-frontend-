const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

// Use unified JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

class PermissionsController {
    // ================= USER MANAGEMENT ================= //
    
    static async getUsers(req, res) {
        try {
            const result = await db.execute(`
                SELECT u.id, u.name, u.email, u.status, u.last_login, u.created_at,
                       r.name as role_name, r.display_name as role_display_name, r.color as role_color
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC
            `);
            
            const users = Array.isArray(result) ? result[0] : result;
            
            res.json({
                success: true,
                data: users || []
            });
            
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    }
    
    static async createUser(req, res) {
        try {
            const { name, email, password, role_id } = req.body;
            
            if (!name || !email || !password || !role_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, password, and role are required'
                });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create user
            const result = await db.execute(`
                INSERT INTO users (name, email, password_hash, role_id, status)
                VALUES (?, ?, ?, ?, 'active')
            `, [name, email, hashedPassword, role_id]);
            
            const userId = result.insertId || (Array.isArray(result) ? result[0].insertId : result.insertId);
            
            // Log audit
            await this.createAuditLog(req.user?.userId, 'CREATE_USER', 'USER', userId, {
                name, email, role_id
            });
            
            res.json({
                success: true,
                message: 'User created successfully',
                data: { id: userId }
            });
            
        } catch (error) {
            console.error('Create user error:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    }
    
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role_id, password } = req.body;
            
            let query = 'UPDATE users SET name = ?, email = ?, role_id = ?, updated_at = NOW() WHERE id = ?';
            let params = [name, email, role_id, id];
            
            // If password is provided, hash it and include in update
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query = 'UPDATE users SET name = ?, email = ?, role_id = ?, password_hash = ?, updated_at = NOW() WHERE id = ?';
                params = [name, email, role_id, hashedPassword, id];
            }
            
            await db.execute(query, params);
            
            // Log audit
            await this.createAuditLog(req.user?.userId, 'UPDATE_USER', 'USER', id, {
                name, email, role_id, password_changed: !!password
            });
            
            res.json({
                success: true,
                message: 'User updated successfully'
            });
            
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user'
            });
        }
    }
    
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            await db.execute('DELETE FROM users WHERE id = ?', [id]);
            
            // Log audit
            await this.createAuditLog(req.user?.userId, 'DELETE_USER', 'USER', id, {});
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
            
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    }
    
    // ================= ROLE MANAGEMENT ================= //
    
    static async getRoles(req, res) {
        try {
            const result = await db.execute(`
                SELECT r.*, COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role_id
                WHERE r.is_active = true
                GROUP BY r.id
                ORDER BY r.name
            `);
            
            const roles = Array.isArray(result) ? result[0] : result;
            
            res.json({
                success: true,
                data: roles || []
            });
            
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch roles'
            });
        }
    }
    
    // ================= PERMISSION MANAGEMENT ================= //
    
    static async getPermissions(req, res) {
        try {
            const result = await db.execute(`
                SELECT * FROM permissions 
                WHERE is_active = true 
                ORDER BY category, name
            `);
            
            const permissions = Array.isArray(result) ? result[0] : result;
            
            res.json({
                success: true,
                data: {
                    permissions: permissions || []
                }
            });
            
        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch permissions'
            });
        }
    }
    
    // ================= AUDIT LOG ================= //
    
    static async getAuditLogs(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            
            const result = await db.execute(`
                SELECT al.*, u.name as user_name, u.email as user_email
                FROM audit_log al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limit), parseInt(offset)]);
            
            const logs = Array.isArray(result) ? result[0] : result;
            
            res.json({
                success: true,
                data: {
                    logs: logs || []
                }
            });
            
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch audit logs'
            });
        }
    }
    
    static async createAuditLog(userId, action, resource, resourceId, data = {}) {
        try {
            await db.execute(`
                INSERT INTO audit_log (user_id, action, resource, resource_id, new_values, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [userId, action, resource, resourceId, JSON.stringify(data)]);
        } catch (error) {
            console.error('Create audit log error:', error);
            // Don't throw - audit logging should not break main functionality
        }
    }
    
    // HTTP route handler for creating audit logs
    static async createAuditLogRoute(req, res) {
        try {
            const { action, resource, resourceId, data } = req.body;
            const userId = req.user?.userId;
            
            await PermissionsController.createAuditLog(userId, action, resource, resourceId, data);
            
            res.json({
                success: true,
                message: 'Audit log created successfully'
            });
        } catch (error) {
            console.error('Create audit log route error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create audit log'
            });
        }
    }
    
    // ================= SYSTEM STATS ================= //
    
    static async getSystemStats(req, res) {
        try {
            const [userStats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
                FROM users
            `);
            
            res.json({
                success: true,
                data: {
                    users: userStats[0] || { total_users: 0, active_users: 0 }
                }
            });
            
        } catch (error) {
            console.error('Get system stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch system stats'
            });
        }
    }
}

module.exports = PermissionsController;