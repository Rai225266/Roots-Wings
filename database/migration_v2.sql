-- =========================================================
-- Roots & Wings — Migration: Alumni Feed, mentorship sessions,
-- and an extended application pipeline.
-- Run this ONLY if your database already existed before this
-- update. Fresh installs get all of this from roots_wings.sql
-- already, no need to run this file too.
--
--   mysql -u root -p roots_wings < database/migration_v2.sql
-- =========================================================
USE roots_wings;

ALTER TABLE applications
  MODIFY COLUMN status ENUM('applied','under_review','shortlisted','interview','rejected','selected') DEFAULT 'applied';

CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentorship_id INT NOT NULL,
  session_date DATETIME NOT NULL,
  session_link VARCHAR(255),
  topic VARCHAR(200),
  notes TEXT,
  status ENUM('scheduled','completed','cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentorship_id) REFERENCES mentorship(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_like (post_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
