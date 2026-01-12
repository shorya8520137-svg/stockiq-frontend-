#!/usr/bin/env node

/**
 * Test login functionality after fixes
 */

const API_BASE = process.env.API_BASE || 'https://13-201-222-24.nip.io/api';

async function testLogin() {
    console.log('🧪 Testing login functionality...\n');
    
    const loginData = {
        email: 'admin@hunyhuny.com',
        password: 'gfx998sd'
    };
    
    try {
        console.log('📤 Sending login request...');
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const responseText = await response.text();
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers));
        console.log('📥 Response body:', responseText);
        
        if (response.ok) {
            const data = JSON.parse(responseText);
            console.log('✅ Login successful!');
            console.log('🔑 Token received:', data.token ? 'Yes' : 'No');
            console.log('👤 User data:', data.user);
        } else {
            console.log('❌ Login failed');
            try {
                const errorData = JSON.parse(responseText);
                console.log('💥 Error:', errorData.message);
            } catch (e) {
                console.log('💥 Raw error:', responseText);
            }
        }
        
    } catch (error) {
        console.error('💥 Request failed:', error.message);
    }
}

// Test health endpoint first
async function testHealth() {
    try {
        console.log('🏥 Testing health endpoint...');
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.text();
        console.log('🏥 Health status:', response.status);
        console.log('🏥 Health response:', data);
        console.log('');
    } catch (error) {
        console.error('💥 Health check failed:', error.message);
    }
}

async function runTests() {
    await testHealth();
    await testLogin();
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testLogin, testHealth };