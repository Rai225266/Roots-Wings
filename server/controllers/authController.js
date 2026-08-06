console.log("AUTH CONTROLLER VERSION: 2026-08-06");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const UserModel = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, full_name: user.full_name }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function sanitizeUser(user) {
  const { password, reset_token, reset_token_expires, ...safe } = user;
  return safe;
}

// -------------------- REGISTER STUDENT --------------------
exports.registerStudent = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { full_name, email, password, phone, university, course, branch, current_year, graduation_year } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.beginTransaction();
  const [userResult] = await conn.query(
  'INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
  [
    full_name,
    email,
    hashedPassword,
    'student',
    phone || null
  ]
);
    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO students (user_id, university, course, branch, current_year, graduation_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, university || null, course || null, branch || null, current_year || null, graduation_year || null]
    );
    await conn.commit();

    const user = await UserModel.findById(userId);
    const token = signToken({ id: userId, role: 'student', email, full_name });

    res.status(201).json({ success: true, message: 'Student registered successfully.', token, user });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// -------------------- REGISTER ALUMNI --------------------
exports.registerAlumni = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      full_name, email, password, phone, university, graduation_year, degree,
      current_company, designation, industry, years_experience
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.beginTransaction();
const [userResult] = await conn.query(
  'INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
  [
    full_name,
    email,
    hashedPassword,
    'alumni',
    phone || null
  ]
);
    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO alumni (user_id, university, graduation_year, degree, current_company, designation, industry, years_experience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, university || null, graduation_year || null, degree || null, current_company || null,
        designation || null, industry || null, years_experience || 0]
    );
    await conn.commit();

    const token = signToken({ id: userId, role: 'alumni', email, full_name });
    const user = await UserModel.findById(userId);

    res.status(201).json({ success: true, message: 'Alumni registered successfully.', token, user });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// -------------------- LOGIN --------------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    req.session.userId = user.id;

    res.json({ success: true, message: 'Login successful.', token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// -------------------- FORGOT PASSWORD --------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    const user = await UserModel.findByEmail(email);

    // Always respond success to avoid leaking which emails are registered
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await UserModel.setResetToken(email, token, expires);

    // In production this would be emailed. For the prototype we return it directly.
    res.json({
      success: true,
      message: 'Password reset link generated.',
      resetToken: token,
      resetUrl: `/reset-password.html?token=${token}`
    });
  } catch (err) {
    next(err);
  }
};

// -------------------- RESET PASSWORD --------------------
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const user = await UserModel.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await UserModel.updatePassword(user.id, hashed);
    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// -------------------- GET CURRENT USER --------------------
exports.getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let extra = {};
    if (user.role === 'student') {
      const [rows] = await pool.query('SELECT * FROM students WHERE user_id = ?', [user.id]);
      extra = rows[0] || {};
    } else if (user.role === 'alumni') {
      const [rows] = await pool.query('SELECT * FROM alumni WHERE user_id = ?', [user.id]);
      extra = rows[0] || {};
    }
    const [experience] = await pool.query('SELECT * FROM experience WHERE user_id = ? ORDER BY start_date DESC', [user.id]);

    res.json({ success: true, user: { ...user, ...extra, experience } });
  } catch (err) {
    next(err);
  }
};

// -------------------- LOGOUT --------------------
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });
};
