const db = require('../db/connection');

class MessageController {
    // Get all channels
    static async getChannels(req, res) {
        try {
            const [channels] = await db.execute(`
                SELECT 
                    id,
                    name,
                    display_name,
                    description,
                    is_private,
                    created_at,
                    (SELECT COUNT(*) FROM messages WHERE channel_id = channels.id) as message_count
                FROM channels
                WHERE is_active = 1
                ORDER BY name ASC
            `);

            res.json({
                success: true,
                data: channels
            });

        } catch (error) {
            console.error('Get channels error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get messages for a channel
    static async getChannelMessages(req, res) {
        try {
            const { channelId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            const [messages] = await db.execute(`
                SELECT 
                    m.*,
                    u.name as user_name,
                    u.email as user_email
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id = ? AND m.is_active = 1
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `, [channelId, parseInt(limit), parseInt(offset)]);

            // Reverse to show oldest first
            messages.reverse();

            // Parse file_data JSON if exists
            messages.forEach(message => {
                if (message.file_data) {
                    try {
                        message.file_data = JSON.parse(message.file_data);
                    } catch (e) {
                        message.file_data = null;
                    }
                }
            });

            res.json({
                success: true,
                data: messages
            });

        } catch (error) {
            console.error('Get channel messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Send message
    static async sendMessage(req, res) {
        try {
            const { channelId, message, messageType = 'text', fileData = null, voiceDuration = null } = req.body;

            if (!channelId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Channel ID and message are required'
                });
            }

            // Validate message type
            const validTypes = ['text', 'voice', 'file'];
            if (!validTypes.includes(messageType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid message type'
                });
            }

            // Check if channel exists
            const [channels] = await db.execute(`
                SELECT id, name FROM channels WHERE id = ? AND is_active = 1
            `, [channelId]);

            if (channels.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Channel not found'
                });
            }

            // Insert message
            const [result] = await db.execute(`
                INSERT INTO messages (
                    channel_id, user_id, message, message_type, 
                    file_data, voice_duration, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                channelId, 
                req.user.userId, 
                message, 
                messageType,
                fileData ? JSON.stringify(fileData) : null,
                voiceDuration
            ]);

            // Get the created message with user info
            const [newMessage] = await db.execute(`
                SELECT 
                    m.*,
                    u.name as user_name,
                    u.email as user_email
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.id = ?
            `, [result.insertId]);

            // Parse file_data if exists
            if (newMessage[0].file_data) {
                try {
                    newMessage[0].file_data = JSON.parse(newMessage[0].file_data);
                } catch (e) {
                    newMessage[0].file_data = null;
                }
            }

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'CREATE', 'MESSAGES', ?, ?, ?, ?)
            `, [
                req.user.userId,
                result.insertId,
                JSON.stringify({
                    channelName: channels[0].name,
                    messageType,
                    messageLength: message.length
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Message sent successfully',
                data: newMessage[0]
            });

        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create channel
    static async createChannel(req, res) {
        try {
            const { name, displayName, description, isPrivate = false } = req.body;

            if (!name || !displayName) {
                return res.status(400).json({
                    success: false,
                    message: 'Channel name and display name are required'
                });
            }

            // Check if channel already exists
            const [existingChannels] = await db.execute(`
                SELECT id FROM channels WHERE name = ?
            `, [name]);

            if (existingChannels.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Channel with this name already exists'
                });
            }

            // Create channel
            const [result] = await db.execute(`
                INSERT INTO channels (name, display_name, description, is_private, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [name, displayName, description, isPrivate, req.user.userId]);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'CREATE', 'CHANNELS', ?, ?, ?, ?)
            `, [
                req.user.userId,
                result.insertId,
                JSON.stringify({
                    name,
                    displayName,
                    isPrivate
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Channel created successfully',
                data: {
                    id: result.insertId,
                    name,
                    displayName,
                    description,
                    isPrivate
                }
            });

        } catch (error) {
            console.error('Create channel error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Delete message
    static async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;

            // Get message details for authorization and logging
            const [messages] = await db.execute(`
                SELECT 
                    m.*,
                    c.name as channel_name
                FROM messages m
                JOIN channels c ON m.channel_id = c.id
                WHERE m.id = ? AND m.is_active = 1
            `, [messageId]);

            if (messages.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            const message = messages[0];

            // Check if user can delete this message (own message or admin)
            if (message.user_id !== req.user.userId && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own messages'
                });
            }

            // Soft delete the message
            await db.execute(`
                UPDATE messages SET is_active = 0, updated_at = NOW() WHERE id = ?
            `, [messageId]);

            // Log activity
            await db.execute(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
                VALUES (?, 'DELETE', 'MESSAGES', ?, ?, ?, ?)
            `, [
                req.user.userId,
                messageId,
                JSON.stringify({
                    channelName: message.channel_name,
                    messageType: message.message_type,
                    originalUserId: message.user_id
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Message deleted successfully'
            });

        } catch (error) {
            console.error('Delete message error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get direct messages between users
    static async getDirectMessages(req, res) {
        try {
            const { otherUserId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            const [messages] = await db.execute(`
                SELECT 
                    m.*,
                    u.name as user_name,
                    u.email as user_email
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.channel_id IS NULL 
                AND ((m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?))
                AND m.is_active = 1
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `, [req.user.userId, otherUserId, otherUserId, req.user.userId, parseInt(limit), parseInt(offset)]);

            // Reverse to show oldest first
            messages.reverse();

            // Parse file_data JSON if exists
            messages.forEach(message => {
                if (message.file_data) {
                    try {
                        message.file_data = JSON.parse(message.file_data);
                    } catch (e) {
                        message.file_data = null;
                    }
                }
            });

            res.json({
                success: true,
                data: messages
            });

        } catch (error) {
            console.error('Get direct messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Send direct message
    static async sendDirectMessage(req, res) {
        try {
            const { recipientId, message, messageType = 'text', fileData = null, voiceDuration = null } = req.body;

            if (!recipientId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient ID and message are required'
                });
            }

            // Check if recipient exists
            const [recipients] = await db.execute(`
                SELECT id, name FROM users WHERE id = ? AND is_active = 1
            `, [recipientId]);

            if (recipients.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            // Insert direct message
            const [result] = await db.execute(`
                INSERT INTO messages (
                    user_id, recipient_id, message, message_type, 
                    file_data, voice_duration, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                req.user.userId, 
                recipientId, 
                message, 
                messageType,
                fileData ? JSON.stringify(fileData) : null,
                voiceDuration
            ]);

            // Get the created message with user info
            const [newMessage] = await db.execute(`
                SELECT 
                    m.*,
                    u.name as user_name,
                    u.email as user_email
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.id = ?
            `, [result.insertId]);

            // Parse file_data if exists
            if (newMessage[0].file_data) {
                try {
                    newMessage[0].file_data = JSON.parse(newMessage[0].file_data);
                } catch (e) {
                    newMessage[0].file_data = null;
                }
            }

            res.json({
                success: true,
                message: 'Direct message sent successfully',
                data: newMessage[0]
            });

        } catch (error) {
            console.error('Send direct message error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = MessageController;