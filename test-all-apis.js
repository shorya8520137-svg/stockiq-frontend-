#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration - Update this to match your server
const BASE_URL = 'http://localhost:5000'; // Change to your AWS server URL
const API_BASE = `${BASE_URL}/api`;

console.log('🚀 Complete API Testing Suite');
console.log('=============================');
console.log(`🌐 Base URL: ${API_BASE}`);
console.log('');

let authToken = null;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: headers
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Authentication test
async function testAuthentication() {
    console.log('🔐 Testing Authentication');
    console.log('========================');
    
    const loginData = {
        email: 'admin@test.com',
        password: 'admin123'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: loginData
        });
        
        console.log(`Login Status: ${result.status}`);
        
        if (result.status === 200 && result.data.token) {
            authToken = result.data.token;
            console.log(`✅ Login successful! Token obtained.`);
            console.log(`👤 User: ${result.data.user?.name || 'Unknown'}`);
            console.log(`🎭 Role: ${result.data.user?.role || 'Unknown'}`);
        } else {
            console.log(`❌ Login failed:`, result.data);
        }
        
    } catch (error) {
        console.log(`❌ Login request failed: ${error.message}`);
    }
    
    console.log('');
}

// Quick API tests
async function quickAPITests() {
    const tests = [
        // Inventory APIs
        {
            name: '📦 Inventory - Get All',
            url: `${API_BASE}/inventory?limit=5`,
            expectArray: true
        },
        {
            name: '📦 Inventory - By Warehouse',
            url: `${API_BASE}/inventory?warehouse=GGM_WH&limit=3`,
            expectArray: true
        },
        
        // Products APIs
        {
            name: '🛍️ Products - Get All',
            url: `${API_BASE}/products?limit=5`,
            expectArray: true
        },
        {
            name: '🛍️ Products - Categories',
            url: `${API_BASE}/products/categories/all`,
            expectArray: true
        },
        {
            name: '🏢 Products - Warehouses',
            url: `${API_BASE}/products/warehouses`,
            expectArray: true
        },
        
        // Search APIs (may require auth)
        {
            name: '🔍 Search - Popular',
            url: `${API_BASE}/search/popular?limit=5`,
            expectArray: true,
            requiresAuth: true
        },
        {
            name: '🔍 Search - Suggestions',
            url: `${API_BASE}/search/suggestions?query=test&limit=3`,
            expectArray: true,
            requiresAuth: true
        }
    ];
    
    console.log('⚡ Quick API Tests');
    console.log('=================');
    
    for (const test of tests) {
        try {
            if (test.requiresAuth && !authToken) {
                console.log(`⏭️ ${test.name} - Skipped (requires auth)`);
                continue;
            }
            
            const result = await makeRequest(test.url);
            
            console.log(`${test.name}`);
            console.log(`   Status: ${result.status}`);
            
            if (result.status === 200) {
                if (test.expectArray && Array.isArray(result.data)) {
                    console.log(`   ✅ Success - ${result.data.length} items`);
                    if (result.data.length > 0) {
                        const sample = result.data[0];
                        const keys = Object.keys(sample).slice(0, 3);
                        console.log(`   📋 Sample fields: ${keys.join(', ')}`);
                    }
                } else if (typeof result.data === 'object') {
                    console.log(`   ✅ Success - Object response`);
                } else {
                    console.log(`   ✅ Success - ${typeof result.data}`);
                }
            } else if (result.status === 401) {
                console.log(`   🔒 Unauthorized - Auth required`);
            } else {
                console.log(`   ❌ Error ${result.status}:`, result.data?.message || 'Unknown error');
            }
            
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
        
        console.log('');
    }
}

// Test data creation
async function testDataCreation() {
    console.log('🏗️ Testing Data Creation');
    console.log('========================');
    
    // Test creating a product
    const productData = {
        name: 'API Test Product',
        category: 'Test Category',
        barcode: `TEST_${Date.now()}`,
        price: 29.99,
        description: 'Created via API test'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/products`, {
            method: 'POST',
            body: productData
        });
        
        console.log(`Create Product Status: ${result.status}`);
        if (result.status === 201) {
            console.log(`✅ Product created successfully!`);
            console.log(`   ID: ${result.data.id}`);
            console.log(`   Barcode: ${result.data.barcode}`);
        } else {
            console.log(`❌ Product creation failed:`, result.data);
        }
        
    } catch (error) {
        console.log(`❌ Product creation request failed: ${error.message}`);
    }
    
    console.log('');
}

// Server health check
async function healthCheck() {
    console.log('🏥 Server Health Check');
    console.log('=====================');
    
    try {
        const result = await makeRequest(`${BASE_URL}/health`);
        console.log(`Health Status: ${result.status}`);
        console.log(`Response:`, result.data);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    console.log('');
}

// Main test runner
async function runAllTests() {
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
    
    // 1. Health check
    await healthCheck();
    
    // 2. Authentication
    await testAuthentication();
    
    // 3. Quick API tests
    await quickAPITests();
    
    // 4. Data creation tests
    await testDataCreation();
    
    console.log('🎉 All API tests completed!');
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   🔐 Auth Token: ${authToken ? 'Available' : 'Not available'}`);
    console.log(`   🌐 Server URL: ${BASE_URL}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Check which APIs returned data');
    console.log('   2. Fix any 401/403 errors by ensuring proper auth');
    console.log('   3. Add sample data if APIs return empty arrays');
    console.log('   4. Update frontend API URLs to match server');
}

// Handle command line arguments
if (process.argv.length > 2) {
    const customUrl = process.argv[2];
    console.log(`🔧 Using custom URL: ${customUrl}`);
    // You can update BASE_URL here if needed
}

runAllTests().catch(console.error);