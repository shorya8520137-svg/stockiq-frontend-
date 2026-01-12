#!/usr/bin/env node

const db = require('./db/connection');

async function fixDatabaseSchema() {
    console.log('🔧 Fixing Database Schema Issues...');
    console.log('===================================');

    try {
        // 1. Check current users table structure
        console.log('1️⃣ Checking users table structure...');
        const [columns] = await db.execute("DESCRIBE users");
        console.log('📋 Current columns:', columns.map(c => c.Field).join(', '));

        // 2. Check roles table
        console.log('2️⃣ Checking roles table...');
        const [roles] = await db.execute("SELECT * FROM roles");
        console.log('👑 Available roles:', roles.map(r => `${r.id}: ${r.name}`).join(', '));

        // 3. Ensure admin role exists
        const adminRole = roles.find(r => r.name === 'SUPER_ADMIN' || r.name === 'admin');
        let adminRoleId;
        
        if (!adminRole) {
            console.log('➕ Creating SUPER_ADMIN role...');
            const [result] = await db.execute("INSERT INTO roles (name, description) VALUES ('SUPER_ADMIN', 'Super Administrator')");
            adminRoleId = result.insertId;
            console.log('✅ SUPER_ADMIN role created with ID:', adminRoleId);
        } else {
            adminRoleId = adminRole.id;
            console.log('✅ Admin role exists with ID:', adminRoleId);
        }

        // 4. Update admin user role
        console.log('3️⃣ Updating admin user role...');
        await db.execute("UPDATE users SET role_id = ?, status = 'active' WHERE email = 'admin@hunyhuny.com'", [adminRoleId]);
        console.log('✅ Admin user role updated');

        // 5. Check stock_batches table
        console.log('4️⃣ Checking stock_batches table...');
        const [stockCount] = await db.execute("SELECT COUNT(*) as count FROM stock_batches WHERE status = 'active'");
        console.log(`📦 Active stock items: ${stockCount[0].count}`);

        if (stockCount[0].count === 0) {
            console.log('➕ Adding sample inventory data...');
            await db.execute(`
                INSERT INTO stock_batches (barcode, product_name, variant, warehouse, qty_available, status, created_at)
                VALUES 
                ('TEST001', 'Sample Product 1', 'Red', 'GGM_WH', 100, 'active', NOW()),
                ('TEST002', 'Sample Product 2', 'Blue', 'BLR_WH', 50, 'active', NOW()),
                ('TEST003', 'Sample Product 3', 'Green', 'MUM_WH', 75, 'active', NOW()),
                ('TEST004', 'Sample Product 4', '', 'AMD_WH', 25, 'active', NOW()),
                ('TEST005', 'Sample Product 5', 'Black', 'HYD_WH', 150, 'active', NOW())
                ON DUPLICATE KEY UPDATE qty_available = VALUES(qty_available)
            `);
            console.log('✅ Sample inventory data added');
        }

        // 6. Verify final state
        console.log('5️⃣ Final verification...');
        const [finalUsers] = await db.execute(`
            SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.status 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            LIMIT 5
        `);
        console.log('👥 Users with roles:');
        finalUsers.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Role: ${user.role_name || 'No Role'} - Status: ${user.status}`);
        });

        const [finalStock] = await db.execute("SELECT COUNT(*) as count FROM stock_batches WHERE status = 'active'");
        console.log(`📦 Total active inventory items: ${finalStock[0].count}`);

        console.log('\n🎉 Database schema fixed successfully!');
        console.log('\n🔄 Next steps:');
        console.log('1. Restart your server: pm2 restart all');
        console.log('2. Test inventory API: curl https://13-201-222-24.nip.io/api/inventory?limit=5');
        console.log('3. Test login: admin@hunyhuny.com / gfx998sd');

    } catch (error) {
        console.error('❌ Error fixing database schema:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

fixDatabaseSchema();