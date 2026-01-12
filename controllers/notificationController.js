const db = require('../db/connection');

class NotificationController {
    // ===============================
    // GET NOTIFICATIONS
    // ===============================
    static async getNotifications(req, res) {
        try {
            const userId = req.user?.userId || 1; // Fallback to admin user
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            const offset = (page - 1) * limit;

            console.log('🔔 Getting notifications for user:', userId);

            // Try database query with fallback
            const query = `
                SELECT id, user_id, type, title, message, data, 
                       read_at, delivered_at, expires_at, created_at
                FROM notification_queue 
                WHERE user_id = ? ${unreadOnly === 'true' ? 'AND read_at IS NULL' : ''}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;

            db.query(query, [userId, parseInt(limit), parseInt(offset)], (error, notifications) => {
                if (error) {
                    console.error('❌ Notification query error:', error);
                    
                    // Fallback to mock data if database table doesn't exist
                    if (error.code === 'ER_NO_SUCH_TABLE') {
                        return res.json({
                            success: true,
                            data: {
                                notifications: [
                                    {
                                        id: 1,
                                        type: 'info',
                                        title: 'Welcome',
                                        message: 'System is running in fallback mode',
                                        data: {},
                                        isRead: false,
                                        isExpired: false,
                                        created_at: new Date().toISOString()
                                    }
                                ],
                                pagination: {
                                    page: 1,
                                    limit: 20,
                                    total: 1,
                                    totalPages: 1
                                }
                            }
                        });
                    }

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch notifications'
                    });
                }

                // Process notifications safely
                const processedNotifications = notifications.map(notification => {
                    let parsedData = {};
                    
                    // Safe JSON parsing
                    if (notification.data) {
                        try {
                            // If it's already an object, use it directly
                            if (typeof notification.data === 'object') {
                                parsedData = notification.data;
                            } else {
                                // If it's a string, try to parse it
                                parsedData = JSON.parse(notification.data);
                            }
                        } catch (parseError) {
                            console.warn('⚠️ Failed to parse notification data:', parseError);
                            parsedData = {};
                        }
                    }

                    return {
                        ...notification,
                        data: parsedData,
                        isRead: notification.read_at !== null,
                        isExpired: notification.expires_at && new Date(notification.expires_at) < new Date()
                    };
                });

                // Get total count
                const countQuery = `
                    SELECT COUNT(*) as total 
                    FROM notification_queue 
                    WHERE user_id = ? ${unreadOnly === 'true' ? 'AND read_at IS NULL' : ''}
                `;

                db.query(countQuery, [userId], (countError, countResult) => {
                    const total = countError ? 0 : countResult[0]?.total || 0;
                    const totalPages = Math.ceil(total / limit);

                    res.json({
                        success: true,
                        data: {
                            notifications: processedNotifications,
                            pagination: {
                                page: parseInt(page),
                                limit: parseInt(limit),
                                total,
                                totalPages
                            }
                        }
                    });
                });
            });

        } catch (error) {
            console.error('❌ Notification controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    }

    // ===============================
    // MARK NOTIFICATION AS READ
    // ===============================
    static async markAsRead(req, res) {
        try {
            const userId = req.user?.userId || 1;
            const { notificationId } = req.params;

            const updateQuery = `
                UPDATE notification_queue 
                SET read_at = NOW(), delivered_at = COALESCE(delivered_at, NOW())
                WHERE id = ? AND user_id = ?
            `;

            db.query(updateQuery, [notificationId, userId], (error, result) => {
                if (error) {
                    console.error('❌ Mark as read error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to mark notification as read'
                    });
                }

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
            });

        } catch (error) {
            console.error('❌ Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read'
            });
        }
    }

    // ===============================
    // CREATE NOTIFICATION
    // ===============================
    static async createNotification(req, res) {
        try {
            const { userId, type, title, message, data = {}, expiresAt } = req.body;

            const insertQuery = `
                INSERT INTO notification_queue (user_id, type, title, message, data, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;

            const dataString = typeof data === 'object' ? JSON.stringify(data) : data;

            db.query(insertQuery, [userId, type, title, message, dataString, expiresAt], (error, result) => {
                if (error) {
                    console.error('❌ Create notification error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create notification'
                    });
                }

                res.json({
                    success: true,
                    message: 'Notification created successfully',
                    data: { id: result.insertId }
                });
            });

        } catch (error) {
            console.error('❌ Create notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create notification'
            });
        }
    }
}

module.exports = NotificationController;