require('dotenv').config();
const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
});

console.log('🔍 Testing database connection and user query...');

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Database connected successfully');
    
    // Test the exact query from auth controller
    const userQuery = `
        SELECT u.*, r.name as role_name, r.display_name as role_display_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
    `;
    
    console.log('🔍 Testing user query for: admin@hunyhuny.com');
    
    db.query(userQuery, ['admin@hunyhuny.com'], (err, users) => {
        if (err) {
            console.error('❌ User query failed:', err.message);
            console.error('❌ Full error:', err);
        } else {
            console.log('✅ User query successful');
            console.log('📊 Results count:', users.length);
            
            if (users.length > 0) {
                const user = users[0];
                console.log('👤 User found:', {
                    id: user.id,
                    email: user.email,
                    status: user.status,
                    role_name: user.role_name,
                    has_password: !!user.password,
                    has_password_hash: !!user.password_hash
                });
                
                // Test password check
                if (user.password) {
                    console.log('🔍 Plain password check:', user.password === 'gfx998sd' ? 'MATCH' : 'NO MATCH');
                }
            } else {
                console.log('❌ No user found with email: admin@hunyhuny.com');
                
                // Check what users exist
                db.query('SELECT email, status FROM users LIMIT 5', (err, allUsers) => {
                    if (!err) {
                        console.log('📋 Available users:', allUsers);
                    }
                });
            }
        }
        
        db.end();
    });
});