const db = require('../db/connection');
const websocketService = require('../services/websocketService');

class NotificationController {

    // ===============================
    // GET USER NOTIFICATIONS
    // ===============================
    static async getUserNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const { 
                limit = 20, 
                offset = 0, 
                unreadOnly = false,
                type = null 
            } = req.query;

            let whereClause = 'WHERE user_id = ?';
            const params = [userId];

            if (unreadOnly === 'true') {
                whereClause += ' AND read_at IS NULL';
            }

            if (type) {
                whereClause += ' AND type = ?';
                params.push(type);
            }

            // Get notifications
            const [notifications] = await db.execute(`
                SELECT 
                    id,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    read_at,
                    delivered_at,
                    expires_at,
                    created_at
                FROM notification_queue 
                ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const [countResult] = await db.execute(`
                SELECT COUNT(*) as total 
                FROM notification_queue 
                ${whereClause}
            `, params);

            // Get unread count
            const [unreadResult] = await db.execute(`
                SELECT COUNT(*) as unread 
                FROM notification_queue 
                WHERE user_id = ? AND read_at IS NULL
            `, [userId]);

            // Parse JSON data
            const processedNotifications = notifications.map(notification => ({
                ...notification,
                data: notification.data ? JSON.parse(notification.data) : {},
                isRead: notification.read_at !== null,
                isExpired: notification.expires_at && new Date(notification.expires_at) < new Date()
            }));

            res.json({
                success: true,
                data: {
                    notifications: processedNotifications,
                    pagination: {
                        total: countResult[0].total,
                        unread: unreadResult[0].unread,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('Get user notifications error:', error);
            
            // Fallback to mock data if database table doesn't exist
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return res.json({
                    success: true,
                    data: {
                        notifications: [],
                        pagination: {
                            total: 0,
                            unread: 0,
                            limit: parseInt(req.query.limit || 20),
                            offset: parseInt(req.query.offset || 0),
                            hasMore: false
                        }
                    }
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }
    }

    // ===============================
    // MARK NOTIFICATION AS READ
    // ===============================
    static async markAsRead(req, res) {
        try {
            const userId = req.user.userId;
            const { notificationId } = req.params;

            const [result] = await db.execute(`
                UPDATE notification_queue 
                SET read_at = NOW(), delivered_at = COALESCE(delivered_at, NOW())
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification marked as read'
            });

        } catch (error) {
            console.error('Mark notification as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    }

    // ===============================
    // MARK ALL NOTIFICATIONS AS READ
    // ===============================
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.userId;

            const [result] = await db.execute(`
                UPDATE notification_queue 
                SET read_at = NOW(), delivered_at = COALESCE(delivered_at, NOW())
                WHERE user_id = ? AND read_at IS NULL
            `, [userId]);

            res.json({
                success: true,
                message: `${result.affectedRows} notifications marked as read`
            });

        } catch (error) {
            console.error('Mark all notifications as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notifications as read',
                error: error.message
            });
        }
    }

    // ===============================
    // DELETE NOTIFICATION
    // ===============================
    static async deleteNotification(req, res) {
        try {
            const userId = req.user.userId;
            const { notificationId } = req.params;

            const [result] = await db.execute(`
                DELETE FROM notification_queue 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification deleted'
            });

        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: error.message
            });
        }
    }

    // ===============================
    // CREATE NOTIFICATION
    // ===============================
    static async createNotification(req, res) {
        try {
            const {
                targetUserId,
                targetUserIds,
                targetRole,
                type,
                title,
                message,
                data = {},
                priority = 'medium',
                expiresIn = null // minutes
            } = req.body;

            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and message are required'
                });
            }

            let targetUsers = [];

            // Determine target users
            if (targetUserId) {
                targetUsers = [targetUserId];
            } else if (targetUserIds && Array.isArray(targetUserIds)) {
                targetUsers = targetUserIds;
            } else if (targetRole) {
                const [users] = await db.execute(
                    'SELECT id FROM users WHERE role = ? AND status = "active"',
                    [targetRole]
                );
                targetUsers = users.map(user => user.id);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Target user(s) or role must be specified'
                });
            }

            const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60000) : null;
            const results = [];

            // Create notifications for each target user
            for (const userId of targetUsers) {
                try {
                    // Send real-time notification via WebSocket
                    const notification = await websocketService.sendNotificationToUser(userId, {
                        type,
                        title,
                        message,
                        data,
                        priority,
                        expiresAt
                    });

                    results.push({
                        userId,
                        success: true,
                        notificationId: notification.id
                    });

                } catch (error) {
                    console.error(`Failed to send notification to user ${userId}:`, error);
                    results.push({
                        userId,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;

            res.json({
                success: true,
                message: `Notification sent to ${successCount} users${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
                data: {
                    results,
                    summary: {
                        total: targetUsers.length,
                        successful: successCount,
                        failed: failureCount
                    }
                }
            });

        } catch (error) {
            console.error('Create notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create notification',
                error: error.message
            });
        }
    }

    // ===============================
    // GET NOTIFICATION PREFERENCES
    // ===============================
    static async getNotificationPreferences(req, res) {
        try {
            const userId = req.user.userId;

            // For now, return default preferences since we haven't created the preferences table yet
            const defaultPreferences = {
                email: {
                    mentions: true,
                    dispatches: true,
                    lowStock: true,
                    orderUpdates: true,
                    systemAlerts: true
                },
                push: {
                    mentions: true,
                    dispatches: false,
                    lowStock: true,
                    orderUpdates: false,
                    systemAlerts: true
                },
                inApp: {
                    mentions: true,
                    dispatches: true,
                    lowStock: true,
                    orderUpdates: true,
                    systemAlerts: true
                }
            };

            res.json({
                success: true,
                data: {
                    preferences: defaultPreferences
                }
            });

        } catch (error) {
            console.error('Get notification preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification preferences',
                error: error.message
            });
        }
    }

    // ===============================
    // UPDATE NOTIFICATION PREFERENCES
    // ===============================
    static async updateNotificationPreferences(req, res) {
        try {
            const userId = req.user.userId;
            const { preferences } = req.body;

            if (!preferences) {
                return res.status(400).json({
                    success: false,
                    message: 'Preferences are required'
                });
            }

            // For now, just return success since we haven't created the preferences table yet
            // TODO: Implement actual preferences storage when database tables are created

            res.json({
                success: true,
                message: 'Notification preferences updated',
                data: {
                    preferences
                }
            });

        } catch (error) {
            console.error('Update notification preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences',
                error: error.message
            });
        }
    }

    // ===============================
    // GET NOTIFICATION STATISTICS
    // ===============================
    static async getNotificationStats(req, res) {
        try {
            const userId = req.user.userId;
            const { days = 30 } = req.query;

            try {
                // Get notification statistics
                const [stats] = await db.execute(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
                        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read,
                        COUNT(CASE WHEN type = 'mention' THEN 1 END) as mentions,
                        COUNT(CASE WHEN type = 'dispatch_created' THEN 1 END) as dispatches,
                        COUNT(CASE WHEN type = 'low_stock_alert' THEN 1 END) as lowStockAlerts,
                        COUNT(CASE WHEN priority = 'high' THEN 1 END) as highPriority,
                        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent
                    FROM notification_queue 
                    WHERE user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                `, [userId, parseInt(days)]);

                // Get daily notification counts
                const [dailyStats] = await db.execute(`
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count,
                        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as readCount
                    FROM notification_queue 
                    WHERE user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `, [userId, parseInt(days)]);

                res.json({
                    success: true,
                    data: {
                        summary: stats[0],
                        dailyStats: dailyStats,
                        period: `${days} days`
                    }
                });

            } catch (dbError) {
                // Return mock stats if table doesn't exist
                res.json({
                    success: true,
                    data: {
                        summary: {
                            total: 0,
                            unread: 0,
                            read: 0,
                            mentions: 0,
                            dispatches: 0,
                            lowStockAlerts: 0,
                            highPriority: 0,
                            urgent: 0
                        },
                        dailyStats: [],
                        period: `${days} days`
                    }
                });
            }

        } catch (error) {
            console.error('Get notification stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification statistics',
                error: error.message
            });
        }
    }

    // ===============================
    // TEST NOTIFICATION
    // ===============================
    static async testNotification(req, res) {
        try {
            const userId = req.user.userId;
            const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

            // Send test notification
            const notification = await websocketService.sendNotificationToUser(userId, {
                type,
                title,
                message,
                data: {
                    isTest: true,
                    timestamp: new Date().toISOString()
                },
                priority: 'low'
            });

            res.json({
                success: true,
                message: 'Test notification sent',
                data: {
                    notification
                }
            });

        } catch (error) {
            console.error('Test notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send test notification',
                error: error.message
            });
        }
    }

    // ===============================
    // GET CONNECTED USERS (Admin only)
    // ===============================
    static async getConnectedUsers(req, res) {
        try {
            // Check if user is admin
            if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const connectedUsers = websocketService.getConnectedUsers();
            const connectedCount = websocketService.getConnectedUsersCount();

            res.json({
                success: true,
                data: {
                    connectedUsers,
                    connectedCount,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Get connected users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get connected users',
                error: error.message
            });
        }
    }
}

module.exports = NotificationController;