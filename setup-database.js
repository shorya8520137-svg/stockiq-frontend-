require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('✅ Connected to database');

        // Read and execute the SQL setup file
        const sqlFile = path.join(__dirname, 'database-setup.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📋 Executing database setup script...');
        await connection.execute(sql);

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   ✓ Tables created: roles, permissions, users, role_permissions, audit_logs');
        console.log('   ✓ Tables created: inventory, orders, dispatches, channels, messages');
        console.log('   ✓ Default roles inserted: 6 roles with hierarchical permissions');
        console.log('   ✓ Default permissions inserted: 35+ granular permissions');
        console.log('   ✓ Default users created: 5 test users');
        console.log('   ✓ Sample data inserted: inventory items, orders, channels');

        console.log('\n🔑 Default Login Credentials:');
        console.log('   Super Admin: admin@example.com / admin@123');
        console.log('   Manager:     manager@example.com / admin@123');
        console.log('   Operator:    operator@example.com / admin@123');
        console.log('   Warehouse:   warehouse@example.com / admin@123');
        console.log('   Viewer:      viewer@example.com / admin@123');

        console.log('\n🚀 Ready to start server with: npm start');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

setupDatabase();