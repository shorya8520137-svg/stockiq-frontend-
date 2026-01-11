"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Search, ChevronDown, ChevronRight, Package, Truck, AlertTriangle, RotateCcw, Eye, X } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { apiRequest } from '@/services/api/config';
import styles from './productTracker.module.css';

export default function EnhancedProductTracker() {
    const { hasPermission } = usePermissions();
    const [timelineData, setTimelineData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filter states
    const [filters, setFilters] = useState({
        warehouses: [],
        dateFrom: '',
        dateTo: '',
        searchQuery: '',
        activityType: 'all' // 'all', 'dispatch', 'return', 'damage'
    });
    
    // Available warehouses for filter
    const [availableWarehouses, setAvailableWarehouses] = useState([]);
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
    
    // Nested timeline states
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [nestedTimelines, setNestedTimelines] = useState({});
    const [loadingNested, setLoadingNested] = useState(new Set());

    // Load initial data
    useEffect(() => {
        loadTimelineData();
        loadWarehouses();
    }, []);

    // Apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [timelineData, filters]);

    const loadTimelineData = async () => {
        try {
            setLoading(true);
            const response = await apiRequest('/timeline/activities');
            
            if (response.success) {
                setTimelineData(response.data || []);
            } else {
                setError('Failed to load timeline data');
            }
        } catch (error) {
            console.error('Error loading timeline:', error);
            setError('Error loading timeline data');
        } finally {
            setLoading(false);
        }
    };

    const loadWarehouses = async () => {
        try {
            const response = await apiRequest('/dispatch/warehouses');
            if (response.success) {
                setAvailableWarehouses(response.data || []);
            }
        } catch (error) {
            console.error('Error loading warehouses:', error);
        }
    };

    const loadNestedTimeline = async (itemId, itemType, awbNumber) => {
        if (nestedTimelines[itemId]) return; // Already loaded
        
        setLoadingNested(prev => new Set([...prev, itemId]));
        
        try {
            let endpoint = '';
            switch (itemType) {
                case 'dispatch':
                    endpoint = `/timeline/dispatch/${awbNumber}`;
                    break;
                case 'return':
                    endpoint = `/timeline/return/${awbNumber}`;
                    break;
                case 'damage':
                    endpoint = `/timeline/damage/${awbNumber}`;
                    break;
                default:
                    endpoint = `/timeline/details/${itemId}`;
            }
            
            const response = await apiRequest(endpoint);
            
            if (response.success) {
                setNestedTimelines(prev => ({
                    ...prev,
                    [itemId]: response.data || []
                }));
            }
        } catch (error) {
            console.error('Error loading nested timeline:', error);
        } finally {
            setLoadingNested(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    };

    const applyFilters = () => {
        let filtered = [...timelineData];

        // Warehouse filter
        if (filters.warehouses.length > 0) {
            filtered = filtered.filter(item => 
                filters.warehouses.includes(item.warehouse) || 
                filters.warehouses.includes(item.warehouse_code)
            );
        }

        // Date filter
        if (filters.dateFrom) {
            filtered = filtered.filter(item => 
                new Date(item.created_at) >= new Date(filters.dateFrom)
            );
        }
        
        if (filters.dateTo) {
            filtered = filtered.filter(item => 
                new Date(item.created_at) <= new Date(filters.dateTo)
            );
        }

        // Search filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.awb_number?.toLowerCase().includes(query) ||
                item.product_name?.toLowerCase().includes(query) ||
                item.customer_name?.toLowerCase().includes(query) ||
                item.activity_type?.toLowerCase().includes(query)
            );
        }

        // Activity type filter
        if (filters.activityType !== 'all') {
            filtered = filtered.filter(item => 
                item.activity_type?.toLowerCase() === filters.activityType
            );
        }

        setFilteredData(filtered);
    };

    const toggleWarehouseFilter = (warehouse) => {
        setFilters(prev => ({
            ...prev,
            warehouses: prev.warehouses.includes(warehouse)
                ? prev.warehouses.filter(w => w !== warehouse)
                : [...prev.warehouses, warehouse]
        }));
    };

    const toggleExpanded = (itemId, itemType, awbNumber) => {
        const newExpanded = new Set(expandedItems);
        
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
            // Load nested timeline if not already loaded
            loadNestedTimeline(itemId, itemType, awbNumber);
        }
        
        setExpandedItems(newExpanded);
    };

    const clearFilters = () => {
        setFilters({
            warehouses: [],
            dateFrom: '',
            dateTo: '',
            searchQuery: '',
            activityType: 'all'
        });
    };

    const getActivityIcon = (activityType) => {
        switch (activityType?.toLowerCase()) {
            case 'dispatch':
                return <Truck size={16} className={styles.dispatchIcon} />;
            case 'return':
                return <RotateCcw size={16} className={styles.returnIcon} />;
            case 'damage':
                return <AlertTriangle size={16} className={styles.damageIcon} />;
            default:
                return <Package size={16} className={styles.defaultIcon} />;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading timeline data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Enhanced Product Timeline Tracker</h1>
                    <p>Track product movements, dispatches, returns, and damage reports with nested details</p>
                </div>
                
                <div className={styles.headerActions}>
                    <button 
                        className={styles.refreshBtn}
                        onClick={loadTimelineData}
                        disabled={loading}
                    >
                        <RotateCcw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Enhanced Filters */}
            <div className={styles.filtersSection}>
                <div className={styles.filtersRow}>
                    {/* Search */}
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search AWB, product, customer..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        />
                    </div>

                    {/* Warehouse Filter Dropdown */}
                    <div className={styles.filterDropdown}>
                        <button 
                            className={styles.dropdownToggle}
                            onClick={() => setWarehouseDropdownOpen(!warehouseDropdownOpen)}
                        >
                            <Filter size={16} />
                            Warehouses ({filters.warehouses.length})
                            <ChevronDown size={14} />
                        </button>
                        
                        {warehouseDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <div className={styles.dropdownHeader}>
                                    <span>Select Warehouses</span>
                                    <button onClick={() => setWarehouseDropdownOpen(false)}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className={styles.checkboxList}>
                                    {availableWarehouses.map(warehouse => (
                                        <label key={warehouse} className={styles.checkboxItem}>
                                            <input
                                                type="checkbox"
                                                checked={filters.warehouses.includes(warehouse)}
                                                onChange={() => toggleWarehouseFilter(warehouse)}
                                            />
                                            <span>{warehouse}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date Filters */}
                    <div className={styles.dateFilters}>
                        <div className={styles.dateInput}>
                            <Calendar size={16} />
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                placeholder="From date"
                            />
                        </div>
                        <div className={styles.dateInput}>
                            <Calendar size={16} />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                placeholder="To date"
                            />
                        </div>
                    </div>

                    {/* Activity Type Filter */}
                    <select
                        className={styles.activityFilter}
                        value={filters.activityType}
                        onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
                    >
                        <option value="all">All Activities</option>
                        <option value="dispatch">Dispatch</option>
                        <option value="return">Returns</option>
                        <option value="damage">Damage</option>
                    </select>

                    {/* Clear Filters */}
                    <button 
                        className={styles.clearFilters}
                        onClick={clearFilters}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            <div className={styles.timelineContainer}>
                {error && (
                    <div className={styles.error}>
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {filteredData.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Package size={48} />
                        <h3>No timeline data found</h3>
                        <p>Try adjusting your filters or check back later</p>
                    </div>
                ) : (
                    <div className={styles.timeline}>
                        {filteredData.map((item, index) => (
                            <div key={item.id || index} className={styles.timelineItem}>
                                {/* Main Timeline Card */}
                                <div className={styles.timelineCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardIcon}>
                                            {getActivityIcon(item.activity_type)}
                                        </div>
                                        <div className={styles.cardTitle}>
                                            <h4>{item.activity_type || 'Activity'}</h4>
                                            <span className={styles.timestamp}>
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>
                                        <div className={styles.cardActions}>
                                            {item.awb_number && (
                                                <button
                                                    className={styles.expandBtn}
                                                    onClick={() => toggleExpanded(item.id, item.activity_type, item.awb_number)}
                                                    title="View detailed timeline"
                                                >
                                                    {expandedItems.has(item.id) ? (
                                                        <ChevronDown size={16} />
                                                    ) : (
                                                        <ChevronRight size={16} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardDetails}>
                                            {item.awb_number && (
                                                <div className={styles.detail}>
                                                    <span className={styles.label}>AWB:</span>
                                                    <span className={styles.value}>{item.awb_number}</span>
                                                </div>
                                            )}
                                            {item.product_name && (
                                                <div className={styles.detail}>
                                                    <span className={styles.label}>Product:</span>
                                                    <span className={styles.value}>{item.product_name}</span>
                                                </div>
                                            )}
                                            {item.customer_name && (
                                                <div className={styles.detail}>
                                                    <span className={styles.label}>Customer:</span>
                                                    <span className={styles.value}>{item.customer_name}</span>
                                                </div>
                                            )}
                                            {item.warehouse && (
                                                <div className={styles.detail}>
                                                    <span className={styles.label}>Warehouse:</span>
                                                    <span className={styles.value}>{item.warehouse}</span>
                                                </div>
                                            )}
                                            {item.quantity && (
                                                <div className={styles.detail}>
                                                    <span className={styles.label}>Quantity:</span>
                                                    <span className={styles.value}>{item.quantity}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Nested Timeline */}
                                {expandedItems.has(item.id) && (
                                    <div className={styles.nestedTimeline}>
                                        {loadingNested.has(item.id) ? (
                                            <div className={styles.nestedLoading}>
                                                <div className={styles.spinner}></div>
                                                <span>Loading detailed timeline...</span>
                                            </div>
                                        ) : nestedTimelines[item.id] ? (
                                            <div className={styles.nestedCards}>
                                                <div className={styles.nestedHeader}>
                                                    <Eye size={16} />
                                                    <span>Detailed Timeline for {item.awb_number}</span>
                                                </div>
                                                {nestedTimelines[item.id].map((nestedItem, nestedIndex) => (
                                                    <div key={nestedIndex} className={styles.nestedCard}>
                                                        <div className={styles.nestedCardHeader}>
                                                            <div className={styles.nestedIcon}>
                                                                {getActivityIcon(nestedItem.status || nestedItem.activity_type)}
                                                            </div>
                                                            <div className={styles.nestedTitle}>
                                                                <h5>{nestedItem.status || nestedItem.activity_type}</h5>
                                                                <span className={styles.nestedTime}>
                                                                    {formatDate(nestedItem.created_at || nestedItem.timestamp)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className={styles.nestedContent}>
                                                            {nestedItem.description && (
                                                                <p>{nestedItem.description}</p>
                                                            )}
                                                            {nestedItem.location && (
                                                                <div className={styles.nestedDetail}>
                                                                    <span>Location: {nestedItem.location}</span>
                                                                </div>
                                                            )}
                                                            {nestedItem.processed_by && (
                                                                <div className={styles.nestedDetail}>
                                                                    <span>Processed by: {nestedItem.processed_by}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={styles.nestedEmpty}>
                                                <p>No detailed timeline available</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}