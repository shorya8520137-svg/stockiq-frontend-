'use client';

import React, { useState, useEffect } from 'react';
import { Download, Upload, Plus, Search, Filter, Edit, Trash2, Package, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowRightLeft, Clock } from 'lucide-react';
import styles from './products.module.css';
import TransferForm from './TransferForm';
import { productsAPI } from '@/services/api/products';
import { usePermissions, PERMISSIONS } from '@/contexts/PermissionsContext';
import { API_CONFIG } from '@/services/api';

const ProductManager = () => {
    const { hasPermission, logAction } = usePermissions();
    
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
    const [notification, setNotification] = useState(null);
    const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
    const [barcodeInventory, setBarcodeInventory] = useState(null);
    const [showBarcodeDisplay, setShowBarcodeDisplay] = useState(false);
    const [selectedBarcode, setSelectedBarcode] = useState(null);
    const [showTransferForm, setShowTransferForm] = useState(false);
    
    // Search suggestions state
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    
    // Progress tracking states for bulk import
    const [importProgress, setImportProgress] = useState(null);
    const [currentImportItem, setCurrentImportItem] = useState(null);

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
    }, [currentPage, selectedCategory]);

    // Debounced search effect
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (searchTerm !== undefined) {
                fetchProducts();
            }
        }, 300);
        return () => clearTimeout(delayedSearch);
    }, [searchTerm]);

    // Handle search input change with suggestions
    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchTerm(query);
        setSelectedSuggestionIndex(-1); // Reset selection when typing

        if (!query.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Show suggestions if query is at least 2 characters
        if (query.length >= 2) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `${API_CONFIG.BASE_URL}/products?search=${encodeURIComponent(query)}&limit=10`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data?.products) {
                        setSuggestions(data.data.products);
                        setShowSuggestions(true);
                    } else if (Array.isArray(data.data)) {
                        setSuggestions(data.data);
                        setShowSuggestions(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Handle keyboard navigation in search
    const handleSearchKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
                    selectSuggestion(suggestions[selectedSuggestionIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                break;
        }
    };

    // Select a suggestion
    const selectSuggestion = (product) => {
        setSearchTerm(product.product_name);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

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

            const response = await fetch(`${API_CONFIG.BASE_URL}/products?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setProducts(data.data.products);
                setTotalPages(data.data.pagination.pages);
            } else {
                showNotification(data.message || 'Failed to fetch products', 'error');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showNotification('Failed to load products. Please check your connection.', 'error');
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/products/categories/all`, {
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

    const downloadTemplate = async () => {
        try {
            // Create empty template with headers only
            const templateData = [
                {
                    product_name: '',
                    product_variant: '',
                    barcode: '',
                    description: '',
                    category_id: '',
                    price: '',
                    cost_price: '',
                    weight: '',
                    dimensions: ''
                }
            ];

            // Import XLSX dynamically (since it's a large library)
            const XLSX = await import('xlsx');

            // Create workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(templateData);

            // Add column widths for better formatting
            worksheet['!cols'] = [
                { width: 25 }, // product_name
                { width: 18 }, // product_variant
                { width: 15 }, // barcode
                { width: 35 }, // description
                { width: 12 }, // category_id
                { width: 10 }, // price
                { width: 12 }, // cost_price
                { width: 10 }, // weight
                { width: 15 }  // dimensions
            ];

            // Add the worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');

            // Generate and download the file
            XLSX.writeFile(workbook, 'products_template.xlsx');

            showNotification('Template downloaded successfully!');
        } catch (error) {
            console.error('Error downloading template:', error);
            showNotification('Failed to download template. Generating CSV instead...', 'error');

            // Fallback to CSV if XLSX fails
            downloadCSVTemplate();
        }
    };

    const downloadCSVTemplate = () => {
        const csvContent = `product_name,product_variant,barcode,description,category_id,price,cost_price,weight,dimensions`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'products_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('CSV template downloaded successfully!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.product_name.trim() || !formData.barcode.trim()) {
            showNotification('Product name and barcode are required', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = editingProduct
                ? `${API_CONFIG.BASE_URL}/products/${editingProduct.p_id}`
                : `${API_CONFIG.BASE_URL}/products`;

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
                await fetchProducts(); // Refresh the list
                showNotification(
                    data.message || (editingProduct ? 'Product updated successfully!' : 'Product created successfully!'),
                    'success'
                );
            } else {
                showNotification(data.message || 'Failed to save product', 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Network error. Please check your connection.', 'error');
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
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                await fetchProducts(); // Refresh the list
                showNotification(data.message || 'Product deleted successfully!', 'success');
            } else {
                showNotification(data.message || 'Failed to delete product', 'error');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Network error. Please check your connection.', 'error');
        }
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        const fileInput = e.target.file;
        const file = fileInput.files[0];

        if (!file) {
            showNotification('Please select a file to import', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            showNotification('Please select a CSV or Excel file', 'error');
            return;
        }

        // Reset progress states
        setImportProgress(null);
        setCurrentImportItem(null);

        try {
            showNotification('Starting product import...', 'success');

            // Use the new progress-enabled import
            const result = await productsAPI.bulkImportWithProgress(file, (progressData) => {
                console.log('Import progress update:', progressData);
                
                switch (progressData.type) {
                    case 'start':
                        setImportProgress({
                            total: progressData.total,
                            current: 0,
                            percentage: 0,
                            message: progressData.message
                        });
                        break;
                        
                    case 'progress':
                        setImportProgress({
                            total: progressData.total,
                            current: progressData.current,
                            percentage: progressData.percentage,
                            message: progressData.message
                        });
                        setCurrentImportItem({
                            product_name: progressData.product_name,
                            barcode: progressData.barcode
                        });
                        break;
                        
                    case 'success':
                        // Individual success - could show in a log if needed
                        break;
                        
                    case 'error':
                        if (progressData.row) {
                            // Individual row error - could show in a log if needed
                            console.warn(`Row ${progressData.row} error:`, progressData.message);
                        }
                        break;
                        
                    case 'complete':
                        setImportProgress(null);
                        setCurrentImportItem(null);
                        break;
                }
            });

            if (result.success) {
                setShowBulkImport(false);
                await fetchProducts(); // Refresh the list
                showNotification(
                    result.message || `Import completed successfully! ${result.count || 0} products imported.`,
                    'success'
                );
            } else {
                showNotification(result.message || 'Failed to import products', 'error');
            }
        } catch (error) {
            console.error('Error importing products:', error);
            showNotification('Network error during import. Please try again.', 'error');
            setImportProgress(null);
            setCurrentImportItem(null);
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!categoryForm.name.trim() || !categoryForm.display_name.trim()) {
            showNotification('Category name and display name are required', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/products/categories`, {
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
                await fetchCategories(); // Refresh categories
                showNotification(data.message || 'Category created successfully!', 'success');
            } else {
                showNotification(data.message || 'Failed to create category', 'error');
            }
        } catch (error) {
            console.error('Error creating category:', error);
            showNotification('Network error. Please check your connection.', 'error');
        }
    };



    const handleBarcodeClick = async (product) => {
        setSelectedBarcode(product);
        setShowBarcodeDisplay(true);
    };

    const handleScanBarcode = async (barcode) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/products/inventory/${barcode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                setBarcodeInventory(data.data);
                setShowBarcodeDetails(true);
                setShowBarcodeDisplay(false); // Close barcode display
                showNotification('Product details loaded!', 'success');
            } else {
                showNotification('No inventory data found for this barcode', 'error');
            }
        } catch (error) {
            console.error('Error fetching barcode inventory:', error);
            showNotification('Error fetching inventory details', 'error');
        }
    };

    const handleSelfTransfer = () => {
        setShowTransferForm(true);
    };

    // Export all products to Excel/CSV
    const handleExportProducts = async () => {
        try {
            showNotification('Preparing export...', 'success');
            
            const token = localStorage.getItem('token');
            
            // Fetch ALL products (no pagination limit)
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/products?limit=10000`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch products for export');
            }

            const data = await response.json();
            let allProducts = [];
            
            if (data.success && data.data?.products) {
                allProducts = data.data.products;
            } else if (Array.isArray(data.data)) {
                allProducts = data.data;
            }

            if (allProducts.length === 0) {
                showNotification('No products to export', 'error');
                return;
            }

            // Prepare data for export
            const exportData = allProducts.map(product => ({
                'Product Name': product.product_name || '',
                'Variant': product.product_variant || '',
                'Barcode': product.barcode || '',
                'Category': product.category_display_name || 'Uncategorized',
                'Description': product.description || '',
                'Price': product.price || '',
                'Cost Price': product.cost_price || '',
                'Total Stock': product.total_stock || 0,
                'Warehouse Locations': product.warehouse_count || 0,
                'Weight': product.weight || '',
                'Dimensions': product.dimensions || ''
            }));

            try {
                // Try to use XLSX for Excel export
                const XLSX = await import('xlsx');
                
                const workbook = XLSX.utils.book_new();
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                
                // Set column widths
                worksheet['!cols'] = [
                    { width: 30 }, // Product Name
                    { width: 20 }, // Variant
                    { width: 15 }, // Barcode
                    { width: 18 }, // Category
                    { width: 35 }, // Description
                    { width: 10 }, // Price
                    { width: 12 }, // Cost Price
                    { width: 12 }, // Total Stock
                    { width: 18 }, // Warehouse Locations
                    { width: 10 }, // Weight
                    { width: 15 }  // Dimensions
                ];
                
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
                
                // Generate filename with date
                const date = new Date().toISOString().split('T')[0];
                XLSX.writeFile(workbook, `products_export_${date}.xlsx`);
                
                showNotification(`Successfully exported ${allProducts.length} products!`, 'success');
            } catch (xlsxError) {
                console.warn('XLSX export failed, falling back to CSV:', xlsxError);
                
                // Fallback to CSV export
                exportToCSV(exportData);
            }
        } catch (error) {
            console.error('Error exporting products:', error);
            showNotification('Failed to export products. Please try again.', 'error');
        }
    };

    // CSV export fallback
    const exportToCSV = (data) => {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = String(value).replace(/"/g, '""');
                    return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
                        ? `"${escaped}"`
                        : escaped;
                }).join(',')
            )
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `products_export_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`Successfully exported ${data.length} products as CSV!`, 'success');
    };

    return (
        <div className={styles.container}>
            {/* Notification */}
            {notification && (
                <div className={`${styles.notification} ${styles[notification.type]}`}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Sticky Header */}
            <div className={styles.stickyHeader}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.titleSection}>
                            <Package className={styles.titleIcon} size={24} />
                            <div>
                                <h1>Product Management</h1>
                                <p>Manage your product catalog</p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
                            <button
                                className={`${styles.btn} ${styles.primaryBtn}`}
                                onClick={() => {
                                    logAction('ATTEMPT_ADD_PRODUCT', 'PRODUCT', { component: 'ProductManager' });
                                    setShowAddForm(true);
                                }}
                            >
                                <Plus size={16} />
                                Add Product
                            </button>
                        )}
                        {hasPermission(PERMISSIONS.PRODUCTS_BULK_IMPORT) && (
                            <button
                                className={`${styles.btn} ${styles.secondaryBtn}`}
                                onClick={() => {
                                    logAction('ATTEMPT_BULK_IMPORT', 'PRODUCT', { component: 'ProductManager' });
                                    setShowBulkImport(true);
                                }}
                            >
                                <Upload size={16} />
                                Bulk Import
                            </button>
                        )}
                        {hasPermission(PERMISSIONS.PRODUCTS_EXPORT) && (
                            <button
                                className={`${styles.btn} ${styles.exportBtn}`}
                                onClick={() => {
                                    logAction('ATTEMPT_EXPORT_PRODUCTS', 'PRODUCT', { component: 'ProductManager' });
                                    handleExportProducts();
                                }}
                            >
                                <Download size={16} />
                                Export All
                            </button>
                        )}
                        {hasPermission(PERMISSIONS.INVENTORY_TRANSFER) && (
                            <button
                                className={`${styles.btn} ${styles.transferBtn}`}
                                onClick={() => {
                                    logAction('ATTEMPT_SELF_TRANSFER', 'INVENTORY', { component: 'ProductManager' });
                                    handleSelfTransfer();
                                }}
                            >
                                <ArrowRightLeft size={16} />
                                Self Transfer
                            </button>
                        )}
                        {hasPermission(PERMISSIONS.PRODUCTS_CATEGORIES) && (
                            <button
                                className={`${styles.btn} ${styles.outlineBtn}`}
                                onClick={() => {
                                    logAction('ATTEMPT_ADD_CATEGORY', 'PRODUCT', { component: 'ProductManager' });
                                    setShowCategoryForm(true);
                                }}
                            >
                                <Plus size={16} />
                                Add Category
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Package size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{products.length}</h3>
                            <p>Total Products</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Filter size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{categories.length}</h3>
                            <p>Categories</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filtersCard}>
                    <div className={styles.filtersContent}>
                        <div className={styles.searchGroup}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder="Search by product name or barcode..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className={styles.searchInput}
                            />
                            
                            {/* Search Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className={styles.suggestionsDropdown}>
                                    {suggestions.map((product, index) => (
                                        <div
                                            key={product.p_id || index}
                                            className={`${styles.suggestionItem} ${
                                                index === selectedSuggestionIndex ? styles.suggestionItemActive : ''
                                            }`}
                                            onClick={() => selectSuggestion(product)}
                                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                        >
                                            <div className={styles.suggestionIcon}>
                                                <Package size={14} />
                                            </div>
                                            <div className={styles.suggestionContent}>
                                                <div className={styles.suggestionName}>
                                                    {product.product_name}
                                                    {product.product_variant && (
                                                        <span className={styles.suggestionVariant}> - {product.product_variant}</span>
                                                    )}
                                                </div>
                                                <div className={styles.suggestionBarcode}>
                                                    Barcode: {product.barcode}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                </div>
            </div>

            {/* Scrollable Content */}
            <div className={styles.scrollableContent}>
                {/* Products Table */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <h3>Products ({products.length})</h3>
                    </div>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading products...</p>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                <tr>
                                    <th>Product Details</th>
                                    <th>Barcode</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Pricing</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {products.map(product => (
                                    <tr key={product.p_id}>
                                        <td>
                                            <div className={styles.productInfo}>
                                                <div className={styles.productAvatar}>
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <div className={styles.productName}>{product.product_name}</div>
                                                    {product.product_variant && (
                                                        <div className={styles.productVariant}>{product.product_variant}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <code 
                                                className={`${styles.barcode} ${styles.clickableBarcode}`}
                                                onClick={() => handleBarcodeClick(product)}
                                                title="Click to view barcode"
                                            >
                                                {product.barcode}
                                            </code>
                                        </td>
                                        <td>
                                                <span className={styles.categoryBadge}>
                                                    {product.category_display_name || 'Uncategorized'}
                                                </span>
                                        </td>
                                        <td>
                                            <div className={styles.stockInfo}>
                                                <div className={styles.stockNumber}>{product.total_stock || 0}</div>
                                                <div className={styles.stockLocations}>
                                                    {product.warehouse_count > 0 ? `${product.warehouse_count} locations` : 'No stock'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.pricing}>
                                                {product.price && <div className={styles.price}>${product.price}</div>}
                                                {product.cost_price && <div className={styles.costPrice}>Cost: ${product.cost_price}</div>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.editBtn}`}
                                                    onClick={() => handleEdit(product)}
                                                    title="Edit Product"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                    onClick={() => handleDelete(product.p_id)}
                                                    title="Delete Product"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className={styles.pagination}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className={styles.paginationBtn}
                    >
                        Previous
                    </button>
                    <span className={styles.paginationInfo}>Page {currentPage} of {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className={styles.paginationBtn}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {showAddForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingProduct(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Product Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.product_name}
                                        onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                                        placeholder="Enter product name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Product Variant</label>
                                    <input
                                        type="text"
                                        value={formData.product_variant}
                                        onChange={(e) => setFormData({...formData, product_variant: e.target.value})}
                                        placeholder="e.g., Size - 6-12m, Red Color"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Barcode *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                        placeholder="Enter unique barcode"
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
                                    <label>Selling Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Cost Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                                        placeholder="0.000"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Dimensions</label>
                                    <input
                                        type="text"
                                        placeholder="L x W x H (e.g., 10x8x2)"
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
                                    placeholder="Enter product description..."
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={`${styles.btn} ${styles.primaryBtn}`}>
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.outlineBtn}`}
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
                        <div className={styles.modalHeader}>
                            <h2>Bulk Import Products</h2>
                            {!importProgress && (
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setShowBulkImport(false)}
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Progress Display */}
                        {importProgress && (
                            <div className={styles.progressSection}>
                                <div className={styles.progressHeader}>
                                    <Clock size={20} />
                                    <span>Import in Progress</span>
                                </div>
                                
                                {/* Circular Progress Counter */}
                                <div className={styles.circularProgress}>
                                    <svg className={styles.progressRing} width="120" height="120">
                                        <circle
                                            className={styles.progressRingBackground}
                                            stroke="#e5e7eb"
                                            strokeWidth="8"
                                            fill="transparent"
                                            r="52"
                                            cx="60"
                                            cy="60"
                                        />
                                        <circle
                                            className={styles.progressRingForeground}
                                            stroke="#3b82f6"
                                            strokeWidth="8"
                                            fill="transparent"
                                            r="52"
                                            cx="60"
                                            cy="60"
                                            strokeDasharray={`${2 * Math.PI * 52}`}
                                            strokeDashoffset={`${2 * Math.PI * 52 * (1 - importProgress.percentage / 100)}`}
                                            transform="rotate(-90 60 60)"
                                        />
                                    </svg>
                                    <div className={styles.progressContent}>
                                        <div className={styles.progressNumber}>
                                            {importProgress.current}
                                        </div>
                                        <div className={styles.progressTotal}>
                                            of {importProgress.total}
                                        </div>
                                        <div className={styles.progressPercentage}>
                                            {importProgress.percentage}%
                                        </div>
                                    </div>
                                </div>

                                {/* Current Item */}
                                {currentImportItem && (
                                    <div className={styles.currentItem}>
                                        <div className={styles.currentItemLabel}>Processing:</div>
                                        <div className={styles.currentItemName}>{currentImportItem.product_name}</div>
                                        <div className={styles.currentItemBarcode}>{currentImportItem.barcode}</div>
                                    </div>
                                )}

                                <div className={styles.progressMessage}>
                                    {importProgress.message}
                                </div>
                            </div>
                        )}

                        {/* Only show form when not importing */}
                        {!importProgress && (
                            <div className={styles.bulkImportContent}>
                                <div className={styles.templateSection}>
                                    <div className={styles.templateHeader}>
                                        <FileSpreadsheet size={24} />
                                        <div>
                                            <h3>Download Template</h3>
                                            <p>Download Excel template with correct column headers for bulk import</p>
                                        </div>
                                    </div>
                                    <button
                                        className={`${styles.btn} ${styles.outlineBtn}`}
                                        onClick={downloadTemplate}
                                    >
                                        <Download size={18} />
                                        Download Template
                                    </button>
                                </div>

                                <div className={styles.divider}>
                                    <span>OR</span>
                                </div>

                                <form onSubmit={handleBulkImport}>
                                    <div className={styles.uploadSection}>
                                        <div className={styles.uploadArea}>
                                            <Upload size={48} />
                                            <h3>Upload Your File</h3>
                                            <p>Choose CSV or Excel file with your product data</p>
                                            <input
                                                type="file"
                                                name="file"
                                                accept=".csv,.xlsx,.xls"
                                                required
                                                className={styles.fileInput}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.columnInfo}>
                                        <h4>Required Columns:</h4>
                                        <div className={styles.columnGrid}>
                                            <div className={styles.columnItem}>
                                                <strong>product_name</strong> - Product name (required)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>barcode</strong> - Unique barcode (required)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>product_variant</strong> - Product variant (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>description</strong> - Product description (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>category_id</strong> - Category ID (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>price</strong> - Selling price (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>cost_price</strong> - Cost price (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>weight</strong> - Weight in kg (optional)
                                            </div>
                                            <div className={styles.columnItem}>
                                                <strong>dimensions</strong> - L x W x H (optional)
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.modalActions}>
                                        <button type="submit" className={`${styles.btn} ${styles.primaryBtn}`}>
                                            <Upload size={18} />
                                            Import Products
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.outlineBtn}`}
                                            onClick={() => setShowBulkImport(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Category</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowCategoryForm(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCategorySubmit}>
                            <div className={styles.formGroup}>
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                    placeholder="e.g., baby_wear"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Display Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.display_name}
                                    onChange={(e) => setCategoryForm({...categoryForm, display_name: e.target.value})}
                                    placeholder="e.g., Baby Wear"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                                    placeholder="Enter category description..."
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={`${styles.btn} ${styles.primaryBtn}`}>
                                    Create Category
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.outlineBtn}`}
                                    onClick={() => setShowCategoryForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Display Modal */}
            {showBarcodeDisplay && selectedBarcode && (
                <div className={styles.modal}>
                    <div className={`${styles.modalContent} ${styles.barcodeModal}`}>
                        <div className={styles.modalHeader}>
                            <h2>Product Barcode</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => {
                                    setShowBarcodeDisplay(false);
                                    setSelectedBarcode(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className={styles.barcodeContent}>
                            <div className={styles.productInfo}>
                                <h3>{selectedBarcode.product_name}</h3>
                                {selectedBarcode.product_variant && (
                                    <p className={styles.variant}>{selectedBarcode.product_variant}</p>
                                )}
                            </div>

                            <div className={styles.barcodeDisplay}>
                                <div className={styles.barcodeType}>Code 128</div>
                                <div className={styles.barcodeLines}>
                                    <div className={styles.barcodeBars}>
                                        {/* Generate barcode-like pattern */}
                                        {Array.from({length: 50}, (_, i) => (
                                            <div 
                                                key={i} 
                                                className={styles.barcodeBar}
                                                style={{
                                                    width: Math.random() > 0.5 ? '2px' : '1px',
                                                    height: '60px',
                                                    backgroundColor: '#000',
                                                    marginRight: Math.random() > 0.7 ? '2px' : '1px'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.barcodeNumber}>{selectedBarcode.barcode}</div>
                            </div>

                            <div className={styles.barcodeActions}>
                                <button 
                                    className={`${styles.btn} ${styles.primaryBtn}`}
                                    onClick={() => handleScanBarcode(selectedBarcode.barcode)}
                                >
                                    <Package size={16} />
                                    Scan & View Details
                                </button>
                                <button 
                                    className={`${styles.btn} ${styles.outlineBtn}`}
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedBarcode.barcode);
                                        showNotification('Barcode copied to clipboard!', 'success');
                                    }}
                                >
                                    Copy Barcode
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Details Modal */}
            {showBarcodeDetails && barcodeInventory && (
                <div className={styles.modal}>
                    <div className={`${styles.modalContent} ${styles.inventoryModal}`}>
                        <div className={styles.modalHeader}>
                            <h2>Inventory Details</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => {
                                    setShowBarcodeDetails(false);
                                    setBarcodeInventory(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className={styles.inventoryContent}>
                            <div className={styles.inventoryHeader}>
                                <div className={styles.barcodeInfo}>
                                    <h3>Barcode: <code>{barcodeInventory.inventory[0]?.code}</code></h3>
                                    <p>Product: {barcodeInventory.inventory[0]?.product}</p>
                                    {barcodeInventory.inventory[0]?.variant && (
                                        <p>Variant: {barcodeInventory.inventory[0]?.variant}</p>
                                    )}
                                </div>
                                <div className={styles.totalStock}>
                                    <div className={styles.stockNumber}>{barcodeInventory.total_stock}</div>
                                    <div className={styles.stockLabel}>Total Stock</div>
                                </div>
                            </div>

                            <div className={styles.locationsList}>
                                <h4>Stock by Location ({barcodeInventory.locations} locations)</h4>
                                <div className={styles.locationsGrid}>
                                    {barcodeInventory.inventory.map((item, index) => (
                                        <div key={index} className={styles.locationCard}>
                                            <div className={styles.locationHeader}>
                                                <div className={styles.locationName}>
                                                    {item.Warehouse_name || item.store_name || item.warehouse}
                                                </div>
                                                <div className={styles.locationCode}>
                                                    {item.warehouse_code}
                                                </div>
                                            </div>
                                            <div className={styles.locationStock}>
                                                <div className={styles.stockAmount}>{item.stock}</div>
                                                <div className={styles.stockUnit}>units</div>
                                            </div>
                                            {item.city && (
                                                <div className={styles.locationCity}>
                                                    {item.city}, {item.state}
                                                </div>
                                            )}
                                            <div className={styles.locationMeta}>
                                                <div>Opening: {item.opening || 0}</div>
                                                <div>Return: {item.return || 0}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Form */}
            {showTransferForm && (
                <TransferForm onClose={() => setShowTransferForm(false)} />
            )}
        </div>
    );
};

export default ProductManager;