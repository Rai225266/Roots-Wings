const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, internshipController.getInternships);
router.get('/my/posted', verifyToken, requireRole('alumni', 'admin'), internshipController.getMyInternships);
router.get('/:id', verifyToken, internshipController.getInternshipById);
router.post('/', verifyToken, requireRole('alumni', 'admin'), internshipController.createInternship);
router.put('/:id', verifyToken, requireRole('alumni', 'admin'), internshipController.updateInternship);
router.delete('/:id', verifyToken, requireRole('alumni', 'admin'), internshipController.deleteInternship);
router.post('/:id/apply', verifyToken, requireRole('student'), internshipController.applyToInternship);
router.post('/:id/save', verifyToken, requireRole('student'), internshipController.saveInternship);

module.exports = router;
