"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Download, Package, MapPin, BarChart3, Eye, RefreshCw, Calendar, TrendingUp, X, ChevronDown } from "lucide-react";
import styles from "./inventory.module.css";
import { getMockInventoryResponse } from "../../utils/mockInventoryData";
import ProductTracker from "./ProductTracker";
import { API_CONFIG } from '@/services/api/config';

const PAGE_SIZE = 50; // Items to show per page in UI
const API_LIMIT = 10000; // Fetch all data from API at once

const WAREHOUSES = [
    { code: "GGM_WH", name: "Gurgaon Warehouse", city: "Gurgaon" },
    { code: "BLR_WH", name: "Bangalore Warehouse", city: "Bangalore" },
    { code: "MUM_WH", name: "Mumbai Warehouse", city: "Mumbai" },
    { code: "AMD_WH", name: "Ahmedabad Warehouse", city: "Ahmedabad" },
    { code: "HYD_WH", name: "Hyderabad Warehouse", city: "Hyderabad" },
];

export default function InventorySheet() {
    const [allItems, setAllItems] = useState([]); // Store ALL items from API
    const [items, setItems] = useState([]); // Items to display on current page
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchChips, setSearchChips] = useState([]); // For multi-search chips
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filter states
    const [selectedWarehouses, setSelectedWarehouses] = useState([]); // Multi-warehouse selection - empty means ALL
    const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false); // For inline warehouse dropdown
    const [stockFilter, setStockFilter] = useState("all");
    const [sortBy, setSortBy] = useState("product_name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState(""); // Empty by default - no date filtering
    const [dateTo, setDateTo] = useState(""); // Empty by default - no date filtering
    const [useMockData, setUseMockData] = useState(false); // Toggle for mock data

    // Timeline states - restored for modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [showTimeline, setShowTimeline] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalStock: 0,
        lowStockItems: 0,
        outOfStockItems: 0
    });

    /* ================= LOAD INVENTORY WITH FILTERS ================= */
    const loadInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: API_LIMIT.toString(), // Fetch ALL data at once
            });

            // Add warehouse filter - if selectedWarehouses is empty, show ALL warehouses
            if (selectedWarehouses.length > 0) {
                // For single warehouse selection, use 'warehouse' parameter
                if (selectedWarehouses.length === 1) {
                    params.append('warehouse', selectedWarehouses[0]);
                } else {
                    // For multiple warehouses, try 'warehouses' parameter
                    params.append('warehouses', selectedWarehouses.join(','));
                }
            }
            // Add search filter - combine chips and current input
            const allSearchTerms = [...searchChips];
            if (searchQuery.trim()) {
                allSearchTerms.push(searchQuery.trim());
            }
            if (allSearchTerms.length > 0) {
                params.append('search', allSearchTerms.join(' '));
            }
            if (stockFilter !== 'all') {
                params.append('stockFilter', stockFilter);
            }
            if (sortBy !== 'product_name') {
                params.append('sortBy', sortBy);
            }
            if (sortOrder !== 'asc') {
                params.append('sortOrder', sortOrder);
            }
            // Only add date filters if they are actually set
            if (dateFrom && dateFrom.trim()) {
                params.append('dateFrom', dateFrom);
            }
            if (dateTo && dateTo.trim()) {
                params.append('dateTo', dateTo);
            }

            console.log('🔗 API URL:', `${API_CONFIG.BASE_URL}/inventory?${params}`);
            console.log('🏢 Selected warehouses for API:', selectedWarehouses);

            const response = await fetch(`${API_CONFIG.BASE_URL}/inventory?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📊 Raw API Response:', data);
            
            // Parse response
            let inventoryItems = [];
            if (data.success && data.data) {
                inventoryItems = Array.isArray(data.data) ? data.data : data.data.items || data.data.inventory || [];
            } else if (Array.isArray(data)) {
                inventoryItems = data;
            } else if (data.inventory) {
                inventoryItems = data.inventory;
            } else if (data.items) {
                inventoryItems = data.items;
            }

            console.log('📊 Total items from API:', inventoryItems.length);
            console.log('🏢 Selected warehouses:', selectedWarehouses.length === 0 ? 'ALL' : selectedWarehouses.join(', '));
            
            // Debug: Check what warehouses are actually in the response
            if (inventoryItems.length > 0) {
                const warehousesInResponse = [...new Set(inventoryItems.map(item => 
                    item.warehouse || item.warehouse_name || item.Warehouse_name || 'Unknown'
                ))];
                console.log('🏢 Warehouses found in API response:', warehousesInResponse);
                console.log('🏢 Expected warehouses:', selectedWarehouses.length === 0 ? 'ALL' : selectedWarehouses);
                
                // Check if filtering worked
                if (selectedWarehouses.length > 0) {
                    const unexpectedWarehouses = warehousesInResponse.filter(wh => 
                        !selectedWarehouses.includes(wh) && wh !== 'Unknown'
                    );
                    if (unexpectedWarehouses.length > 0) {
                        console.error('❌ WAREHOUSE FILTERING FAILED!');
                        console.error('❌ Unexpected warehouses in response:', unexpectedWarehouses);
                        console.error('❌ This indicates the API is not filtering properly');
                    } else {
                        console.log('✅ Warehouse filtering working correctly');
                    }
                }
            }

            // Store ALL items for frontend pagination
            setAllItems(inventoryItems);
            
            // Apply frontend filtering as backup if API filtering failed
            let filteredItems = inventoryItems;
            if (selectedWarehouses.length > 0) {
                filteredItems = inventoryItems.filter(item => {
                    const itemWarehouse = item.warehouse || item.warehouse_name || item.Warehouse_name;
                    return selectedWarehouses.includes(itemWarehouse);
                });
                
                if (filteredItems.length !== inventoryItems.length) {
                    console.log('🔧 Applied frontend warehouse filtering');
                    console.log('🔧 Before filtering:', inventoryItems.length, 'items');
                    console.log('🔧 After filtering:', filteredItems.length, 'items');
                    setAllItems(filteredItems);
                }
            }
            
            // Calculate pages
            const totalPagesCalc = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
            setTotalPages(totalPagesCalc);
            
            // Show first page
            setItems(filteredItems.slice(0, PAGE_SIZE));
            setPage(1);

            // Calculate stats
            setStats({
                totalProducts: filteredItems.length,
                totalStock: filteredItems.reduce((sum, item) => sum + (parseInt(item.stock || item.quantity || 0)), 0),
                lowStockItems: filteredItems.filter(item => {
                    const stock = parseInt(item.stock || item.quantity || 0);
                    return stock > 0 && stock <= 10;
                }).length,
                outOfStockItems: filteredItems.filter(item => {
                    const stock = parseInt(item.stock || item.quantity || 0);
                    return stock === 0;
                }).length
            });

            console.log('✅ Frontend pagination ready:', { totalItems: inventoryItems.length, totalPages: totalPagesCalc, pageSize: PAGE_SIZE });

        } catch (error) {
            console.error('❌ Error loading inventory:', error);
            setAllItems([]);
            setItems([]);
            setTotalPages(1);
            setStats({ totalProducts: 0, totalStock: 0, lowStockItems: 0, outOfStockItems: 0 });
        } finally {
            setLoading(false);
        }
    };
    
    // ✅ Handle page change - slice data from allItems
    useEffect(() => {
        if (allItems.length > 0) {
            const startIndex = (page - 1) * PAGE_SIZE;
            const endIndex = startIndex + PAGE_SIZE;
            setItems(allItems.slice(startIndex, endIndex));
            console.log(`📄 Page ${page}: showing items ${startIndex + 1} to ${Math.min(endIndex, allItems.length)} of ${allItems.length}`);
        }
    }, [page, allItems]);

    useEffect(() => {
        // Load data when filters change (NOT when page changes - that's handled separately)
        console.log('🔄 Filters changed, reloading data...');
        loadInventory();
    }, [selectedWarehouses, stockFilter, sortBy, sortOrder, dateFrom, dateTo, useMockData]);

    // Separate effect for search with debounce
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (searchQuery !== undefined) {
                console.log('🔍 Search query changed, reloading...', searchQuery);
                loadInventory();
            }
        }, 300);

        return () => clearTimeout(delayedSearch);
    }, [searchQuery]);

    /* ================= SEARCH WITH BACKEND SUGGESTIONS ================= */
    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setSelectedSuggestionIndex(-1); // Reset selection when typing

        if (!query.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (query.length >= 2) {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/products?search=${encodeURIComponent(query)}&limit=5`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setSuggestions(data.data.products || data.data || []);
                        setShowSuggestions(true);
                    } else if (Array.isArray(data)) {
                        setSuggestions(data);
                        setShowSuggestions(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }
    };

    // Handle keyboard navigation in search
    const handleSearchKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) {
            // Handle chips functionality
            if (e.key === 'Enter' && searchQuery.trim()) {
                e.preventDefault();
                addSearchChip(searchQuery.trim());
                return;
            }
            if (e.key === 'Backspace' && !searchQuery && searchChips.length > 0) {
                // Remove last chip when backspace on empty input
                removeSearchChip(searchChips.length - 1);
                return;
            }
            return;
        }

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
                } else if (searchQuery.trim()) {
                    addSearchChip(searchQuery.trim());
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                break;
        }
    };

    // Add search chip
    const addSearchChip = (term) => {
        if (term && !searchChips.includes(term)) {
            setSearchChips([...searchChips, term]);
            setSearchQuery("");
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
            setPage(1);
        }
    };

    // Remove search chip
    const removeSearchChip = (index) => {
        const newChips = searchChips.filter((_, i) => i !== index);
        setSearchChips(newChips);
        setPage(1);
    };

    const selectSuggestion = (suggestion) => {
        addSearchChip(suggestion.product_name);
    };

    /* ================= WAREHOUSE FILTER ================= */
    const handleWarehouseToggle = (warehouseCode) => {
        console.log('🏢 Warehouse toggled:', warehouseCode);
        console.log('🏢 Current selection:', selectedWarehouses);

        setSelectedWarehouses(prev => {
            const newSelection = prev.includes(warehouseCode)
                ? prev.filter(code => code !== warehouseCode) // Remove if already selected
                : [...prev, warehouseCode]; // Add if not selected
            
            console.log('🏢 New selection:', newSelection);
            return newSelection;
        });
        
        setPage(1);
    };

    const selectAllWarehouses = () => {
        console.log('🏢 Selecting all warehouses');
        setSelectedWarehouses(WAREHOUSES.map(w => w.code));
        setShowWarehouseDropdown(false);
        setPage(1);
    };

    const clearAllWarehouses = () => {
        console.log('🏢 Clearing all warehouses (showing ALL)');
        setSelectedWarehouses([]);
        setShowWarehouseDropdown(false);
        setPage(1);
    };

    // Close warehouse dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showWarehouseDropdown && !event.target.closest('.warehouseDropdown')) {
                setShowWarehouseDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showWarehouseDropdown]);

    /* ================= LOAD INVENTORY WITH SPECIFIC WAREHOUSE (UNUSED - KEPT FOR REFERENCE) ================= */
    // ✅ NOTE: This function is no longer used. All loading goes through loadInventory() now.
    const loadInventoryWithWarehouse = async (warehouseCode) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),  // ✅ FIXED: Use current page, not hardcoded '1'
                limit: PAGE_SIZE.toString(),
            });

            // Use the passed warehouse parameter directly
            if (warehouseCode) {
                params.append('warehouse', warehouseCode);
            }

            // Add other current filter parameters
            if (searchQuery.trim()) {
                params.append('search', searchQuery);
            }
            if (stockFilter !== 'all') {
                params.append('stockFilter', stockFilter);
            }
            if (sortBy !== 'product_name') {
                params.append('sortBy', sortBy);
            }
            if (sortOrder !== 'asc') {
                params.append('sortOrder', sortOrder);
            }
            if (dateFrom) {
                params.append('dateFrom', dateFrom);
            }
            if (dateTo) {
                params.append('dateTo', dateTo);
            }

            console.log('🔍 Loading inventory for warehouse:', warehouseCode);
            console.log('API URL:', `${API_CONFIG.BASE_URL}/inventory?${params}`);

            const response = await fetch(`${API_CONFIG.BASE_URL}/inventory?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response for', warehouseCode, ':', data);

            // Handle different response formats more robustly
            let inventoryItems = [];
            let totalCount = 0;
            let statsData = {
                totalProducts: 0,
                totalStock: 0,
                lowStockItems: 0,
                outOfStockItems: 0
            };

            // Try different response structures
            if (data.success && data.data) {
                // Standard success response
                inventoryItems = Array.isArray(data.data) ? data.data : data.data.items || data.data.inventory || [];
                totalCount = data.total || data.data.total || inventoryItems.length;
                statsData = data.stats || data.data.stats || {};
            } else if (Array.isArray(data)) {
                // Direct array response
                inventoryItems = data;
                totalCount = data.length;
            } else if (data.inventory && Array.isArray(data.inventory)) {
                // Inventory key response
                inventoryItems = data.inventory;
                totalCount = data.total || inventoryItems.length;
                statsData = data.stats || {};
            } else if (data.items && Array.isArray(data.items)) {
                // Items key response
                inventoryItems = data.items;
                totalCount = data.total || inventoryItems.length;
                statsData = data.stats || {};
            } else {
                console.warn('Unexpected API response format:', data);
                inventoryItems = [];
            }

            // Verify warehouse filtering worked correctly
            const actualWarehouses = [...new Set(inventoryItems.map(item => item.warehouse || item.warehouse_name || item.Warehouse_name))];
            console.log('🏢 Expected warehouse:', warehouseCode);
            console.log('🏢 Actual warehouses in response:', actualWarehouses);

            if (warehouseCode && actualWarehouses.length > 0 && !actualWarehouses.includes(warehouseCode)) {
                console.error('❌ WAREHOUSE FILTER FAILED! Expected:', warehouseCode, 'Got:', actualWarehouses);
                console.error('❌ This indicates a backend filtering bug or data corruption');
                // Clear data if wrong warehouse data is returned
                inventoryItems = [];
                totalCount = 0;
                statsData = {
                    totalProducts: 0,
                    totalStock: 0,
                    lowStockItems: 0,
                    outOfStockItems: 0
                };
            } else if (warehouseCode && actualWarehouses.length === 0) {
                console.log('✅ Warehouse filter working correctly - no data for', warehouseCode);
            } else if (warehouseCode && actualWarehouses.includes(warehouseCode)) {
                console.log('✅ Warehouse filter working correctly - data matches', warehouseCode);
            }

            // Calculate stats if not provided by API
            if (!statsData.totalProducts && inventoryItems.length > 0) {
                statsData = {
                    totalProducts: totalCount || inventoryItems.length,
                    totalStock: inventoryItems.reduce((sum, item) => sum + (parseInt(item.stock || item.quantity || 0)), 0),
                    lowStockItems: inventoryItems.filter(item => {
                        const stock = parseInt(item.stock || item.quantity || 0);
                        return stock > 0 && stock <= 10;
                    }).length,
                    outOfStockItems: inventoryItems.filter(item => {
                        const stock = parseInt(item.stock || item.quantity || 0);
                        return stock === 0;
                    }).length
                };
            }

            console.log('✅ Final processed data for', warehouseCode, ':', {
                itemsCount: inventoryItems.length,
                totalCount,
                stats: statsData,
                sampleItem: inventoryItems[0] || 'No items'
            });

            setItems(inventoryItems);
            setTotalPages(Math.ceil(totalCount / PAGE_SIZE) || 1);
            setStats({
                totalProducts: statsData.totalProducts || totalCount || inventoryItems.length,
                totalStock: statsData.totalStock || 0,
                lowStockItems: statsData.lowStockItems || 0,
                outOfStockItems: statsData.outOfStockItems || 0
            });
        } catch (error) {
            console.error('❌ Error loading inventory for', warehouseCode, ':', error);

            // Don't fall back to mock data for warehouse-specific requests
            // Just show empty state
            setItems([]);
            setTotalPages(1);
            setStats({
                totalProducts: 0,
                totalStock: 0,
                lowStockItems: 0,
                outOfStockItems: 0
            });
        } finally {
            setLoading(false);
        }
    };

    /* ================= EXPORT ================= */
    const exportToCSV = async (warehouseOption = 'current') => {
        try {
            const params = new URLSearchParams({
                export: 'true'
            });

            // Determine which warehouses to export
            let exportWarehouses = [];
            if (warehouseOption === 'all') {
                // Don't add warehouse parameter for all warehouses
            } else if (warehouseOption === 'current') {
                exportWarehouses = selectedWarehouses;
            } else {
                exportWarehouses = [warehouseOption];
            }

            if (exportWarehouses.length > 0 && warehouseOption !== 'all') {
                params.append('warehouses', exportWarehouses.join(','));
            }

            // Add search filter - combine chips and current input
            const allSearchTerms = [...searchChips];
            if (searchQuery.trim()) {
                allSearchTerms.push(searchQuery.trim());
            }
            if (allSearchTerms.length > 0) {
                params.append('search', allSearchTerms.join(' '));
            }
            if (stockFilter !== 'all') {
                params.append('stockFilter', stockFilter);
            }
            if (sortBy !== 'product_name') {
                params.append('sortBy', sortBy);
            }
            if (sortOrder !== 'asc') {
                params.append('sortOrder', sortOrder);
            }
            // Only add date filters if they are actually set
            if (dateFrom && dateFrom.trim()) {
                params.append('dateFrom', dateFrom);
            }
            if (dateTo && dateTo.trim()) {
                params.append('dateTo', dateTo);
            }

            console.log('🔽 Exporting with params:', params.toString());
            console.log('🏢 Export warehouses:', exportWarehouses.length === 0 ? 'All Warehouses' : exportWarehouses.join(', '));

            const response = await fetch(`${API_CONFIG.BASE_URL}/inventory/export?${params}`, {
                method: 'GET'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const warehouseName = warehouseOption === 'all' ? 'All-Warehouses' :
                                    warehouseOption === 'current' ? 
                                        (selectedWarehouses.length === 0 ? 'All-Warehouses' : selectedWarehouses.join('-')) :
                                    warehouseOption;

                a.download = `inventory-${warehouseName}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);

                console.log('✅ Export completed for:', warehouseName);
            } else {
                console.error('❌ Export failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Export error:', error);
        }
    };

    /* ================= TIMELINE FUNCTIONS ================= */
    const openTimeline = async (item) => {
        setSelectedItem(item);
        setShowTimeline(true);
    };

    const closeTimeline = () => {
        setShowTimeline(false);
        setSelectedItem(null);
    };

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <div className={styles.topBar}>
                <div className={styles.topLeft}>
                    <h1 className={styles.title}>
                        <Package size={20} />
                        Inventory Management
                        {useMockData && <span style={{fontSize: '12px', color: '#f59e0b', marginLeft: '8px'}}>(Mock Data)</span>}
                    </h1>
                    {selectedWarehouses.length > 0 && (
                        <div style={{
                            fontSize: '12px', 
                            color: '#3b82f6', 
                            marginLeft: '12px',
                            padding: '4px 8px',
                            background: '#dbeafe',
                            borderRadius: '12px',
                            fontWeight: '500'
                        }}>
                            {selectedWarehouses.length} warehouse{selectedWarehouses.length > 1 ? 's' : ''} selected
                        </div>
                    )}
                    {selectedWarehouses.length === 0 && (
                        <div style={{
                            fontSize: '12px', 
                            color: '#059669', 
                            marginLeft: '12px',
                            padding: '4px 8px',
                            background: '#dcfce7',
                            borderRadius: '12px',
                            fontWeight: '500'
                        }}>
                            All warehouses
                        </div>
                    )}
                </div>

                <div className={styles.topActions}>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => {
                            console.log('🔄 Manual refresh triggered');
                            loadInventory();
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>

                    {/* Export Dropdown */}
                    <div className={styles.exportDropdown}>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    exportToCSV(e.target.value);
                                    e.target.value = ''; // Reset selection
                                }
                            }}
                            className={styles.exportSelect}
                            defaultValue=""
                        >
                            <option value="" disabled>📥 Export Data</option>
                            <option value="current">
                                Current Selection ({selectedWarehouses.length === 0 ? 'All Warehouses' : `${selectedWarehouses.length} warehouses`})
                            </option>
                            <option value="GGM_WH">Gurgaon Warehouse</option>
                            <option value="BLR_WH">Bangalore Warehouse</option>
                            <option value="MUM_WH">Mumbai Warehouse</option>
                            <option value="AMD_WH">Ahmedabad Warehouse</option>
                            <option value="HYD_WH">Hyderabad Warehouse</option>
                            <option value="all">All Warehouses</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className={styles.statsBar}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.totalProducts}</span>
                    <span className={styles.statLabel}>Products</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.totalStock}</span>
                    <span className={styles.statLabel}>Total Stock</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.lowStockItems}</span>
                    <span className={styles.statLabel}>Low Stock</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.outOfStockItems}</span>
                    <span className={styles.statLabel}>Out of Stock</span>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className={styles.searchBar}>
                <div className={styles.searchGroup}>
                    <Search className={styles.searchIcon} size={16} />
                    
                    {/* Search Chips */}
                    <div className={styles.searchChipsContainer}>
                        {searchChips.map((chip, index) => (
                            <div key={index} className={styles.searchChip}>
                                <span>{chip}</span>
                                <button 
                                    onClick={() => removeSearchChip(index)}
                                    className={styles.chipRemove}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        
                        {searchChips.length > 1 && (
                            <button
                                onClick={() => {
                                    setSearchChips([]);
                                    setPage(1);
                                }}
                                className={styles.clearAllChips}
                                title="Clear all search terms"
                            >
                                Clear All
                            </button>
                        )}
                        
                        <input
                            type="text"
                            placeholder={searchChips.length > 0 ? "Add more search terms..." : "Search products by name, barcode, or variant..."}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                            className={styles.searchInput}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                    </div>

                    {/* Search Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className={styles.suggestions}>
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={suggestion.p_id}
                                    className={`${styles.suggestionItem} ${
                                        index === selectedSuggestionIndex ? styles.suggestionItemActive : ''
                                    }`}
                                    onClick={() => selectSuggestion(suggestion)}
                                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                >
                                    <Package size={14} />
                                    <div>
                                        <div className={styles.suggestionName}>{suggestion.product_name}</div>
                                        <div className={styles.suggestionBarcode}>{suggestion.barcode}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Inline Warehouse Filter */}
                <div className={styles.inlineFilter}>
                    <label className={styles.filterLabel}>Warehouses:</label>
                    <div className={`${styles.warehouseDropdown} warehouseDropdown`}>
                        <button 
                            className={styles.warehouseToggle}
                            onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                        >
                            {selectedWarehouses.length === 0 ? 'All Warehouses' : 
                             selectedWarehouses.length === 1 ? WAREHOUSES.find(w => w.code === selectedWarehouses[0])?.name :
                             `${selectedWarehouses.length} Selected`}
                            <ChevronDown size={14} />
                        </button>
                        {showWarehouseDropdown && (
                            <div className={styles.warehouseDropdownMenu}>
                                <div className={styles.warehouseActions}>
                                    <button onClick={clearAllWarehouses} className={styles.warehouseAction}>
                                        Show All
                                    </button>
                                    <button onClick={selectAllWarehouses} className={styles.warehouseAction}>
                                        Select All
                                    </button>
                                </div>
                                {WAREHOUSES.map(warehouse => (
                                    <label key={warehouse.code} className={styles.warehouseOption}>
                                        <input
                                            type="checkbox"
                                            checked={selectedWarehouses.includes(warehouse.code)}
                                            onChange={() => handleWarehouseToggle(warehouse.code)}
                                        />
                                        <span>{warehouse.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Inline Date Filter */}
                <div className={styles.inlineFilter}>
                    <label className={styles.filterLabel}>From:</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setPage(1);
                        }}
                        className={styles.inlineDateInput}
                        placeholder="Start Date"
                    />
                </div>

                <div className={styles.inlineFilter}>
                    <label className={styles.filterLabel}>To:</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            setPage(1);
                        }}
                        className={styles.inlineDateInput}
                        placeholder="End Date"
                    />
                </div>

                <button
                    className={`${styles.filterBtn} ${showFilters ? styles.active : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} />
                    More
                </button>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Filter Sidebar */}
                {showFilters && (
                    <>
                        <div className={styles.filterOverlay} onClick={() => setShowFilters(false)} />
                        <div className={styles.filterSidebar}>
                            <div className={styles.filterHeader}>
                                <h3>Filters</h3>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setShowFilters(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className={styles.filterContent}>
                                {/* Quick Actions */}
                                <div className={styles.filterSection}>
                                    <h4>Quick Actions</h4>
                                    <button
                                        className={styles.filterAction}
                                        onClick={() => {
                                            setSelectedWarehouses([]);
                                            setDateFrom("");
                                            setDateTo("");
                                            setStockFilter("all");
                                            setSortBy("product_name");
                                            setSortOrder("asc");
                                            setSearchQuery("");
                                            setSearchChips([]);
                                            setPage(1);
                                        }}
                                    >
                                        Reset Filters
                                    </button>
                                </div>

                                {/* Date Range Filter - Moved to sidebar for advanced options */}
                                <div className={styles.filterSection}>
                                    <h4>Advanced Date Range</h4>
                                    <div className={styles.dateInputs}>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => {
                                                console.log('Date from changed to:', e.target.value);
                                                setDateFrom(e.target.value);
                                                setPage(1);
                                            }}
                                            className={styles.dateInput}
                                            placeholder="From"
                                        />
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => {
                                                console.log('Date to changed to:', e.target.value);
                                                setDateTo(e.target.value);
                                                setPage(1);
                                            }}
                                            className={styles.dateInput}
                                            placeholder="To"
                                        />
                                    </div>
                                </div>

                                {/* Stock Status Filter */}
                                <div className={styles.filterSection}>
                                    <h4>Stock Status</h4>
                                    <select
                                        value={stockFilter}
                                        onChange={(e) => {
                                            console.log('Stock filter changed to:', e.target.value);
                                            setStockFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className={styles.filterSelect}
                                    >
                                        <option value="all">All Items</option>
                                        <option value="in-stock">In Stock</option>
                                        <option value="low-stock">Low Stock</option>
                                        <option value="out-of-stock">Out of Stock</option>
                                    </select>
                                </div>

                                {/* Sort Options */}
                                <div className={styles.filterSection}>
                                    <h4>Sort By</h4>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => {
                                            console.log('Sort by changed to:', e.target.value);
                                            setSortBy(e.target.value);
                                            setPage(1);
                                        }}
                                        className={styles.filterSelect}
                                    >
                                        <option value="product_name">Product Name</option>
                                        <option value="stock">Stock Quantity</option>
                                        <option value="warehouse">Warehouse</option>
                                        <option value="updated_at">Last Updated</option>
                                    </select>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => {
                                            console.log('Sort order changed to:', e.target.value);
                                            setSortOrder(e.target.value);
                                            setPage(1);
                                        }}
                                        className={styles.filterSelect}
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Inventory Table */}
                <div className={styles.tableContainer} key={`inventory-${selectedWarehouses.join('-')}`}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading inventory...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className={styles.noData}>
                            <Package size={48} />
                            <h3>No inventory data found</h3>
                            <p>Try adjusting your filters or check if inventory data exists in the database.</p>
                            <button
                                className={styles.refreshBtn}
                                onClick={() => {
                                    // ✅ FIXED: Use single loader
                                    loadInventory();
                                }}
                            >
                                <RefreshCw size={16} />
                                Refresh Data
                            </button>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Barcode</th>
                                    <th>Stock</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id || index}>
                                        <td>
                                            <div className={styles.productCell}>
                                                <div className={styles.productName}>
                                                    {item.product || item.product_name || item.name || 'N/A'}
                                                </div>
                                                {(item.variant || item.product_variant) && (
                                                    <div className={styles.productVariant}>
                                                        {item.variant || item.product_variant}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <code className={styles.barcode}>
                                                {item.code || item.barcode || 'N/A'}
                                            </code>
                                        </td>
                                        <td>
                                            <div
                                                className={styles.stockCell}
                                                onClick={() => openTimeline(item)}
                                                title="Click to view stock timeline"
                                            >
                                                <span className={styles.stockNumber}>
                                                    {item.stock || item.quantity || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.locationCell}>
                                                <MapPin size={12} />
                                                <span>
                                                    {item.warehouse || item.warehouse_name || item.Warehouse_name || item.location || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${
                                                (item.stock || item.quantity || 0) === 0 ? styles.outOfStock :
                                                (item.stock || item.quantity || 0) < 10 ? styles.lowStock :
                                                styles.inStock
                                            }`}>
                                                {(item.stock || item.quantity || 0) === 0 ? 'Out of Stock' :
                                                 (item.stock || item.quantity || 0) < 10 ? 'Low Stock' :
                                                 'In Stock'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.dateText}>
                                                <Calendar size={12} />
                                                {item.updated_at ? new Date(item.updated_at).toLocaleDateString() :
                                                 item.last_updated ? new Date(item.last_updated).toLocaleDateString() :
                                                 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.actionBtn}
                                                title="View Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Enhanced Pagination - ALWAYS SHOW */}
            <div className={styles.pagination}>
                {/* First Page Button */}
                <button
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className={`${styles.paginationBtn} ${page === 1 ? styles.disabled : ''}`}
                    title="First Page"
                >
                    ⟪
                </button>
                
                {/* Previous Button */}
                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className={`${styles.paginationBtn} ${page === 1 ? styles.disabled : ''}`}
                    title="Previous Page"
                >
                    ⟨ Previous
                </button>
                
                <div className={styles.paginationNumbers}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (page <= 3) {
                            pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = page - 2 + i;
                        }
                        
                        return (
                            <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`${styles.paginationNumber} ${page === pageNum ? styles.active : ''}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>
                
                {/* Next Button */}
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className={`${styles.paginationBtn} ${page === totalPages ? styles.disabled : ''}`}
                    title="Next Page"
                >
                    Next ⟩
                </button>
                
                {/* Last Page Button */}
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(totalPages)}
                    className={`${styles.paginationBtn} ${page === totalPages ? styles.disabled : ''}`}
                    title="Last Page"
                >
                    ⟫
                </button>
                
                {/* Page Info */}
                <div className={styles.paginationControls}>
                    <span className={styles.paginationInfo}>
                        Page {page} of {totalPages} • Showing {items.length} of {allItems.length} items (50 per page)
                    </span>
                </div>
            </div>

            {/* Use ProductTracker Component */}
            {showTimeline && selectedItem && (
                <ProductTracker
                    barcodeOverride={selectedItem.code || selectedItem.barcode}
                    warehouseFilter={selectedWarehouses.length === 1 ? selectedWarehouses[0] : null}
                    onClose={closeTimeline}
                />
            )}
        </div>
    );
}
