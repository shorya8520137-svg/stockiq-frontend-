#!/usr/bin/env node

/**
 * Test script to verify Vercel proxy configuration
 * Run this after deploying to Vercel to test the proxy
 */

const testEndpoints = [
    '/api/health',
    '/api/auth/me',
    '/api/products',
    '/api/inventory'
];

async function testProxy() {
    console.log('🧪 Testing Vercel API proxy...\n');
    
    const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
    
    console.log(`Testing against: ${baseUrl}\n`);
    
    for (const endpoint of testEndpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const status = response.status;
            const statusText = response.statusText;
            
            if (response.ok) {
                console.log(`✅ ${endpoint}: ${status} ${statusText}`);
            } else {
                console.log(`⚠️  ${endpoint}: ${status} ${statusText}`);
            }
            
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
    
    console.log('\n🏁 Proxy test completed');
}

// Run if called directly
if (require.main === module) {
    testProxy().catch(console.error);
}

module.exports = { testProxy };