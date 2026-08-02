-- =========================================================
-- Roots & Wings - Alumni-Student Networking Platform
-- MySQL Database Schema
-- =========================================================

CREATE DATABASE IF NOT EXISTS roots_wings CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE roots_wings;

-- ---------------------------------------------------------
-- USERS (base table for all account types)
-- ---------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','alumni','admin') NOT NULL DEFAULT 'student',
  phone VARCHAR(20),
  profile_picture VARCHAR(255) DEFAULT NULL,
  bio TEXT,
  location VARCHAR(150),
  linkedin_url VARCHAR(255),
  github_url VARCHAR(255),
  skills TEXT COMMENT 'Comma separated skills',
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- STUDENTS (extends users)
-- ---------------------------------------------------------
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  university VARCHAR(150),
  course VARCHAR(150),
  branch VARCHAR(150),
  current_year VARCHAR(20),
  graduation_year YEAR,
  cgpa DECIMAL(3,2),
  resume_url VARCHAR(255),
  interests TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_university (university),
  INDEX idx_grad_year (graduation_year)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- ALUMNI (extends users)
-- ---------------------------------------------------------
CREATE TABLE alumni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  university VARCHAR(150),
  graduation_year YEAR,
  degree VARCHAR(150),
  current_company VARCHAR(150),
  designation VARCHAR(150),
  industry VARCHAR(150),
  years_experience INT DEFAULT 0,
  is_mentor_available TINYINT(1) DEFAULT 1,
  achievements TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_a_university (university),
  INDEX idx_company (current_company),
  INDEX idx_industry (industry),
  INDEX idx_a_grad_year (graduation_year)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- EXPERIENCE (work history entries for profile)
-- ---------------------------------------------------------
CREATE TABLE experience (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  company VARCHAR(150) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current TINYINT(1) DEFAULT 0,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- JOBS
-- ---------------------------------------------------------
CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  posted_by INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(150) NOT NULL,
  location VARCHAR(150),
  job_type ENUM('full-time','part-time','contract','remote') DEFAULT 'full-time',
  experience_required VARCHAR(50),
  salary_range VARCHAR(100),
  description TEXT NOT NULL,
  requirements TEXT,
  skills_required TEXT,
  application_link VARCHAR(255),
  last_date_to_apply DATE,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_job_status (status),
  FULLTEXT idx_job_search (title, company, skills_required)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- INTERNSHIPS
-- ---------------------------------------------------------
CREATE TABLE internships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  posted_by INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(150) NOT NULL,
  location VARCHAR(150),
  duration VARCHAR(50),
  stipend VARCHAR(100),
  mode ENUM('remote','onsite','hybrid') DEFAULT 'remote',
  description TEXT NOT NULL,
  skills_required TEXT,
  last_date_to_apply DATE,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_intern_status (status),
  FULLTEXT idx_intern_search (title, company, skills_required)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- APPLICATIONS (student applies to job/internship)
-- ---------------------------------------------------------
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT NOT NULL,
  item_type ENUM('job','internship') NOT NULL,
  item_id INT NOT NULL,
  cover_note TEXT,
  status ENUM('applied','under_review','shortlisted','interview','rejected','selected') DEFAULT 'applied',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_application (applicant_id, item_type, item_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SAVED JOBS / INTERNSHIPS
-- ---------------------------------------------------------
CREATE TABLE saved_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_type ENUM('job','internship') NOT NULL,
  item_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_saved (user_id, item_type, item_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type ENUM('webinar','meetup','workshop','networking','other') DEFAULT 'other',
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(200),
  is_online TINYINT(1) DEFAULT 1,
  meeting_link VARCHAR(255),
  banner_image VARCHAR(255),
  max_participants INT DEFAULT 0,
  status ENUM('upcoming','completed','cancelled') DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_event_date (event_date)
) ENGINE=InnoDB;

CREATE TABLE event_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_participant (event_id, user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- MENTORSHIP
-- ---------------------------------------------------------
CREATE TABLE mentorship (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  alumni_id INT NOT NULL,
  message TEXT,
  status ENUM('pending','accepted','rejected','completed') DEFAULT 'pending',
  meeting_date DATETIME DEFAULT NULL,
  meeting_link VARCHAR(255) DEFAULT NULL,
  notes TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mentor_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- MENTORSHIP SESSIONS (ongoing calls/doubt sessions logged
-- under an accepted mentorship, instead of a single one-off meeting)
-- ---------------------------------------------------------
CREATE TABLE mentorship_sessions (
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

-- ---------------------------------------------------------
-- MESSAGES
-- ---------------------------------------------------------
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation (sender_id, receiver_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type ENUM('job','internship','event','mentorship','message','system') DEFAULT 'system',
  link VARCHAR(255),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- POSTS (Alumni Feed)
-- ---------------------------------------------------------
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255) COMMENT 'Comma separated tags, e.g. Career Advice,Mentorship',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_like (post_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- CONTACT MESSAGES (Landing page contact form)
-- ---------------------------------------------------------
CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TESTIMONIALS (Landing page)
-- ---------------------------------------------------------
CREATE TABLE testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  role VARCHAR(150),
  photo VARCHAR(255),
  quote TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO testimonials (name, role, photo, quote) VALUES
('Ananya Sharma', 'Student, CS Batch 2026', '/images/testimonial1.jpg', 'Roots & Wings connected me with a mentor who helped me land my first internship at a fintech startup.'),
('Rohan Mehta', 'Software Engineer, Alumni 2019', '/images/testimonial2.jpg', 'Giving back to students through this platform has been one of the most rewarding parts of my career.'),
('Priya Nair', 'Product Manager, Alumni 2020', '/images/testimonial3.jpg', 'The mentorship tools made it effortless to schedule calls and track student progress.');

-- =========================================================
-- End of schema. Use server/seed.js to create demo accounts
-- (1 admin, 1 alumni, 1 student) with properly hashed passwords.
-- =========================================================
