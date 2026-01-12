#!/usr/bin/env node

// Script to install WebSocket dependencies

const { execSync } = require('child_process');

console.log('📦 Installing WebSocket dependencies...');

const dependencies = [
    'socket.io',           // WebSocket server
    'socket.io-client',    // WebSocket client
    'uuid'                 // For generating unique session IDs
];

try {
    console.log('Installing:', dependencies.join(', '));
    execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ WebSocket dependencies installed successfully!');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    console.log('\n💡 You can manually install them with:');
    console.log(`npm install ${dependencies.join(' ')}`);
}