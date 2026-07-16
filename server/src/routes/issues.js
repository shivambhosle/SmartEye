import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { upload } from '../middleware/upload.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Issue } from '../models/Issue.js';
import { analyzeIssueImage } from '../services/aiVision.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const router = Router();

// POST /api/issues — a citizen submits a new report.
// Every logged-in citizen can do this; there's no role restriction here.
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { category, priority, lat, lng, userNote } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'An image is required.' });
    }
    if (!category || !lat || !lng) {
      return res.status(400).json({ message: 'category, lat, and lng are required.' });
    }

    // Save the image to disk under a random filename — never trust the
    // original filename from the client (could contain path traversal like "../../etc").
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    const photoUrl = `/uploads/${filename}`;

    // Run the AI Vision Engine, but don't let a failure here block the
    // citizen's report from being saved — an occasional Gemini 503 or bad
    // image shouldn't mean their pothole report just vanishes.
    let aiAnalysis;
    try {
      const base64Image = req.file.buffer.toString('base64');
      aiAnalysis = await analyzeIssueImage(base64Image, req.file.mimetype);
    } catch (err) {
      console.warn('[issues/create] AI analysis failed, saving without it:', err.message);
    }

    const issue = await Issue.create({
      photoUrl,
      category,
      priority: priority || 'medium',
      userNote: userNote || '',
      reportedBy: req.user.id,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      aiAnalysis,
    });

    res.status(201).json({ message: 'Issue reported successfully.', issue });
  } catch (err) {
    console.error('[issues/create]', err);
    res.status(500).json({ message: 'Error creating issue.', error: err.message });
  }
});

// GET /api/issues/mine — the logged-in citizen's own reports only.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const issues = await Issue.find({ reportedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your issues.', error: err.message });
  }
});

// GET /api/issues — ALL issues across ALL citizens. Admin/officer only —
// this is the government-side view, so it's explicitly role-gated.
router.get('/', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const issues = await Issue.find({})
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name email'); // shows who reported it, without exposing password hashes
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching issues.', error: err.message });
  }
});

// PUT /api/issues/:id/status — admin/officer updates an issue's status.
router.put('/:id/status', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'resolved') update.resolvedAt = new Date();

    const issue = await Issue.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    res.json({ message: 'Status updated.', issue });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status.', error: err.message });
  }
});

export default router;