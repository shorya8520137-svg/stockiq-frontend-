#!/usr/bin/env node

console.log('🔍 Diagnosing frontend data display issues...\n');

// 1. Check server configuration
console.log('1️⃣ Server Configuration:');
console.log('   Port:', process.env.PORT || 5000);
console.log('   Node Environment:', process.env.NODE_ENV || 'development');
console.log('   JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Not set');

// 2. Check database connection
console.log('\n2️⃣ Database Connection:');
const db = require('./db/connection');

db.execute('SELECT 1')
    .then(() => {
        console.log('   ✅ Database connection successful');
        return checkData();
    })
    .catch(error => {
        console.log('   ❌ Database connection failed:', error.message);
        process.exit(1);
    });

async function checkData() {
    try {
        // Check users
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        console.log(`   📊 Users in database: ${users[0].count}`);
        
        // Check inventory
        const [inventory] = await db.execute('SELECT COUNT(*) as count FROM stock_batches WHERE status = "active"');
        console.log(`   📦 Active inventory items: ${inventory[0].count}`);
        
        // Sample inventory data
        const [sampleInventory] = await db.execute('SELECT barcode, product_name, warehouse, qty_available FROM stock_batches WHERE status = "active" LIMIT 3');
        if (sampleInventory.length > 0) {
            console.log('   📋 Sample inventory:');
            sampleInventory.forEach(item => {
                console.log(`      - ${item.product_name} (${item.barcode}) - ${item.warehouse}: ${item.qty_available} units`);
            });
        }
        
        console.log('\n3️⃣ API Endpoint Test:');
        
        // Test inventory API
        const inventoryController = require('./controllers/inventoryController');
        
        const mockReq = {
            query: { limit: '5' }
        };
        
        let apiResponse = null;
        const mockRes = {
            json: function(data) {
                apiResponse = data;
                return this;
            },
            status: function(code) {
                this.statusCode = code;
                return this;
            }
        };
        
        await inventoryController.getInventory(mockReq, mockRes);
        
        if (apiResponse && Array.isArray(apiResponse)) {
            console.log(`   ✅ Inventory API working - returned ${apiResponse.length} items`);
            if (apiResponse.length > 0) {
                console.log('   📋 Sample API response:');
                console.log('      ', JSON.stringify(apiResponse[0], null, 6));
            }
        } else {
            console.log('   ❌ Inventory API not returning expected data');
            console.log('   📋 Actual response:', apiResponse);
        }
        
        console.log('\n4️⃣ Frontend Configuration Issues:');
        console.log('   🌐 Frontend API URL: https://13-201-222-24.nip.io/api');
        console.log('   🖥️ Server running on: http://localhost:5000');
        console.log('   ⚠️ POTENTIAL ISSUE: URL mismatch!');
        
        console.log('\n5️⃣ Recommendations:');
        console.log('   1. Update frontend API URL to match your server');
        console.log('   2. Create a test user: admin@test.com / admin123');
        console.log('   3. Temporarily remove auth from search routes');
        console.log('   4. Check browser console for CORS errors');
        
        console.log('\n🔧 Quick fixes to try:');
        console.log('   node fix-frontend-data-issues.js    # Create test user & data');
        console.log('   node remove-auth-temporarily.js     # Remove auth temporarily');
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error.message);
    } finally {
        process.exit(0);
    }
}