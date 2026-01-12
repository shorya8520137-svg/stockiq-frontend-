#!/usr/bin/env node

// Test your REAL backend API endpoints

const https = require('https');
const http = require('http');

const API_BASE = 'https://13-201-222-24.nip.io/api';

console.log('🔧 Testing REAL backend API...');
console.log(`🌐 API Base: ${API_BASE}`);

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = `${API_BASE}${endpoint}`;
        console.log(`\n🔍 Testing: ${url}`);
        
        const protocol = url.startsWith('https') ? https : http;
        
        const req = protocol.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   ✅ Success: ${JSON.stringify(json).substring(0, 100)}...`);
                    } catch (e) {
                        console.log(`   ✅ Success: ${data.substring(0, 100)}...`);
                    }
                } else {
                    console.log(`   ❌ Error: ${data.substring(0, 200)}`);
                }
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ Connection Error: ${error.message}`);
            resolve();
        });
        
        req.setTimeout(10000, () => {
            console.log(`   ⏰ Timeout`);
            req.destroy();
            resolve();
        });
    });
}

async function runTests() {
    console.log('\n📋 Testing critical dispatch endpoints...');
    
    // Test basic health
    await testEndpoint('/');
    
    // Test dispatch endpoints
    await testEndpoint('/dispatch/warehouses');
    await testEndpoint('/dispatch/processed-persons');
    
    // Test other critical endpoints
    await testEndpoint('/auth/verify');
    await testEndpoint('/products');
    
    console.log('\n🎯 Test complete!');
    console.log('\n💡 If all endpoints show errors:');
    console.log('   1. Check if your server is running on port 5000');
    console.log('   2. Check if nginx/proxy is configured correctly');
    console.log('   3. Check server logs: pm2 logs');
    console.log('   4. Verify SSL certificate for https://13-201-222-24.nip.io');
}

runTests();