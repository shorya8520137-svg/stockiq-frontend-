#!/usr/bin/env node

const https = require('https');

const API_BASE = 'https://13-201-222-24.nip.io/api';
const TEST_CREDENTIALS = {
    email: 'admin@hunyhuny.com',
    password: 'gfx998sd'
};

async function debugInventoryAPI() {
    console.log('🔍 DEBUGGING INVENTORY API RESPONSE...\n');
    
    try {
        // 1. Login first
        console.log('1️⃣ Getting auth token...');
        const loginResponse = await makeRequest('/auth/login', 'POST', TEST_CREDENTIALS);
        
        if (!loginResponse.success || !loginResponse.token) {
            throw new Error('Login failed: ' + JSON.stringify(loginResponse));
        }
        
        const token = loginResponse.token;
        console.log('✅ Token received:', token.substring(0, 20) + '...');
        
        // 2. Test inventory API and capture raw response
        console.log('\n2️⃣ Testing inventory API...');
        const rawResponse = await makeRawRequest('/inventory?limit=5', 'GET', null, token);
        
        console.log('📄 Raw Response Status:', rawResponse.statusCode);
        console.log('📄 Raw Response Headers:', rawResponse.headers);
        console.log('📄 Raw Response Body:', rawResponse.body);
        
        // Try to parse as JSON
        try {
            const parsed = JSON.parse(rawResponse.body);
            console.log('✅ JSON Parse Success:', parsed);
        } catch (e) {
            console.log('❌ JSON Parse Failed:', e.message);
            console.log('📄 First 500 chars of response:', rawResponse.body.substring(0, 500));
        }
        
    } catch (error) {
        console.error('❌ DEBUG FAILED:', error.message);
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
                    resolve({ success: false, error: 'Invalid JSON response', raw: responseData });
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

function makeRawRequest(endpoint, method = 'GET', data = null, token = null) {
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
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: responseData
                });
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

debugInventoryAPI();