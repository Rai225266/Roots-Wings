const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, jobController.getJobs);
router.get('/trending/companies', verifyToken, jobController.getTrendingCompanies);
router.get('/my/posted', verifyToken, requireRole('alumni', 'admin'), jobController.getMyJobs);
router.get('/my/applications', verifyToken, requireRole('student'), jobController.getMyApplications);
router.get('/my/saved', verifyToken, requireRole('student'), jobController.getMySavedJobs);
router.get('/:id', verifyToken, jobController.getJobById);
router.post('/', verifyToken, requireRole('alumni', 'admin'), jobController.createJob);
router.put('/:id', verifyToken, requireRole('alumni', 'admin'), jobController.updateJob);
router.delete('/:id', verifyToken, requireRole('alumni', 'admin'), jobController.deleteJob);
router.post('/:id/apply', verifyToken, requireRole('student'), jobController.applyToJob);
router.post('/:id/save', verifyToken, requireRole('student'), jobController.saveJob);

module.exports = router;
