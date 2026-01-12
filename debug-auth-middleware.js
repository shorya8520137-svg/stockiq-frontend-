#!/usr/bin/env node

/**
 * Debug Authentication Middleware
 * Tests JWT token generation and validation
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

console.log('🔍 JWT Authentication Debug');
console.log('===========================');

// Test 1: Generate a test token
console.log('📝 Test 1: Generate JWT Token');
const testPayload = {
    userId: 1,
    email: 'admin@hunyhuny.com',
    role: 'super_admin',
    roleId: 1
};

const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
console.log('✅ Generated Token:', testToken);
console.log('');

// Test 2: Verify the token
console.log('📝 Test 2: Verify JWT Token');
try {
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('   Decoded payload:', decoded);
} catch (error) {
    console.log('❌ Token verification failed:', error.message);
}
console.log('');

// Test 3: Test with existing token from login
console.log('📝 Test 3: Test Existing Token');
const existingToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3MzY2OTQ1MzcsImV4cCI6MTczNjc4MDkzN30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

try {
    const decoded = jwt.verify(existingToken, JWT_SECRET);
    console.log('✅ Existing token verified successfully');
    console.log('   Decoded payload:', decoded);
} catch (error) {
    console.log('❌ Existing token verification failed:', error.message);
}
console.log('');

// Test 4: Test auth middleware logic
console.log('📝 Test 4: Test Auth Middleware Logic');

function testAuthMiddleware(token) {
    console.log(`   Testing token: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);
    
    if (!token) {
        console.log('   ❌ No token provided - fallback mode activated');
        return { userId: 1, email: 'admin@hunyhuny.com', role: 'super_admin' };
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('   ✅ Token valid - user authenticated');
        return decoded;
    } catch (error) {
        console.log('   ❌ Token invalid - fallback mode activated');
        console.log('   Error:', error.message);
        return { userId: 1, email: 'admin@hunyhuny.com', role: 'super_admin' };
    }
}

// Test with no token
console.log('🔸 Test with no token:');
const result1 = testAuthMiddleware(null);
console.log('   Result:', result1);
console.log('');

// Test with valid token
console.log('🔸 Test with valid token:');
const result2 = testAuthMiddleware(testToken);
console.log('   Result:', result2);
console.log('');

// Test with invalid token
console.log('🔸 Test with invalid token:');
const result3 = testAuthMiddleware('invalid.token.here');
console.log('   Result:', result3);
console.log('');

console.log('🎯 Debug Complete');
console.log('================');
console.log('✅ Use this token for testing:');
console.log(`   ${testToken}`);