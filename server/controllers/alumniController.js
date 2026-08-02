const pool = require('../config/db');

// GET /api/alumni - directory with search + filters + pagination
exports.getAlumniDirectory = async (req, res, next) => {
  try {
    const {
      search = '', university = '', company = '', skills = '',
      graduation_year = '', industry = '', page = 1, limit = 9
    } = req.query;

    const conditions = ['u.role = "alumni"', 'u.is_active = 1'];
    const params = [];

    if (search) {
      conditions.push('(u.full_name LIKE ? OR a.current_company LIKE ? OR a.designation LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (university) {
      conditions.push('a.university LIKE ?');
      params.push(`%${university}%`);
    }
    if (company) {
      conditions.push('a.current_company LIKE ?');
      params.push(`%${company}%`);
    }
    if (skills) {
      conditions.push('u.skills LIKE ?');
      params.push(`%${skills}%`);
    }
    if (graduation_year) {
      conditions.push('a.graduation_year = ?');
      params.push(graduation_year);
    }
    if (industry) {
      conditions.push('a.industry LIKE ?');
      params.push(`%${industry}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 9, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users u JOIN alumni a ON a.user_id = u.id ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.profile_picture, u.bio, u.location, u.skills,
              u.linkedin_url, a.university, a.graduation_year, a.degree, a.current_company,
              a.designation, a.industry, a.years_experience, a.is_mentor_available
       FROM users u JOIN alumni a ON a.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/alumni/:id
exports.getAlumniProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.profile_picture, u.bio, u.location, u.skills,
              u.linkedin_url, u.github_url, a.university, a.graduation_year, a.degree,
              a.current_company, a.designation, a.industry, a.years_experience,
              a.is_mentor_available, a.achievements
       FROM users u JOIN alumni a ON a.user_id = u.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Alumni not found.' });

    const [experience] = await pool.query('SELECT * FROM experience WHERE user_id = ? ORDER BY start_date DESC', [req.params.id]);

    res.json({ success: true, data: { ...rows[0], experience } });
  } catch (err) {
    next(err);
  }
};

// GET /api/alumni/filters/options - distinct values for filter dropdowns
exports.getFilterOptions = async (req, res, next) => {
  try {
    const [universities] = await pool.query('SELECT DISTINCT university FROM alumni WHERE university IS NOT NULL AND university <> ""');
    const [companies] = await pool.query('SELECT DISTINCT current_company FROM alumni WHERE current_company IS NOT NULL AND current_company <> ""');
    const [industries] = await pool.query('SELECT DISTINCT industry FROM alumni WHERE industry IS NOT NULL AND industry <> ""');
    const [years] = await pool.query('SELECT DISTINCT graduation_year FROM alumni WHERE graduation_year IS NOT NULL ORDER BY graduation_year DESC');

    res.json({
      success: true,
      data: {
        universities: universities.map(r => r.university),
        companies: companies.map(r => r.current_company),
        industries: industries.map(r => r.industry),
        years: years.map(r => r.graduation_year)
      }
    });
  } catch (err) {
    next(err);
  }
};
