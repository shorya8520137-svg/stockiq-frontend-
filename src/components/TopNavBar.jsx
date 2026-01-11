"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import notificationService from "@/services/notificationService";
import useGlobalSearch from "@/hooks/useGlobalSearch";
import styles from "./TopNavBar.module.css";

export default function TopNavBar() {
    const { user, logout } = useAuth();
    const { userRole } = usePermissions();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Use global search hook
    const {
        searchQuery,
        suggestions,
        isSearching,
        showSuggestions,
        searchHistory,
        handleSearchInput,
        handleSearchSubmit,
        handleSuggestionClick,
        hideSuggestions,
        showSuggestions: showSuggestionsHandler
    } = useGlobalSearch();

    // Load notifications on component mount
    useEffect(() => {
        loadNotifications();

        // Subscribe to notification changes
        const unsubscribe = notificationService.subscribe((notifications) => {
            const userNotifications = notificationService.getNotifications({
                targetUser: user?.email,
                targetRole: user?.role
            });
            setNotifications(userNotifications);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, [user]);

    const loadNotifications = async () => {
        try {
            // Get notifications for current user
            const userNotifications = notificationService.getNotifications({
                targetUser: user?.email,
                targetRole: user?.role
            });
            
            setNotifications(userNotifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        handleSearchSubmit();
    };

    const handleSearchInputChange = (e) => {
        handleSearchInput(e.target.value);
    };

    const markNotificationRead = (notificationId) => {
        notificationService.markAsRead(notificationId);
    };

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
    };

    const unreadNotifications = notifications.filter(n => !n.isRead);
    const recentNotifications = notifications.slice(0, 5); // Show only 5 most recent

    return (
        <div className={styles.topNav}>
            <div className={styles.container}>
                {/* Enhanced Search Section */}
                <div className={styles.searchSection}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <div className={styles.searchContainer}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder="Search products, orders, users, warehouses..."
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onFocus={showSuggestionsHandler}
                                onBlur={hideSuggestions}
                                className={styles.searchInput}
                                disabled={isSearching}
                            />
                            
                            {/* Real Search Suggestions */}
                            {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
                                <div className={styles.searchSuggestions}>
                                    {/* Current Suggestions */}
                                    {suggestions.length > 0 && (
                                        <>
                                            <div className={styles.suggestionsHeader}>
                                                <span>Search suggestions</span>
                                            </div>
                                            {suggestions.map((suggestion, index) => (
                                                <div 
                                                    key={index} 
                                                    className={styles.suggestionItem}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                >
                                                    <div className={styles.suggestionIcon}>
                                                        {suggestion.icon}
                                                    </div>
                                                    <div className={styles.suggestionContent}>
                                                        <span className={styles.suggestionTitle}>{suggestion.title}</span>
                                                        <span className={styles.suggestionCount}>{suggestion.count} results</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Search History */}
                                    {searchHistory.length > 0 && suggestions.length === 0 && searchQuery.length < 2 && (
                                        <>
                                            <div className={styles.suggestionsHeader}>
                                                <span>Recent searches</span>
                                            </div>
                                            {searchHistory.slice(0, 3).map((historyItem, index) => (
                                                <div 
                                                    key={index} 
                                                    className={styles.suggestionItem}
                                                    onClick={() => handleSearchInput(historyItem)}
                                                >
                                                    <div className={styles.suggestionIcon}>
                                                        🕒
                                                    </div>
                                                    <div className={styles.suggestionContent}>
                                                        <span className={styles.suggestionTitle}>{historyItem}</span>
                                                        <span className={styles.suggestionCount}>Recent search</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Search All Results */}
                                    {searchQuery.trim().length >= 2 && (
                                        <div className={styles.suggestionFooter}>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    handleSearchSubmit();
                                                    hideSuggestions();
                                                }}
                                            >
                                                View all results for "{searchQuery}"
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loading indicator */}
                            {isSearching && (
                                <div className={styles.searchLoading}>
                                    <div className={styles.spinner}></div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Actions Section */}
                <div className={styles.actionsSection}>
                    {/* Dynamic Notifications */}
                    <div className={styles.notificationWrapper}>
                        <button
                            className={styles.notificationBtn}
                            onClick={() => setShowNotifications(!showNotifications)}
                            title={`${unreadNotifications.length} unread notifications`}
                        >
                            <Bell size={18} />
                            {unreadNotifications.length > 0 && (
                                <span className={styles.notificationBadge}>
                                    {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                                </span>
                            )}
                        </button>
                        
                        {showNotifications && (
                            <div className={styles.notificationDropdown}>
                                <div className={styles.notificationHeader}>
                                    <h4>Notifications</h4>
                                    <span className={styles.notificationCount}>
                                        {unreadNotifications.length} unread
                                    </span>
                                </div>
                                <div className={styles.notificationList}>
                                    {recentNotifications.length === 0 ? (
                                        <div className={styles.emptyNotifications}>
                                            <Bell size={24} />
                                            <p>No notifications yet</p>
                                        </div>
                                    ) : (
                                        recentNotifications.map(notification => (
                                            <div 
                                                key={notification.id} 
                                                className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                                                onClick={() => markNotificationRead(notification.id)}
                                            >
                                                <div className={styles.notificationDot}></div>
                                                <div className={styles.notificationContent}>
                                                    <p className={styles.notificationTitle}>{notification.title}</p>
                                                    <p className={styles.notificationMessage}>{notification.message}</p>
                                                    <p className={styles.notificationTime}>
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className={styles.notificationFooter}>
                                    <button 
                                        className={styles.viewAllBtn}
                                        onClick={() => {
                                            // Navigate to notifications page
                                            console.log('Navigate to notifications page');
                                            setShowNotifications(false);
                                        }}
                                    >
                                        View all notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced User Profile */}
                    <div className={styles.userProfile}>
                        <button 
                            className={styles.userProfileBtn}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className={styles.userAvatar}>
                                <User size={16} />
                            </div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user?.name || "User"}</span>
                                <span className={styles.userRole}>
                                    {userRole?.name || user?.role || "User"}
                                </span>
                            </div>
                            <ChevronDown size={14} className={styles.chevronIcon} />
                        </button>

                        {/* User Menu Dropdown */}
                        {showUserMenu && (
                            <div className={styles.userMenuDropdown}>
                                <div className={styles.userMenuHeader}>
                                    <div className={styles.userMenuAvatar}>
                                        <User size={20} />
                                    </div>
                                    <div className={styles.userMenuInfo}>
                                        <span className={styles.userMenuName}>{user?.name}</span>
                                        <span className={styles.userMenuEmail}>{user?.email}</span>
                                        <span className={styles.userMenuRole}>
                                            {userRole?.name || user?.role}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.userMenuDivider}></div>
                                <div className={styles.userMenuItems}>
                                    <button 
                                        className={styles.userMenuItem}
                                        onClick={() => {
                                            console.log('Navigate to profile');
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <User size={16} />
                                        Profile Settings
                                    </button>
                                    <button 
                                        className={styles.userMenuItem}
                                        onClick={() => {
                                            console.log('Navigate to preferences');
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <Bell size={16} />
                                        Notification Preferences
                                    </button>
                                </div>
                                <div className={styles.userMenuDivider}></div>
                                <button 
                                    className={`${styles.userMenuItem} ${styles.logoutItem}`}
                                    onClick={handleLogout}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16,17 21,12 16,7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}