const multer = require('multer');
const path = require('path');
const fs = require('fs');

const profileDir = path.join(__dirname, '..', 'uploads', 'profiles');
const resumeDir = path.join(__dirname, '..', 'uploads', 'resumes');
[profileDir, resumeDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeStorage(destDir, prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}-${req.user?.id || 'anon'}-${uniqueSuffix}${ext}`);
    }
  });
}

const imageFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'));
};

const resumeFileFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ext) return cb(null, true);
  cb(new Error('Only PDF/DOC/DOCX files are allowed for resumes'));
};

const uploadProfilePicture = multer({
  storage: makeStorage(profileDir, 'profile'),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

const uploadResume = multer({
  storage: makeStorage(resumeDir, 'resume'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: resumeFileFilter
});

module.exports = { uploadProfilePicture, uploadResume };
