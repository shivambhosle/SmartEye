import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeIssueImage } from '../services/aiVision.js';
import { classifyWithLocalModel } from '../services/localVision.js';

const router = Router();

// Protected by requireAuth: each call costs real money against your Anthropic
// billing, so this shouldn't be a public unauthenticated endpoint even for testing.
router.post('/analyze', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded. Send it as form-data under the key "image".' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const analysis = await analyzeIssueImage(base64Image, req.file.mimetype);

    res.json({ analysis });
  } catch (err) {
    console.error('[vision/analyze]', err);
    res.status(500).json({ message: 'AI analysis failed.', error: err.message });
  }
});

router.post('/local-analyze', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded.' });
    }

    const result = await classifyWithLocalModel(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json(result);
  } catch (err) {
    console.error('[vision/local-analyze]', err);
    // Non-fatal by design — the frontend treats a failed local-model call as
    // "no suggestion available," not a blocking error, since the citizen can
    // always just pick a category manually regardless.
    res.status(503).json({ message: 'Local model unavailable.', error: err.message });
  }
});

export default router;