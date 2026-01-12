#!/usr/bin/env node

/**
 * Comprehensive API testing script
 */

const backendUrl = 'https://13-201-222-24.nip.io';

async function testAPI(endpoint, method = 'GET', data = null, token = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...(data && { body: JSON.stringify(data) })
        };

        const response = await fetch(`${backendUrl}${endpoint}`, options);
        const result = await response.text();
        
        console.log(`${method} ${endpoint}: ${response.status}`);
        
        if (response.ok) {
            try {
                const jsonResult = JSON.parse(result);
                console.log('✅ Success:', jsonResult.message || 'OK');
                return { success: true, data: jsonResult };
            } catch (e) {
                console.log('✅ Success (non-JSON):', result.substring(0, 100));
                return { success: true, data: result };
            }
        } else {
            console.log('❌ Error:', result.substring(0, 200));
            return { success: false, error: result };
        }
    } catch (error) {
        console.log('❌ Network Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🧪 Testing All APIs Comprehensively...\n');
    
    let token = null;
    
    // 1. Test basic connectivity
    console.log('1️⃣ Basic Connectivity Tests');
    console.log('============================');
    await testAPI('/');
    await testAPI('/api');
    await testAPI('/api/test');
    console.log('');
    
    // 2. Test authentication
    console.log('2️⃣ Authentication Tests');
    console.log('========================');
    const loginResult = await testAPI('/api/auth/login', 'POST', {
        email: 'admin@hunyhuny.com',
        password: 'gfx998sd'
    });
    
    if (loginResult.success && loginResult.data.token) {
        token = loginResult.data.token;
        console.log('✅ Login successful, token obtained');
    }
    console.log('');
    
    // 3. Test products API
    console.log('3️⃣ Products API Tests');
    console.log('======================');
    await testAPI('/api/products', 'GET', null, token);
    await testAPI('/api/products?page=1&limit=5', 'GET', null, token);
    await testAPI('/api/products?search=sample', 'GET', null, token);
    console.log('');
    
    // 4. Test inventory API
    console.log('4️⃣ Inventory API Tests');
    console.log('=======================');
    await testAPI('/api/inventory', 'GET', null, token);
    await testAPI('/api/inventory?page=1&limit=5', 'GET', null, token);
    await testAPI('/api/inventory?warehouse=WH001', 'GET', null, token);
    console.log('');
    
    // 5. Test dispatch API
    console.log('5️⃣ Dispatch API Tests');
    console.log('======================');
    await testAPI('/api/dispatch', 'GET', null, token);
    await testAPI('/api/dispatch?status=PENDING', 'GET', null, token);
    console.log('');
    
    // 6. Test notifications API
    console.log('6️⃣ Notifications API Tests');
    console.log('===========================');
    await testAPI('/api/notifications', 'GET', null, token);
    await testAPI('/api/notifications?page=1&limit=5', 'GET', null, token);
    console.log('');
    
    // 7. Test search API
    console.log('7️⃣ Search API Tests');
    console.log('====================');
    await testAPI('/api/search/popular?limit=5', 'GET', null, token);
    await testAPI('/api/search?q=sample', 'GET', null, token);
    console.log('');
    
    // 8. Test bulk upload API
    console.log('8️⃣ Bulk Upload API Tests');
    console.log('=========================');
    await testAPI('/api/bulk-upload/status', 'GET', null, token);
    console.log('');
    
    // 9. Test damage recovery API
    console.log('9️⃣ Damage Recovery API Tests');
    console.log('=============================');
    await testAPI('/api/damage-recovery', 'GET', null, token);
    console.log('');
    
    // 10. Test returns API
    console.log('🔟 Returns API Tests');
    console.log('====================');
    await testAPI('/api/returns', 'GET', null, token);
    console.log('');
    
    // 11. Test self transfer API
    console.log('1️⃣1️⃣ Self Transfer API Tests');
    console.log('=============================');
    await testAPI('/api/self-transfer', 'GET', null, token);
    console.log('');
    
    // 12. Test timeline API
    console.log('1️⃣2️⃣ Timeline API Tests');
    console.log('========================');
    await testAPI('/api/timeline', 'GET', null, token);
    console.log('');
    
    console.log('🎉 All API tests completed!');
    console.log('📊 Check the results above to see which APIs are working.');
    console.log('✅ APIs returning 200 status are working correctly.');
    console.log('❌ APIs with errors may need database tables or additional fixes.');
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testAPI, runTests };