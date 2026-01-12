#!/usr/bin/env node

/**
 * Debug script to check inventory data in database
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306,
    multipleStatements: true
};

async function debugInventoryData() {
    let connection;
    
    try {
        console.log('🔍 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check if stock_batches table exists
        console.log('\n📋 Checking if stock_batches table exists...');
        const [tables] = await connection.execute("SHOW TABLES LIKE 'stock_batches'");
        console.log('Tables found:', tables);

        if (tables.length === 0) {
            console.log('❌ stock_batches table does not exist!');
            
            // Check what tables do exist
            console.log('\n📋 Available tables:');
            const [allTables] = await connection.execute('SHOW TABLES');
            console.log(allTables);
            return;
        }

        // Check table structure
        console.log('\n🏗️ Table structure:');
        const [structure] = await connection.execute('DESCRIBE stock_batches');
        console.log(structure);

        // Check total count
        console.log('\n📊 Total records in stock_batches:');
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM stock_batches');
        console.log('Total records:', countResult[0].total);

        if (countResult[0].total === 0) {
            console.log('❌ No data in stock_batches table!');
            console.log('💡 You need to add some inventory data first.');
            return;
        }

        // Check active records
        console.log('\n📊 Active records:');
        const [activeResult] = await connection.execute("SELECT COUNT(*) as active FROM stock_batches WHERE status = 'active'");
        console.log('Active records:', activeResult[0].active);

        // Sample data
        console.log('\n📋 Sample data (first 5 records):');
        const [sampleData] = await connection.execute('SELECT * FROM stock_batches LIMIT 5');
        console.log(sampleData);

        // Check warehouses
        console.log('\n🏢 Available warehouses:');
        const [warehouses] = await connection.execute('SELECT DISTINCT warehouse FROM stock_batches WHERE warehouse IS NOT NULL');
        console.log(warehouses);

        // Test the exact query from inventory controller
        console.log('\n🔍 Testing inventory controller query:');
        const testQuery = `
            SELECT
                barcode,
                product_name,
                variant,
                warehouse,
                SUM(qty_available) AS stock,
                MAX(created_at) AS updated_at
            FROM stock_batches
            WHERE status = 'active'
            GROUP BY barcode, product_name, variant, warehouse
            ORDER BY product_name ASC LIMIT 20 OFFSET 0
        `;
        
        const [testResult] = await connection.execute(testQuery);
        console.log('Query result:', testResult.length, 'records');
        if (testResult.length > 0) {
            console.log('Sample result:', testResult[0]);
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

debugInventoryData();