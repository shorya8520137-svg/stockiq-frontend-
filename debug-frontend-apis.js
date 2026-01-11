#!/usr/bin/env node

// Debug script to test all frontend API configurations
const https = require('https');
const http = require('http');

const API_BASE = 'https://13-201-222-24.nip.io/api';

console.log('🔍 Frontend API Debug Tool');
console.log('==========================');
console.log(`🌐 Testing API: ${API_BASE}`);
console.log('');

// Test API endpoints
const endpoints = [
    { name: 'Health Check', url: `${API_BASE.replace('/api', '')}/` },
    { name: 'API Health', url: `${API_BASE}` },
    { name: 'Inventory', url: `${API_BASE}/inventory?limit=5` },
    { name: 'Products', url: `${API_BASE}/products?limit=5` },
    { name: 'Categories', url: `${API_BASE}/products/categories/all` },
    { name: 'Warehouses', url: `${API_BASE}/products/warehouses` },
    { name: 'Dispatch Warehouses', url: `${API_BASE}/dispatch/warehouses` }
];

// Test login
async function testLogin() {
    return new Promise((resolve) => {
        const loginData = JSON.stringify({
            email: 'admin@hunyhuny.com',
            password: 'gfx998sd'
        });

        const options = {
            hostname: '13-201-222-24.nip.io',
            port: 443,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            resolve({ status: 0, error: error.message });
        });

        req.write(loginData);
        req.end();
    });
}

// Test endpoint
async function testEndpoint(name, url) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ 
                        name, 
                        status: res.statusCode, 
                        success: res.statusCode === 200,
                        dataType: Array.isArray(result) ? `array[${result.length}]` : typeof result,
                        hasData: Array.isArray(result) ? result.length > 0 : !!result
                    });
                } catch (e) {
                    resolve({ 
                        name, 
                        status: res.statusCode, 
                        success: res.statusCode === 200,
                        dataType: 'text',
                        hasData: !!data
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({ 
                name, 
                status: 0, 
                success: false, 
                error: error.message 
            });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            resolve({ 
                name, 
                status: 0, 
                success: false, 
                error: 'Timeout' 
            });
        });

        req.end();
    });
}

// Run all tests
async function runTests() {
    console.log('🔐 Testing Authentication...');
    const loginResult = await testLogin();
    
    if (loginResult.status === 200 && loginResult.data.token) {
        console.log('✅ Login successful!');
        console.log(`   Token: ${loginResult.data.token.substring(0, 20)}...`);
        console.log(`   User: ${loginResult.data.user?.name || 'Unknown'}`);
    } else {
        console.log('❌ Login failed!');
        console.log(`   Status: ${loginResult.status}`);
        console.log(`   Response: ${JSON.stringify(loginResult.data)}`);
    }
    
    console.log('');
    console.log('📡 Testing API Endpoints...');
    
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint.name, endpoint.url);
        
        if (result.success) {
            console.log(`✅ ${result.name}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Data: ${result.dataType}`);
            console.log(`   Has Data: ${result.hasData ? 'Yes' : 'No'}`);
        } else {
            console.log(`❌ ${result.name}`);
            console.log(`   Status: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }
        console.log('');
    }
    
    console.log('🎯 Frontend Configuration Check:');
    console.log(`   API Base URL: ${API_BASE}`);
    console.log(`   WebSocket URL: https://13-201-222-24.nip.io`);
    console.log('');
    console.log('💡 If APIs are working but frontend shows no data:');
    console.log('   1. Clear browser localStorage');
    console.log('   2. Hard refresh (Ctrl+Shift+R)');
    console.log('   3. Check browser console for errors');
    console.log('   4. Verify login credentials');
}

runTests().catch(console.error);