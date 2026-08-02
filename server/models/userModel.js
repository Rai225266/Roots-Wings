const pool = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, phone, profile_picture, bio, location,
              linkedin_url, github_url, skills, is_verified, is_active, created_at
       FROM users WHERE id = ?`, [id]);
    return rows[0];
  },

  async create({ full_name, email, password, role, phone }) {
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, password, role, phone || null]
    );
    return result.insertId;
  },

  async updateProfile(id, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
  },

  async setResetToken(email, token, expires) {
    await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', [token, expires, email]);
  },

  async findByResetToken(token) {
    const [rows] = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
    return rows[0];
  },

  async updatePassword(id, hashedPassword) {
    await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, id]);
  },

  async countByRole(role) {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    return rows[0].count;
  }
};

module.exports = UserModel;
