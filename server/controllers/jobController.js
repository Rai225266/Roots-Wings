const pool = require('../config/db');

// GET /api/jobs
// GET /api/jobs/trending/companies - real aggregate of open postings per company (jobs + internships)
exports.getTrendingCompanies = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT company, SUM(openings) as openings FROM (
         SELECT company, COUNT(*) as openings FROM jobs WHERE status = 'open' GROUP BY company
         UNION ALL
         SELECT company, COUNT(*) as openings FROM internships WHERE status = 'open' GROUP BY company
       ) combined
       GROUP BY company
       ORDER BY openings DESC
       LIMIT 5`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getJobs = async (req, res, next) => {
  try {
    const { search = '', job_type = '', location = '', page = 1, limit = 8 } = req.query;
    const conditions = ['j.status = "open"'];
    const params = [];

    if (search) {
      conditions.push('(j.title LIKE ? OR j.company LIKE ? OR j.skills_required LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (job_type) {
      conditions.push('j.job_type = ?');
      params.push(job_type);
    }
    if (location) {
      conditions.push('j.location LIKE ?');
      params.push(`%${location}%`);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 8, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM jobs j ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT j.*, u.full_name as posted_by_name, u.profile_picture as posted_by_picture
       FROM jobs j JOIN users u ON u.id = j.posted_by
       ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
};

// GET /api/jobs/:id
exports.getJobById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, u.full_name as posted_by_name FROM jobs j JOIN users u ON u.id = j.posted_by WHERE j.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/jobs (alumni/admin only)
exports.createJob = async (req, res, next) => {
  try {
    const { title, company, location, job_type, experience_required, salary_range,
      description, requirements, skills_required, application_link, last_date_to_apply } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: 'Title, company and description are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (posted_by, title, company, location, job_type, experience_required,
        salary_range, description, requirements, skills_required, application_link, last_date_to_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, company, location, job_type || 'full-time', experience_required,
        salary_range, description, requirements, skills_required, application_link, last_date_to_apply || null]
    );
    res.status(201).json({ success: true, message: 'Job posted successfully.', jobId: result.insertId });
  } catch (err) { next(err); }
};

// PUT /api/jobs/:id
exports.updateJob = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (existing[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this job.' });
    }

    const allowed = ['title', 'company', 'location', 'job_type', 'experience_required', 'salary_range',
      'description', 'requirements', 'skills_required', 'application_link', 'last_date_to_apply', 'status'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No fields to update.' });

    const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    await pool.query(`UPDATE jobs SET ${setClause} WHERE id = ?`, [...Object.values(updates), req.params.id]);

    res.json({ success: true, message: 'Job updated successfully.' });
  } catch (err) { next(err); }
};

// DELETE /api/jobs/:id
exports.deleteJob = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (existing[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this job.' });
    }
    await pool.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Job deleted successfully.' });
  } catch (err) { next(err); }
};

// GET /api/jobs/my/posted (alumni)
exports.getMyJobs = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE posted_by = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/jobs/:id/apply (student)
exports.applyToJob = async (req, res, next) => {
  try {
    const { cover_note } = req.body;
    await pool.query(
      'INSERT INTO applications (applicant_id, item_type, item_id, cover_note) VALUES (?, "job", ?, ?)',
      [req.user.id, req.params.id, cover_note || null]
    );

    const [jobRows] = await pool.query('SELECT posted_by, title FROM jobs WHERE id = ?', [req.params.id]);
    if (jobRows.length) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "job", ?)',
        [jobRows[0].posted_by, 'New Job Application', `${req.user.full_name} applied to ${jobRows[0].title}`, `/jobs.html`]
      );
    }
    res.status(201).json({ success: true, message: 'Application submitted successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already applied to this job.' });
    }
    next(err);
  }
};

// POST /api/jobs/:id/save (student)
exports.saveJob = async (req, res, next) => {
  try {
    await pool.query('INSERT INTO saved_items (user_id, item_type, item_id) VALUES (?, "job", ?)', [req.user.id, req.params.id]);
    res.status(201).json({ success: true, message: 'Job saved successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      await pool.query('DELETE FROM saved_items WHERE user_id = ? AND item_type = "job" AND item_id = ?', [req.user.id, req.params.id]);
      return res.json({ success: true, message: 'Job unsaved.' });
    }
    next(err);
  }
};

// GET /api/jobs/my/applications (student)
exports.getMyApplications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ap.*, j.title, j.company, j.location FROM applications ap
       JOIN jobs j ON j.id = ap.item_id AND ap.item_type = 'job'
       WHERE ap.applicant_id = ? ORDER BY ap.applied_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/jobs/my/saved (student)
exports.getMySavedJobs = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.* FROM saved_items si JOIN jobs j ON j.id = si.item_id AND si.item_type = 'job'
       WHERE si.user_id = ? ORDER BY si.saved_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
