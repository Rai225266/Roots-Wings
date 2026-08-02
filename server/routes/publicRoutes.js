const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.post('/contact', publicController.submitContact);
router.get('/testimonials', publicController.getTestimonials);
router.get('/stats', publicController.getStats);

module.exports = router;
