const pool = require('../config/db');

// POST /api/public/contact
exports.submitContact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }
    await pool.query('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject || null, message]);
    res.status(201).json({ success: true, message: 'Thank you for reaching out! We will get back to you soon.' });
  } catch (err) { next(err); }
};

// GET /api/public/testimonials
exports.getTestimonials = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/public/stats
exports.getStats = async (req, res, next) => {
  try {
    const [[{ students }]] = await pool.query('SELECT COUNT(*) as students FROM users WHERE role = "student"');
    const [[{ alumni }]] = await pool.query('SELECT COUNT(*) as alumni FROM users WHERE role = "alumni"');
    const [[{ jobs }]] = await pool.query('SELECT COUNT(*) as jobs FROM jobs');
    const [[{ events }]] = await pool.query('SELECT COUNT(*) as events FROM events');
    res.json({ success: true, data: { students, alumni, jobs, events } });
  } catch (err) { next(err); }
};
