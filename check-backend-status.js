#!/usr/bin/env node

/**
 * Check backend server status
 */

async function checkBackendStatus() {
    const backendUrl = 'https://13-201-222-24.nip.io';
    
    console.log('🔍 Checking backend server status...\n');
    
    // Test basic connectivity
    try {
        console.log('📡 Testing basic connectivity...');
        const response = await fetch(backendUrl, { 
            method: 'GET',
            timeout: 10000 
        });
        console.log(`✅ Server responding: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.log(`❌ Server not responding: ${error.message}`);
        return false;
    }
    
    // Test health endpoint
    try {
        console.log('\n🏥 Testing health endpoint...');
        const healthResponse = await fetch(`${backendUrl}/api/health`, {
            method: 'GET',
            timeout: 10000
        });
        console.log(`Health status: ${healthResponse.status}`);
        
        if (healthResponse.ok) {
            const data = await healthResponse.text();
            console.log('Health response:', data);
        }
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    // Test login endpoint
    try {
        console.log('\n🔐 Testing login endpoint...');
        const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@hunyhuny.com',
                password: 'gfx998sd'
            }),
            timeout: 10000
        });
        console.log(`Login status: ${loginResponse.status}`);
        
        const loginText = await loginResponse.text();
        console.log('Login response preview:', loginText.substring(0, 200));
    } catch (error) {
        console.log(`❌ Login test failed: ${error.message}`);
    }
    
    return true;
}

if (require.main === module) {
    checkBackendStatus().catch(console.error);
}

module.exports = { checkBackendStatus };