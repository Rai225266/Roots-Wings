const pool = require('../config/db');

// GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) as totalStudents FROM users WHERE role = "student"');
    const [[{ totalAlumni }]] = await pool.query('SELECT COUNT(*) as totalAlumni FROM users WHERE role = "alumni"');
    const [[{ totalJobs }]] = await pool.query('SELECT COUNT(*) as totalJobs FROM jobs');
    const [[{ totalInternships }]] = await pool.query('SELECT COUNT(*) as totalInternships FROM internships');
    const [[{ totalEvents }]] = await pool.query('SELECT COUNT(*) as totalEvents FROM events');
    const [[{ totalApplications }]] = await pool.query('SELECT COUNT(*) as totalApplications FROM applications');
    const [[{ totalMentorships }]] = await pool.query('SELECT COUNT(*) as totalMentorships FROM mentorship');

    const [signupTrend] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
       FROM users GROUP BY month ORDER BY month DESC LIMIT 6`
    );

    const [industryDistribution] = await pool.query(
      `SELECT industry, COUNT(*) as count FROM alumni WHERE industry IS NOT NULL AND industry <> ""
       GROUP BY industry ORDER BY count DESC LIMIT 8`
    );

    res.json({
      success: true,
      data: {
        totalUsers, totalStudents, totalAlumni, totalJobs, totalInternships,
        totalEvents, totalApplications, totalMentorships,
        signupTrend: signupTrend.reverse(),
        industryDistribution
      }
    });
  } catch (err) { next(err); }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role = '', search = '', page = 1, limit = 10 } = req.query;
    const conditions = [];
    const params = [];
    if (role) { conditions.push('role = ?'); params.push(role); }
    if (search) { conditions.push('(full_name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, phone, profile_picture, is_verified, is_active, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limitNum) } });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/status - activate/deactivate
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) { next(err); }
};

// GET /api/admin/jobs
exports.getAllJobsAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, u.full_name as posted_by_name FROM jobs j JOIN users u ON u.id = j.posted_by ORDER BY j.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/admin/events
exports.getAllEventsAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.full_name as creator_name FROM events e JOIN users u ON u.id = e.created_by ORDER BY e.event_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/admin/contact-messages
exports.getContactMessages = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
