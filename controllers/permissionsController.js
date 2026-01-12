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
}

module.exports = PermissionsController;