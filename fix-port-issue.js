#!/usr/bin/env node

/**
 * FIX PORT 5000 ISSUE
 * Kill all node processes and start fresh
 */

const { exec } = require('child_process');

console.log('🔧 FIXING PORT 5000 ISSUE...\n');

// Kill all node processes
console.log('1️⃣ Killing all node processes...');
exec('pkill -f "node server.js"', (error, stdout, stderr) => {
    if (error && error.code !== 1) {
        console.log('❌ Error killing processes:', error.message);
    } else {
        console.log('✅ All node server.js processes killed');
    }
    
    // Wait a moment then check port
    setTimeout(() => {
        exec('sudo ss -lptn "sport = :5000"', (error, stdout, stderr) => {
            if (stdout.trim()) {
                console.log('❌ Port 5000 still in use:');
                console.log(stdout);
                console.log('\n🔧 Run this manually:');
                console.log('sudo fuser -k 5000/tcp');
                console.log('node server.js');
            } else {
                console.log('✅ Port 5000 is now free!');
                console.log('\n🚀 You can now run:');
                console.log('node server.js');
            }
        });
    }, 1000);
});

console.log('\n📋 If port is still busy, run these commands:');
console.log('sudo fuser -k 5000/tcp');
console.log('PORT=5001 node server.js');