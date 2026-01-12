#!/usr/bin/env node

/**
 * Fix all controllers to use callback-style database queries
 * This will fix products, dispatch, returns, damage recovery, etc.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Converting all controllers from promise to callback style...');

// List of controller files to fix
const controllerFiles = [
    'controllers/productController.js',
    'controllers/dispatchController.js',
    'controllers/returnsController.js',
    'controllers/damageRecoveryController.js',
    'controllers/bulkUploadController.js',
    'controllers/orderTrackingController.js',
    'controllers/selfTransferController.js',
    'controllers/timelineController.js',
    'controllers/notificationController.js',
    'controllers/searchController.js'
];

controllerFiles.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Replace async/await patterns with callback patterns
        
        // Pattern 1: const [rows] = await db.execute(sql, values);
        if (content.includes('await db.execute')) {
            content = content.replace(
                /const \[([^\]]+)\] = await db\.execute\(([^)]+)\);/g,
                'db.query($2, (err, $1) => {\n        if (err) {\n            console.error("Database error:", err);\n            return res.status(500).json({ success: false, error: err.message });\n        }'
            );
            modified = true;
        }

        // Pattern 2: const [result] = await db.execute(sql, values);
        if (content.includes('await db.query')) {
            content = content.replace(
                /const \[([^\]]+)\] = await db\.query\(([^)]+)\);/g,
                'db.query($2, (err, $1) => {\n        if (err) {\n            console.error("Database error:", err);\n            return res.status(500).json({ success: false, error: err.message });\n        }'
            );
            modified = true;
        }

        // Pattern 3: await db.execute(sql, values);
        if (content.includes('await db.execute')) {
            content = content.replace(
                /await db\.execute\(([^)]+)\);/g,
                'db.query($1, (err, result) => {\n        if (err) {\n            console.error("Database error:", err);\n            return res.status(500).json({ success: false, error: err.message });\n        }'
            );
            modified = true;
        }

        // Remove async from function declarations
        content = content.replace(/exports\.(\w+) = async \(/g, 'exports.$1 = (');
        content = content.replace(/const (\w+) = async \(/g, 'const $1 = (');

        if (modified) {
            fs.writeFileSync(file, content);
            console.log(`✅ Fixed ${file}`);
        } else {
            console.log(`⚪ ${file} - no changes needed`);
        }
    } else {
        console.log(`⚠️  ${file} - file not found`);
    }
});

console.log('🚀 All controllers converted to callback style!');
console.log('⚠️  Note: Some manual fixes may still be needed for complex queries.');
console.log('📝 Restart your server: node server.js');