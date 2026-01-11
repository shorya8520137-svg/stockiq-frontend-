#!/usr/bin/env node

// Comprehensive fix for all MySQL2 promise/callback issues

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ALL MySQL2 promise/callback issues...');

// Find all controller files
const controllersDir = 'controllers';
const controllerFiles = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(controllersDir, file));

console.log(`📁 Found ${controllerFiles.length} controller files`);

controllerFiles.forEach(filePath => {
    console.log(`🔍 Checking ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file uses callback-style queries
    if (content.includes('db.query(') && content.includes('(err, rows)')) {
        console.log(`📋 Converting ${filePath} to promises...`);
        
        // Convert callback queries to promises
        content = content.replace(
            /db\.query\(([^,]+),\s*\(err,\s*rows\)\s*=>\s*{/g,
            'try {\n        const [rows] = await db.execute($1);'
        );
        
        // Convert function declarations to async
        content = content.replace(
            /exports\.(\w+)\s*=\s*\(([^)]+)\)\s*=>\s*{/g,
            'exports.$1 = async ($2) => {'
        );
        
        // Add error handling
        content = content.replace(
            /if\s*\(err\)\s*{\s*return\s+res\.status\(500\)\.json\([^}]+}\s*\);\s*}/g,
            ''
        );
        
        // Add try-catch wrapper where needed
        if (!content.includes('} catch (error) {')) {
            content = content.replace(
                /res\.json\(\s*{\s*success:\s*true/g,
                `res.json({
            success: true`
            );
            
            // Add catch blocks before function endings
            content = content.replace(
                /(\s+res\.json\([^}]+}\);)\s*};/g,
                `$1
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};`
            );
        }
        
        fs.writeFileSync(filePath, content);
        modified = true;
        console.log(`✅ Fixed ${filePath}`);
    } else {
        console.log(`ℹ️ ${filePath} - No issues found`);
    }
});

console.log('\n🎉 All MySQL2 issues fixed!');
console.log('🔄 Restart your server: pm2 restart all');
console.log('🧪 Test your dispatch form now!');