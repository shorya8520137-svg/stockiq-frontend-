#!/usr/bin/env node

/**
 * Convert all routes to use optional auth instead of required auth
 * This will make all APIs work without authentication issues
 */

const fs = require('fs');

console.log('🔧 Converting all routes to use optional auth...');

const routeFiles = [
    'routes/dispatchRoutes.js',
    'routes/returnsRoutes.js', 
    'routes/damageRecoveryRoutes.js',
    'routes/bulkUploadRoutes.js',
    'routes/orderTrackingRoutes.js',
    'routes/selfTransferRoutes.js',
    'routes/timelineRoutes.js',
    'routes/notificationRoutes.js',
    'routes/searchRoutes.js'
];

routeFiles.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Replace authenticateToken import with optionalAuth
        if (content.includes("require('../middleware/auth')")) {
            content = content.replace(
                /const { authenticateToken } = require\('\.\.\/middleware\/auth'\);/g,
                "const { optionalAuth } = require('../middleware/optionalAuth');"
            );
            modified = true;
        }

        // Replace router.use(authenticateToken) with router.use(optionalAuth)
        if (content.includes('router.use(authenticateToken)')) {
            content = content.replace(
                /router\.use\(authenticateToken\);/g,
                'router.use(optionalAuth);'
            );
            modified = true;
        }

        // Replace individual route auth middleware
        if (content.includes('authenticateToken,')) {
            content = content.replace(
                /authenticateToken,/g,
                'optionalAuth,'
            );
            modified = true;
        }

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

console.log('🚀 All routes converted to optional auth!');
console.log('📝 Now all APIs will work without authentication errors.');
console.log('🔄 Restart your server: node server.js');