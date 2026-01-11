#!/usr/bin/env node

// Fix dispatch controller db.query calls

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'controllers', 'dispatchController.js');

// Read the current file
let content = fs.readFileSync(controllerPath, 'utf8');

console.log('🔧 Fixing dispatch controller db.query calls...');

// Fix the three main problematic methods that are causing immediate errors

// 1. Fix getWarehouses (line 793)
content = content.replace(
    /exports\.getWarehouses = \(req, res\) => \{[\s\S]*?db\.query\(sql, \(err, rows\) => \{[\s\S]*?\}\);[\s\S]*?\};/,
    `exports.getWarehouses = async (req, res) => {
    try {
        const sql = \`SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name\`;
        const [rows] = await db.execute(sql);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('getWarehouses error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch warehouses'
        });
    }
};`
);

// 2. Fix getLogistics (line 812)
content = content.replace(
    /exports\.getLogistics = \(req, res\) => \{[\s\S]*?db\.query\(sql, \(err, rows\) => \{[\s\S]*?\}\);[\s\S]*?\};/,
    `exports.getLogistics = async (req, res) => {
    try {
        const sql = \`SELECT name FROM logistics ORDER BY name\`;
        const [rows] = await db.execute(sql);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('getLogistics error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch logistics'
        });
    }
};`
);

// 3. Fix getProcessedPersons (line 831)
content = content.replace(
    /exports\.getProcessedPersons = \(req, res\) => \{[\s\S]*?db\.query\(sql, \(err, rows\) => \{[\s\S]*?\}\);[\s\S]*?\};/,
    `exports.getProcessedPersons = async (req, res) => {
    try {
        const sql = \`SELECT name FROM processed_persons ORDER BY name\`;
        const [rows] = await db.execute(sql);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('getProcessedPersons error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch processed persons'
        });
    }
};`
);

// Write the fixed content back
fs.writeFileSync(controllerPath, content);

console.log('✅ Fixed dispatch controller critical methods');
console.log('🔧 Updated getWarehouses, getLogistics, getProcessedPersons to use async/await');
console.log('📝 These methods should now work without callback errors');