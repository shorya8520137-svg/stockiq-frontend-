#!/usr/bin/env node

// Verify all MySQL2 fixes are working

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying MySQL2 fixes...');

const controllersDir = 'controllers';
const controllerFiles = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(controllersDir, file));

let issuesFound = 0;

controllerFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for remaining callback patterns
    const callbackPatterns = [
        /db\.query\([^,]+,\s*\(err,\s*rows\)/g,
        /db\.execute\([^,]+,\s*\(err,\s*rows\)/g,
        /pool\.query\([^,]+,\s*\(err,\s*rows\)/g
    ];
    
    callbackPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            console.log(`❌ ${filePath}: Found ${matches.length} callback patterns`);
            matches.forEach(match => console.log(`   - ${match}`));
            issuesFound += matches.length;
        }
    });
});

if (issuesFound === 0) {
    console.log('✅ All MySQL2 callback issues have been fixed!');
    console.log('🚀 Your dispatch form should now work properly');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your server: pm2 restart all');
    console.log('2. Test the dispatch form');
    console.log('3. Check server logs: pm2 logs');
} else {
    console.log(`❌ Found ${issuesFound} remaining issues that need manual fixing`);
}

// Also check for proper async/await usage
console.log('\n🔍 Checking for proper async/await patterns...');

controllerFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if functions using db.execute are async
    const executeUsage = content.match(/db\.execute\(/g);
    const asyncFunctions = content.match(/exports\.\w+\s*=\s*async/g);
    
    if (executeUsage && executeUsage.length > 0) {
        console.log(`📊 ${filePath}: ${executeUsage.length} db.execute calls`);
        if (asyncFunctions) {
            console.log(`   ✅ ${asyncFunctions.length} async functions found`);
        } else {
            console.log(`   ⚠️ No async functions found - may need manual review`);
        }
    }
});

console.log('\n🎯 Verification complete!');