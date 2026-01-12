require('dotenv').config();
const mysql = require('mysql2/promise');

// ✅ Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ Missing DB credentials in environment');
    process.exit(1);
}

// ✅ Connection configuration
const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000
};

// ✅ Create MySQL connection pool for better performance
const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database:', process.env.DB_HOST);
        connection.release();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();

// Export both pool and legacy callback interface for backward compatibility
module.exports = pool;

// Legacy callback interface for existing code
module.exports.query = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    
    pool.execute(sql, params)
        .then(([rows, fields]) => callback(null, rows, fields))
        .catch(err => callback(err));
};