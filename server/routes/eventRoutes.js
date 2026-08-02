const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, eventController.getEvents);
router.get('/my/events', verifyToken, eventController.getMyEvents);
router.get('/:id', verifyToken, eventController.getEventById);
router.post('/', verifyToken, requireRole('alumni', 'admin'), eventController.createEvent);
router.put('/:id', verifyToken, requireRole('alumni', 'admin'), eventController.updateEvent);
router.delete('/:id', verifyToken, requireRole('alumni', 'admin'), eventController.deleteEvent);
router.post('/:id/join', verifyToken, eventController.joinEvent);

module.exports = router;
