#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Temporarily removing authentication from basic routes...');

// Remove auth from search routes
const searchRoutesPath = path.join(__dirname, 'routes', 'searchRoutes.js');
let searchContent = fs.readFileSync(searchRoutesPath, 'utf8');

// Backup original file
fs.writeFileSync(searchRoutesPath + '.backup', searchContent);

// Remove authenticateToken middleware
searchContent = searchContent.replace(/authenticateToken, /g, '');
searchContent = searchContent.replace(/, authenticateToken/g, '');

fs.writeFileSync(searchRoutesPath, searchContent);
console.log('✅ Removed authentication from search routes');

// Check if notification routes need auth removal
const notificationRoutesPath = path.join(__dirname, 'routes', 'notificationRoutes.js');
if (fs.existsSync(notificationRoutesPath)) {
    let notificationContent = fs.readFileSync(notificationRoutesPath, 'utf8');
    
    if (notificationContent.includes('authenticateToken')) {
        fs.writeFileSync(notificationRoutesPath + '.backup', notificationContent);
        notificationContent = notificationContent.replace(/authenticateToken, /g, '');
        notificationContent = notificationContent.replace(/, authenticateToken/g, '');
        fs.writeFileSync(notificationRoutesPath, notificationContent);
        console.log('✅ Removed authentication from notification routes');
    }
}

console.log('\n⚠️ IMPORTANT: This is temporary! Restore authentication later with:');
console.log('cp routes/searchRoutes.js.backup routes/searchRoutes.js');
console.log('cp routes/notificationRoutes.js.backup routes/notificationRoutes.js');
console.log('\n🔄 Restart your server now: pm2 restart all');