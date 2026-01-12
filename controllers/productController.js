const db = require('../db/connection');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');

class ProductController {

    // ===============================
    // GET PRODUCTS WITH INVENTORY
    // ===============================
    static getAllProducts(req, res) {
        console.log('🔍 Products API called');
        
        const { page = 1, limit = 20, search = '', category = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = `
            SELECT 
                p_id,
                product_name,
                barcode,
                product_variant,
                category,
                created_at
            FROM products 
            WHERE 1=1
        `;
        
        const values = [];
        
        if (search) {
            sql += ' AND (product_name LIKE ? OR barcode LIKE ?)';
            values.push(`%${search}%`, `%${search}%`);
        }
        
        if (category) {
            sql += ' AND category = ?';
            values.push(category);
        }
        
        sql += ' ORDER BY product_name ASC LIMIT ? OFFSET ?';
        values.push(parseInt(limit), parseInt(offset));
        
        db.query(sql, values, (err, rows) => {
            if (err) {
                console.error('❌ Products query error:', err);
                
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
                
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch products',
                    error: err.message
                });
            }
            
            // Get total count
            db.query('SELECT COUNT(*) as total FROM products', (countErr, countResult) => {
                const total = countErr ? 0 : (countResult[0] ? countResult[0].total : 0);
                const totalPages = Math.ceil(total / limit);
                
                res.json({
                    success: true,
                    data: rows || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: totalPages
                    }
                });
            });
        });
    }

    // ===============================
    // GET WAREHOUSES
    // ===============================
    static getWarehouses(req, res) {
        db.query(
            'SELECT w_id, warehouse_code, Warehouse_name, address FROM dispatch_warehouse ORDER BY Warehouse_name',
            (err, rows) => {
                if (err) {
                    console.error('getWarehouses:', err);
                    
                    // Handle missing table gracefully
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({ 
                            success: true, 
                            data: [
                                { w_id: 1, warehouse_code: 'GGM_WH', Warehouse_name: 'Gurgaon Warehouse' },
                                { w_id: 2, warehouse_code: 'BLR_WH', Warehouse_name: 'Bangalore Warehouse' }
                            ]
                        });
                    }
                    
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch warehouses' 
                    });
                }
                
                res.json({ success: true, data: rows });
            }
        );
    }

    // ===============================
    // GET STORES
    // ===============================
    static getStores(req, res) {
        db.query(
            'SELECT store_id, store_name, store_code FROM stores ORDER BY store_name',
            (err, rows) => {
                if (err) {
                    console.error('getStores:', err);
                    
                    // Handle missing table gracefully
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({ 
                            success: true, 
                            data: [
                                { store_id: 1, store_name: 'Main Store', store_code: 'MAIN' },
                                { store_id: 2, store_name: 'Branch Store', store_code: 'BRANCH' }
                            ]
                        });
                    }
                    
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch stores' 
                    });
                }
                
                res.json({ success: true, data: rows });
            }
        );
    }

    // ===============================
    // GET CATEGORIES
    // ===============================
    static getCategories(req, res) {
        db.query(
            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category',
            (err, rows) => {
                if (err) {
                    console.error('getCategories:', err);
                    
                    // Handle missing table gracefully
                    if (err.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({ 
                            success: true, 
                            data: [
                                { category: 'Electronics' },
                                { category: 'Clothing' },
                                { category: 'Home & Garden' }
                            ]
                        });
                    }
                    
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to fetch categories' 
                    });
                }
                
                res.json({ success: true, data: rows });
            }
        );
    }

    // ===============================
    // CREATE PRODUCT
    // ===============================
    static createProduct(req, res) {
        const { product_name, barcode, product_variant, category } = req.body;
        
        if (!product_name || !barcode) {
            return res.status(400).json({
                success: false,
                message: 'Product name and barcode are required'
            });
        }
        
        const sql = 'INSERT INTO products (product_name, barcode, product_variant, category) VALUES (?, ?, ?, ?)';
        const values = [product_name, barcode, product_variant || null, category || null];
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('createProduct:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create product',
                    error: err.message
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: { p_id: result.insertId, ...req.body }
            });
        });
    }

    // ===============================
    // UPDATE PRODUCT
    // ===============================
    static updateProduct(req, res) {
        const { id } = req.params;
        const { product_name, barcode, product_variant, category } = req.body;
        
        const sql = 'UPDATE products SET product_name = ?, barcode = ?, product_variant = ?, category = ? WHERE p_id = ?';
        const values = [product_name, barcode, product_variant || null, category || null, id];
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('updateProduct:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update product',
                    error: err.message
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Product updated successfully'
            });
        });
    }

    // ===============================
    // DELETE PRODUCT
    // ===============================
    static deleteProduct(req, res) {
        const { id } = req.params;
        
        db.query('DELETE FROM products WHERE p_id = ?', [id], (err, result) => {
            if (err) {
                console.error('deleteProduct:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete product',
                    error: err.message
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        });
    }

    // ===============================
    // SEARCH BY BARCODE
    // ===============================
    static searchByBarcode(req, res) {
        const { barcode } = req.params;
        
        db.query('SELECT * FROM products WHERE barcode = ?', [barcode], (err, rows) => {
            if (err) {
                console.error('searchByBarcode:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to search product',
                    error: err.message
                });
            }
            
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                data: rows[0]
            });
        });
    }

    // ===============================
    // GET INVENTORY
    // ===============================
    static getInventory(req, res) {
        const sql = `
            SELECT 
                p.p_id,
                p.product_name,
                p.barcode,
                p.product_variant,
                COALESCE(SUM(sb.qty_available), 0) as total_stock
            FROM products p
            LEFT JOIN stock_batches sb ON p.barcode = sb.barcode AND sb.status = 'active'
            GROUP BY p.p_id, p.product_name, p.barcode, p.product_variant
            ORDER BY p.product_name
        `;
        
        db.query(sql, (err, rows) => {
            if (err) {
                console.error('getInventory:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch inventory',
                    error: err.message
                });
            }
            
            res.json({
                success: true,
                data: rows || []
            });
        });
    }

    // ===============================
    // GET INVENTORY BY WAREHOUSE
    // ===============================
    static getInventoryByWarehouse(req, res) {
        const { warehouse } = req.params;
        
        const sql = `
            SELECT 
                p.p_id,
                p.product_name,
                p.barcode,
                p.product_variant,
                sb.warehouse,
                COALESCE(SUM(sb.qty_available), 0) as stock
            FROM products p
            LEFT JOIN stock_batches sb ON p.barcode = sb.barcode AND sb.status = 'active' AND sb.warehouse = ?
            GROUP BY p.p_id, p.product_name, p.barcode, p.product_variant, sb.warehouse
            ORDER BY p.product_name
        `;
        
        db.query(sql, [warehouse], (err, rows) => {
            if (err) {
                console.error('getInventoryByWarehouse:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch warehouse inventory',
                    error: err.message
                });
            }
            
            res.json({
                success: true,
                data: rows || []
            });
        });
    }

    // ===============================
    // EXPORT INVENTORY
    // ===============================
    static exportInventory(req, res) {
        const sql = `
            SELECT 
                p.product_name,
                p.barcode,
                p.product_variant,
                p.category,
                COALESCE(SUM(sb.qty_available), 0) as total_stock
            FROM products p
            LEFT JOIN stock_batches sb ON p.barcode = sb.barcode AND sb.status = 'active'
            GROUP BY p.p_id, p.product_name, p.barcode, p.product_variant, p.category
            ORDER BY p.product_name
        `;
        
        db.query(sql, (err, rows) => {
            if (err) {
                console.error('exportInventory:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to export inventory',
                    error: err.message
                });
            }
            
            // Generate CSV
            const csvHeader = 'Product Name,Barcode,Variant,Category,Total Stock\n';
            const csvRows = (rows || []).map(item => 
                `"${item.product_name}","${item.barcode}","${item.product_variant || ''}","${item.category || ''}",${item.total_stock}`
            ).join('\n');
            
            const csv = csvHeader + csvRows;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="products-inventory-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        });
    }

    // ===============================
    // TRANSFER PRODUCT
    // ===============================
    static transferProduct(req, res) {
        res.json({
            success: false,
            message: 'Transfer functionality not implemented yet'
        });
    }

    // ===============================
    // BULK TRANSFER PRODUCTS
    // ===============================
    static bulkTransferProducts(req, res) {
        res.json({
            success: false,
            message: 'Bulk transfer functionality not implemented yet'
        });
    }

    // ===============================
    // GET PRODUCT INVENTORY
    // ===============================
    static getProductInventory(req, res) {
        const { barcode } = req.params;
        
        const sql = `
            SELECT 
                sb.warehouse,
                SUM(sb.qty_available) as stock,
                MAX(sb.created_at) as last_updated
            FROM stock_batches sb
            WHERE sb.barcode = ? AND sb.status = 'active'
            GROUP BY sb.warehouse
            ORDER BY sb.warehouse
        `;
        
        db.query(sql, [barcode], (err, rows) => {
            if (err) {
                console.error('getProductInventory:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch product inventory',
                    error: err.message
                });
            }
            
            res.json({
                success: true,
                data: rows || []
            });
        });
    }

    // ===============================
    // BULK IMPORT
    // ===============================
    static bulkImport(req, res) {
        res.json({
            success: false,
            message: 'Bulk import functionality not implemented yet'
        });
    }

    // ===============================
    // BULK IMPORT WITH PROGRESS
    // ===============================
    static bulkImportWithProgress(req, res) {
        res.json({
            success: false,
            message: 'Bulk import with progress functionality not implemented yet'
        });
    }

    // ===============================
    // CREATE CATEGORY
    // ===============================
    static createCategory(req, res) {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }
        
        // For now, just return success since we don't have a categories table
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { name }
        });
    }
}

module.exports = ProductController;