const pool = require('../config/db');

exports.getInternships = async (req, res, next) => {
  try {
    const { search = '', mode = '', location = '', page = 1, limit = 8 } = req.query;
    const conditions = ['i.status = "open"'];
    const params = [];

    if (search) {
      conditions.push('(i.title LIKE ? OR i.company LIKE ? OR i.skills_required LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (mode) { conditions.push('i.mode = ?'); params.push(mode); }
    if (location) { conditions.push('i.location LIKE ?'); params.push(`%${location}%`); }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 8, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM internships i ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT i.*, u.full_name as posted_by_name FROM internships i JOIN users u ON u.id = i.posted_by
       ${whereClause} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
};

exports.getInternshipById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, u.full_name as posted_by_name FROM internships i JOIN users u ON u.id = i.posted_by WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Internship not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.createInternship = async (req, res, next) => {
  try {
    const { title, company, location, duration, stipend, mode, description, skills_required, last_date_to_apply } = req.body;
    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: 'Title, company and description are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO internships (posted_by, title, company, location, duration, stipend, mode, description, skills_required, last_date_to_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, company, location, duration, stipend, mode || 'remote', description, skills_required, last_date_to_apply || null]
    );
    res.status(201).json({ success: true, message: 'Internship posted successfully.', internshipId: result.insertId });
  } catch (err) { next(err); }
};

exports.updateInternship = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Internship not found.' });
    if (existing[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this internship.' });
    }
    const allowed = ['title', 'company', 'location', 'duration', 'stipend', 'mode', 'description', 'skills_required', 'last_date_to_apply', 'status'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    await pool.query(`UPDATE internships SET ${setClause} WHERE id = ?`, [...Object.values(updates), req.params.id]);
    res.json({ success: true, message: 'Internship updated successfully.' });
  } catch (err) { next(err); }
};

exports.deleteInternship = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Internship not found.' });
    if (existing[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this internship.' });
    }
    await pool.query('DELETE FROM internships WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Internship deleted successfully.' });
  } catch (err) { next(err); }
};

exports.getMyInternships = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM internships WHERE posted_by = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.applyToInternship = async (req, res, next) => {
  try {
    const { cover_note } = req.body;
    await pool.query(
      'INSERT INTO applications (applicant_id, item_type, item_id, cover_note) VALUES (?, "internship", ?, ?)',
      [req.user.id, req.params.id, cover_note || null]
    );
    const [rows] = await pool.query('SELECT posted_by, title FROM internships WHERE id = ?', [req.params.id]);
    if (rows.length) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "internship", ?)',
        [rows[0].posted_by, 'New Internship Application', `${req.user.full_name} applied to ${rows[0].title}`, `/internships.html`]
      );
    }
    res.status(201).json({ success: true, message: 'Application submitted successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already applied to this internship.' });
    }
    next(err);
  }
};

exports.saveInternship = async (req, res, next) => {
  try {
    await pool.query('INSERT INTO saved_items (user_id, item_type, item_id) VALUES (?, "internship", ?)', [req.user.id, req.params.id]);
    res.status(201).json({ success: true, message: 'Internship saved successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      await pool.query('DELETE FROM saved_items WHERE user_id = ? AND item_type = "internship" AND item_id = ?', [req.user.id, req.params.id]);
      return res.json({ success: true, message: 'Internship unsaved.' });
    }
    next(err);
  }
};
