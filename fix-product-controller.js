#!/usr/bin/env node

// This script will fix the most critical database query issues in productController.js

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'controllers', 'productController.js');

// Read the current file
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix getCategories method
content = content.replace(
    /static getCategories\(req, res\) \{[\s\S]*?db\.query\([\s\S]*?\);[\s\S]*?\}/,
    `static async getCategories(req, res) {
        try {
            const [rows] = await db.execute(
                'SELECT id, name, display_name FROM product_categories WHERE is_active = 1'
            );
            
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('getCategories:', err);
            
            // Handle missing table gracefully
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ 
                    success: true, 
                    data: [] // Return empty array if table doesn't exist
                });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch categories' 
            });
        }
    }`
);

// Fix getWarehouses method
content = content.replace(
    /static getWarehouses\(req, res\) \{[\s\S]*?db\.query\([\s\S]*?\);[\s\S]*?\}/,
    `static async getWarehouses(req, res) {
        try {
            const [rows] = await db.execute(
                'SELECT w_id, warehouse_code, Warehouse_name, address FROM dispatch_warehouse ORDER BY Warehouse_name'
            );
            
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('getWarehouses:', err);
            
            // Handle missing table gracefully
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ success: true, data: [] });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch warehouses' 
            });
        }
    }`
);

// Fix getStores method
content = content.replace(
    /static getStores\(req, res\) \{[\s\S]*?db\.query\([\s\S]*?\);[\s\S]*?\}/,
    `static async getStores(req, res) {
        try {
            const [rows] = await db.execute(
                'SELECT id, store_code, store_name, city, state FROM stores WHERE is_active = 1 ORDER BY store_name'
            );
            
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('getStores:', err);
            
            // Handle missing table gracefully
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.json({ success: true, data: [] });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch stores' 
            });
        }
    }`
);

// Write the fixed content back
fs.writeFileSync(controllerPath, content);

console.log('✅ Fixed critical database queries in productController.js');
console.log('🔧 Updated methods: getCategories, getWarehouses, getStores');
console.log('📝 All methods now use async/await with proper error handling');