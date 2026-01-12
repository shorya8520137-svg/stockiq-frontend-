require('dotenv').config();
const mysql = require('mysql2');

console.log('🔍 Testing database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.code, err.message);
        console.error('❌ Full error:', err);
    } else {
        console.log('✅ Database connected successfully!');
        
        // Test a simple query
        db.query('SELECT 1 as test', (err, results) => {
            if (err) {
                console.error('❌ Query failed:', err.message);
            } else {
                console.log('✅ Query successful:', results);
            }
            db.end();
        });
    }
});