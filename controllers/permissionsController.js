const bcrypt = require('bcryptjs');
const db = require('../db/connection');

class PermissionsController {
    // ================= USER MANAGEMENT ================= //
    
    static async getUsers(req, res) {
        try {
            const [users] = await db.execute(`
                SELECT u.id, u.name, u.email, u.status, u.last_login, u.created_at,
                       r.name as role_name, r.display_name as role_display_name, r.color as role_color
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC
            `);
            
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
            
            console.log('🔍 CREATE USER DEBUG:');
            console.log('📥 Request data:', { name, email, role_id });
            
            if (!name || !email || !password || !role_id) {
                console.log('❌ Validation failed - missing fields');
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, password, and role are required'
                });
            }
            
            // Check if email already exists - FIXED MySQL2 format
            console.log('🔍 Checking if email exists:', email);
            const [existingUsers] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
            console.log('📊 Existing users check result:', existingUsers);
            
            if (existingUsers && existingUsers.length > 0) {
                console.log('❌ Email already exists');
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            // Hash password
            console.log('🔐 Hashing password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('✅ Password hashed successfully');
            
            // Create user - FIXED MySQL2 format
            console.log('💾 Inserting user into database...');
            console.log('📊 SQL Query: INSERT INTO users (name, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?)');
            console.log('📊 SQL Params:', [name, email, '[HIDDEN]', role_id, 'active']);
            
            const [insertResult] = await db.execute(`
                INSERT INTO users (name, email, password_hash, role_id, status)
                VALUES (?, ?, ?, ?, 'active')
            `, [name, email, hashedPassword, role_id]);
            
            console.log('📊 Raw insert result:', insertResult);
            
            const userId = insertResult.insertId;
            console.log('🆔 New user ID:', userId);
            
            if (!userId) {
                throw new Error('Failed to get user ID after insert');
            }
            
            // Verify the insert worked - FIXED MySQL2 format
            console.log('🔍 Verifying user was created...');
            const [verifyUser] = await db.execute('SELECT id, name, email, role_id FROM users WHERE id = ?', [userId]);
            console.log('✅ Verification result:', verifyUser);
            
            if (!verifyUser || verifyUser.length === 0) {
                throw new Error('User not found after insert - database insert failed');
            }
            
            // Log audit
            await PermissionsController.createAuditLog(req.user?.userId, 'CREATE_USER', 'USER', userId, {
                name, email, role_id
            });
            
            console.log('✅ User created successfully with ID:', userId);
            
            res.json({
                success: true,
                message: 'User created successfully',
                data: { id: userId, user: verifyUser[0] }
            });
            
        } catch (error) {
            console.error('❌ Create user error:', error);
            console.error('❌ Error stack:', error.stack);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to create user: ' + error.message
            });
        }
    }
    
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role_id, password } = req.body;
            
            let query = 'UPDATE users SET name = ?, email = ?, role_id = ?, updated_at = NOW() WHERE id = ?';
            let params = [name, email, role_id, id];
            
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query = 'UPDATE users SET name = ?, email = ?, role_id = ?, password_hash = ?, updated_at = NOW() WHERE id = ?';
                params = [name, email, role_id, hashedPassword, id];
            }
            
            await db.execute(query, params);
            
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
            const [roles] = await db.execute(`
                SELECT r.*, COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role_id
                WHERE r.is_active = true
                GROUP BY r.id
                ORDER BY r.name
            `);
            
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
    
    static async createRole(req, res) {
        try {
            const { name, display_name, description, color } = req.body;
            
            if (!name || !display_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and display name are required'
                });
            }
            
            const [result] = await db.execute(`
                INSERT INTO roles (name, display_name, description, color, is_active, created_at)
                VALUES (?, ?, ?, ?, true, NOW())
            `, [name, display_name, description || '', color || '#6366f1']);
            
            res.json({
                success: true,
                message: 'Role created successfully',
                data: { id: result.insertId }
            });
            
        } catch (error) {
            console.error('Create role error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Role name already exists'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to create role'
            });
        }
    }
    
    // ================= PERMISSION MANAGEMENT ================= //
    
    static async getPermissions(req, res) {
        try {
            const [permissions] = await db.execute(`
                SELECT * FROM permissions 
                WHERE is_active = true 
                ORDER BY category, name
            `);
            
            res.json({
                success: true,
                data: permissions || []
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
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;
            
            const [logs] = await db.execute(`
                SELECT al.*, u.name as user_name, u.email as user_email
                FROM audit_log al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limit), parseInt(offset)]);
            
            res.json({
                success: true,
                data: logs || []
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
        }
    }
    
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
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
                FROM users
            `);
            
            res.json({
                success: true,
                data: {
                    users: stats[0] || { total_users: 0, active_users: 0 }
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