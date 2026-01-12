#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing orphaned catch blocks...');

const controllersDir = path.join(__dirname, 'controllers');
const controllerFiles = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(controllersDir, file));

let fixedFiles = 0;

controllerFiles.forEach(filePath => {
    const fileName = path.basename(filePath);
    console.log(`🔍 Checking ${fileName}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern to match orphaned catch blocks after db.query callbacks
    const orphanedCatchPattern = /(\s+res\.json\(rows\);\s+\}\);\s+)\} catch \(error\) \{\s+console\.error\([^}]+\}\s+\}/g;
    
    content = content.replace(orphanedCatchPattern, '$1};');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed orphaned catch blocks in ${fileName}`);
        fixedFiles++;
    } else {
        console.log(`ℹ️ No orphaned catch blocks found in ${fileName}`);
    }
});

console.log(`\n🎉 Fixed ${fixedFiles} files with orphaned catch blocks!`);
console.log('🔄 Please restart your server: pm2 restart all');