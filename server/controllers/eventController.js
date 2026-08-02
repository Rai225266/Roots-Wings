const pool = require('../config/db');

exports.getEvents = async (req, res, next) => {
  try {
    const { search = '', event_type = '', upcoming = 'true', page = 1, limit = 9 } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (event_type) { conditions.push('e.event_type = ?'); params.push(event_type); }
    if (upcoming === 'true') { conditions.push('e.event_date >= CURDATE()'); conditions.push('e.status = "upcoming"'); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 9, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM events e ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT e.*, u.full_name as creator_name,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
       FROM events e JOIN users u ON u.id = e.created_by
       ${whereClause} ORDER BY e.event_date ASC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
};

exports.getEventById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.full_name as creator_name,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
       FROM events e JOIN users u ON u.id = e.created_by WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, event_type, event_date, event_time, location, is_online, meeting_link, max_participants } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ success: false, message: 'Title and event date are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO events (created_by, title, description, event_type, event_date, event_time, location, is_online, meeting_link, max_participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, event_type || 'other', event_date, event_time || null, location,
        is_online === false || is_online === 'false' ? 0 : 1, meeting_link, max_participants || 0]
    );
    res.status(201).json({ success: true, message: 'Event created successfully.', eventId: result.insertId });
  } catch (err) { next(err); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (existing[0].created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this event.' });
    }
    const allowed = ['title', 'description', 'event_type', 'event_date', 'event_time', 'location', 'is_online', 'meeting_link', 'max_participants', 'status'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    await pool.query(`UPDATE events SET ${setClause} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err) { next(err); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (existing[0].created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this event.' });
    }
    await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) { next(err); }
};

exports.joinEvent = async (req, res, next) => {
  try {
    await pool.query('INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
    res.status(201).json({ success: true, message: 'You have joined the event!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      await pool.query('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?', [req.params.id, req.user.id]);
      return res.json({ success: true, message: 'You have left the event.' });
    }
    next(err);
  }
};

exports.getMyEvents = async (req, res, next) => {
  try {
    const [created] = await pool.query('SELECT * FROM events WHERE created_by = ? ORDER BY event_date DESC', [req.user.id]);
    const [joined] = await pool.query(
      `SELECT e.* FROM event_participants ep JOIN events e ON e.id = ep.event_id WHERE ep.user_id = ? ORDER BY e.event_date ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: { created, joined } });
  } catch (err) { next(err); }
};
