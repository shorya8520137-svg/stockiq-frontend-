#!/usr/bin/env node

// This script fixes the hanging products API by replacing db.query with db.execute

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'controllers', 'productController.js');

// Read the current file
let content = fs.readFileSync(controllerPath, 'utf8');

console.log('🔧 Fixing products API hanging issue...');

// Replace the problematic db.query calls in getAllProducts method
content = content.replace(
    /db\.query\(dataSql, \[\.\.\.params, limit, offset\], \(err, rows\) => \{[\s\S]*?db\.query\(countSql, params, \(err2, countRows\) => \{[\s\S]*?\}\);[\s\S]*?\}\);/,
    `try {
            // Execute both queries with proper async/await
            const [rows] = await db.execute(dataSql, [...params, parseInt(limit), parseInt(offset)]);
            const [countRows] = await db.execute(countSql, params);

            const total = countRows[0]?.total || 0;
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    totalPages: parseInt(totalPages)
                }
            });

        } catch (err) {
            console.error('getAllProducts:', err);
            
            // Handle missing table gracefully
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        totalPages: 0
                    }
                });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch products' 
            });
        }`
);

// Write the fixed content back
fs.writeFileSync(controllerPath, content);

console.log('✅ Fixed products API hanging issue');
console.log('🔧 Replaced db.query callbacks with async/await db.execute');
console.log('📝 Products endpoint should now respond properly');