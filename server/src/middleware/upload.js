import multer from 'multer';

// Memory storage: we need the image as a Buffer to base64-encode it for the
// Anthropic API. Saving to disk happens separately in Phase 3 once we also
// need a permanent photoUrl to store on the Issue document.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches the "PNG, JPG up to 10MB" in your UI
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});