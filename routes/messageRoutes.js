const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All message routes require authentication
router.use(authMiddleware);

// Get all channels
router.get('/channels', 
    permissionMiddleware('messages.view'),
    MessageController.getChannels
);

// Create channel
router.post('/channels', 
    permissionMiddleware('messages.create_channel'),
    MessageController.createChannel
);

// Get messages for a channel
router.get('/channels/:channelId/messages', 
    permissionMiddleware('messages.view'),
    MessageController.getChannelMessages
);

// Send message to channel
router.post('/channels/send', 
    permissionMiddleware('messages.send'),
    MessageController.sendMessage
);

// Delete message
router.delete('/messages/:messageId', 
    permissionMiddleware('messages.delete'),
    MessageController.deleteMessage
);

// Get direct messages between users
router.get('/direct/:otherUserId', 
    permissionMiddleware('messages.view'),
    MessageController.getDirectMessages
);

// Send direct message
router.post('/direct/send', 
    permissionMiddleware('messages.send'),
    MessageController.sendDirectMessage
);

module.exports = router;