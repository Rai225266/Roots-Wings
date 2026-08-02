const pool = require('../config/db');

// GET /api/messages/contact/:id - basic info for chat header (works even with no message history yet)
exports.getContactInfo = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, profile_picture FROM users WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/messages/search-users?q= - find people to start a new conversation with
exports.searchContacts = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, profile_picture FROM users
       WHERE id != ? AND is_active = 1 AND (full_name LIKE ? OR email LIKE ?)
       ORDER BY full_name ASC LIMIT 10`,
      [req.user.id, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/messages/inbox - list of conversations (latest message per contact)
exports.getInbox = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Note: rewritten to avoid MySQL's ONLY_FULL_GROUP_BY restriction, which
    // rejected the previous GROUP BY query and silently broke the inbox.
    const [rows] = await pool.query(
      `SELECT
         c.contact_id,
         u.full_name AS contact_name, u.profile_picture AS contact_picture, u.role AS contact_role,
         (SELECT m2.message FROM messages m2
            WHERE (m2.sender_id = ? AND m2.receiver_id = c.contact_id) OR (m2.sender_id = c.contact_id AND m2.receiver_id = ?)
            ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
         (SELECT m2.created_at FROM messages m2
            WHERE (m2.sender_id = ? AND m2.receiver_id = c.contact_id) OR (m2.sender_id = c.contact_id AND m2.receiver_id = ?)
            ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
         (SELECT COUNT(*) FROM messages m3 WHERE m3.sender_id = c.contact_id AND m3.receiver_id = ? AND m3.is_read = 0) AS unread_count
       FROM (
         SELECT DISTINCT IF(sender_id = ?, receiver_id, sender_id) AS contact_id
         FROM messages WHERE sender_id = ? OR receiver_id = ?
       ) c
       JOIN users u ON u.id = c.contact_id
       ORDER BY last_message_at DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/messages/:contactId - conversation thread with a specific user
exports.getConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.contactId;
    const [rows] = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, contactId, contactId, userId]
    );
    await pool.query('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?', [contactId, userId]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/messages - send a message
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) {
      return res.status(400).json({ success: false, message: 'Receiver and message content are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [req.user.id, receiver_id, message]
    );
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "message", ?)',
      [receiver_id, 'New Message', `${req.user.full_name} sent you a message.`, '/messages.html']
    );
    const [newMsg] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newMsg[0] });
  } catch (err) { next(err); }
};

// GET /api/messages/unread/count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0', [req.user.id]);
    res.json({ success: true, count: rows[0].count });
  } catch (err) { next(err); }
};
