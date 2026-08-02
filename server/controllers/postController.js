const pool = require('../config/db');

// GET /api/posts - feed, newest first
exports.getFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 30);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM posts');

    const [rows] = await pool.query(
      `SELECT p.*, u.full_name, u.profile_picture, u.role,
        a.designation, a.current_company,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN alumni a ON a.user_id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limitNum, offset]
    );

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, liked_by_me: r.liked_by_me > 0 })),
      pagination: { page: pageNum, limit: limitNum, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limitNum) }
    });
  } catch (err) { next(err); }
};

// POST /api/posts
exports.createPost = async (req, res, next) => {
  try {
    const { content, tags } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Post content cannot be empty.' });
    }
    const [result] = await pool.query('INSERT INTO posts (user_id, content, tags) VALUES (?, ?, ?)', [req.user.id, content.trim(), tags || null]);
    res.status(201).json({ success: true, message: 'Post shared!', id: result.insertId });
  } catch (err) { next(err); }
};

// DELETE /api/posts/:id
exports.deletePost = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts.' });
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) { next(err); }
};

// POST /api/posts/:id/like - toggle
exports.toggleLike = async (req, res, next) => {
  try {
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
    res.status(201).json({ success: true, liked: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [req.params.id, req.user.id]);
      return res.json({ success: true, liked: false });
    }
    next(err);
  }
};

// GET /api/posts/:id/comments
exports.getComments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT pc.*, u.full_name, u.profile_picture FROM post_comments pc
       JOIN users u ON u.id = pc.user_id WHERE pc.post_id = ? ORDER BY pc.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/posts/:id/comments
exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    const [result] = await pool.query('INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)', [req.params.id, req.user.id, comment.trim()]);

    const [postRows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (postRows.length && postRows[0].user_id !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "system", ?)',
        [postRows[0].user_id, 'New Comment', `${req.user.full_name} commented on your post.`, '/dashboard.html']
      );
    }
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
};
