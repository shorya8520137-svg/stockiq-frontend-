const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> { socketId, sessionId, lastActivity }
        this.userSessions = new Map(); // sessionId -> { userId, socketId, metadata }
    }

    /**
     * Initialize WebSocket server
     * @param {Object} server - HTTP server instance
     */
    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                // Verify JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                
                // Get user details from database
                const [users] = await db.execute(
                    'SELECT id, name, email, role FROM users WHERE id = ? AND status = "active"',
                    [decoded.userId]
                );

                if (users.length === 0) {
                    return next(new Error('User not found or inactive'));
                }

                socket.user = users[0];
                socket.sessionId = uuidv4();
                
                next();
            } catch (error) {
                console.error('WebSocket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });

        // Connection handling
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        console.log('🔌 WebSocket server initialized');
    }

    /**
     * Handle new WebSocket connection
     * @param {Object} socket - Socket instance
     */
    async handleConnection(socket) {
        const user = socket.user;
        const sessionId = socket.sessionId;

        console.log(`👤 User ${user.name} (${user.id}) connected - Session: ${sessionId}`);

        try {
            // Store user session
            this.connectedUsers.set(user.id, {
                socketId: socket.id,
                sessionId: sessionId,
                lastActivity: new Date(),
                user: user
            });

            this.userSessions.set(sessionId, {
                userId: user.id,
                socketId: socket.id,
                user: user,
                connectedAt: new Date()
            });

            // Save session to database (if table exists)
            try {
                await db.execute(`
                    INSERT INTO user_sessions 
                    (user_id, session_id, socket_id, ip_address, user_agent, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    socket_id = VALUES(socket_id),
                    last_activity = NOW(),
                    is_active = 1
                `, [
                    user.id,
                    sessionId,
                    socket.id,
                    socket.handshake.address,
                    socket.handshake.headers['user-agent'] || 'Unknown',
                    true
                ]);
            } catch (dbError) {
                // Table might not exist yet, continue without database logging
                console.log('Session not saved to database (table may not exist)');
            }

            // Join user to their personal room
            socket.join(`user_${user.id}`);
            socket.join(`role_${user.role}`);

            // Send initial data
            socket.emit('connected', {
                sessionId: sessionId,
                user: user,
                timestamp: new Date().toISOString()
            });

            // Load and send pending notifications
            await this.sendPendingNotifications(socket, user.id);

            // Broadcast user online status to relevant users
            this.broadcastUserStatus(user.id, 'online');

            // Set up event handlers
            this.setupEventHandlers(socket);

        } catch (error) {
            console.error('Connection setup error:', error);
            socket.emit('error', { message: 'Connection setup failed' });
        }
    }

    /**
     * Set up event handlers for socket
     * @param {Object} socket - Socket instance
     */
    setupEventHandlers(socket) {
        const user = socket.user;
        const sessionId = socket.sessionId;

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
            console.log(`👤 User ${user.name} (${user.id}) disconnected - Reason: ${reason}`);
            
            // Remove from connected users
            this.connectedUsers.delete(user.id);
            this.userSessions.delete(sessionId);

            // Update database session
            try {
                await db.execute(`
                    UPDATE user_sessions 
                    SET is_active = 0, last_activity = NOW() 
                    WHERE session_id = ?
                `, [sessionId]);
            } catch (error) {
                console.log('Could not update session in database');
            }

            // Broadcast user offline status
            this.broadcastUserStatus(user.id, 'offline');
        });

        // Handle activity updates
        socket.on('activity', async (data) => {
            await this.updateUserActivity(user.id, data);
        });

        // Handle notification acknowledgment
        socket.on('notification_read', async (notificationId) => {
            await this.markNotificationAsRead(notificationId, user.id);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.to(data.room || `user_${data.targetUserId}`).emit('user_typing', {
                userId: user.id,
                userName: user.name,
                isTyping: data.isTyping
            });
        });

        // Handle mention notifications
        socket.on('mention_created', async (data) => {
            await this.handleMentionCreated(data, user);
        });

        // Handle custom events
        socket.on('custom_event', (data) => {
            this.handleCustomEvent(socket, data);
        });

        // Heartbeat to keep connection alive
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
            this.updateUserActivity(user.id, { type: 'heartbeat' });
        });
    }

    /**
     * Send notification to specific user
     * @param {number} userId - Target user ID
     * @param {Object} notification - Notification data
     */
    async sendNotificationToUser(userId, notification) {
        try {
            // Save notification to database (if table exists)
            let notificationId = null;
            try {
                const [result] = await db.execute(`
                    INSERT INTO notification_queue 
                    (user_id, type, title, message, data, priority, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    userId,
                    notification.type || 'info',
                    notification.title,
                    notification.message,
                    JSON.stringify(notification.data || {}),
                    notification.priority || 'medium'
                ]);
                notificationId = result.insertId;
            } catch (dbError) {
                console.log('Could not save notification to database');
            }

            // Send real-time notification
            const notificationData = {
                id: notificationId || Date.now(),
                ...notification,
                timestamp: new Date().toISOString(),
                read: false
            };

            this.io.to(`user_${userId}`).emit('notification', notificationData);

            console.log(`📢 Notification sent to user ${userId}: ${notification.title}`);
            return notificationData;

        } catch (error) {
            console.error('Send notification error:', error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {Object} notification - Notification data
     */
    async sendNotificationToUsers(userIds, notification) {
        const results = [];
        for (const userId of userIds) {
            try {
                const result = await this.sendNotificationToUser(userId, notification);
                results.push({ userId, success: true, notification: result });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }
        return results;
    }

    /**
     * Broadcast notification to all users with specific role
     * @param {string} role - User role
     * @param {Object} notification - Notification data
     */
    async broadcastToRole(role, notification) {
        try {
            // Get users with specific role
            const [users] = await db.execute(
                'SELECT id FROM users WHERE role = ? AND status = "active"',
                [role]
            );

            const userIds = users.map(user => user.id);
            return await this.sendNotificationToUsers(userIds, notification);

        } catch (error) {
            console.error('Broadcast to role error:', error);
            throw error;
        }
    }

    /**
     * Send pending notifications to user
     * @param {Object} socket - Socket instance
     * @param {number} userId - User ID
     */
    async sendPendingNotifications(socket, userId) {
        try {
            const [notifications] = await db.execute(`
                SELECT * FROM notification_queue 
                WHERE user_id = ? AND read_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT 10
            `, [userId]);

            for (const notification of notifications) {
                socket.emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: JSON.parse(notification.data || '{}'),
                    priority: notification.priority,
                    timestamp: notification.created_at,
                    read: false
                });
            }

            console.log(`📬 Sent ${notifications.length} pending notifications to user ${userId}`);

        } catch (error) {
            console.log('Could not load pending notifications from database');
        }
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     * @param {number} userId - User ID
     */
    async markNotificationAsRead(notificationId, userId) {
        try {
            await db.execute(`
                UPDATE notification_queue 
                SET read_at = NOW() 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            console.log(`✅ Notification ${notificationId} marked as read by user ${userId}`);

        } catch (error) {
            console.log('Could not mark notification as read in database');
        }
    }

    /**
     * Handle mention created event
     * @param {Object} data - Mention data
     * @param {Object} mentioningUser - User who created the mention
     */
    async handleMentionCreated(data, mentioningUser) {
        try {
            const { mentionedUserId, entityType, entityId, mentionText, contextText } = data;

            // Save mention to database (if table exists)
            try {
                await db.execute(`
                    INSERT INTO user_mentions 
                    (mentioned_user_id, mentioning_user_id, entity_type, entity_id, mention_text, context_text, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    mentionedUserId,
                    mentioningUser.id,
                    entityType,
                    entityId,
                    mentionText,
                    contextText
                ]);
            } catch (dbError) {
                console.log('Could not save mention to database');
            }

            // Send notification to mentioned user
            await this.sendNotificationToUser(mentionedUserId, {
                type: 'mention',
                title: 'You were mentioned',
                message: `${mentioningUser.name} mentioned you: "${mentionText}"`,
                data: {
                    mentioningUser: mentioningUser,
                    entityType: entityType,
                    entityId: entityId,
                    mentionText: mentionText,
                    contextText: contextText
                },
                priority: 'high'
            });

            console.log(`🏷️ Mention notification sent from ${mentioningUser.name} to user ${mentionedUserId}`);

        } catch (error) {
            console.error('Handle mention error:', error);
        }
    }

    /**
     * Update user activity
     * @param {number} userId - User ID
     * @param {Object} activityData - Activity data
     */
    async updateUserActivity(userId, activityData) {
        try {
            const userSession = this.connectedUsers.get(userId);
            if (userSession) {
                userSession.lastActivity = new Date();
            }

            // Save activity to database (if table exists)
            try {
                await db.execute(`
                    INSERT INTO user_activities 
                    (user_id, action, entity_type, entity_id, new_values, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [
                    userId,
                    activityData.type || 'activity',
                    activityData.entityType || null,
                    activityData.entityId || null,
                    JSON.stringify(activityData)
                ]);
            } catch (dbError) {
                console.log('Could not save activity to database');
            }

        } catch (error) {
            console.error('Update activity error:', error);
        }
    }

    /**
     * Broadcast user status change
     * @param {number} userId - User ID
     * @param {string} status - Status (online/offline)
     */
    broadcastUserStatus(userId, status) {
        this.io.emit('user_status_change', {
            userId: userId,
            status: status,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle custom events
     * @param {Object} socket - Socket instance
     * @param {Object} data - Event data
     */
    handleCustomEvent(socket, data) {
        const user = socket.user;
        
        switch (data.type) {
            case 'dispatch_created':
                this.handleDispatchCreated(data, user);
                break;
            case 'inventory_updated':
                this.handleInventoryUpdated(data, user);
                break;
            case 'order_status_changed':
                this.handleOrderStatusChanged(data, user);
                break;
            default:
                console.log(`Unknown custom event: ${data.type}`);
        }
    }

    /**
     * Handle dispatch created event
     * @param {Object} data - Dispatch data
     * @param {Object} user - User who created dispatch
     */
    async handleDispatchCreated(data, user) {
        // Notify warehouse staff
        await this.broadcastToRole('warehouse_staff', {
            type: 'dispatch_created',
            title: 'New Dispatch Created',
            message: `${user.name} created a new dispatch for ${data.warehouse}`,
            data: data,
            priority: 'medium'
        });
    }

    /**
     * Handle inventory updated event
     * @param {Object} data - Inventory data
     * @param {Object} user - User who updated inventory
     */
    async handleInventoryUpdated(data, user) {
        // Notify managers if stock is low
        if (data.newStock <= 10) {
            await this.broadcastToRole('manager', {
                type: 'low_stock_alert',
                title: 'Low Stock Alert',
                message: `${data.productName} is running low (${data.newStock} remaining)`,
                data: data,
                priority: 'high'
            });
        }
    }

    /**
     * Handle order status changed event
     * @param {Object} data - Order data
     * @param {Object} user - User who changed status
     */
    async handleOrderStatusChanged(data, user) {
        // Notify relevant users about status change
        // Implementation depends on business logic
        console.log(`Order ${data.orderId} status changed to ${data.newStatus} by ${user.name}`);
    }

    /**
     * Get connected users count
     * @returns {number} Number of connected users
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    /**
     * Get connected users list
     * @returns {Array} List of connected users
     */
    getConnectedUsers() {
        return Array.from(this.connectedUsers.entries()).map(([userId, session]) => ({
            userId: userId,
            user: session.user,
            sessionId: session.sessionId,
            lastActivity: session.lastActivity,
            socketId: session.socketId
        }));
    }

    /**
     * Check if user is online
     * @param {number} userId - User ID
     * @returns {boolean} True if user is online
     */
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }

    /**
     * Get WebSocket server instance
     * @returns {Object} Socket.IO server instance
     */
    getIO() {
        return this.io;
    }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;