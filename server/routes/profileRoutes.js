const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadProfilePicture, uploadResume } = require('../middleware/uploadMiddleware');

router.put('/', verifyToken, profileController.updateProfile);
router.put('/password', verifyToken, profileController.changePassword);
router.post('/picture', verifyToken, uploadProfilePicture.single('picture'), profileController.uploadProfilePicture);
router.post('/resume', verifyToken, uploadResume.single('resume'), profileController.uploadResume);
router.post('/experience', verifyToken, profileController.addExperience);
router.delete('/experience/:id', verifyToken, profileController.deleteExperience);

module.exports = router;
