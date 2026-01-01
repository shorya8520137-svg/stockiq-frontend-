require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing database setup script...');

try {
    // Test reading the SQL file
    const sqlFile = path.join(__dirname, 'database-setup.sql');
    console.log('📁 SQL file path:', sqlFile);
    
    if (!fs.existsSync(sqlFile)) {
        console.error('❌ SQL file does not exist!');
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ SQL file read successfully');
    console.log('📊 File size:', sql.length, 'characters');
    console.log('📋 First 100 characters:', sql.substring(0, 100));
    
    // Test environment variables
    console.log('🔧 Environment variables:');
    console.log('   DB_HOST:', process.env.DB_HOST);
    console.log('   DB_PORT:', process.env.DB_PORT);
    console.log('   DB_USER:', process.env.DB_USER);
    console.log('   DB_NAME:', process.env.DB_NAME);
    console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
    
    console.log('✅ Test completed successfully!');
    console.log('🚀 Run: node setup-database.js');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}