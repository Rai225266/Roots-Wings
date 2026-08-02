const express = require('express');
const router = express.Router();
const mentorshipController = require('../controllers/mentorshipController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/my', verifyToken, mentorshipController.getMyMentorships);
router.post('/request', verifyToken, requireRole('student'), mentorshipController.requestMentor);
router.put('/:id/respond', verifyToken, requireRole('alumni'), mentorshipController.respondToRequest);
router.put('/:id/schedule', verifyToken, requireRole('alumni'), mentorshipController.scheduleMeeting);
router.post('/:id/sessions', verifyToken, requireRole('alumni'), mentorshipController.addSession);
router.get('/:id/sessions', verifyToken, mentorshipController.getSessions);

module.exports = router;
