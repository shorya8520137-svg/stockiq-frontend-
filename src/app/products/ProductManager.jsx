'use client';

import React, { useState, useEffect } from 'react';
import styles from './products.module.css';

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        product_name: '',
        product_variant: '',
        barcode: '',
        description: '',
        category_id: '',
        price: '',
        cost_price: '',
        weight: '',
        dimensions: ''
    });

    // Category form state
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        display_name: '',
        description: '',
        parent_id: ''
    });
    const [showCategoryForm, setShowCategoryForm] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [currentPage, searchTerm, selectedCategory]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                search: searchTerm,
                category: selectedCategory
            });

            const response = await fetch(`https://13-201-222-24.nip.io/api/products?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                setProducts(data.data.products);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://13-201-222-24.nip.io/api/products/categories/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingProduct 
                ? `https://13-201-222-24.nip.io/api/products/${editingProduct.p_id}`
                : 'https://13-201-222-24.nip.io/api/products';
            
            const method = editingProduct ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                setShowAddForm(false);
                setEditingProduct(null);
                setFormData({
                    product_name: '',
                    product_variant: '',
                    barcode: '',
                    description: '',
                    category_id: '',
                    price: '',
                    cost_price: '',
                    weight: '',
                    dimensions: ''
                });
                fetchProducts();
                alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
            } else {
                alert(data.message || 'Error saving product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product');
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            product_name: product.product_name || '',
            product_variant: product.product_variant || '',
            barcode: product.barcode || '',
            description: product.description || '',
            category_id: product.category_id || '',
            price: product.price || '',
            cost_price: product.cost_price || '',
            weight: product.weight || '',
            dimensions: product.dimensions || ''
        });
        setShowAddForm(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://13-201-222-24.nip.io/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchProducts();
                alert('Product deleted successfully!');
            } else {
                alert(data.message || 'Error deleting product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        const fileInput = e.target.file;
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('https://13-201-222-24.nip.io/api/products/bulk/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setShowBulkImport(false);
                fetchProducts();
                alert(`Import completed! Success: ${data.data.success}, Errors: ${data.data.errors}`);
            } else {
                alert(data.message || 'Error importing products');
            }
        } catch (error) {
            console.error('Error importing products:', error);
            alert('Error importing products');
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://13-201-222-24.nip.io/api/products/categories', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryForm)
            });

            const data = await response.json();
            if (data.success) {
                setShowCategoryForm(false);
                setCategoryForm({
                    name: '',
                    display_name: '',
                    description: '',
                    parent_id: ''
                });
                fetchCategories();
                alert('Category created successfully!');
            } else {
                alert(data.message || 'Error creating category');
            }
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Error creating category');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Product Management</h1>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.primaryBtn}
                        onClick={() => setShowAddForm(true)}
                    >
                        Add Product
                    </button>
                    <button 
                        className={styles.secondaryBtn}
                        onClick={() => setShowBulkImport(true)}
                    >
                        Bulk Import
                    </button>
                    <button 
                        className={styles.secondaryBtn}
                        onClick={() => setShowCategoryForm(true)}
                    >
                        Add Category
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={styles.categorySelect}
                >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.name}>
                            {category.display_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Products Table */}
            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Loading products...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Variant</th>
                                <th>Barcode</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.p_id}>
                                    <td>{product.product_name}</td>
                                    <td>{product.product_variant || '-'}</td>
                                    <td>{product.barcode}</td>
                                    <td>{product.category_display_name || '-'}</td>
                                    <td>{product.price ? `$${product.price}` : '-'}</td>
                                    <td>
                                        <button 
                                            className={styles.editBtn}
                                            onClick={() => handleEdit(product)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(product.p_id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                >
                    Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                >
                    Next
                </button>
            </div>

            {/* Add/Edit Product Modal */}
            {showAddForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Product Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.product_name}
                                        onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Product Variant</label>
                                    <input
                                        type="text"
                                        value={formData.product_variant}
                                        onChange={(e) => setFormData({...formData, product_variant: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Barcode *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Category</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.display_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Cost Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Dimensions</label>
                                    <input
                                        type="text"
                                        placeholder="L x W x H"
                                        value={formData.dimensions}
                                        onChange={(e) => setFormData({...formData, dimensions: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.primaryBtn}>
                                    {editingProduct ? 'Update' : 'Create'} Product
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.secondaryBtn}
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingProduct(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {showBulkImport && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Bulk Import Products</h2>
                        <form onSubmit={handleBulkImport}>
                            <div className={styles.formGroup}>
                                <label>Upload CSV or Excel File</label>
                                <input
                                    type="file"
                                    name="file"
                                    accept=".csv,.xlsx,.xls"
                                    required
                                />
                                <small>
                                    Required columns: product_name, barcode<br/>
                                    Optional: product_variant, description, category_id, price, cost_price, weight, dimensions
                                </small>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.primaryBtn}>
                                    Import Products
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.secondaryBtn}
                                    onClick={() => setShowBulkImport(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Add New Category</h2>
                        <form onSubmit={handleCategorySubmit}>
                            <div className={styles.formGroup}>
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Display Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.display_name}
                                    onChange={(e) => setCategoryForm({...categoryForm, display_name: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.primaryBtn}>
                                    Create Category
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.secondaryBtn}
                                    onClick={() => setShowCategoryForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManager;