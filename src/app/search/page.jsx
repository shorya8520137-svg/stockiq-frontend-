"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Grid, List, Clock, ArrowRight } from 'lucide-react';
import useGlobalSearch from '@/hooks/useGlobalSearch';
import PermissionGate from '@/components/common/PermissionGate';
import styles from './search.module.css';

const SearchResultsPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'date', 'name'
    const [filterType, setFilterType] = useState(type);
    
    const {
        searchResults,
        isSearching,
        performSearch,
        handleResultClick,
        searchHistory,
        popularSearches
    } = useGlobalSearch();

    // Perform search when component mounts or query changes
    useEffect(() => {
        if (query) {
            performSearch(query, filterType);
        }
    }, [query, filterType, performSearch]);

    // Handle filter change
    const handleFilterChange = (newType) => {
        setFilterType(newType);
        const newUrl = `/search?q=${encodeURIComponent(query)}&type=${newType}`;
        router.push(newUrl);
    };

    // Handle sort change
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        // Sort results locally for now
        // TODO: Implement server-side sorting
    };

    // Get sorted results
    const getSortedResults = () => {
        if (!searchResults) return [];
        
        const sorted = [...searchResults];
        
        switch (sortBy) {
            case 'date':
                return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'name':
                return sorted.sort((a, b) => a.title.localeCompare(b.title));
            case 'relevance':
            default:
                return sorted; // Already sorted by relevance from backend
        }
    };

    // Group results by type
    const getGroupedResults = () => {
        const results = getSortedResults();
        const grouped = {};
        
        results.forEach(result => {
            if (!grouped[result.type]) {
                grouped[result.type] = [];
            }
            grouped[result.type].push(result);
        });
        
        return grouped;
    };

    const sortedResults = getSortedResults();
    const groupedResults = getGroupedResults();

    const resultTypes = [
        { key: 'all', label: 'All Results', icon: '🔍' },
        { key: 'products', label: 'Products', icon: '📦' },
        { key: 'inventory', label: 'Inventory', icon: '📋' },
        { key: 'users', label: 'Users', icon: '👤' },
        { key: 'warehouses', label: 'Warehouses', icon: '🏢' },
        { key: 'orders', label: 'Orders', icon: '📄' }
    ];

    const sortOptions = [
        { key: 'relevance', label: 'Relevance' },
        { key: 'date', label: 'Date' },
        { key: 'name', label: 'Name' }
    ];

    return (
        <div className={styles.searchPage}>
            {/* Search Header */}
            <div className={styles.searchHeader}>
                <div className={styles.searchInfo}>
                    <h1 className={styles.searchTitle}>
                        Search Results for "{query}"
                    </h1>
                    <p className={styles.searchMeta}>
                        {isSearching ? 'Searching...' : `${sortedResults.length} results found`}
                    </p>
                </div>
                
                {/* Search Controls */}
                <div className={styles.searchControls}>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={16} />
                        </button>
                        <button
                            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className={styles.sortSelect}
                    >
                        {sortOptions.map(option => (
                            <option key={option.key} value={option.key}>
                                Sort by {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.searchContent}>
                {/* Sidebar Filters */}
                <div className={styles.searchSidebar}>
                    <div className={styles.filterSection}>
                        <h3 className={styles.filterTitle}>
                            <Filter size={16} />
                            Filter Results
                        </h3>
                        
                        <div className={styles.filterGroup}>
                            <h4>Type</h4>
                            {resultTypes.map(resultType => (
                                <button
                                    key={resultType.key}
                                    className={`${styles.filterBtn} ${filterType === resultType.key ? styles.active : ''}`}
                                    onClick={() => handleFilterChange(resultType.key)}
                                >
                                    <span className={styles.filterIcon}>{resultType.icon}</span>
                                    {resultType.label}
                                    {groupedResults[resultType.key] && (
                                        <span className={styles.filterCount}>
                                            {groupedResults[resultType.key].length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Searches */}
                    {searchHistory.length > 0 && (
                        <div className={styles.filterSection}>
                            <h3 className={styles.filterTitle}>
                                <Clock size={16} />
                                Recent Searches
                            </h3>
                            <div className={styles.recentSearches}>
                                {searchHistory.slice(0, 5).map((search, index) => (
                                    <button
                                        key={index}
                                        className={styles.recentSearchBtn}
                                        onClick={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Popular Searches */}
                    {popularSearches.length > 0 && (
                        <div className={styles.filterSection}>
                            <h3 className={styles.filterTitle}>
                                Popular Searches
                            </h3>
                            <div className={styles.popularSearches}>
                                {popularSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        className={styles.popularSearchBtn}
                                        onClick={() => router.push(`/search?q=${encodeURIComponent(search.query)}`)}
                                    >
                                        <span>{search.query}</span>
                                        <span className={styles.searchTrend}>
                                            {search.trend === 'up' && '📈'}
                                            {search.trend === 'down' && '📉'}
                                            {search.trend === 'stable' && '➡️'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Results */}
                <div className={styles.searchResults}>
                    {isSearching ? (
                        <div className={styles.searchLoading}>
                            <div className={styles.spinner}></div>
                            <p>Searching...</p>
                        </div>
                    ) : sortedResults.length === 0 ? (
                        <div className={styles.noResults}>
                            <Search size={48} />
                            <h3>No results found</h3>
                            <p>Try adjusting your search terms or filters</p>
                            <div className={styles.searchSuggestions}>
                                <h4>Suggestions:</h4>
                                <ul>
                                    <li>Check your spelling</li>
                                    <li>Try different keywords</li>
                                    <li>Use more general terms</li>
                                    <li>Remove filters to see more results</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.resultsList} ${viewMode === 'grid' ? styles.gridView : styles.listView}`}>
                            {sortedResults.map((result, index) => (
                                <PermissionGate
                                    key={`${result.type}-${result.id}-${index}`}
                                    permission={getResultPermission(result.type)}
                                >
                                    <div 
                                        className={styles.resultItem}
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className={styles.resultIcon}>
                                            {result.icon}
                                        </div>
                                        <div className={styles.resultContent}>
                                            <h3 className={styles.resultTitle}>{result.title}</h3>
                                            <p className={styles.resultDescription}>{result.description}</p>
                                            <div className={styles.resultMeta}>
                                                <span className={styles.resultType}>{result.category}</span>
                                                {result.metadata && (
                                                    <span className={styles.resultMetadata}>{result.metadata}</span>
                                                )}
                                                {result.formattedDate && (
                                                    <span className={styles.resultDate}>{result.formattedDate}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.resultAction}>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </PermissionGate>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper function to get required permission for result type
const getResultPermission = (type) => {
    const permissions = {
        'product': 'PRODUCT_VIEW',
        'inventory': 'INVENTORY_VIEW',
        'user': 'USER_VIEW',
        'warehouse': 'WAREHOUSE_VIEW',
        'order': 'ORDER_VIEW'
    };
    
    return permissions[type] || null; // null means no permission required
};

export default SearchResultsPage;