const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/inbox', verifyToken, messageController.getInbox);
router.get('/unread/count', verifyToken, messageController.getUnreadCount);
router.get('/search-users', verifyToken, messageController.searchContacts);
router.get('/contact/:id/info', verifyToken, messageController.getContactInfo);
router.get('/:contactId', verifyToken, messageController.getConversation);
router.post('/', verifyToken, messageController.sendMessage);

module.exports = router;
