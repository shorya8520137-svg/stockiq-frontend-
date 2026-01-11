"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchAPI from '@/services/api/search';

/**
 * Custom hook for global search functionality
 * Provides search state management, debounced queries, and result caching
 */
export const useGlobalSearch = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [popularSearches, setPopularSearches] = useState([]);
    const [error, setError] = useState(null);

    // Refs for managing timeouts and preventing race conditions
    const searchTimeoutRef = useRef(null);
    const suggestionsTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Load search history and popular searches on mount
    useEffect(() => {
        loadSearchHistory();
        loadPopularSearches();
    }, []);

    // Load search history from localStorage
    const loadSearchHistory = useCallback(() => {
        try {
            const history = localStorage.getItem('search_history');
            if (history) {
                setSearchHistory(JSON.parse(history));
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
        }
    }, []);

    // Load popular searches
    const loadPopularSearches = useCallback(async () => {
        try {
            const response = await SearchAPI.getPopularSearches(5);
            if (response.success) {
                setPopularSearches(response.data.popularSearches || []);
            }
        } catch (error) {
            console.warn('Failed to load popular searches:', error);
        }
    }, []);

    // Save search to history
    const saveToHistory = useCallback((query) => {
        try {
            const history = JSON.parse(localStorage.getItem('search_history') || '[]');
            const newHistory = [
                query,
                ...history.filter(item => item !== query)
            ].slice(0, 10); // Keep only last 10 searches

            localStorage.setItem('search_history', JSON.stringify(newHistory));
            setSearchHistory(newHistory);
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }, []);

    // Debounced search suggestions
    const debouncedGetSuggestions = useCallback(
        SearchAPI.debounce(async (query) => {
            if (!query || query.trim().length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                // Cancel previous request
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                // Create new abort controller
                abortControllerRef.current = new AbortController();

                const response = await SearchAPI.getSearchSuggestions(query.trim(), 5);
                
                if (response.success && !abortControllerRef.current.signal.aborted) {
                    setSuggestions(response.data.suggestions || []);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('Failed to get search suggestions:', error);
                    setSuggestions([]);
                }
            }
        }, 300),
        []
    );

    // Handle search input change
    const handleSearchInput = useCallback((query) => {
        setSearchQuery(query);
        setError(null);

        if (query.trim().length >= 2) {
            setShowSuggestions(true);
            debouncedGetSuggestions(query);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    }, [debouncedGetSuggestions]);

    // Perform global search
    const performSearch = useCallback(async (query, type = 'all', options = {}) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const trimmedQuery = query.trim();
        setIsSearching(true);
        setError(null);

        try {
            // Check cache first
            const cacheKey = `${trimmedQuery}_${type}`;
            const cachedResults = SearchAPI.getCachedResults(cacheKey);
            
            if (cachedResults && !options.forceRefresh) {
                setSearchResults(cachedResults.results || []);
                setIsSearching(false);
                return cachedResults;
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            const response = await SearchAPI.globalSearch(
                trimmedQuery, 
                type, 
                options.limit || 20, 
                options.offset || 0
            );

            if (response.success && !abortControllerRef.current.signal.aborted) {
                const formattedResults = response.data.results.map(SearchAPI.formatSearchResult);
                setSearchResults(formattedResults);

                // Cache results
                SearchAPI.cacheResults(cacheKey, response.data);

                // Save to history
                saveToHistory(trimmedQuery);

                return response.data;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
                setError('Search failed. Please try again.');
                setSearchResults([]);
            }
        } finally {
            setIsSearching(false);
        }
    }, [saveToHistory]);

    // Handle search submission
    const handleSearchSubmit = useCallback((query = searchQuery) => {
        if (!query || query.trim().length < 2) return;

        setShowSuggestions(false);
        performSearch(query);
        
        // Navigate to search results page
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }, [searchQuery, performSearch, router]);

    // Handle suggestion click
    const handleSuggestionClick = useCallback((suggestion) => {
        setShowSuggestions(false);
        setSearchQuery(suggestion.title.replace(/^.*matching "([^"]*)".*$/, '$1'));
        
        // Navigate to specific page
        if (suggestion.route) {
            router.push(suggestion.route);
        } else {
            handleSearchSubmit(suggestion.query || searchQuery);
        }
    }, [router, handleSearchSubmit, searchQuery]);

    // Handle result click
    const handleResultClick = useCallback((result) => {
        SearchAPI.navigateToSearchResult(result.type, searchQuery, router);
    }, [searchQuery, router]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setSuggestions([]);
        setShowSuggestions(false);
        setError(null);
        
        // Cancel any pending requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Hide suggestions
    const hideSuggestions = useCallback(() => {
        // Use timeout to allow for click events on suggestions
        suggestionsTimeoutRef.current = setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    }, []);

    // Show suggestions
    const showSuggestionsHandler = useCallback(() => {
        if (suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current);
        }
        if (searchQuery.trim().length >= 2) {
            setShowSuggestions(true);
        }
    }, [searchQuery]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        // State
        searchQuery,
        searchResults,
        suggestions,
        isSearching,
        showSuggestions,
        searchHistory,
        popularSearches,
        error,

        // Actions
        handleSearchInput,
        handleSearchSubmit,
        handleSuggestionClick,
        handleResultClick,
        performSearch,
        clearSearch,
        hideSuggestions,
        showSuggestions: showSuggestionsHandler,

        // Utilities
        saveToHistory,
        loadSearchHistory,
        loadPopularSearches
    };
};

export default useGlobalSearch;