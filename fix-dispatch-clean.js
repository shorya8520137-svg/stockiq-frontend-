#!/usr/bin/env node

// Clean fix for dispatch controller - remove duplicates and fix MySQL2 issues

const fs = require('fs');

console.log('🔧 Cleaning and fixing dispatch controller...');

let content = fs.readFileSync('controllers/dispatchController.js', 'utf8');

// Remove duplicate function definitions (keep only the first working one)
const lines = content.split('\n');
const cleanLines = [];
let skipUntilNextExport = false;
let foundFirstWarehouses = false;
let foundFirstProcessedPersons = false;
let foundFirstLogistics = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for duplicate exports
    if (line.includes('exports.getWarehouses')) {
        if (foundFirstWarehouses) {
            skipUntilNextExport = true;
            continue;
        } else {
            foundFirstWarehouses = true;
        }
    }
    
    if (line.includes('exports.getProcessedPersons')) {
        if (foundFirstProcessedPersons) {
            skipUntilNextExport = true;
            continue;
        } else {
            foundFirstProcessedPersons = true;
        }
    }
    
    if (line.includes('exports.getLogistics')) {
        if (foundFirstLogistics) {
            skipUntilNextExport = true;
            continue;
        } else {
            foundFirstLogistics = true;
        }
    }
    
    // Check if we're at the next export (end of duplicate function)
    if (skipUntilNextExport && line.startsWith('exports.') && !line.includes('getWarehouses') && !line.includes('getProcessedPersons') && !line.includes('getLogistics')) {
        skipUntilNextExport = false;
    }
    
    // Add line if not skipping
    if (!skipUntilNextExport) {
        cleanLines.push(line);
    }
}

content = cleanLines.join('\n');

// Fix any remaining callback patterns
content = content.replace(
    /db\.query\(([^,]+),\s*\(err,\s*rows\)\s*=>\s*{[\s\S]*?if\s*\(err\)[\s\S]*?}\s*}/g,
    'try {\n        const [rows] = await db.execute($1);'
);

// Ensure all functions are async
content = content.replace(
    /exports\.(getWarehouses|getLogistics|getProcessedPersons)\s*=\s*\(req,\s*res\)\s*=>/g,
    'exports.$1 = async (req, res) =>'
);

// Fix response format consistency
content = content.replace(
    /res\.json\(logistics\);/g,
    'res.json({ success: true, data: logistics });'
);

content = content.replace(
    /res\.json\(warehouses\);/g,
    'res.json({ success: true, data: warehouses });'
);

content = content.replace(
    /res\.json\(persons\);/g,
    'res.json({ success: true, data: persons });'
);

fs.writeFileSync('controllers/dispatchController.js', content);
console.log('✅ Dispatch controller cleaned and fixed!');