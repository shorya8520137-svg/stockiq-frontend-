"use client";

import { io } from 'socket.io-client';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventListeners = new Map();
        this.connectionPromise = null;
    }

    /**
     * Connect to WebSocket server
     * @param {string} token - Authentication token
     * @returns {Promise} Connection promise
     */
    connect(token) {
        // Only connect in browser environment
        if (typeof window === 'undefined') {
            return Promise.reject(new Error('WebSocket only available in browser'));
        }
        
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                // Disconnect existing connection
                if (this.socket) {
                    this.disconnect();
                }

                // Create new socket connection
                this.socket = io(process.env.NEXT_PUBLIC_API_BASE?.replace('/api', '') || 'http://localhost:5000', {
                    auth: {
                        token: token
                    },
                    transports: ['websocket', 'polling'],
                    timeout: 10000,
                    forceNew: true
                });

                // Connection successful
                this.socket.on('connect', () => {
                    console.log('🔌 WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.connectionPromise = null;
                    resolve(this.socket);
                });

                // Connection error
                this.socket.on('connect_error', (error) => {
                    console.error('🔌 WebSocket connection error:', error);
                    this.isConnected = false;
                    this.connectionPromise = null;
                    reject(error);
                });

                // Disconnection
                this.socket.on('disconnect', (reason) => {
                    console.log('🔌 WebSocket disconnected:', reason);
                    this.isConnected = false;
                    
                    // Auto-reconnect if not manually disconnected
                    if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect(token);
                    }
                });

                // Authentication error
                this.socket.on('error', (error) => {
                    console.error('🔌 WebSocket error:', error);
                    this.isConnected = false;
                    this.connectionPromise = null;
                    reject(new Error(error.message || 'WebSocket connection failed'));
                });

                // Set up default event handlers
                this.setupDefaultHandlers();

            } catch (error) {
                console.error('🔌 WebSocket setup error:', error);
                this.connectionPromise = null;
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
    }

    /**
     * Schedule reconnection attempt
     * @param {string} token - Authentication token
     */
    scheduleReconnect(token) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (!this.isConnected && this.reconnectAttempts <= this.maxReconnectAttempts) {
                console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect(token).catch(error => {
                    console.error('🔄 Reconnect failed:', error);
                });
            }
        }, delay);
    }

    /**
     * Set up default event handlers
     */
    setupDefaultHandlers() {
        if (!this.socket) return;

        // Handle connection confirmation
        this.socket.on('connected', (data) => {
            console.log('🔌 WebSocket session established:', data);
            this.emit('connected', data);
        });

        // Handle notifications
        this.socket.on('notification', (notification) => {
            console.log('📢 Received notification:', notification);
            this.emit('notification', notification);
        });

        // Handle user status changes
        this.socket.on('user_status_change', (data) => {
            console.log('👤 User status change:', data);
            this.emit('user_status_change', data);
        });

        // Handle typing indicators
        this.socket.on('user_typing', (data) => {
            this.emit('user_typing', data);
        });

        // Handle pong responses
        this.socket.on('pong', (data) => {
            this.emit('pong', data);
        });

        // Start heartbeat
        this.startHeartbeat();
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping');
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Send activity update
     * @param {Object} activityData - Activity data
     */
    sendActivity(activityData) {
        if (this.isConnected && this.socket) {
            this.socket.emit('activity', activityData);
        }
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     */
    markNotificationAsRead(notificationId) {
        if (this.isConnected && this.socket) {
            this.socket.emit('notification_read', notificationId);
        }
    }

    /**
     * Send typing indicator
     * @param {Object} data - Typing data
     */
    sendTyping(data) {
        if (this.isConnected && this.socket) {
            this.socket.emit('typing', data);
        }
    }

    /**
     * Create mention
     * @param {Object} mentionData - Mention data
     */
    createMention(mentionData) {
        if (this.isConnected && this.socket) {
            this.socket.emit('mention_created', mentionData);
        }
    }

    /**
     * Send custom event
     * @param {Object} eventData - Event data
     */
    sendCustomEvent(eventData) {
        if (this.isConnected && this.socket) {
            this.socket.emit('custom_event', eventData);
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);

        // Also add to socket if connected
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }

        // Also remove from socket if connected
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     * @returns {boolean} Connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Get socket instance
     * @returns {Object|null} Socket instance
     */
    getSocket() {
        return this.socket;
    }

    /**
     * Send dispatch created event
     * @param {Object} dispatchData - Dispatch data
     */
    notifyDispatchCreated(dispatchData) {
        this.sendCustomEvent({
            type: 'dispatch_created',
            ...dispatchData
        });
    }

    /**
     * Send inventory updated event
     * @param {Object} inventoryData - Inventory data
     */
    notifyInventoryUpdated(inventoryData) {
        this.sendCustomEvent({
            type: 'inventory_updated',
            ...inventoryData
        });
    }

    /**
     * Send order status changed event
     * @param {Object} orderData - Order data
     */
    notifyOrderStatusChanged(orderData) {
        this.sendCustomEvent({
            type: 'order_status_changed',
            ...orderData
        });
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopHeartbeat();
        this.disconnect();
        this.eventListeners.clear();
    }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;