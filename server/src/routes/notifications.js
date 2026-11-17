import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { sendVerificationOtpEmail } from '../services/notificationService.js';

const router = Router();

// GET /api/notifications/test-email — Verify email configuration by sending a test OTP
router.get('/test-email', async (req, res) => {
  const { to } = req.query;
  const targetEmail = to || process.env.SMTP_USER;

  if (!targetEmail) {
    return res.status(400).json({
      configured: false,
      message: 'Provide an email address via ?to=your_email@domain.com or set SMTP_USER in server/.env',
    });
  }

  try {
    const result = await sendVerificationOtpEmail({
      toEmail: targetEmail,
      userName: 'Test Citizen',
      otp: '777888',
    });

    if (result.sent) {
      return res.json({
        configured: true,
        sent: true,
        method: result.method,
        message: `Test verification email sent successfully to ${targetEmail}! Check your inbox.`,
      });
    }

    if (result.devMode) {
      return res.json({
        configured: false,
        sent: false,
        devMode: true,
        message: 'No live cloud email delivery method configured (GMAIL_WEBHOOK_URL or BREVO_API_KEY).',
      });
    }

    return res.status(500).json({
      configured: true,
      sent: false,
      error: result.error,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications — Retrieve all in-app notifications for logged in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('issueId', 'category photoUrl status');

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications.', error: err.message });
  }
});

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ message: 'Marked as read.', notification: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification.', error: err.message });
  }
});

// PATCH /api/notifications/read-all — Mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications.', error: err.message });
  }
});

export default router;
