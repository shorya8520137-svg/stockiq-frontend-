#!/usr/bin/env node

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306
};

async function checkDatabaseRoles() {
    try {
        console.log('🔍 Connecting to database...');
        const connection = await mysql.createConnection(dbConfig);
        
        // Check users table
        console.log('\n📊 USERS TABLE:');
        const [users] = await connection.execute(`
            SELECT u.id, u.name, u.email, u.role_id, u.status, r.name as role_name, r.display_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        `);
        
        users.forEach(user => {
            console.log(`  ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role_name} (ID: ${user.role_id}), Status: ${user.status}`);
        });
        
        // Check roles table
        console.log('\n📊 ROLES TABLE:');
        const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
        
        roles.forEach(role => {
            console.log(`  ID: ${role.id}, Name: ${role.name}, Display: ${role.display_name}, Active: ${role.is_active}`);
        });
        
        // Check permissions table
        console.log('\n📊 PERMISSIONS TABLE:');
        const [permissions] = await connection.execute('SELECT * FROM permissions WHERE is_active = true ORDER BY category, name');
        
        permissions.forEach(perm => {
            console.log(`  ID: ${perm.id}, Name: ${perm.name}, Category: ${perm.category}, Display: ${perm.display_name}`);
        });
        
        // Check role_permissions table
        console.log('\n📊 ROLE PERMISSIONS:');
        const [rolePermissions] = await connection.execute(`
            SELECT r.name as role_name, p.name as permission_name, p.category
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.is_active = true AND p.is_active = true
            ORDER BY r.name, p.category, p.name
        `);
        
        let currentRole = '';
        rolePermissions.forEach(rp => {
            if (rp.role_name !== currentRole) {
                console.log(`\n  ${rp.role_name}:`);
                currentRole = rp.role_name;
            }
            console.log(`    - ${rp.permission_name} (${rp.category})`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

// Run the check
checkDatabaseRoles();