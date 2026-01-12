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

        // 2. Add role column if missing
        const hasRole = columns.some(col => col.Field === 'role');
        if (!hasRole) {
            console.log('➕ Adding role column...');
            await db.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER' AFTER email");
            console.log('✅ Role column added');
        } else {
            console.log('✅ Role column already exists');
        }

        // 3. Add status column if missing (for WebSocket compatibility)
        const hasStatus = columns.some(col => col.Field === 'status');
        if (!hasStatus) {
            console.log('➕ Adding status column...');
            await db.execute("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER role");
            console.log('✅ Status column added');
        } else {
            console.log('✅ Status column already exists');
        }

        // 4. Update existing users with proper roles
        console.log('2️⃣ Updating user roles...');
        await db.execute("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@hunyhuny.com'");
        await db.execute("UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''");
        console.log('✅ User roles updated');

        // 5. Check stock_batches table
        console.log('3️⃣ Checking stock_batches table...');
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
        console.log('4️⃣ Final verification...');
        const [finalUsers] = await db.execute("SELECT id, name, email, role, status FROM users LIMIT 5");
        console.log('👥 Users:');
        finalUsers.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - ${user.role} - ${user.status}`);
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