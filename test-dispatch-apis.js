#!/usr/bin/env node

// Test dispatch APIs to ensure they're working

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306
};

async function testDispatchAPIs() {
    try {
        console.log('🔧 Testing dispatch APIs...');
        
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected');
        
        // Test warehouses query
        try {
            const [warehouses] = await connection.execute(
                'SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name LIMIT 5'
            );
            console.log(`✅ Warehouses query: Found ${warehouses.length} warehouses`);
            if (warehouses.length > 0) {
                console.log(`   Sample: ${warehouses[0].warehouse_code}`);
            }
        } catch (error) {
            console.log('❌ Warehouses query failed:', error.message);
            
            // Check if table exists
            try {
                const [tables] = await connection.execute(
                    "SHOW TABLES LIKE 'dispatch_warehouse'"
                );
                if (tables.length === 0) {
                    console.log('💡 Table "dispatch_warehouse" does not exist');
                }
            } catch (e) {
                console.log('💡 Could not check table existence');
            }
        }
        
        // Test processed persons query
        try {
            const [persons] = await connection.execute(
                'SELECT name FROM processed_persons ORDER BY name LIMIT 5'
            );
            console.log(`✅ Processed persons query: Found ${persons.length} persons`);
            if (persons.length > 0) {
                console.log(`   Sample: ${persons[0].name}`);
            }
        } catch (error) {
            console.log('❌ Processed persons query failed:', error.message);
            
            // Check if table exists
            try {
                const [tables] = await connection.execute(
                    "SHOW TABLES LIKE 'processed_persons'"
                );
                if (tables.length === 0) {
                    console.log('💡 Table "processed_persons" does not exist');
                }
            } catch (e) {
                console.log('💡 Could not check table existence');
            }
        }
        
        // Show all tables for debugging
        try {
            const [tables] = await connection.execute('SHOW TABLES');
            console.log(`\n📋 Available tables (${tables.length}):`);
            tables.slice(0, 10).forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
            if (tables.length > 10) {
                console.log(`   ... and ${tables.length - 10} more`);
            }
        } catch (error) {
            console.log('❌ Could not list tables:', error.message);
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

testDispatchAPIs();