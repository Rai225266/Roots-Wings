const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, alumniController.getAlumniDirectory);
router.get('/filters/options', verifyToken, alumniController.getFilterOptions);
router.get('/:id', verifyToken, alumniController.getAlumniProfile);

module.exports = router;
