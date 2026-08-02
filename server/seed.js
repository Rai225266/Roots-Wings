/**
 * Seed script for Roots & Wings.
 * Creates 3 demo login accounts (admin, alumni, student) plus sample
 * jobs, internships, and an event so the prototype has data to demo.
 *
 * Run after importing database/roots_wings.sql:
 *   npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('🌱 Seeding Roots & Wings demo data...');

    const adminPass = await bcrypt.hash('Admin@123', 10);
    const alumniPass = await bcrypt.hash('Alumni@123', 10);
    const studentPass = await bcrypt.hash('Student@123', 10);

    // ---------- ADMIN ----------
    const [existingAdmin] = await conn.query('SELECT id FROM users WHERE email = ?', ['admin@rootswings.com']);
    let adminId;
    if (!existingAdmin.length) {
      const [r] = await conn.query(
        'INSERT INTO users (full_name, email, password, role, is_verified) VALUES (?, ?, ?, "admin", 1)',
        ['Platform Admin', 'admin@rootswings.com', adminPass]
      );
      adminId = r.insertId;
      console.log('  ✔ Admin account created: admin@rootswings.com / Admin@123');
    } else {
      adminId = existingAdmin[0].id;
      console.log('  • Admin account already exists, skipping.');
    }

    // ---------- ALUMNI ----------
    const [existingAlumni] = await conn.query('SELECT id FROM users WHERE email = ?', ['alumni@rootswings.com']);
    let alumniId;
    if (!existingAlumni.length) {
      const [r] = await conn.query(
        'INSERT INTO users (full_name, email, password, role, phone, bio, location, skills, is_verified) VALUES (?, ?, ?, "alumni", ?, ?, ?, ?, 1)',
        ['Rohan Mehta', 'alumni@rootswings.com', alumniPass, '9876543210',
          'Software Engineer passionate about mentoring the next generation of developers.',
          'Bengaluru, India', 'JavaScript,Node.js,React,System Design']
      );
      alumniId = r.insertId;
      await conn.query(
        `INSERT INTO alumni (user_id, university, graduation_year, degree, current_company, designation, industry, years_experience, is_mentor_available, achievements)
         VALUES (?, 'National Institute of Technology', 2019, 'B.Tech Computer Science', 'TechNova Inc.', 'Senior Software Engineer', 'Information Technology', 6, 1, 'Led a team of 8 engineers; Speaker at ReactConf 2024')`,
        [alumniId]
      );
      console.log('  ✔ Alumni account created: alumni@rootswings.com / Alumni@123');
    } else {
      alumniId = existingAlumni[0].id;
      console.log('  • Alumni account already exists, skipping.');
    }

    // ---------- STUDENT ----------
    const [existingStudent] = await conn.query('SELECT id FROM users WHERE email = ?', ['student@rootswings.com']);
    let studentId;
    if (!existingStudent.length) {
      const [r] = await conn.query(
        'INSERT INTO users (full_name, email, password, role, phone, bio, location, skills, is_verified) VALUES (?, ?, ?, "student", ?, ?, ?, ?, 1)',
        ['Ananya Sharma', 'student@rootswings.com', studentPass, '9123456780',
          'Final year CS student passionate about full-stack development and AI.',
          'Pune, India', 'Python,React,MySQL,Machine Learning']
      );
      studentId = r.insertId;
      await conn.query(
        `INSERT INTO students (user_id, university, course, branch, current_year, graduation_year, cgpa, interests)
         VALUES (?, 'National Institute of Technology', 'B.Tech', 'Computer Science', 'Final Year', 2026, 8.7, 'Web Development, AI/ML, Open Source')`,
        [studentId]
      );
      console.log('  ✔ Student account created: student@rootswings.com / Student@123');
    } else {
      studentId = existingStudent[0].id;
      console.log('  • Student account already exists, skipping.');
    }

    // ---------- SAMPLE JOB / INTERNSHIP / EVENT (only if none exist) ----------
    const [jobCount] = await conn.query('SELECT COUNT(*) as c FROM jobs');
    if (jobCount[0].c === 0) {
      await conn.query(
        `INSERT INTO jobs (posted_by, title, company, location, job_type, experience_required, salary_range, description, requirements, skills_required, last_date_to_apply)
         VALUES (?, 'Frontend Developer', 'TechNova Inc.', 'Bengaluru, India', 'full-time', '0-2 years', '₹6-10 LPA',
           'We are looking for a passionate frontend developer to join our growing product team and build delightful user experiences.',
           'Strong fundamentals in JavaScript and React. Good problem-solving skills.',
           'JavaScript,React,CSS,HTML', DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
        [alumniId]
      );
      console.log('  ✔ Sample job posted.');
    }

    const [internCount] = await conn.query('SELECT COUNT(*) as c FROM internships');
    if (internCount[0].c === 0) {
      await conn.query(
        `INSERT INTO internships (posted_by, title, company, location, duration, stipend, mode, description, skills_required, last_date_to_apply)
         VALUES (?, 'Backend Engineering Intern', 'TechNova Inc.', 'Remote', '3 months', '₹15,000/month', 'remote',
           'Work alongside our backend team building scalable REST APIs using Node.js and MySQL.',
           'Node.js,Express,MySQL,Git', DATE_ADD(CURDATE(), INTERVAL 21 DAY))`,
        [alumniId]
      );
      console.log('  ✔ Sample internship posted.');
    }

    const [eventCount] = await conn.query('SELECT COUNT(*) as c FROM events');
    if (eventCount[0].c === 0) {
      await conn.query(
        `INSERT INTO events (created_by, title, description, event_type, event_date, event_time, location, is_online, meeting_link, max_participants)
         VALUES (?, 'Career Paths in Tech: Alumni Panel', 'Join alumni from top tech companies as they share their journeys and answer your career questions.',
           'webinar', DATE_ADD(CURDATE(), INTERVAL 10 DAY), '18:00:00', 'Online', 1, 'https://meet.example.com/roots-wings-panel', 200)`,
        [alumniId]
      );
      console.log('  ✔ Sample event created.');
    }

    console.log('\n✅ Seeding complete! Demo credentials:');
    console.log('   Admin:   admin@rootswings.com   / Admin@123');
    console.log('   Alumni:  alumni@rootswings.com  / Alumni@123');
    console.log('   Student: student@rootswings.com / Student@123');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
