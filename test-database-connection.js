#!/usr/bin/env node

/**
 * Test database connection and basic queries
 */

const db = require('./db/connection');

async function testDatabase() {
    console.log('🔍 TESTING DATABASE CONNECTION...\n');
    
    try {
        // 1. Test basic connection
        console.log('1️⃣ Testing database connection...');
        const [result] = await db.execute('SELECT 1 as test');
        console.log('✅ Database connection successful:', result);
        
        // 2. Test if stock_batches table exists
        console.log('\n2️⃣ Testing stock_batches table...');
        const [tables] = await db.execute("SHOW TABLES LIKE 'stock_batches'");
        if (tables.length === 0) {
            console.log('❌ stock_batches table does not exist!');
            console.log('📋 Available tables:');
            const [allTables] = await db.execute('SHOW TABLES');
            allTables.forEach(table => {
                console.log('  -', Object.values(table)[0]);
            });
        } else {
            console.log('✅ stock_batches table exists');
            
            // 3. Test table structure
            console.log('\n3️⃣ Testing table structure...');
            const [columns] = await db.execute('DESCRIBE stock_batches');
            console.log('📋 Table columns:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type}`);
            });
            
            // 4. Test data count
            console.log('\n4️⃣ Testing data count...');
            const [count] = await db.execute("SELECT COUNT(*) as total FROM stock_batches WHERE status = 'active'");
            console.log('📊 Active stock records:', count[0].total);
            
            if (count[0].total > 0) {
                // 5. Test sample query
                console.log('\n5️⃣ Testing sample query...');
                const [sample] = await db.execute(`
                    SELECT 
                        barcode,
                        product_name,
                        warehouse,
                        SUM(qty_available) AS stock
                    FROM stock_batches 
                    WHERE status = 'active' 
                    GROUP BY barcode, product_name, warehouse 
                    LIMIT 3
                `);
                console.log('📋 Sample data:');
                sample.forEach(item => {
                    console.log(`  - ${item.product_name} (${item.barcode}): ${item.stock} in ${item.warehouse}`);
                });
            }
        }
        
        console.log('\n🎉 DATABASE TEST COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ DATABASE TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testDatabase();