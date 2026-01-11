#!/usr/bin/env node

const db = require('./db/connection');
const bcrypt = require('bcrypt');

async function checkAndCreateUser() {
    try {
        console.log('🔍 Checking for existing users...');
        
        // Check if users exist
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        const userCount = users[0].count;
        
        console.log(`📊 Found ${userCount} users in database`);
        
        if (userCount === 0) {
            console.log('👤 No users found. Creating test user...');
            
            // Create a test user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await db.execute(`
                INSERT INTO users (name, email, password, role, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, ['Test Admin', 'admin@test.com', hashedPassword, 'SUPER_ADMIN', 1]);
            
            console.log('✅ Test user created successfully!');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: admin123');
            console.log('👑 Role: SUPER_ADMIN');
        } else {
            console.log('📋 Existing users:');
            const [allUsers] = await db.execute('SELECT id, name, email, role, is_active FROM users LIMIT 5');
            allUsers.forEach(user => {
                console.log(`   - ${user.name} (${user.email}) - ${user.role} - ${user.is_active ? 'Active' : 'Inactive'}`);
            });
        }
        
        // Test login endpoint
        console.log('\n🧪 Testing login endpoint...');
        const authController = require('./controllers/authController');
        
        // Mock request and response objects
        const mockReq = {
            body: {
                email: 'admin@test.com',
                password: 'admin123'
            }
        };
        
        const mockRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log(`📤 Login response (${this.statusCode}):`, JSON.stringify(data, null, 2));
                return this;
            }
        };
        
        await authController.login(mockReq, mockRes);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

checkAndCreateUser();