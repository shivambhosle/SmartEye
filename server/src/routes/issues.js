import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { upload } from '../middleware/upload.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Issue } from '../models/Issue.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { analyzeIssueImage } from '../services/aiVision.js';
import { sendStatusUpdateEmail, sendIssueRegisteredEmail } from '../services/notificationService.js';
import { normalizeCategory, getDepartmentForCategory } from '../config/departments.js';
import { reportLimiter } from '../middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const router = Router();

// GET /api/issues/check-duplicates — Check if an identical issue exists nearby (< 60 meters)
router.get('/check-duplicates', requireAuth, async (req, res) => {
  try {
    const { lat, lng, category } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng query parameters are required.' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const canonicalCategory = category ? normalizeCategory(category) : null;

    // Search bounding box: approx ±0.0006 degrees (~66 meters)
    const latDelta = 0.0006;
    const lngDelta = 0.0006 / Math.cos((latitude * Math.PI) / 180);

    const query = {
      status: { $in: ['open', 'in-progress'] },
      'location.lat': { $gte: latitude - latDelta, $lte: latitude + latDelta },
      'location.lng': { $gte: longitude - lngDelta, $lte: longitude + lngDelta },
    };

    if (canonicalCategory) {
      query.category = canonicalCategory;
    }

    const nearbyIssues = await Issue.find(query)
      .select('_id category photoUrl userNote location status supportCount createdAt upvoters')
      .lean();

    // Compute exact distance and filter to within 60 meters
    const duplicates = nearbyIssues
      .map((item) => {
        const distance = getDistanceMeters(latitude, longitude, item.location.lat, item.location.lng);
        return {
          ...item,
          distanceMeters: distance,
          isUserUpvoted: req.user ? (item.upvoters || []).some((u) => u.toString() === req.user.id) : false,
        };
      })
      .filter((item) => item.distanceMeters <= 60)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({ hasDuplicates: duplicates.length > 0, duplicates });
  } catch (err) {
    console.error('[issues/check-duplicates]', err);
    res.status(500).json({ message: 'Error checking duplicate issues.', error: err.message });
  }
});

// POST /api/issues/:id/upvote — Support an existing nearby issue instead of creating a duplicate
router.post('/:id/upvote', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const userId = req.user.id;
    const alreadyUpvoted = (issue.upvoters || []).some((u) => u.toString() === userId);
    if (alreadyUpvoted) {
      return res.status(400).json({ message: 'You have already supported this issue.' });
    }

    // Add to upvoters & subscribers
    issue.upvoters = issue.upvoters || [];
    issue.subscribers = issue.subscribers || [];
    issue.upvoters.push(userId);
    if (!issue.subscribers.some((s) => s.toString() === userId)) {
      issue.subscribers.push(userId);
    }
    issue.supportCount = (issue.supportCount || 1) + 1;
    issue.priorityScore = (issue.priorityScore || 0) + 5; // Upvoted issues get escalated priority
    await issue.save();

    // Create confirmation in-app notification
    const readableCategory = (issue.category || 'civic issue').replace(/_/g, ' ');
    await Notification.create({
      recipient: userId,
      issueId: issue._id,
      title: 'Issue Supported',
      message: `You supported an existing ${readableCategory} report. You will receive updates as the city crew resolves it.`,
      status: issue.status,
    });

    res.json({
      message: 'Support added successfully!',
      supportCount: issue.supportCount,
      issue,
    });
  } catch (err) {
    console.error('[issues/upvote]', err);
    res.status(500).json({ message: 'Error supporting issue.', error: err.message });
  }
});

// POST /api/issues — a citizen submits a new report.
router.post('/', requireAuth, reportLimiter, upload.single('image'), async (req, res) => {
  try {
    const { category, priority, lat, lng, userNote, duplicateOf, captureMode } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'An image is required.' });
    }
    if (!category || !lat || !lng) {
      return res.status(400).json({ message: 'category, lat, and lng are required.' });
    }

    const canonicalCategory = normalizeCategory(category);
    const departmentInfo = getDepartmentForCategory(canonicalCategory);
    const mode = captureMode === 'live' ? 'live' : 'gallery';

    // Save image to disk with unique UUID filename
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    const photoUrl = `/uploads/${filename}`;

    // Run AI Vision Engine
    let aiAnalysis;
    try {
      const base64Image = req.file.buffer.toString('base64');
      aiAnalysis = await analyzeIssueImage(base64Image, req.file.mimetype);
    } catch (err) {
      console.warn('[issues/create] AI analysis failed, saving without it:', err.message);
    }

    const issue = await Issue.create({
      photoUrl,
      category: canonicalCategory,
      priority: priority || 'medium',
      captureMode: mode,
      userNote: userNote || '',
      reportedBy: req.user.id,
      subscribers: [req.user.id],
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: req.body.address ? String(req.body.address).trim() : '',
      },
      department: departmentInfo.name,
      duplicateOf: duplicateOf || null,
      aiAnalysis,
    });

    // Create initial in-app notification
    await Notification.create({
      recipient: req.user.id,
      issueId: issue._id,
      title: mode === 'live' ? 'Verified Live Issue Registered' : 'Issue Report Registered',
      message: `Your report for ${canonicalCategory.replace(/_/g, ' ')} has been received and routed to ${departmentInfo.name}.${mode === 'live' ? ' Thank you for on-site live capture verification!' : ''}`,
      status: 'open',
    });

    // Dispatch issue registered confirmation email to citizen
    const reporter = await User.findById(req.user.id).select('name email');
    if (reporter && reporter.email) {
      sendIssueRegisteredEmail({
        toEmail: reporter.email,
        userName: reporter.name,
        issue,
      }).catch((err) => console.error('[issues/register-email-error]', err));
    }

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

// GET /api/issues — ALL issues across ALL citizens (Admin/officer only)
router.get('/', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const issues = await Issue.find({})
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name email');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching issues.', error: err.message });
  }
});

// PUT /api/issues/:id/status — admin/officer updates an issue's status.
router.put('/:id/status', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { status, resolutionPhotoUrl, resolutionNote } = req.body;
    const update = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }
    if (resolutionPhotoUrl) {
      update.resolutionPhotoUrl = resolutionPhotoUrl;
    }
    if (resolutionNote) {
      update.resolutionNote = resolutionNote;
    }

    const issue = await Issue.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('reportedBy', 'name email')
      .populate('subscribers', 'name email');

    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    // Gather unique recipients (original reporter + upvote subscribers)
    const recipientMap = new Map();
    if (issue.reportedBy) {
      recipientMap.set(String(issue.reportedBy._id), {
        id: issue.reportedBy._id,
        name: issue.reportedBy.name,
        email: issue.reportedBy.email,
      });
    }
    if (Array.isArray(issue.subscribers)) {
      issue.subscribers.forEach((sub) => {
        if (sub && sub._id) {
          recipientMap.set(String(sub._id), {
            id: sub._id,
            name: sub.name,
            email: sub.email,
          });
        }
      });
    }

    const readableCategory = (issue.category || 'civic issue').replace(/_/g, ' ');
    const statusTitles = {
      'open': 'Report Reopened',
      'in-progress': 'Work In Progress — Crew Assigned',
      'resolved': 'Issue Resolved & Closed',
    };

    // Dispatch email notifications and create in-app notifications asynchronously
    recipientMap.forEach(async (recipient) => {
      // 1. Send status update email
      sendStatusUpdateEmail({
        toEmail: recipient.email,
        userName: recipient.name,
        issue,
        newStatus: status,
        resolutionPhotoUrl: issue.resolutionPhotoUrl,
        officerNote: resolutionNote,
      }).catch((err) => console.error('[status-email-error]', err));

      // 2. Create In-App Notification
      try {
        await Notification.create({
          recipient: recipient.id,
          issueId: issue._id,
          title: statusTitles[status] || `Status Updated to ${status}`,
          message: `The reported ${readableCategory} status has changed to "${status}".`,
          status,
        });
      } catch (err) {
        console.error('[in-app-notification-error]', err);
      }
    });

    res.json({ message: 'Status updated and notifications dispatched.', issue });
  } catch (err) {
    console.error('[issues/status]', err);
    res.status(500).json({ message: 'Error updating status.', error: err.message });
  }
});

export default router;