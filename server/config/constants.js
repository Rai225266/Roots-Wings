require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_session_secret',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5000'
};
