#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Change this to your server URL
const API_BASE = `${BASE_URL}/api`;

console.log('🧪 Testing Products API Endpoints');
console.log('=================================');
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
async function testProductEndpoints() {
    const tests = [
        {
            name: 'Get All Products',
            url: `${API_BASE}/products`,
            description: 'Basic products fetch'
        },
        {
            name: 'Get Products with Pagination',
            url: `${API_BASE}/products?page=1&limit=10`,
            description: 'Products with pagination'
        },
        {
            name: 'Search Products',
            url: `${API_BASE}/products?search=test`,
            description: 'Search products by name'
        },
        {
            name: 'Get Products by Category',
            url: `${API_BASE}/products?category=Electronics`,
            description: 'Filter by category'
        },
        {
            name: 'Get All Categories',
            url: `${API_BASE}/products/categories/all`,
            description: 'Fetch all product categories'
        },
        {
            name: 'Get Warehouses',
            url: `${API_BASE}/products/warehouses`,
            description: 'Fetch all warehouses'
        },
        {
            name: 'Get Stores',
            url: `${API_BASE}/products/stores`,
            description: 'Fetch all stores'
        },
        {
            name: 'Search by Barcode',
            url: `${API_BASE}/products/search/TEST001`,
            description: 'Search product by barcode'
        },
        {
            name: 'Get Product Inventory',
            url: `${API_BASE}/products/inventory`,
            description: 'Get inventory through products API'
        },
        {
            name: 'Get Inventory by Warehouse',
            url: `${API_BASE}/products/inventory/by-warehouse/GGM_WH`,
            description: 'Get warehouse-specific inventory'
        },
        {
            name: 'Get Product Inventory by Barcode',
            url: `${API_BASE}/products/inventory/TEST001`,
            description: 'Get specific product inventory'
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

// Test POST endpoints
async function testCreateProduct() {
    console.log('📦 Testing Create Product Endpoint');
    console.log('==================================');
    
    const testProduct = {
        name: 'Test API Product',
        category: 'Electronics',
        barcode: 'TESTAPI001',
        price: 99.99,
        description: 'Product created via API test'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/products`, {
            method: 'POST',
            body: testProduct
        });
        
        console.log(`Status: ${result.status}`);
        console.log(`Response:`, JSON.stringify(result.data, null, 2));
        
        if (result.status === 201 && result.data.id) {
            console.log(`✅ Product created with ID: ${result.data.id}`);
            return result.data.id;
        }
        
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('');
    return null;
}

// Test transfer endpoint
async function testProductTransfer() {
    console.log('🚚 Testing Product Transfer Endpoint');
    console.log('====================================');
    
    const transferData = {
        barcode: 'TEST001',
        from_warehouse: 'GGM_WH',
        to_warehouse: 'BLR_WH',
        quantity: 5,
        reason: 'API Test Transfer'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/products/transfer`, {
            method: 'POST',
            body: transferData
        });
        
        console.log(`Status: ${result.status}`);
        console.log(`Response:`, JSON.stringify(result.data, null, 2));
        
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('');
}

// Test category creation
async function testCreateCategory() {
    console.log('📂 Testing Create Category Endpoint');
    console.log('===================================');
    
    const categoryData = {
        name: 'Test Category',
        description: 'Category created via API test'
    };
    
    try {
        const result = await makeRequest(`${API_BASE}/products/categories`, {
            method: 'POST',
            body: categoryData
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
    
    await testProductEndpoints();
    const productId = await testCreateProduct();
    await testProductTransfer();
    await testCreateCategory();
    
    console.log('🎉 All products API tests completed!');
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
    
    if (productId) {
        console.log(`\n💡 Tip: You can test UPDATE/DELETE with product ID: ${productId}`);
        console.log(`   PUT ${API_BASE}/products/${productId}`);
        console.log(`   DELETE ${API_BASE}/products/${productId}`);
    }
}

// Handle command line arguments
if (process.argv.length > 2) {
    const customUrl = process.argv[2];
    console.log(`🔧 Using custom URL: ${customUrl}`);
    // Update BASE_URL and API_BASE here if needed
}

runAllTests().catch(console.error);