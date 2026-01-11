#!/usr/bin/env node

// Fix MySQL2 promise/callback mismatch in dispatch controller

const fs = require('fs');

console.log('🔧 Fixing MySQL2 promise/callback issues in dispatch controller...');

const dispatchControllerPath = 'controllers/dispatchController.js';

if (!fs.existsSync(dispatchControllerPath)) {
    console.error('❌ Dispatch controller not found!');
    process.exit(1);
}

let content = fs.readFileSync(dispatchControllerPath, 'utf8');

// Fix getWarehouses function
const oldGetWarehouses = `exports.getWarehouses = (req, res) => {
    const sql = \`SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name\`;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }`;

const newGetWarehouses = `exports.getWarehouses = async (req, res) => {
    try {
        const sql = \`SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name\`;
        const [rows] = await db.execute(sql);`;

// Fix getProcessedPersons function
const oldGetProcessedPersons = `exports.getProcessedPersons = (req, res) => {
    const sql = \`SELECT name FROM processed_persons ORDER BY name\`;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }`;

const newGetProcessedPersons = `exports.getProcessedPersons = async (req, res) => {
    try {
        const sql = \`SELECT name FROM processed_persons ORDER BY name\`;
        const [rows] = await db.execute(sql);`;

// Apply fixes
if (content.includes('db.query(sql, (err, rows)')) {
    console.log('📋 Converting callback-style queries to promises...');
    
    // Replace callback patterns with promise patterns
    content = content.replace(
        /db\.query\(([^,]+),\s*\(err,\s*rows\)\s*=>\s*{\s*if\s*\(err\)\s*{\s*return\s+res\.status\(500\)\.json\(\s*{\s*success:\s*false,\s*error:\s*err\.message\s*}\s*\);\s*}/g,
        'try {\n        const [rows] = await db.execute($1);'
    );
    
    // Convert function declarations to async
    content = content.replace(
        /exports\.(getWarehouses|getProcessedPersons)\s*=\s*\(req,\s*res\)\s*=>/g,
        'exports.$1 = async (req, res) =>'
    );
    
    // Add try-catch blocks
    content = content.replace(
        /const persons = rows\.map\(row => row\.name\);/g,
        `const persons = rows.map(row => row.name);
        
        res.json({
            success: true,
            data: persons
        });
    } catch (error) {
        console.error('Error fetching processed persons:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }`
    );
    
    // Fix warehouse response
    content = content.replace(
        /const warehouses = rows\.map\(row => row\.warehouse_code\);/g,
        `const warehouses = rows.map(row => row.warehouse_code);
        
        res.json({
            success: true,
            data: warehouses
        });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }`
    );
    
    fs.writeFileSync(dispatchControllerPath, content);
    console.log('✅ Fixed MySQL2 promise/callback issues');
} else {
    console.log('ℹ️ No callback-style queries found to fix');
}

console.log('🎉 Dispatch controller MySQL2 issues fixed!');
console.log('🔄 Please restart your server: pm2 restart all');