const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto')

// where files are stored: absolute path
const { uploadsDir } = require('../config/config.js');

// Check if folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, buffer) => {
      if (err) return cb(err);
      const uniqueName = buffer.toString('hex') + path.extname(file.originalname);
      cb(null, uniqueName);
    });
  }
});

const upload = multer({ 
  storage,
  limits: 15 * 1024 * 1024 //15 mb
});

module.exports = upload;
