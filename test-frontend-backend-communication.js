#!/usr/bin/env node

/**
 * TEST FRONTEND-BACKEND COMMUNICATION
 * Run this script to verify the fixes are working
 */

const https = require('https');

const API_BASE = 'https://13-201-222-24.nip.io/api';
const TEST_CREDENTIALS = {
    email: 'admin@hunyhuny.com',
    password: 'gfx998sd'
};

async function testAPI() {
    console.log('🧪 TESTING FRONTEND-BACKEND COMMUNICATION...\n');
    
    try {
        // 1. Test Login
        console.log('1️⃣ Testing login...');
        const loginResponse = await makeRequest('/auth/login', 'POST', TEST_CREDENTIALS);
        
        if (!loginResponse.success || !loginResponse.token) {
            throw new Error('Login failed: ' + JSON.stringify(loginResponse));
        }
        
        const token = loginResponse.token;
        console.log('✅ Login successful, token received');
        
        // 2. Test Inventory API with Auth
        console.log('\n2️⃣ Testing inventory API with authentication...');
        const inventoryResponse = await makeRequest('/inventory?limit=5', 'GET', null, token);
        
        if (!inventoryResponse.success) {
            throw new Error('Inventory API failed: ' + JSON.stringify(inventoryResponse));
        }
        
        console.log('✅ Inventory API working:', inventoryResponse.data?.length || 0, 'items');
        
        // 3. Test Products API with Auth
        console.log('\n3️⃣ Testing products API with authentication...');
        const productsResponse = await makeRequest('/products?limit=5', 'GET', null, token);
        
        if (!productsResponse.success && !Array.isArray(productsResponse)) {
            throw new Error('Products API failed: ' + JSON.stringify(productsResponse));
        }
        
        console.log('✅ Products API working');
        
        // 4. Test Search API
        console.log('\n4️⃣ Testing search API...');
        const searchResponse = await makeRequest('/search/popular?limit=5', 'GET', null, token);
        
        if (!searchResponse.success) {
            throw new Error('Search API failed: ' + JSON.stringify(searchResponse));
        }
        
        console.log('✅ Search API working');
        
        console.log('\n🎉 ALL TESTS PASSED! Frontend-backend communication is working.');
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        process.exit(1);
    }
}

function makeRequest(endpoint, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + endpoint);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    resolve({ success: false, error: 'Invalid JSON response' });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run tests
testAPI();
