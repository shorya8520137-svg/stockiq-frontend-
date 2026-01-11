#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306,
    multipleStatements: true
};

async function setupDispatchTables() {
    let connection;
    
    try {
        console.log('🔧 Setting up dispatch tables...');
        
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected');
        
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'fix-dispatch-tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Execute the SQL
        console.log('📝 Executing SQL commands...');
        await connection.execute(sql);
        
        console.log('✅ Dispatch tables created successfully!');
        
        // Verify tables were created
        console.log('\n🔍 Verifying tables...');
        
        const [warehouses] = await connection.execute('SELECT COUNT(*) as count FROM dispatch_warehouse');
        console.log(`✅ dispatch_warehouse: ${warehouses[0].count} records`);
        
        const [persons] = await connection.execute('SELECT COUNT(*) as count FROM processed_persons');
        console.log(`✅ processed_persons: ${persons[0].count} records`);
        
        const [logistics] = await connection.execute('SELECT COUNT(*) as count FROM logistics');
        console.log(`✅ logistics: ${logistics[0].count} records`);
        
        console.log('\n🎉 Setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        
        if (error.code === 'ETIMEDOUT') {
            console.log('\n💡 Database connection timed out. This might be due to:');
            console.log('   - Network connectivity issues');
            console.log('   - Database server being down');
            console.log('   - Firewall blocking the connection');
            console.log('\n🔧 You can run the SQL manually:');
            console.log('   1. Connect to your database using MySQL client');
            console.log('   2. Run the commands from fix-dispatch-tables.sql');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDispatchTables();