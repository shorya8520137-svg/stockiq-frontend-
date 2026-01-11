#!/usr/bin/env node

const db = require('./db/connection');
const bcrypt = require('bcrypt');

async function fixFrontendDataIssues() {
    try {
        console.log('🔧 Fixing frontend data display issues...\n');
        
        // 1. Check database connection
        console.log('1️⃣ Testing database connection...');
        await db.execute('SELECT 1');
        console.log('✅ Database connection successful\n');
        
        // 2. Check for users
        console.log('2️⃣ Checking user accounts...');
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        const userCount = users[0].count;
        
        if (userCount === 0) {
            console.log('👤 No users found. Creating test user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await db.execute(`
                INSERT INTO users (name, email, password, role, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['Test Admin', 'admin@test.com', hashedPassword, 'SUPER_ADMIN', 1]);
            
            console.log('✅ Test user created!');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: admin123\n');
        } else {
            console.log(`✅ Found ${userCount} users in database\n`);
        }
        
        // 3. Check inventory data
        console.log('3️⃣ Checking inventory data...');
        const [inventory] = await db.execute('SELECT COUNT(*) as count FROM stock_batches WHERE status = "active"');
        const inventoryCount = inventory[0].count;
        console.log(`📦 Found ${inventoryCount} active inventory items`);
        
        if (inventoryCount === 0) {
            console.log('⚠️ No inventory data found. Adding sample data...');
            await db.execute(`
                INSERT INTO stock_batches (barcode, product_name, variant, warehouse, qty_available, status, created_at)
                VALUES 
                ('TEST001', 'Sample Product 1', 'Red', 'GGM_WH', 100, 'active', NOW()),
                ('TEST002', 'Sample Product 2', 'Blue', 'BLR_WH', 50, 'active', NOW()),
                ('TEST003', 'Sample Product 3', '', 'MUM_WH', 75, 'active', NOW())
            `);
            console.log('✅ Sample inventory data added\n');
        } else {
            console.log('✅ Inventory data exists\n');
        }
        
        // 4. Check products table
        console.log('4️⃣ Checking products table...');
        try {
            const [products] = await db.execute('SELECT COUNT(*) as count FROM products');
            const productCount = products[0].count;
            console.log(`🛍️ Found ${productCount} products`);
            
            if (productCount === 0) {
                console.log('⚠️ No products found. Adding sample products...');
                await db.execute(`
                    INSERT INTO products (name, category, barcode, price, is_active, created_at)
                    VALUES 
                    ('Sample Product 1', 'Electronics', 'TEST001', 99.99, 1, NOW()),
                    ('Sample Product 2', 'Clothing', 'TEST002', 49.99, 1, NOW()),
                    ('Sample Product 3', 'Home', 'TEST003', 29.99, 1, NOW())
                `);
                console.log('✅ Sample products added\n');
            } else {
                console.log('✅ Products data exists\n');
            }
        } catch (error) {
            console.log('⚠️ Products table might not exist, skipping...\n');
        }
        
        // 5. Test API endpoints
        console.log('5️⃣ Testing API endpoints...');
        
        // Test inventory endpoint
        const inventoryController = require('./controllers/inventoryController');
        console.log('📦 Testing inventory API...');
        
        const mockReq = {
            query: { limit: '10' }
        };
        
        const mockRes = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                if (Array.isArray(data)) {
                    console.log(`✅ Inventory API returned ${data.length} items`);
                } else {
                    console.log('✅ Inventory API response:', typeof data);
                }
                return this;
            }
        };
        
        await inventoryController.getInventory(mockReq, mockRes);
        
        // 6. Check JWT secret
        console.log('\n6️⃣ Checking JWT configuration...');
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret === 'your-secret-key') {
            console.log('⚠️ JWT_SECRET not properly configured in .env');
            console.log('💡 Add this to your .env file: JWT_SECRET=your-super-secret-key-here');
        } else {
            console.log('✅ JWT_SECRET is configured');
        }
        
        console.log('\n🎉 Frontend data issues check completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Login to frontend with: admin@test.com / admin123');
        console.log('2. Check if data appears in inventory section');
        console.log('3. If still no data, check browser console for errors');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

fixFrontendDataIssues();