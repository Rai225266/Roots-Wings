const pool = require('../config/db');

const VALID_TYPES = ['job', 'internship'];
const VALID_STATUSES = ['applied', 'under_review', 'shortlisted', 'interview', 'rejected', 'selected'];

// GET /api/applications/:itemType/:itemId - list applicants for a posting (poster/admin only)
exports.getApplicantsForItem = async (req, res, next) => {
  try {
    const { itemType, itemId } = req.params;
    if (!VALID_TYPES.includes(itemType)) {
      return res.status(400).json({ success: false, message: 'Invalid item type.' });
    }
    const table = itemType === 'job' ? 'jobs' : 'internships';

    const [itemRows] = await pool.query(`SELECT posted_by, title FROM ${table} WHERE id = ?`, [itemId]);
    if (!itemRows.length) return res.status(404).json({ success: false, message: 'Posting not found.' });
    if (itemRows[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only view applicants for your own postings.' });
    }

    const [applicants] = await pool.query(
      `SELECT ap.id as application_id, ap.status, ap.cover_note, ap.applied_at,
              u.id as user_id, u.full_name, u.email, u.profile_picture, u.skills,
              s.university, s.course, s.graduation_year, s.resume_url
       FROM applications ap
       JOIN users u ON u.id = ap.applicant_id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE ap.item_type = ? AND ap.item_id = ?
       ORDER BY ap.applied_at DESC`,
      [itemType, itemId]
    );

    res.json({ success: true, data: applicants, itemTitle: itemRows[0].title });
  } catch (err) { next(err); }
};

// PUT /api/applications/:id/status - move an applicant through the pipeline (poster/admin only)
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    const application = rows[0];

    const table = application.item_type === 'job' ? 'jobs' : 'internships';
    const [itemRows] = await pool.query(`SELECT posted_by, title FROM ${table} WHERE id = ?`, [application.item_id]);
    if (!itemRows.length) return res.status(404).json({ success: false, message: 'Original posting no longer exists.' });
    if (itemRows[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only update applicants for your own postings.' });
    }

    await pool.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);

    const statusLabels = {
      applied: 'Applied', under_review: 'Under Review', shortlisted: 'Shortlisted',
      interview: 'Interview', rejected: 'Not Selected', selected: 'Selected'
    };
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, "job", ?)',
      [application.applicant_id, 'Application Status Updated',
        `Your application for "${itemRows[0].title}" is now: ${statusLabels[status]}.`,
        application.item_type === 'job' ? '/jobs.html' : '/internships.html']
    );

    res.json({ success: true, message: `Applicant moved to "${statusLabels[status]}".` });
  } catch (err) { next(err); }
};
