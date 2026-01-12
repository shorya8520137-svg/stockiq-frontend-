require('dotenv').config();
const mysql = require('mysql2');

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
    timeout: 10000,
    reconnect: true
};

// ✅ Create MySQL connection
let db = mysql.createConnection(connectionConfig);

// ✅ Handle connection errors and reconnection
function handleDisconnect() {
    db.on('error', function(err) {
        console.error('Database connection error:', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('🔄 Reconnecting to database...');
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

// ✅ Connect and log status
db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        setTimeout(handleDisconnect, 2000);
    } else {
        console.log('✅ Connected to MySQL Database:', process.env.DB_HOST);
        handleDisconnect();
    }
});

module.exports = db;