#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'https://13-201-222-24.nip.io/api';

async function testUserCreation() {
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
        
        // Create a test user
        console.log('👤 Creating test user...');
        const createUserResponse = await axios.post(`${API_BASE}/users`, {
            name: 'Test User ' + Date.now(),
            email: `testuser${Date.now()}@example.com`,
            password: 'testpass123',
            role_id: 2 // Assuming manager role
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ User creation response:', createUserResponse.data);
        
        // Verify user was created by fetching users list
        console.log('📋 Fetching users list...');
        const usersResponse = await axios.get(`${API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Users list fetched:', usersResponse.data.data.length, 'users found');
        
        // Find our created user
        const createdUser = usersResponse.data.data.find(user => 
            user.id === createUserResponse.data.data.id
        );
        
        if (createdUser) {
            console.log('✅ User successfully created and verified in database:', createdUser);
        } else {
            console.log('❌ User not found in database after creation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('💡 Authentication failed - check credentials');
        }
    }
}

// Run the test
testUserCreation();