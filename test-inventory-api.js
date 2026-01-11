#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Change this to your server URL
const API_BASE = `${BASE_URL}/api`;

console.log('🧪 Testing Inventory API Endpoints');
console.log('===================================');
console.log(`🌐 Base URL: ${API_BASE}`);
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
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

// Test functions
async function testInventoryEndpoints() {
    const tests = [
        {
            name: 'Get All Inventory',
            url: `${API_BASE}/inventory`,
            description: 'Basic inventory fetch'
        },
        {
            name: 'Get Inventory with Limit',
            url: `${API_BASE}/inventory?limit=10`,
            description: 'Inventory with pagination'
        },
        {
            name: 'Get Inventory by Warehouse',
            url: `${API_BASE}/inventory?warehouse=GGM_WH`,
            description: 'Filter by specific warehouse'
        },
        {
            name: 'Get Inventory with Search',
            url: `${API_BASE}/inventory?search=product`,
            description: 'Search products by name'
        },
        {
            name: 'Get Inventory - Multiple Warehouses',
            url: `${API_BASE}/inventory?warehouses=GGM_WH,BLR_WH,MUM_WH`,
            description: 'Multiple warehouse filter'
        },
        {
            name: 'Get Inventory by Warehouse (Legacy)',
            url: `${API_BASE}/inventory/by-warehouse?warehouse=GGM_WH`,
            description: 'Legacy warehouse endpoint'
        },
        {
            name: 'Export Inventory',
            url: `${API_BASE}/inventory/export?warehouse=GGM_WH`,
            description: 'CSV export functionality'
        }
    ];

    for (const test of tests) {
        try {
            console.log(`📋 ${test.name}`);
            console.log(`   URL: ${test.url}`);
            console.log(`   Description: ${test.description}`);
            
            const result = await makeRequest(test.url);
            
            console.log(`   Status: ${result.status}`);
            
            if (result.status === 200) {
                if (Array.isArray(result.data)) {
                    console.log(`   ✅ Success - Returned ${result.data.length} items`);
                    if (result.data.length > 0) {
                        console.log(`   📦 Sample item:`, JSON.stringify(result.data[0], null, 6));
                    }
                } else if (typeof result.data === 'object') {
                    console.log(`   ✅ Success - Response:`, JSON.stringify(result.data, null, 6));
                } else {
                    console.log(`   ✅ Success - Data type: ${typeof result.data}`);
                }
            } else {
                console.log(`   ❌ Error - Response:`, result.data);
            }
            
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
        
        console.log('');
    }
}

// Test POST endpoint
async function testAddStock() {
    console.log('📦 Testing Add Stock Endpoint');
    console.log('=============================');
    
    const testData = {
        barcode: 'TEST001',
        product_name: 'Test Product',
        variant: 'Red',
        warehouse: 'GGM_WH',
        qty_available: 10,
        status: 'active'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/inventory/add-stock`, {
            method: 'POST',
            body: testData
        });
        
        console.log(`Status: ${result.status}`);
        console.log(`Response:`, JSON.stringify(result.data, null, 2));
        
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('');
}

// Run all tests
async function runAllTests() {
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
    
    await testInventoryEndpoints();
    await testAddStock();
    
    console.log('🎉 All inventory API tests completed!');
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
}

// Handle command line arguments
if (process.argv.length > 2) {
    const customUrl = process.argv[2];
    console.log(`🔧 Using custom URL: ${customUrl}`);
    // Update BASE_URL and API_BASE here if needed
}

runAllTests().catch(console.error);