const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ===============================
// WORKING ROUTES (MATCH CONTROLLER)
// ===============================

// GET /api/products - Get all products
router.get('/', ProductController.getAllProducts);

// GET /api/products/:id - Get single product
router.get('/:id', ProductController.getProduct);

// POST /api/products - Create product
router.post('/', ProductController.createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', ProductController.updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', ProductController.deleteProduct);

// ===============================
// FALLBACK ROUTES (ADDITIONAL ENDPOINTS)
// ===============================

// GET /api/products/search/:query - Search products
router.get('/search/:query', (req, res) => {
    const { query } = req.params;
    res.json({
        success: true,
        data: [
            {
                p_id: 1,
                product_name: `Product matching "${query}"`,
                barcode: '1234567890',
                category: 'Electronics'
            }
        ],
        message: 'Sample search results (fallback mode)'
    });
});

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', (req, res) => {
    const { category } = req.params;
    res.json({
        success: true,
        data: [
            {
                p_id: 1,
                product_name: `Sample ${category} Product`,
                barcode: '1234567890',
                category: category
            }
        ],
        message: `Sample ${category} products (fallback mode)`
    });
});

module.exports = router;