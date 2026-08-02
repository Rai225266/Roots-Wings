const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const path = require('path');

// PUT /api/profile - update common + role-specific profile fields
exports.updateProfile = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { full_name, phone, bio, location, linkedin_url, github_url, skills } = req.body;

    await conn.beginTransaction();
    await conn.query(
      `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), bio = COALESCE(?, bio),
        location = COALESCE(?, location), linkedin_url = COALESCE(?, linkedin_url),
        github_url = COALESCE(?, github_url), skills = COALESCE(?, skills) WHERE id = ?`,
      [full_name, phone, bio, location, linkedin_url, github_url, skills, req.user.id]
    );

    if (req.user.role === 'student') {
      const { university, course, branch, current_year, graduation_year, cgpa, interests } = req.body;
      await conn.query(
        `UPDATE students SET university = COALESCE(?, university), course = COALESCE(?, course),
          branch = COALESCE(?, branch), current_year = COALESCE(?, current_year),
          graduation_year = COALESCE(?, graduation_year), cgpa = COALESCE(?, cgpa),
          interests = COALESCE(?, interests) WHERE user_id = ?`,
        [university, course, branch, current_year, graduation_year, cgpa, interests, req.user.id]
      );
    } else if (req.user.role === 'alumni') {
      const { university, graduation_year, degree, current_company, designation, industry, years_experience, is_mentor_available, achievements } = req.body;
      await conn.query(
        `UPDATE alumni SET university = COALESCE(?, university), graduation_year = COALESCE(?, graduation_year),
          degree = COALESCE(?, degree), current_company = COALESCE(?, current_company),
          designation = COALESCE(?, designation), industry = COALESCE(?, industry),
          years_experience = COALESCE(?, years_experience),
          is_mentor_available = COALESCE(?, is_mentor_available), achievements = COALESCE(?, achievements)
         WHERE user_id = ?`,
        [university, graduation_year, degree, current_company, designation, industry, years_experience, is_mentor_available, achievements, req.user.id]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// POST /api/profile/picture
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const relativePath = `/uploads/profiles/${req.file.filename}`;
    await pool.query('UPDATE users SET profile_picture = ? WHERE id = ?', [relativePath, req.user.id]);
    res.json({ success: true, message: 'Profile picture updated.', path: relativePath });
  } catch (err) { next(err); }
};

// POST /api/profile/resume (student)
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const relativePath = `/uploads/resumes/${req.file.filename}`;
    await pool.query('UPDATE students SET resume_url = ? WHERE user_id = ?', [relativePath, req.user.id]);
    res.json({ success: true, message: 'Resume uploaded successfully.', path: relativePath });
  } catch (err) { next(err); }
};

// POST /api/profile/experience
exports.addExperience = async (req, res, next) => {
  try {
    const { title, company, start_date, end_date, is_current, description } = req.body;
    if (!title || !company) return res.status(400).json({ success: false, message: 'Title and company are required.' });
    const [result] = await pool.query(
      `INSERT INTO experience (user_id, title, company, start_date, end_date, is_current, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, company, start_date || null, end_date || null, is_current ? 1 : 0, description || null]
    );
    res.status(201).json({ success: true, message: 'Experience added.', id: result.insertId });
  } catch (err) { next(err); }
};

// DELETE /api/profile/experience/:id
exports.deleteExperience = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM experience WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Experience deleted.' });
  } catch (err) { next(err); }
};

// PUT /api/profile/password
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
};
