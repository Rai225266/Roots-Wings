const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/register/student', authController.registerStudent);
router.post('/register/alumni', authController.registerAlumni);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
