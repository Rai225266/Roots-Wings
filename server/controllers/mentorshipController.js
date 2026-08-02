const pool = require('../config/db');

// POST /api/mentorship/request (student requests a mentor)
exports.requestMentor = async (req, res, next) => {
  try {
    const { alumni_id, message } = req.body;
    if (!alumni_id) return res.status(400).json({ success: false, message: 'Alumni ID is required.' });

    const [alumniRows] = await pool.query('SELECT * FROM alumni WHERE user_id = ?', [alumni_id]);
    if (!alumniRows.length) return res.status(404).json({ success: false, message: 'Alumni not found.' });

    const [result] = await pool.query(
      'INSERT INTO mentorship (student_id, alumni_id, message) VALUES (?, ?, ?)',
      [req.user.id, alumni_id, message || null]
    );

    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "mentorship", ?)',
      [alumni_id, 'New Mentorship Request', `${req.user.full_name} requested you as a mentor.`, '/dashboard.html']
    );

    res.status(201).json({ success: true, message: 'Mentorship request sent successfully.', id: result.insertId });
  } catch (err) { next(err); }
};

// PUT /api/mentorship/:id/respond (alumni accepts/rejects)
exports.respondToRequest = async (req, res, next) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected.' });
    }
    const [rows] = await pool.query('SELECT * FROM mentorship WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mentorship request not found.' });
    if (rows[0].alumni_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to respond to this request.' });
    }

    await pool.query('UPDATE mentorship SET status = ?, responded_at = NOW() WHERE id = ?', [status, req.params.id]);

    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "mentorship", ?)',
      [rows[0].student_id, `Mentorship Request ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
        `Your mentorship request has been ${status}.`, '/dashboard.html']
    );

    res.json({ success: true, message: `Request ${status}.` });
  } catch (err) { next(err); }
};

// PUT /api/mentorship/:id/schedule (alumni schedules a meeting)
exports.scheduleMeeting = async (req, res, next) => {
  try {
    const { meeting_date, meeting_link, notes } = req.body;
    const [rows] = await pool.query('SELECT * FROM mentorship WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mentorship not found.' });
    if (rows[0].alumni_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await pool.query('UPDATE mentorship SET meeting_date = ?, meeting_link = ?, notes = ? WHERE id = ?',
      [meeting_date || null, meeting_link || null, notes || null, req.params.id]);

    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "mentorship", ?)',
      [rows[0].student_id, 'Meeting Scheduled', 'Your mentor scheduled a meeting with you.', '/dashboard.html']
    );

    res.json({ success: true, message: 'Meeting scheduled successfully.' });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/sessions - log/schedule another session (alumni only, mentorship must be accepted)
exports.addSession = async (req, res, next) => {
  try {
    const { session_date, session_link, topic, notes } = req.body;
    if (!session_date) return res.status(400).json({ success: false, message: 'Session date/time is required.' });

    const [rows] = await pool.query('SELECT * FROM mentorship WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mentorship not found.' });
    if (rows[0].alumni_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the mentor can schedule a session.' });
    }
    if (rows[0].status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'This mentorship request has not been accepted yet.' });
    }

    const [result] = await pool.query(
      'INSERT INTO mentorship_sessions (mentorship_id, session_date, session_link, topic, notes) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, session_date, session_link || null, topic || null, notes || null]
    );

    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "mentorship", ?)',
      [rows[0].student_id, 'New Mentorship Session Scheduled', topic ? `Session: ${topic}` : 'Your mentor scheduled a new session with you.', '/dashboard.html']
    );

    res.status(201).json({ success: true, message: 'Session scheduled.', id: result.insertId });
  } catch (err) { next(err); }
};

// GET /api/mentorship/:id/sessions - either party can view the session log
exports.getSessions = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mentorship WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mentorship not found.' });
    if (rows[0].student_id !== req.user.id && rows[0].alumni_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const [sessions] = await pool.query(
      'SELECT * FROM mentorship_sessions WHERE mentorship_id = ? ORDER BY session_date DESC',
      [req.params.id]
    );
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
};

// GET /api/mentorship/my (role-aware: student sees own requests, alumni sees requests for them)
exports.getMyMentorships = async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'alumni') {
      [rows] = await pool.query(
        `SELECT m.*, u.full_name as student_name, u.profile_picture as student_picture
         FROM mentorship m JOIN users u ON u.id = m.student_id
         WHERE m.alumni_id = ? ORDER BY m.requested_at DESC`, [req.user.id]);
    } else {
      [rows] = await pool.query(
        `SELECT m.*, u.full_name as alumni_name, u.profile_picture as alumni_picture, a.current_company, a.designation
         FROM mentorship m JOIN users u ON u.id = m.alumni_id
         LEFT JOIN alumni a ON a.user_id = m.alumni_id
         WHERE m.student_id = ? ORDER BY m.requested_at DESC`, [req.user.id]);
    }
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
