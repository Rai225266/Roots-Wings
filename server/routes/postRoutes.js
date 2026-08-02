const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, postController.getFeed);
router.post('/', verifyToken, postController.createPost);
router.delete('/:id', verifyToken, postController.deletePost);
router.post('/:id/like', verifyToken, postController.toggleLike);
router.get('/:id/comments', verifyToken, postController.getComments);
router.post('/:id/comments', verifyToken, postController.addComment);

module.exports = router;
