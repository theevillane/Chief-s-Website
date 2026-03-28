'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOAD_PATH   = process.env.UPLOAD_PATH    || './uploads';
const MAX_MB        = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;
const MAX_BYTES     = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf')
  .split(',').map(t => t.trim());

// Ensure upload directories exist
['evidence', 'profiles'].forEach((sub) => {
  const dir = path.join(UPLOAD_PATH, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Storage engines ──────────────────────────────────────────────────────────
const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(UPLOAD_PATH, subfolder));
    },
    filename: (req, file, cb) => {
      const rand = crypto.randomBytes(12).toString('hex');
      const ext  = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${rand}${ext}`);
    },
  });

// ─── File type filter ─────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `File type '${file.mimetype}' is not allowed. Accepted types: ${ALLOWED_TYPES.join(', ')}`
    );
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

// ─── Upload instances ─────────────────────────────────────────────────────────

/** For evidence files on disputes, security & illicit reports — up to 5 files */
const evidenceUpload = multer({
  storage:  makeStorage('evidence'),
  limits:   { fileSize: MAX_BYTES, files: 5 },
  fileFilter,
});

/** For profile photos — single file */
const profileUpload = multer({
  storage:  makeStorage('profiles'),
  limits:   { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB for photos
  fileFilter: (req, file, cb) => {
    const imgTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (imgTypes.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Profile photo must be JPEG, PNG or WebP.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  },
});

/**
 * Build public URLs for uploaded files.
 * @param {Express.Multer.File[]} files
 * @param {string} subfolder
 * @returns {string[]}
 */
const buildFileUrls = (files, subfolder = 'evidence') => {
  if (!files || files.length === 0) return [];
  return files.map((f) => `/uploads/${subfolder}/${f.filename}`);
};

module.exports = {
  evidenceUpload,
  profileUpload,
  buildFileUrls,
};
