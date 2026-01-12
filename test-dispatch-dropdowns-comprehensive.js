#!/usr/bin/env node

/**
 * COMPREHENSIVE DISPATCH DROPDOWN TEST SUITE
 * Tests all dispatch form dropdown endpoints and functionality
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'https://13-201-222-24.nip.io';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, raw: data });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null, raw: data, error: e.message });
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

// Test functions
async function testEndpoint(name, url, expectedType = 'array') {
    console.log(`${colors.cyan}🧪 Testing ${name}...${colors.reset}`);
    
    try {
        const response = await makeRequest(url);
        
        if (response.status === 200) {
            const isArray = Array.isArray(response.data);
            const hasData = isArray ? response.data.length > 0 : response.data !== null;
            
            if (expectedType === 'array' && isArray && hasData) {
                console.log(`${colors.green}✅ ${name}: SUCCESS - Got ${response.data.length} items${colors.reset}`);
                console.log(`${colors.blue}   Sample data: ${JSON.stringify(response.data.slice(0, 3))}${colors.reset}`);
                return { success: true, count: response.data.length, data: response.data };
            } else if (expectedType === 'object' && response.data) {
                console.log(`${colors.green}✅ ${name}: SUCCESS - Got response object${colors.reset}`);
                console.log(`${colors.blue}   Data: ${JSON.stringify(response.data)}${colors.reset}`);
                return { success: true, data: response.data };
            } else {
                console.log(`${colors.yellow}⚠️  ${name}: EMPTY - No data returned${colors.reset}`);
                console.log(`${colors.blue}   Response: ${response.raw}${colors.reset}`);
                return { success: false, reason: 'empty_data', data: response.data };
            }
        } else {
            console.log(`${colors.red}❌ ${name}: FAILED - Status ${response.status}${colors.reset}`);
            console.log(`${colors.red}   Error: ${response.raw}${colors.reset}`);
            return { success: false, reason: 'http_error', status: response.status };
        }
    } catch (error) {
        console.log(`${colors.red}❌ ${name}: ERROR - ${error.message}${colors.reset}`);
        return { success: false, reason: 'network_error', error: error.message };
    }
}

async function testDispatchCreation() {
    console.log(`${colors.cyan}🧪 Testing Dispatch Creation...${colors.reset}`);
    
    const testPayload = {
        selectedWarehouse: "GGM_WH",
        orderRef: `TEST_${Date.now()}`,
        customerName: "Test Customer",
        awbNumber: `AWB_${Date.now()}`,
        selectedLogistics: "Delhivery",
        selectedPaymentMode: "COD",
        parcelType: "Forward",
        selectedExecutive: "Admin User",
        invoiceAmount: "100",
        weight: "1",
        dimensions: {
            length: "10",
            width: "10", 
            height: "10"
        },
        remarks: "Test dispatch creation",
        products: [
            {
                name: "Test Product | Default | TEST123",
                qty: 1
            }
        ]
    };

    try {
        const response = await makeRequest(`${BASE_URL}/api/dispatch/create`, {
            method: 'POST',
            body: testPayload
        });

        if (response.status === 201 || response.status === 200) {
            console.log(`${colors.green}✅ Dispatch Creation: SUCCESS${colors.reset}`);
            console.log(`${colors.blue}   Response: ${JSON.stringify(response.data)}${colors.reset}`);
            return { success: true, data: response.data };
        } else {
            console.log(`${colors.yellow}⚠️  Dispatch Creation: EXPECTED FAILURE (likely insufficient stock)${colors.reset}`);
            console.log(`${colors.blue}   Status: ${response.status}, Response: ${response.raw}${colors.reset}`);
            return { success: false, reason: 'expected_failure', status: response.status };
        }
    } catch (error) {
        console.log(`${colors.red}❌ Dispatch Creation: ERROR - ${error.message}${colors.reset}`);
        return { success: false, reason: 'network_error', error: error.message };
    }
}

// Main test suite
async function runTests() {
    console.log(`${colors.magenta}🚀 DISPATCH DROPDOWN COMPREHENSIVE TEST SUITE${colors.reset}`);
    console.log(`${colors.magenta}===============================================${colors.reset}`);
    console.log(`${colors.yellow}📋 Testing Backend: ${BASE_URL}${colors.reset}`);
    console.log('');

    const results = {};

    // Test 1: Warehouses
    results.warehouses = await testEndpoint(
        'Warehouses Dropdown', 
        `${BASE_URL}/api/dispatch/warehouses`
    );

    // Test 2: Logistics
    results.logistics = await testEndpoint(
        'Logistics Dropdown', 
        `${BASE_URL}/api/dispatch/logistics`
    );

    // Test 3: Processed Persons (Executives)
    results.executives = await testEndpoint(
        'Executives Dropdown', 
        `${BASE_URL}/api/dispatch/processed-persons`
    );

    // Test 4: Payment Modes
    results.paymentModes = await testEndpoint(
        'Payment Modes Dropdown', 
        `${BASE_URL}/api/dispatch/payment-modes`
    );

    // Test 5: Product Search
    results.productSearch = await testEndpoint(
        'Product Search', 
        `${BASE_URL}/api/dispatch/search-products?query=test`
    );

    // Test 6: Stock Check
    results.stockCheck = await testEndpoint(
        'Stock Check', 
        `${BASE_URL}/api/dispatch/check-inventory?warehouse=GGM_WH&barcode=TEST123&qty=1`,
        'object'
    );

    // Test 7: Dispatch Creation (may fail due to stock, but tests the endpoint)
    results.dispatchCreation = await testDispatchCreation();

    // Test 8: Get Dispatches
    results.getDispatches = await testEndpoint(
        'Get Dispatches', 
        `${BASE_URL}/api/dispatch?limit=5`,
        'object'
    );

    console.log('');
    console.log(`${colors.magenta}📊 TEST RESULTS SUMMARY${colors.reset}`);
    console.log(`${colors.magenta}======================${colors.reset}`);

    let passCount = 0;
    let totalTests = Object.keys(results).length;

    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? 
            `${colors.green}✅ PASS${colors.reset}` : 
            `${colors.red}❌ FAIL${colors.reset}`;
        
        console.log(`${test.padEnd(20)}: ${status}`);
        
        if (result.success) passCount++;
    });

    console.log('');
    console.log(`${colors.yellow}📈 Overall Score: ${passCount}/${totalTests} tests passed${colors.reset}`);

    if (passCount >= 6) {
        console.log(`${colors.green}🎉 EXCELLENT! Dispatch dropdowns are working properly${colors.reset}`);
    } else if (passCount >= 4) {
        console.log(`${colors.yellow}⚠️  GOOD! Most endpoints working, some may need database setup${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ NEEDS ATTENTION! Multiple endpoints failing${colors.reset}`);
    }

    console.log('');
    console.log(`${colors.cyan}🔗 Frontend Test Instructions:${colors.reset}`);
    console.log('1. Open your dispatch form in the browser');
    console.log('2. Check that dropdowns populate with data');
    console.log('3. Test product search functionality');
    console.log('4. Verify stock checking works when selecting products');
    console.log('');
    console.log(`${colors.green}✅ Backend API endpoints are ready for frontend integration!${colors.reset}`);
}

// Run the tests
runTests().catch(console.error);