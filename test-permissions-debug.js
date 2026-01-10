#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'https://13-201-222-24.nip.io/api';

async function testPermissionsDebug() {
    try {
        console.log('🔍 Testing permissions debug...');
        
        // First, login to get a token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@hunyhuny.com',
            password: 'gfx998sd'
        });
        
        console.log('✅ Login successful');
        console.log('🔍 User data:', loginResponse.data.user);
        const token = loginResponse.data.token;
        
        // Test the simplified endpoints (no permission checks)
        console.log('\n📋 Testing simplified endpoints...');
        
        try {
            console.log('🔍 Testing /users-test...');
            const usersTestResponse = await axios.get(`${API_BASE}/users-test`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ /users-test successful:', usersTestResponse.data.data.length, 'users');
        } catch (error) {
            console.log('❌ /users-test failed:', error.response?.status, error.response?.data?.message);
        }
        
        try {
            console.log('🔍 Testing /roles-test...');
            const rolesTestResponse = await axios.get(`${API_BASE}/roles-test`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ /roles-test successful:', rolesTestResponse.data.data.length, 'roles');
        } catch (error) {
            console.log('❌ /roles-test failed:', error.response?.status, error.response?.data?.message);
        }
        
        // Test the original endpoints (with permission checks)
        console.log('\n📋 Testing original endpoints...');
        
        try {
            console.log('🔍 Testing /users...');
            const usersResponse = await axios.get(`${API_BASE}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ /users successful:', usersResponse.data.data.length, 'users');
        } catch (error) {
            console.log('❌ /users failed:', error.response?.status, error.response?.data?.message);
        }
        
        try {
            console.log('🔍 Testing /roles...');
            const rolesResponse = await axios.get(`${API_BASE}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ /roles successful:', rolesResponse.data.data.length, 'roles');
        } catch (error) {
            console.log('❌ /roles failed:', error.response?.status, error.response?.data?.message);
        }
        
        // Test user creation with simplified endpoint
        console.log('\n👤 Testing user creation...');
        
        try {
            const testUserData = {
                name: 'Debug Test User ' + Date.now(),
                email: `debugtest${Date.now()}@example.com`,
                password: 'testpass123',
                role_id: 2
            };
            
            console.log('🔍 Creating user with /users-test...');
            const createResponse = await axios.post(`${API_BASE}/users-test`, testUserData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ User creation successful:', createResponse.data);
        } catch (error) {
            console.log('❌ User creation failed:', error.response?.status, error.response?.data?.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testPermissionsDebug();