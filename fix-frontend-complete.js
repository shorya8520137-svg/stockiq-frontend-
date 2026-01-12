#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Frontend API Configuration...');
console.log('=====================================');

const API_URL = 'https://13-201-222-24.nip.io/api';

// Files to update
const filesToUpdate = [
    {
        path: 'src/services/api/config.js',
        pattern: /BASE_URL:\s*['"`][^'"`]*['"`]/g,
        replacement: `BASE_URL: '${API_URL}'`
    },
    {
        path: 'src/utils/api.js',
        pattern: /const BASE_URL = [^;]+;/g,
        replacement: `const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "${API_URL}";`
    },
    {
        path: '.env.local',
        pattern: /NEXT_PUBLIC_API_BASE=.*/g,
        replacement: `NEXT_PUBLIC_API_BASE=${API_URL}`
    }
];

let filesUpdated = 0;

filesToUpdate.forEach(({ path: filePath, pattern, replacement }) => {
    try {
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            
            content = content.replace(pattern, replacement);
            
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content);
                console.log(`✅ Updated: ${filePath}`);
                filesUpdated++;
            } else {
                console.log(`ℹ️ No changes needed: ${filePath}`);
            }
        } else {
            console.log(`⚠️ File not found: ${filePath}`);
        }
    } catch (error) {
        console.log(`❌ Error updating ${filePath}:`, error.message);
    }
});

// Check for other API configuration files
const apiFiles = [
    'src/services/api/auth.js',
    'src/services/api/inventory.js',
    'src/services/api/search.js',
    'src/services/api/products.js',
    'src/services/api/bulkUpload.js'
];

console.log('\n🔍 Checking API service files...');
apiFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${filePath}`);
    } else {
        console.log(`⚠️ Missing: ${filePath}`);
    }
});

// Create a test API connection script
const testScript = `
// Test API Connection
import { checkAPIHealth } from './src/services/api/config.js';

async function testConnection() {
    try {
        console.log('🧪 Testing API connection...');
        const result = await checkAPIHealth();
        
        if (result.success) {
            console.log('✅ API connection successful!');
            console.log('📊 Response:', result.data);
        } else {
            console.log('❌ API connection failed:', result.error);
        }
    } catch (error) {
        console.log('❌ Connection test error:', error.message);
    }
}

testConnection();
`;

fs.writeFileSync('test-api-connection.mjs', testScript);

console.log('\n📋 Summary:');
console.log(`   🔧 Files updated: ${filesUpdated}`);
console.log(`   🌐 API URL: ${API_URL}`);
console.log(`   📝 Test script created: test-api-connection.mjs`);

console.log('\n🚀 Next Steps:');
console.log('1. Restart your Next.js development server');
console.log('2. Clear browser cache and localStorage');
console.log('3. Test login with: admin@hunyhuny.com / gfx998sd');
console.log('4. Check browser console for any remaining errors');

console.log('\n💡 Test API connection:');
console.log('   node test-api-connection.mjs');

console.log('\n🎉 Frontend API configuration updated!');