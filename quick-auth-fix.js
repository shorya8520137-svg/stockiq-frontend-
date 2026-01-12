#!/usr/bin/env node

/**
 * Quick fix to temporarily remove auth middleware from routes
 * Run this if you're still getting 401 errors
 */

const fs = require('fs');
const path = require('path');

const routeFiles = [
    'routes/dispatchRoutes.js',
    'routes/inventoryRoutes.js', 
    'routes/productRoutes.js'
];

console.log('🔧 Temporarily removing auth middleware from routes...');

routeFiles.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove auth middleware import
        content = content.replace(/const { authenticateToken } = require\('\.\.\/middleware\/auth'\);\n/, '');
        
        // Remove auth middleware usage
        content = content.replace(/router\.use\(authenticateToken\);\n/, '');
        
        fs.writeFileSync(file, content);
        console.log(`✅ Removed auth from ${file}`);
    }
});

console.log('🚀 Auth middleware temporarily removed. Restart your server.');
console.log('⚠️  Remember to add auth back later for security!');