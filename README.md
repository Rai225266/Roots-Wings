# 🌳 Roots & Wings

**Alumni–Student Networking Platform** — connecting students with alumni for mentorship, internships, placements, career guidance, and events.

Built as a full-stack prototype: **Node.js + Express + MySQL** backend, vanilla **HTML/CSS/JS** frontend (no framework build step — runs directly in the browser).

---

## ✨ Features

- Landing page (hero, about, features, testimonials, contact form)
- Student & Alumni registration, JWT login, forgot/reset password
- Role-aware dashboard with a real **Alumni Feed** (post updates, like, comment), Upcoming Events, and Trending Companies (live data, not placeholders)
- Alumni directory with search + filters (university, company, skills, industry, grad year) + pagination
- Jobs & Internships: post, edit, delete, apply, save, track applications
- **Full hiring pipeline**: applications move through Applied → Under Review → Shortlisted → Interview → Selected/Rejected. Alumni get a "View Applicants" screen per posting with resume links and a one-click Message button; students see their status as a visual progress stepper — no more dead ends after applying.
- Mentorship: request → accept/reject → **ongoing session log** (schedule repeat calls/doubt sessions, view history) + direct messaging with your mentor/mentee — not just a single one-off meeting.
- Direct messaging (inbox + chat, works even for brand-new conversations)
- Events: create, join/leave, list view + calendar view
- Profile: picture upload, resume upload, experience timeline, skills, password change
- Admin panel: analytics charts, manage users/jobs/events, contact messages
- Dark/light mode, responsive design, real project logo throughout

---

## 🗂️ Project Structure

```
Roots-Wings/
├── public/            → Frontend (HTML, CSS, JS)
├── server/             → Express backend (routes, controllers, middleware, models)
├── database/           → MySQL schema + migration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- MySQL 8+ (or MariaDB)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your MySQL credentials:
```bash
cp .env.example .env
```

### 4. Create the database

**Fresh install:**
```bash
mysql -u root -p < database/roots_wings.sql
```

**Already had this project set up before this update?** Don't re-run the file above — it'll fail on tables that already exist. Instead just run the small migration, which adds the Alumni Feed tables, mentorship sessions, and the extended application pipeline:
```bash
mysql -u root -p roots_wings < database/migration_v2.sql
```

### 5. Seed demo accounts (1 Admin, 1 Alumni, 1 Student)
```bash
npm run seed
```
This creates:

| Role    | Email                     | Password     |
|---------|---------------------------|--------------|
| Admin   | admin@rootswings.com      | Admin@123    |
| Alumni  | alumni@rootswings.com     | Alumni@123   |
| Student | student@rootswings.com    | Student@123  |

It also seeds one sample job, internship, and event so the dashboards aren't empty on first login.

### 6. Run the server
```bash
npm run dev     # with nodemon (auto-restart)
# or
npm start
```

Visit **http://localhost:5000** — the landing page, and all pages under `/login.html`, `/register.html`, `/dashboard.html`, etc.

---

## 🎨 Branding
The logo lives at `public/images/logo-mark.png` (icon only, used in the navbar/sidebar) and `public/images/logo-full.png` (full lockup with wordmark + tagline, background made transparent — no design elements were altered from the original artwork). The color palette in `public/css/style.css` is sampled directly from the logo's green.

## 🔐 Security Notes
- Passwords hashed with bcrypt (10 salt rounds)
- JWT-based API authentication + role-based route guards (`student`, `alumni`, `admin`)
- Parameterized SQL queries throughout (no string-concatenated queries) to prevent SQL injection
- File uploads restricted by type/size via Multer filters
- Session cookie is `httpOnly`

## 📌 Notes for the funding demo / resume
- The "Forgot Password" flow returns the reset link directly in the API response instead of emailing it (no SMTP configured for this prototype) — wire up a provider like Nodemailer/SendGrid for production.
- Swap `JWT_SECRET` / `SESSION_SECRET` in `.env` before deploying anywhere public.
- `server/uploads/` stores profile pictures & resumes locally; move to S3/Cloud storage for production scale.

---

Built with 🌱 for students and alumni everywhere.
