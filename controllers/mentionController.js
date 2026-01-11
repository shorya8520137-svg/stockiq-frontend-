const db = require('../db/connection');
const websocketService = require('../services/websocketService');

class MentionController {

    // ===============================
    // CREATE MENTION
    // ===============================
    static async createMention(req, res) {
        try {
            const mentioningUserId = req.user.userId;
            const {
                mentionedUserIds, // Array of user IDs or usernames
                entityType,
                entityId,
                mentionText,
                contextText
            } = req.body;

            if (!mentionedUserIds || !Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Mentioned users are required'
                });
            }

            if (!entityType || !entityId || !mentionText) {
                return res.status(400).json({
                    success: false,
                    message: 'Entity type, entity ID, and mention text are required'
                });
            }

            // Get mentioning user details
            const [mentioningUsers] = await db.execute(
                'SELECT id, name, email FROM users WHERE id = ?',
                [mentioningUserId]
            );

            if (mentioningUsers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Mentioning user not found'
                });
            }

            const mentioningUser = mentioningUsers[0];
            const results = [];

            // Process each mentioned user
            for (const mentionedIdentifier of mentionedUserIds) {
                try {
                    // Find user by ID or username/email
                    let mentionedUser = null;
                    
                    if (typeof mentionedIdentifier === 'number' || /^\d+$/.test(mentionedIdentifier)) {
                        // Search by ID
                        const [users] = await db.execute(
                            'SELECT id, name, email FROM users WHERE id = ? AND status = "active"',
                            [mentionedIdentifier]
                        );
                        mentionedUser = users[0];
                    } else {
                        // Search by username or email
                        const [users] = await db.execute(
                            'SELECT id, name, email FROM users WHERE (name LIKE ? OR email = ?) AND status = "active"',
                            [`%${mentionedIdentifier}%`, mentionedIdentifier]
                        );
                        mentionedUser = users[0];
                    }

                    if (!mentionedUser) {
                        results.push({
                            identifier: mentionedIdentifier,
                            success: false,
                            error: 'User not found'
                        });
                        continue;
                    }

                    // Don't allow self-mentions
                    if (mentionedUser.id === mentioningUserId) {
                        results.push({
                            identifier: mentionedIdentifier,
                            success: false,
                            error: 'Cannot mention yourself'
                        });
                        continue;
                    }

                    // Save mention to database (if table exists)
                    let mentionId = null;
                    try {
                        const [result] = await db.execute(`
                            INSERT INTO user_mentions 
                            (mentioned_user_id, mentioning_user_id, entity_type, entity_id, mention_text, context_text, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                        `, [
                            mentionedUser.id,
                            mentioningUserId,
                            entityType,
                            entityId,
                            mentionText,
                            contextText
                        ]);
                        mentionId = result.insertId;
                    } catch (dbError) {
                        console.log('Could not save mention to database:', dbError.message);
                    }

                    // Send real-time notification
                    await websocketService.sendNotificationToUser(mentionedUser.id, {
                        type: 'mention',
                        title: 'You were mentioned',
                        message: `${mentioningUser.name} mentioned you: "${mentionText}"`,
                        data: {
                            mentionId: mentionId,
                            mentioningUser: {
                                id: mentioningUser.id,
                                name: mentioningUser.name,
                                email: mentioningUser.email
                            },
                            mentionedUser: {
                                id: mentionedUser.id,
                                name: mentionedUser.name,
                                email: mentionedUser.email
                            },
                            entityType: entityType,
                            entityId: entityId,
                            mentionText: mentionText,
                            contextText: contextText
                        },
                        priority: 'high'
                    });

                    results.push({
                        identifier: mentionedIdentifier,
                        success: true,
                        mentionId: mentionId,
                        mentionedUser: {
                            id: mentionedUser.id,
                            name: mentionedUser.name,
                            email: mentionedUser.email
                        }
                    });

                } catch (error) {
                    console.error(`Error processing mention for ${mentionedIdentifier}:`, error);
                    results.push({
                        identifier: mentionedIdentifier,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;

            res.json({
                success: true,
                message: `${successCount} mentions created${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
                data: {
                    results,
                    summary: {
                        total: mentionedUserIds.length,
                        successful: successCount,
                        failed: failureCount
                    }
                }
            });

        } catch (error) {
            console.error('Create mention error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create mention',
                error: error.message
            });
        }
    }

    // ===============================
    // GET USER MENTIONS
    // ===============================
    static async getUserMentions(req, res) {
        try {
            const userId = req.user.userId;
            const { 
                limit = 20, 
                offset = 0, 
                unreadOnly = false,
                entityType = null 
            } = req.query;

            try {
                let whereClause = 'WHERE m.mentioned_user_id = ?';
                const params = [userId];

                if (unreadOnly === 'true') {
                    whereClause += ' AND m.read_at IS NULL';
                }

                if (entityType) {
                    whereClause += ' AND m.entity_type = ?';
                    params.push(entityType);
                }

                // Get mentions with user details
                const [mentions] = await db.execute(`
                    SELECT 
                        m.id,
                        m.entity_type,
                        m.entity_id,
                        m.mention_text,
                        m.context_text,
                        m.notification_sent,
                        m.read_at,
                        m.created_at,
                        u.id as mentioning_user_id,
                        u.name as mentioning_user_name,
                        u.email as mentioning_user_email
                    FROM user_mentions m
                    JOIN users u ON m.mentioning_user_id = u.id
                    ${whereClause}
                    ORDER BY m.created_at DESC 
                    LIMIT ? OFFSET ?
                `, [...params, parseInt(limit), parseInt(offset)]);

                // Get total count
                const [countResult] = await db.execute(`
                    SELECT COUNT(*) as total 
                    FROM user_mentions m
                    ${whereClause}
                `, params);

                // Get unread count
                const [unreadResult] = await db.execute(`
                    SELECT COUNT(*) as unread 
                    FROM user_mentions 
                    WHERE mentioned_user_id = ? AND read_at IS NULL
                `, [userId]);

                // Process mentions
                const processedMentions = mentions.map(mention => ({
                    id: mention.id,
                    entityType: mention.entity_type,
                    entityId: mention.entity_id,
                    mentionText: mention.mention_text,
                    contextText: mention.context_text,
                    notificationSent: mention.notification_sent,
                    isRead: mention.read_at !== null,
                    createdAt: mention.created_at,
                    readAt: mention.read_at,
                    mentioningUser: {
                        id: mention.mentioning_user_id,
                        name: mention.mentioning_user_name,
                        email: mention.mentioning_user_email
                    }
                }));

                res.json({
                    success: true,
                    data: {
                        mentions: processedMentions,
                        pagination: {
                            total: countResult[0].total,
                            unread: unreadResult[0].unread,
                            limit: parseInt(limit),
                            offset: parseInt(offset),
                            hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit))
                        }
                    }
                });

            } catch (dbError) {
                // Return empty data if table doesn't exist
                res.json({
                    success: true,
                    data: {
                        mentions: [],
                        pagination: {
                            total: 0,
                            unread: 0,
                            limit: parseInt(limit),
                            offset: parseInt(offset),
                            hasMore: false
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Get user mentions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get mentions',
                error: error.message
            });
        }
    }

    // ===============================
    // MARK MENTION AS READ
    // ===============================
    static async markMentionAsRead(req, res) {
        try {
            const userId = req.user.userId;
            const { mentionId } = req.params;

            const [result] = await db.execute(`
                UPDATE user_mentions 
                SET read_at = NOW() 
                WHERE id = ? AND mentioned_user_id = ?
            `, [mentionId, userId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Mention not found'
                });
            }

            res.json({
                success: true,
                message: 'Mention marked as read'
            });

        } catch (error) {
            console.error('Mark mention as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark mention as read',
                error: error.message
            });
        }
    }

    // ===============================
    // SEARCH USERS FOR MENTIONS
    // ===============================
    static async searchUsersForMention(req, res) {
        try {
            const { query, limit = 10 } = req.query;

            if (!query || query.trim().length < 2) {
                return res.json({
                    success: true,
                    data: {
                        users: []
                    }
                });
            }

            const searchTerm = `%${query.trim()}%`;

            // Search users by name or email
            const [users] = await db.execute(`
                SELECT 
                    id,
                    name,
                    email,
                    role
                FROM users 
                WHERE (name LIKE ? OR email LIKE ?) 
                AND status = 'active'
                AND id != ?
                ORDER BY 
                    CASE 
                        WHEN name LIKE ? THEN 1
                        WHEN email LIKE ? THEN 2
                        ELSE 3
                    END,
                    name
                LIMIT ?
            `, [
                searchTerm, 
                searchTerm, 
                req.user.userId, // Exclude current user
                `${query.trim()}%`, 
                `${query.trim()}%`, 
                parseInt(limit)
            ]);

            // Format users for mention suggestions
            const formattedUsers = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                displayName: `${user.name} (${user.email})`,
                mentionText: `@${user.name.replace(/\s+/g, '')}`
            }));

            res.json({
                success: true,
                data: {
                    users: formattedUsers,
                    query: query
                }
            });

        } catch (error) {
            console.error('Search users for mention error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search users',
                error: error.message
            });
        }
    }

    // ===============================
    // PARSE MENTIONS FROM TEXT
    // ===============================
    static async parseMentionsFromText(req, res) {
        try {
            const { text } = req.body;

            if (!text) {
                return res.json({
                    success: true,
                    data: {
                        mentions: [],
                        parsedText: text
                    }
                });
            }

            // Regular expression to find @mentions
            const mentionRegex = /@(\w+(?:\.\w+)*)/g;
            const mentions = [];
            let match;

            while ((match = mentionRegex.exec(text)) !== null) {
                const mentionText = match[0]; // Full match including @
                const username = match[1]; // Username without @

                // Try to find user by name or email
                try {
                    const [users] = await db.execute(`
                        SELECT id, name, email 
                        FROM users 
                        WHERE (name LIKE ? OR email = ?) 
                        AND status = 'active'
                        LIMIT 1
                    `, [`%${username}%`, username]);

                    if (users.length > 0) {
                        mentions.push({
                            mentionText: mentionText,
                            username: username,
                            user: users[0],
                            startIndex: match.index,
                            endIndex: match.index + mentionText.length
                        });
                    } else {
                        mentions.push({
                            mentionText: mentionText,
                            username: username,
                            user: null,
                            startIndex: match.index,
                            endIndex: match.index + mentionText.length,
                            error: 'User not found'
                        });
                    }
                } catch (dbError) {
                    mentions.push({
                        mentionText: mentionText,
                        username: username,
                        user: null,
                        startIndex: match.index,
                        endIndex: match.index + mentionText.length,
                        error: 'Database error'
                    });
                }
            }

            // Create parsed text with mention highlights
            let parsedText = text;
            const validMentions = mentions.filter(m => m.user);
            
            // Replace mentions with formatted versions (from end to start to preserve indices)
            validMentions.reverse().forEach(mention => {
                const replacement = `<span class="mention" data-user-id="${mention.user.id}">${mention.mentionText}</span>`;
                parsedText = parsedText.substring(0, mention.startIndex) + 
                           replacement + 
                           parsedText.substring(mention.endIndex);
            });

            res.json({
                success: true,
                data: {
                    mentions: mentions.reverse(), // Restore original order
                    parsedText: parsedText,
                    validMentions: validMentions.length,
                    totalMentions: mentions.length
                }
            });

        } catch (error) {
            console.error('Parse mentions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to parse mentions',
                error: error.message
            });
        }
    }

    // ===============================
    // GET MENTION STATISTICS
    // ===============================
    static async getMentionStats(req, res) {
        try {
            const userId = req.user.userId;
            const { days = 30 } = req.query;

            try {
                // Get mention statistics
                const [stats] = await db.execute(`
                    SELECT 
                        COUNT(*) as totalReceived,
                        COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
                        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read
                    FROM user_mentions 
                    WHERE mentioned_user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                `, [userId, parseInt(days)]);

                // Get mentions sent by user
                const [sentStats] = await db.execute(`
                    SELECT COUNT(*) as totalSent
                    FROM user_mentions 
                    WHERE mentioning_user_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                `, [userId, parseInt(days)]);

                // Get top mentioning users
                const [topMentioners] = await db.execute(`
                    SELECT 
                        u.id,
                        u.name,
                        u.email,
                        COUNT(*) as mentionCount
                    FROM user_mentions m
                    JOIN users u ON m.mentioning_user_id = u.id
                    WHERE m.mentioned_user_id = ? 
                    AND m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    GROUP BY u.id, u.name, u.email
                    ORDER BY mentionCount DESC
                    LIMIT 5
                `, [userId, parseInt(days)]);

                res.json({
                    success: true,
                    data: {
                        received: stats[0],
                        sent: sentStats[0],
                        topMentioners: topMentioners,
                        period: `${days} days`
                    }
                });

            } catch (dbError) {
                // Return mock stats if table doesn't exist
                res.json({
                    success: true,
                    data: {
                        received: {
                            totalReceived: 0,
                            unread: 0,
                            read: 0
                        },
                        sent: {
                            totalSent: 0
                        },
                        topMentioners: [],
                        period: `${days} days`
                    }
                });
            }

        } catch (error) {
            console.error('Get mention stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get mention statistics',
                error: error.message
            });
        }
    }
}

module.exports = MentionController;