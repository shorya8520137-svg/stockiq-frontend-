"use client";

import React, { useState } from "react";
import { Search, Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./TopNavBar.module.css";

export default function TopNavBar() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        // Implement search functionality here
        console.log("Searching for:", searchQuery);
    };

    return (
        <div className={styles.topNav}>
            <div className={styles.container}>
                {/* Search Section */}
                <div className={styles.searchSection}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <div className={styles.searchContainer}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder="Search orders, products, customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </form>
                </div>

                {/* Actions Section */}
                <div className={styles.actionsSection}>
                    {/* Notifications */}
                    <div className={styles.notificationWrapper}>
                        <button
                            className={styles.notificationBtn}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={18} />
                            <span className={styles.notificationBadge}>3</span>
                        </button>
                        
                        {showNotifications && (
                            <div className={styles.notificationDropdown}>
                                <div className={styles.notificationHeader}>
                                    <h4>Notifications</h4>
                                    <span className={styles.notificationCount}>3 new</span>
                                </div>
                                <div className={styles.notificationList}>
                                    <div className={styles.notificationItem}>
                                        <div className={styles.notificationDot}></div>
                                        <div>
                                            <p className={styles.notificationTitle}>New order received</p>
                                            <p className={styles.notificationTime}>2 minutes ago</p>
                                        </div>
                                    </div>
                                    <div className={styles.notificationItem}>
                                        <div className={styles.notificationDot}></div>
                                        <div>
                                            <p className={styles.notificationTitle}>Low stock alert</p>
                                            <p className={styles.notificationTime}>15 minutes ago</p>
                                        </div>
                                    </div>
                                    <div className={styles.notificationItem}>
                                        <div className={styles.notificationDot}></div>
                                        <div>
                                            <p className={styles.notificationTitle}>Dispatch completed</p>
                                            <p className={styles.notificationTime}>1 hour ago</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.notificationFooter}>
                                    <button className={styles.viewAllBtn}>View all notifications</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <div className={styles.userProfile}>
                        <div className={styles.userAvatar}>
                            <User size={16} />
                        </div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user?.name || "Admin"}</span>
                            <span className={styles.userRole}>Administrator</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}