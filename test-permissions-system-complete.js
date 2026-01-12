#!/usr/bin/env node

/**
 * Comprehensive Permissions System Test
 * Tests all aspects of the enhanced permissions system
 */

const axios = require('axios');

const BASE_URL = 'https://13-201-222-24.nip.io';
const TEST_CREDENTIALS = {
    email: 'admin@hunyhuny.com',
    password: 'gfx998sd'
};

let authToken = null;

// Test configuration
const TESTS = {
    AUTH: true,
    PERMISSIONS: true,
    USER_MANAGEMENT: true,
    COMPONENT_ACCESS: true,
    AUDIT_LOGS: true,
    ACTIVITY_TRACKING: true
};

console.log('🧪 COMPREHENSIVE PERMISSIONS SYSTEM TEST');
console.log('==========================================');
console.log(`🎯 Target: ${BASE_URL}`);
console.log(`📋 Tests: ${Object.keys(TESTS).filter(k => TESTS[k]).join(', ')}`);
console.log('');

// Helper function for API calls
async function apiCall(method, endpoint, data = null, useAuth = true) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (useAuth && authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test 1: Authentication
async function testAuthentication() {
    if (!TESTS.AUTH) return;
    
    console.log('🔐 TEST 1: Authentication');
    console.log('-------------------------');
    
    // Test login
    console.log('📝 Testing login...');
    const loginResult = await apiCall('POST', '/api/auth/login', TEST_CREDENTIALS, false);
    
    if (loginResult.success && loginResult.data.token) {
        authToken = loginResult.data.token;
        console.log('✅ Login successful');
        console.log(`   Token: ${authToken.substring(0, 20)}...`);
        console.log(`   User: ${loginResult.data.user?.email}`);
        console.log(`   Role: ${loginResult.data.user?.role}`);
    } else {
        console.log('❌ Login failed:', loginResult.error);
        return false;
    }
    
    // Test profile access
    console.log('📝 Testing profile access...');
    const profileResult = await apiCall('GET', '/api/auth/profile');
    
    if (profileResult.success) {
        console.log('✅ Profile access successful');
        console.log(`   User ID: ${profileResult.data.data?.id}`);
        console.log(`   Name: ${profileResult.data.data?.name}`);
    } else {
        console.log('❌ Profile access failed:', profileResult.error);
    }
    
    console.log('');
    return true;
}

// Test 2: Permission System
async function testPermissions() {
    if (!TESTS.PERMISSIONS) return;
    
    console.log('🛡️ TEST 2: Permission System');
    console.log('----------------------------');
    
    // Test getting user permissions
    console.log('📝 Testing user permissions retrieval...');
    const permissionsResult = await apiCall('GET', '/api/enhanced-permissions/users/1/permissions');
    
    if (permissionsResult.success) {
        console.log('✅ User permissions retrieved successfully');
        console.log(`   Total permissions: ${permissionsResult.data.permissions?.length || 0}`);
        
        if (permissionsResult.data.permissions_by_component) {
            const components = Object.keys(permissionsResult.data.permissions_by_component);
            console.log(`   Components with access: ${components.join(', ')}`);
        }
    } else {
        console.log('❌ Failed to get user permissions:', permissionsResult.error);
    }
    
    // Test permission checking
    console.log('📝 Testing specific permission check...');
    const permCheckResult = await apiCall('GET', '/api/enhanced-permissions/users/1/check/DASHBOARD_VIEW');
    
    if (permCheckResult.success) {
        console.log('✅ Permission check successful');
        console.log(`   Has DASHBOARD_VIEW: ${permCheckResult.data.has_permission}`);
    } else {
        console.log('❌ Permission check failed:', permCheckResult.error);
    }
    
    console.log('');
}

// Test 3: User Management
async function testUserManagement() {
    if (!TESTS.USER_MANAGEMENT) return;
    
    console.log('👥 TEST 3: User Management');
    console.log('-------------------------');
    
    // Test getting all users
    console.log('📝 Testing user list retrieval...');
    const usersResult = await apiCall('GET', '/api/enhanced-permissions/users');
    
    if (usersResult.success) {
        console.log('✅ User list retrieved successfully');
        console.log(`   Total users: ${usersResult.data.users?.length || 0}`);
        
        if (usersResult.data.users && usersResult.data.users.length > 0) {
            const onlineUsers = usersResult.data.users.filter(u => u.is_online);
            console.log(`   Online users: ${onlineUsers.length}`);
            
            usersResult.data.users.slice(0, 3).forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - ${user.role_name || 'No role'} - ${user.is_online ? 'Online' : 'Offline'}`);
            });
        }
    } else {
        console.log('❌ Failed to get users:', usersResult.error);
    }
    
    console.log('');
}

// Test 4: Component Access
async function testComponentAccess() {
    if (!TESTS.COMPONENT_ACCESS) return;
    
    console.log('🧩 TEST 4: Component Access');
    console.log('---------------------------');
    
    const componentsToTest = ['Dashboard', 'Inventory', 'Products', 'Orders'];
    
    for (const component of componentsToTest) {
        console.log(`📝 Testing access to ${component}...`);
        const accessResult = await apiCall('GET', `/api/enhanced-permissions/users/1/component/${component}`);
        
        if (accessResult.success) {
            console.log(`✅ ${component} access check: ${accessResult.data.has_access ? 'GRANTED' : 'DENIED'}`);
        } else {
            console.log(`❌ ${component} access check failed:`, accessResult.error);
        }
    }
    
    console.log('');
}

// Test 5: Audit Logs
async function testAuditLogs() {
    if (!TESTS.AUDIT_LOGS) return;
    
    console.log('📋 TEST 5: Audit Logs');
    console.log('---------------------');
    
    // Test getting audit logs
    console.log('📝 Testing audit logs retrieval...');
    const auditResult = await apiCall('GET', '/api/enhanced-permissions/audit-logs?limit=10');
    
    if (auditResult.success) {
        console.log('✅ Audit logs retrieved successfully');
        console.log(`   Total logs returned: ${auditResult.data.audit_logs?.length || 0}`);
        
        if (auditResult.data.audit_logs && auditResult.data.audit_logs.length > 0) {
            console.log('   Recent audit entries:');
            auditResult.data.audit_logs.slice(0, 3).forEach(log => {
                console.log(`   - ${log.action} by ${log.username || 'System'} at ${log.created_at}`);
            });
        }
    } else {
        console.log('❌ Failed to get audit logs:', auditResult.error);
    }
    
    console.log('');
}

// Test 6: Activity Tracking
async function testActivityTracking() {
    if (!TESTS.ACTIVITY_TRACKING) return;
    
    console.log('📊 TEST 6: Activity Tracking');
    console.log('----------------------------');
    
    // Test updating user activity
    console.log('📝 Testing activity update...');
    const activityData = {
        action: 'testing_permissions',
        component: 'test_suite',
        metadata: { test_run: new Date().toISOString() }
    };
    
    const updateResult = await apiCall('POST', '/api/enhanced-permissions/users/1/activity', activityData);
    
    if (updateResult.success) {
        console.log('✅ User activity updated successfully');
    } else {
        console.log('❌ Failed to update user activity:', updateResult.error);
    }
    
    // Test getting online users
    console.log('📝 Testing online users retrieval...');
    const onlineResult = await apiCall('GET', '/api/enhanced-permissions/users/online');
    
    if (onlineResult.success) {
        console.log('✅ Online users retrieved successfully');
        console.log(`   Currently online: ${onlineResult.data.count || 0} users`);
        
        if (onlineResult.data.online_users && onlineResult.data.online_users.length > 0) {
            onlineResult.data.online_users.forEach(user => {
                console.log(`   - ${user.username} (${user.role_name || 'No role'}) - ${user.current_action || 'idle'}`);
            });
        }
    } else {
        console.log('❌ Failed to get online users:', onlineResult.error);
    }
    
    console.log('');
}

// Test 7: API Endpoints Health Check
async function testAPIEndpoints() {
    console.log('🔗 TEST 7: API Endpoints Health');
    console.log('-------------------------------');
    
    const endpoints = [
        { method: 'GET', path: '/api/products', name: 'Products API' },
        { method: 'GET', path: '/api/inventory', name: 'Inventory API' },
        { method: 'GET', path: '/api/dispatch/warehouses', name: 'Dispatch Warehouses' },
        { method: 'GET', path: '/api/dispatch/logistics', name: 'Dispatch Logistics' },
        { method: 'GET', path: '/api/dispatch/executives', name: 'Dispatch Executives' }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`📝 Testing ${endpoint.name}...`);
        const result = await apiCall(endpoint.method, endpoint.path);
        
        if (result.success) {
            console.log(`✅ ${endpoint.name}: OK (${result.status})`);
            if (result.data && Array.isArray(result.data)) {
                console.log(`   Records: ${result.data.length}`);
            }
        } else {
            console.log(`❌ ${endpoint.name}: FAILED (${result.status}) - ${result.error?.message || 'Unknown error'}`);
        }
    }
    
    console.log('');
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting comprehensive permissions system test...\n');
    
    try {
        // Run authentication first (required for other tests)
        const authSuccess = await testAuthentication();
        if (!authSuccess) {
            console.log('❌ Authentication failed - stopping tests');
            return;
        }
        
        // Run all other tests
        await testPermissions();
        await testUserManagement();
        await testComponentAccess();
        await testAuditLogs();
        await testActivityTracking();
        await testAPIEndpoints();
        
        console.log('🎉 COMPREHENSIVE TEST COMPLETED');
        console.log('===============================');
        console.log('✅ All tests have been executed');
        console.log('📊 Check the results above for any failures');
        console.log('🔍 Review audit logs for security tracking');
        
    } catch (error) {
        console.error('💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runAllTests();