const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/:itemType/:itemId', verifyToken, requireRole('alumni', 'admin'), applicationController.getApplicantsForItem);
router.put('/:id/status', verifyToken, requireRole('alumni', 'admin'), applicationController.updateApplicationStatus);

module.exports = router;
