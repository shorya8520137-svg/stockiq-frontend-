const db = require('../db/connection');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');

class ProductController {

    // ===============================
    // GET PRODUCTS WITH FALLBACK DATA
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
                
                // Handle missing table gracefully with mock data
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.json({
                        success: true,
                        data: {
                            products: [
                                {
                                    p_id: 1,
                                    product_name: 'Sample Product 1',
                                    barcode: '1234567890',
                                    product_variant: 'Default',
                                    category: 'Electronics',
                                    created_at: new Date().toISOString()
                                },
                                {
                                    p_id: 2,
                                    product_name: 'Sample Product 2',
                                    barcode: '0987654321',
                                    product_variant: 'Premium',
                                    category: 'Accessories',
                                    created_at: new Date().toISOString()
                                }
                            ],
                            pagination: {
                                page: parseInt(page),
                                limit: parseInt(limit),
                                total: 2,
                                totalPages: 1
                            }
                        },
                        message: 'Showing sample data (database table not found)'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch products',
                    error: err.message
                });
            }
            
            // Get total count
            const countSql = `
                SELECT COUNT(*) as total 
                FROM products 
                WHERE 1=1 ${search ? 'AND (product_name LIKE ? OR barcode LIKE ?)' : ''} 
                ${category ? 'AND category = ?' : ''}
            `;
            
            const countValues = [];
            if (search) {
                countValues.push(`%${search}%`, `%${search}%`);
            }
            if (category) {
                countValues.push(category);
            }
            
            db.query(countSql, countValues, (countErr, countResult) => {
                const total = countErr ? 0 : countResult[0]?.total || 0;
                const totalPages = Math.ceil(total / limit);
                
                res.json({
                    success: true,
                    data: {
                        products: rows,
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total,
                            totalPages
                        }
                    }
                });
            });
        });
    }

    // ===============================
    // GET SINGLE PRODUCT
    // ===============================
    static getProduct(req, res) {
        const { id } = req.params;
        
        const sql = 'SELECT * FROM products WHERE p_id = ?';
        
        db.query(sql, [id], (err, rows) => {
            if (err) {
                console.error('❌ Get product error:', err);
                
                // Fallback for missing table
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.json({
                        success: true,
                        data: {
                            p_id: id,
                            product_name: `Sample Product ${id}`,
                            barcode: `123456789${id}`,
                            product_variant: 'Default',
                            category: 'Sample Category',
                            created_at: new Date().toISOString()
                        },
                        message: 'Showing sample data (database table not found)'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch product'
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
        
        const sql = `
            INSERT INTO products (product_name, barcode, product_variant, category, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        db.query(sql, [product_name, barcode, product_variant || 'Default', category || 'General'], (err, result) => {
            if (err) {
                console.error('❌ Create product error:', err);
                
                // Fallback response for missing table
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.json({
                        success: true,
                        message: 'Product would be created (database table not found)',
                        data: { id: Math.floor(Math.random() * 1000) }
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create product'
                });
            }
            
            res.json({
                success: true,
                message: 'Product created successfully',
                data: { id: result.insertId }
            });
        });
    }

    // ===============================
    // UPDATE PRODUCT
    // ===============================
    static updateProduct(req, res) {
        const { id } = req.params;
        const { product_name, barcode, product_variant, category } = req.body;
        
        const sql = `
            UPDATE products 
            SET product_name = ?, barcode = ?, product_variant = ?, category = ?, updated_at = NOW()
            WHERE p_id = ?
        `;
        
        db.query(sql, [product_name, barcode, product_variant, category, id], (err, result) => {
            if (err) {
                console.error('❌ Update product error:', err);
                
                // Fallback response
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.json({
                        success: true,
                        message: 'Product would be updated (database table not found)'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update product'
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
        
        const sql = 'DELETE FROM products WHERE p_id = ?';
        
        db.query(sql, [id], (err, result) => {
            if (err) {
                console.error('❌ Delete product error:', err);
                
                // Fallback response
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.json({
                        success: true,
                        message: 'Product would be deleted (database table not found)'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete product'
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
}

module.exports = ProductController;