require('dotenv').config();
const mysql = require('mysql2');

// ✅ Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ Missing DB credentials in environment');
    process.exit(1);
}

// ✅ Connection configuration (REMOVED ALL INVALID OPTIONS)
const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
    // REMOVED: acquireTimeout, timeout, reconnect (these cause warnings)
};

// ✅ Create MySQL connection
let db = mysql.createConnection(connectionConfig);

// ✅ Handle connection errors gracefully
function handleDisconnect() {
    db.on('error', function(err) {
        console.error('Database connection error:', err.code, err.message);
        
        if(err.code === 'PROTOCOL_CONNECTION_LOST' || 
           err.code === 'ECONNRESET' || 
           err.code === 'ETIMEDOUT') {
            console.log('🔄 Attempting to reconnect to database...');
            setTimeout(() => {
                db = mysql.createConnection(connectionConfig);
                handleDisconnect();
            }, 2000);
        } else {
            console.error('❌ Fatal database error:', err);
            // Don't crash the server, just log the error
        }
    });
}

// ✅ Connect with timeout handling
db.connect((err) => {
    if (err) {
        console.error('❌ Initial connection failed:', err.message);
        console.log('⚠️ Server will continue without database (using fallback mode)');
        // Don't crash - continue with fallback mode
    } else {
        console.log('✅ Connected to MySQL Database:', process.env.DB_HOST);
    }
    handleDisconnect();
});

// Export connection even if it failed (controllers will handle gracefully)
module.exports = db;