#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE = 'https://13-201-222-24.nip.io/api';

// Database configuration
const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306
};

async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing database connection...');
        const connection = await mysql.createConnection(dbConfig);
        
        // Test basic query
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log('✅ Database connection successful. Users count:', rows[0].count);
        
        await connection.end();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function testUserCreationAPI() {
    try {
        console.log('🔍 Testing user creation API...');
        
        // First, login to get a token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@hunyhuny.com',
            password: 'gfx998sd'
        });
        
        console.log('✅ Login successful');
        const token = loginResponse.data.token;
        
        // Get current user count
        console.log('📊 Getting current user count...');
        const usersBeforeResponse = await axios.get(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userCountBefore = usersBeforeResponse.data.data.length;
        console.log('📊 Users before creation:', userCountBefore);
        
        // Create a test user
        const testUserData = {
            name: 'API Test User ' + Date.now(),
            email: `apitest${Date.now()}@example.com`,
            password: 'testpass123',
            role_id: 2 // Manager role
        };
        
        console.log('👤 Creating test user:', testUserData.name, testUserData.email);
        const createUserResponse = await axios.post(`${API_BASE}/users`, testUserData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ User creation API response:', createUserResponse.data);
        
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify user was created by fetching users list
        console.log('📋 Fetching updated users list...');
        const usersAfterResponse = await axios.get(`${API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const userCountAfter = usersAfterResponse.data.data.length;
        console.log('📊 Users after creation:', userCountAfter);
        
        if (userCountAfter > userCountBefore) {
            console.log('✅ User count increased - user was successfully created in database');
            
            // Find our created user
            const createdUser = usersAfterResponse.data.data.find(user => 
                user.email === testUserData.email
            );
            
            if (createdUser) {
                console.log('✅ Created user found in database:', {
                    id: createdUser.id,
                    name: createdUser.name,
                    email: createdUser.email,
                    role: createdUser.role_name
                });
                return true;
            } else {
                console.log('❌ Created user not found in users list');
                return false;
            }
        } else {
            console.log('❌ User count did not increase - user was not created in database');
            return false;
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('💡 Authentication failed - check credentials');
        }
        return false;
    }
}

async function testDirectDatabaseInsert() {
    try {
        console.log('🔍 Testing direct database insert...');
        const connection = await mysql.createConnection(dbConfig);
        
        const testUser = {
            name: 'Direct DB Test User ' + Date.now(),
            email: `dbtest${Date.now()}@example.com`,
            password_hash: '$2a$10$test.hash.for.testing.purposes.only',
            role_id: 2,
            status: 'active'
        };
        
        console.log('💾 Inserting user directly into database...');
        const [result] = await connection.execute(`
            INSERT INTO users (name, email, password_hash, role_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [testUser.name, testUser.email, testUser.password_hash, testUser.role_id, testUser.status]);
        
        console.log('✅ Direct database insert successful. User ID:', result.insertId);
        
        // Verify the insert
        const [verifyResult] = await connection.execute(
            'SELECT id, name, email, role_id FROM users WHERE id = ?',
            [result.insertId]
        );
        
        if (verifyResult.length > 0) {
            console.log('✅ User verified in database:', verifyResult[0]);
        } else {
            console.log('❌ User not found after insert');
        }
        
        await connection.end();
        return true;
    } catch (error) {
        console.error('❌ Direct database insert failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting comprehensive user creation tests...\n');
    
    const dbTest = await testDatabaseConnection();
    console.log('');
    
    const directDbTest = await testDirectDatabaseInsert();
    console.log('');
    
    const apiTest = await testUserCreationAPI();
    console.log('');
    
    console.log('📊 TEST RESULTS:');
    console.log('Database Connection:', dbTest ? '✅ PASS' : '❌ FAIL');
    console.log('Direct DB Insert:', directDbTest ? '✅ PASS' : '❌ FAIL');
    console.log('API User Creation:', apiTest ? '✅ PASS' : '❌ FAIL');
    
    if (dbTest && directDbTest && apiTest) {
        console.log('\n🎉 ALL TESTS PASSED! User creation is working correctly.');
    } else {
        console.log('\n❌ Some tests failed. Check the logs above for details.');
    }
}

// Run all tests
runAllTests().catch(console.error);