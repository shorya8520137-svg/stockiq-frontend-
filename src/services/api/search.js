import { apiRequest } from './config';

/**
 * Search API Service
 * Handles all search-related API calls
 */
class SearchAPI {
    
    /**
     * Perform global search across all entities
     * @param {string} query - Search query
     * @param {string} type - Search type ('all', 'products', 'inventory', 'users', 'warehouses', 'orders')
     * @param {number} limit - Number of results to return
     * @param {number} offset - Offset for pagination
     * @returns {Promise} Search results
     */
    static async globalSearch(query, type = 'all', limit = 20, offset = 0) {
        try {
            const params = new URLSearchParams({
                query: query.trim(),
                type,
                limit: limit.toString(),
                offset: offset.toString(),
                user_id: localStorage.getItem('userId') || '1' // For analytics
            });

            const response = await apiRequest(`/search/global?${params}`, {
                method: 'GET'
            });

            return response;
        } catch (error) {
            console.error('Global search error:', error);
            throw error;
        }
    }

    /**
     * Get search suggestions
     * @param {string} query - Search query
     * @param {number} limit - Number of suggestions to return
     * @returns {Promise} Search suggestions
     */
    static async getSearchSuggestions(query, limit = 5) {
        try {
            if (!query || query.trim().length < 2) {
                return {
                    success: true,
                    data: { suggestions: [] }
                };
            }

            const params = new URLSearchParams({
                query: query.trim(),
                limit: limit.toString()
            });

            const response = await apiRequest(`/search/suggestions?${params}`, {
                method: 'GET'
            });

            return response;
        } catch (error) {
            console.error('Search suggestions error:', error);
            // Return empty suggestions on error
            return {
                success: true,
                data: { suggestions: [] }
            };
        }
    }

    /**
     * Get search analytics
     * @param {Object} filters - Analytics filters
     * @returns {Promise} Search analytics data
     */
    static async getSearchAnalytics(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.limit) params.append('limit', filters.limit.toString());

            const response = await apiRequest(`/search/analytics?${params}`, {
                method: 'GET'
            });

            return response;
        } catch (error) {
            console.error('Search analytics error:', error);
            throw error;
        }
    }

    /**
     * Get popular search queries
     * @param {number} limit - Number of popular searches to return
     * @returns {Promise} Popular search queries
     */
    static async getPopularSearches(limit = 10) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString()
            });

            const response = await apiRequest(`/search/popular?${params}`, {
                method: 'GET'
            });

            return response;
        } catch (error) {
            console.error('Popular searches error:', error);
            throw error;
        }
    }

    /**
     * Navigate to search results based on type and query
     * @param {string} type - Search result type
     * @param {string} query - Search query
     * @param {Object} router - Next.js router instance
     */
    static navigateToSearchResult(type, query, router) {
        const routes = {
            'product': `/products?search=${encodeURIComponent(query)}`,
            'inventory': `/inventory?search=${encodeURIComponent(query)}`,
            'user': `/admin/permissions?search=${encodeURIComponent(query)}`,
            'warehouse': `/warehouses?search=${encodeURIComponent(query)}`,
            'order': `/orders?search=${encodeURIComponent(query)}`,
            'products': `/products?search=${encodeURIComponent(query)}`,
            'users': `/admin/permissions?search=${encodeURIComponent(query)}`,
            'warehouses': `/warehouses?search=${encodeURIComponent(query)}`,
            'orders': `/orders?search=${encodeURIComponent(query)}`
        };

        const route = routes[type] || `/search?q=${encodeURIComponent(query)}&type=${type}`;
        
        if (router) {
            router.push(route);
        } else {
            window.location.href = route;
        }
    }

    /**
     * Format search result for display
     * @param {Object} result - Search result object
     * @returns {Object} Formatted result
     */
    static formatSearchResult(result) {
        const icons = {
            'product': '📦',
            'inventory': '📋',
            'user': '👤',
            'warehouse': '🏢',
            'order': '📄'
        };

        return {
            ...result,
            icon: icons[result.type] || '📄',
            formattedDate: result.created_at ? new Date(result.created_at).toLocaleDateString() : '',
            url: this.getResultUrl(result)
        };
    }

    /**
     * Get URL for search result
     * @param {Object} result - Search result object
     * @returns {string} Result URL
     */
    static getResultUrl(result) {
        const baseUrls = {
            'product': '/products',
            'inventory': '/inventory',
            'user': '/admin/permissions',
            'warehouse': '/warehouses',
            'order': '/orders'
        };

        const baseUrl = baseUrls[result.type] || '/';
        return `${baseUrl}?id=${result.id}`;
    }

    /**
     * Debounced search function
     * @param {Function} searchFunction - Function to debounce
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(searchFunction, delay = 300) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => searchFunction.apply(this, args), delay);
        };
    }

    /**
     * Cache search results
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    static cacheResults(key, data, ttl = 300000) { // 5 minutes default
        const cacheItem = {
            data,
            timestamp: Date.now(),
            ttl
        };
        
        try {
            localStorage.setItem(`search_cache_${key}`, JSON.stringify(cacheItem));
        } catch (error) {
            console.warn('Failed to cache search results:', error);
        }
    }

    /**
     * Get cached search results
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null if expired/not found
     */
    static getCachedResults(key) {
        try {
            const cached = localStorage.getItem(`search_cache_${key}`);
            if (!cached) return null;

            const cacheItem = JSON.parse(cached);
            const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;

            if (isExpired) {
                localStorage.removeItem(`search_cache_${key}`);
                return null;
            }

            return cacheItem.data;
        } catch (error) {
            console.warn('Failed to get cached search results:', error);
            return null;
        }
    }

    /**
     * Clear search cache
     */
    static clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('search_cache_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear search cache:', error);
        }
    }
}

export default SearchAPI;