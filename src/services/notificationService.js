/**
 * Notification Service
 * Handles creating and managing notifications for the permissions system
 */

class NotificationService {
    constructor() {
        this.notifications = [];
        this.listeners = [];
    }

    // Create a new notification
    async createNotification({
        type,
        title,
        message,
        targetUser = null,
        targetRole = null,
        warehouse = null,
        data = {},
        priority = 'medium'
    }) {
        const notification = {
            id: Date.now() + Math.random(),
            type,
            title,
            message,
            targetUser,
            targetRole,
            warehouse,
            data,
            priority,
            isRead: false,
            createdAt: new Date().toISOString(),
            readAt: null
        };

        // In a real app, this would be an API call
        // For demo purposes, store locally
        this.notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }

        // Store in localStorage for persistence (browser only)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('app_notifications', JSON.stringify(this.notifications));
            } catch (error) {
                console.error('Error storing notifications:', error);
            }
        }

        // Notify listeners
        this.notifyListeners();

        console.log('📢 Notification created:', notification);
        return notification;
    }

    // Get notifications for a specific user/role
    getNotifications(filters = {}) {
        let filtered = [...this.notifications];

        if (filters.targetUser) {
            filtered = filtered.filter(n => 
                n.targetUser === filters.targetUser || 
                n.targetUser === null
            );
        }

        if (filters.targetRole) {
            filtered = filtered.filter(n => 
                n.targetRole === filters.targetRole || 
                n.targetRole === null
            );
        }

        if (filters.warehouse) {
            filtered = filtered.filter(n => 
                n.warehouse === filters.warehouse || 
                n.warehouse === null
            );
        }

        if (filters.unreadOnly) {
            filtered = filtered.filter(n => !n.isRead);
        }

        return filtered;
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
            
            // Update localStorage (browser only)
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('app_notifications', JSON.stringify(this.notifications));
                } catch (error) {
                    console.error('Error updating notifications:', error);
                }
            }
            
            // Notify listeners
            this.notifyListeners();
        }
    }

    // Mark all notifications as read for a user
    markAllAsRead(filters = {}) {
        const notifications = this.getNotifications(filters);
        notifications.forEach(n => {
            if (!n.isRead) {
                n.isRead = true;
                n.readAt = new Date().toISOString();
            }
        });

        // Update localStorage (browser only)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('app_notifications', JSON.stringify(this.notifications));
            } catch (error) {
                console.error('Error updating notifications:', error);
            }
        }
        
        // Notify listeners
        this.notifyListeners();
    }

    // Delete notification
    deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        // Update localStorage (browser only)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('app_notifications', JSON.stringify(this.notifications));
            } catch (error) {
                console.error('Error updating notifications:', error);
            }
        }
        
        // Notify listeners
        this.notifyListeners();
    }

    // Load notifications from localStorage
    loadNotifications() {
        if (typeof window === 'undefined') {
            return; // Server-side rendering
        }
        
        try {
            const stored = localStorage.getItem('app_notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.notifications = [];
        }
    }

    // Subscribe to notification changes
    subscribe(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of changes
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.notifications);
            } catch (error) {
                console.error('Notification listener error:', error);
            }
        });
    }

    // Predefined notification creators for common actions
    async createDispatchNotification(dispatchData) {
        return this.createNotification({
            type: 'dispatch_submitted',
            title: 'New Dispatch Submitted',
            message: `Order #${dispatchData.orderRef} submitted by ${dispatchData.submittedBy}`,
            targetRole: 'manager',
            warehouse: dispatchData.warehouse,
            data: dispatchData,
            priority: 'medium'
        });
    }

    async createApprovalRequest(operationData) {
        return this.createNotification({
            type: 'approval_request',
            title: `${operationData.type} Approval Required`,
            message: `${operationData.type} operation requires approval: ${operationData.description}`,
            targetRole: 'admin',
            warehouse: operationData.warehouse,
            data: operationData,
            priority: 'high'
        });
    }

    async createOperationCompleted(operationData) {
        return this.createNotification({
            type: 'operation_completed',
            title: 'Operation Completed',
            message: `${operationData.type} operation completed successfully`,
            targetUser: operationData.requestedBy,
            warehouse: operationData.warehouse,
            data: operationData,
            priority: 'low'
        });
    }

    async createLowStockAlert(stockData) {
        return this.createNotification({
            type: 'low_stock_alert',
            title: 'Low Stock Alert',
            message: `Product "${stockData.productName}" is running low (${stockData.currentStock} remaining)`,
            targetRole: 'warehouse_staff',
            warehouse: stockData.warehouse,
            data: stockData,
            priority: 'high'
        });
    }
}

// Create singleton instance
const notificationService = new NotificationService();

// Load existing notifications on startup (browser only)
if (typeof window !== 'undefined') {
    notificationService.loadNotifications();
}

export default notificationService;

// Export convenience functions
export const createDispatchNotification = (data) => notificationService.createDispatchNotification(data);
export const createApprovalRequest = (data) => notificationService.createApprovalRequest(data);
export const createOperationCompleted = (data) => notificationService.createOperationCompleted(data);
export const createLowStockAlert = (data) => notificationService.createLowStockAlert(data);