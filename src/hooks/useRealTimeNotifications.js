"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import websocketService from '@/services/websocketService';
import { apiRequest } from '@/services/api/config';

/**
 * Custom hook for real-time notifications
 * Manages WebSocket connection, notification state, and real-time updates
 */
export const useRealTimeNotifications = () => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Refs to prevent memory leaks
    const notificationListeners = useRef(new Set());
    const connectionAttempted = useRef(false);

    // Load initial notifications from API
    const loadNotifications = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        try {
            const response = await apiRequest('/notifications?limit=20', {
                method: 'GET'
            });

            if (response.success) {
                setNotifications(response.data.notifications || []);
                setUnreadCount(response.data.pagination?.unread || 0);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Connect to WebSocket
    const connectWebSocket = useCallback(async () => {
        if (!token || !user || connectionAttempted.current) return;

        connectionAttempted.current = true;
        setConnectionError(null);

        try {
            await websocketService.connect(token);
            setIsConnected(true);
            console.log('✅ WebSocket connected successfully');
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            setConnectionError(error.message);
            setIsConnected(false);
            connectionAttempted.current = false; // Allow retry
        }
    }, [token, user]);

    // Handle new notification
    const handleNewNotification = useCallback((notification) => {
        console.log('📢 New notification received:', notification);

        // Add to notifications list
        setNotifications(prev => {
            // Check if notification already exists
            const exists = prev.some(n => n.id === notification.id);
            if (exists) return prev;

            // Add new notification at the beginning
            const updated = [notification, ...prev];
            
            // Keep only last 50 notifications
            return updated.slice(0, 50);
        });

        // Update unread count
        if (!notification.read) {
            setUnreadCount(prev => prev + 1);
        }

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: `notification-${notification.id}`
            });
        }

        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('newNotification', {
            detail: notification
        }));
    }, []);

    // Handle connection status changes
    const handleConnectionChange = useCallback((connected) => {
        setIsConnected(connected);
        if (connected) {
            setConnectionError(null);
            // Reload notifications when reconnected
            loadNotifications();
        }
    }, [loadNotifications]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
        try {
            // Optimistically update UI
            setNotifications(prev => 
                prev.map(n => 
                    n.id === notificationId 
                        ? { ...n, read: true, isRead: true }
                        : n
                )
            );

            // Update unread count
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Send to WebSocket
            websocketService.markNotificationAsRead(notificationId);

            // Send to API
            await apiRequest(`/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Revert optimistic update on error
            loadNotifications();
        }
    }, [loadNotifications]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            // Optimistically update UI
            setNotifications(prev => 
                prev.map(n => ({ ...n, read: true, isRead: true }))
            );
            setUnreadCount(0);

            // Send to API
            await apiRequest('/notifications/read-all', {
                method: 'PUT'
            });

        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            // Revert optimistic update on error
            loadNotifications();
        }
    }, [loadNotifications]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId) => {
        try {
            // Optimistically update UI
            const notificationToDelete = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            
            if (notificationToDelete && !notificationToDelete.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            // Send to API
            await apiRequest(`/notifications/${notificationId}`, {
                method: 'DELETE'
            });

        } catch (error) {
            console.error('Failed to delete notification:', error);
            // Revert optimistic update on error
            loadNotifications();
        }
    }, [notifications, loadNotifications]);

    // Send test notification
    const sendTestNotification = useCallback(async () => {
        try {
            await apiRequest('/notifications/test', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Test Notification',
                    message: 'This is a test notification from the system'
                })
            });
        } catch (error) {
            console.error('Failed to send test notification:', error);
        }
    }, []);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }, []);

    // Set up WebSocket event listeners
    useEffect(() => {
        if (!isConnected) return;

        // Set up event listeners
        const handleNotification = (notification) => handleNewNotification(notification);
        const handleConnected = () => handleConnectionChange(true);
        const handleDisconnected = () => handleConnectionChange(false);

        websocketService.on('notification', handleNotification);
        websocketService.on('connected', handleConnected);
        websocketService.on('disconnect', handleDisconnected);

        // Store listeners for cleanup
        notificationListeners.current.add(handleNotification);

        return () => {
            websocketService.off('notification', handleNotification);
            websocketService.off('connected', handleConnected);
            websocketService.off('disconnect', handleDisconnected);
            notificationListeners.current.delete(handleNotification);
        };
    }, [isConnected, handleNewNotification, handleConnectionChange]);

    // Initialize connection and load notifications
    useEffect(() => {
        if (user && token) {
            loadNotifications();
            connectWebSocket();
        }

        return () => {
            // Cleanup on unmount
            connectionAttempted.current = false;
        };
    }, [user, token, loadNotifications, connectWebSocket]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear all listeners
            notificationListeners.current.forEach(listener => {
                websocketService.off('notification', listener);
            });
            notificationListeners.current.clear();
        };
    }, []);

    // Get recent notifications (last 5)
    const recentNotifications = notifications.slice(0, 5);

    // Get unread notifications
    const unreadNotifications = notifications.filter(n => !n.isRead && !n.read);

    return {
        // State
        notifications,
        recentNotifications,
        unreadNotifications,
        unreadCount,
        isConnected,
        connectionError,
        isLoading,

        // Actions
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendTestNotification,
        requestNotificationPermission,
        loadNotifications,
        connectWebSocket,

        // Utilities
        hasUnreadNotifications: unreadCount > 0,
        connectionStatus: isConnected ? 'connected' : connectionError ? 'error' : 'disconnected'
    };
};

export default useRealTimeNotifications;