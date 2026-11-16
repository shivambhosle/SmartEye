import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { getTransporter } from '../services/notificationService.js';

const router = Router();

// GET /api/notifications/test-email — Verify SMTP configuration by sending a test email
router.get('/test-email', async (req, res) => {
  const { to } = req.query;
  const targetEmail = to || process.env.SMTP_USER;

  if (!targetEmail) {
    return res.status(400).json({
      configured: false,
      message: 'Provide an email address via ?to=your_email@domain.com or set SMTP_USER in server/.env',
    });
  }

  const transporter = getTransporter();
  if (!transporter) {
    return res.status(200).json({
      configured: false,
      message: 'SMTP credentials (SMTP_USER / SMTP_PASS) are not set in server/.env. Emails are currently only logged in the server console.',
    });
  }

  try {
    // 1. Verify credentials with SMTP server
    await transporter.verify();

    // 2. Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: '[SmartEye] SMTP Configuration Verified Successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
          <h2 style="color: #38bdf8; text-align: center; margin-top: 0;">SmartEye Email Setup Verified</h2>
          <p style="color: #cbd5e1; font-size: 15px;">Success! Your SMTP mail server configuration is fully operational.</p>
          <div style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; margin: 16px 0;">
            <div style="color: #10b981; font-weight: bold;">Status: CONNECTED & READY</div>
            <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Outgoing User: ${process.env.SMTP_USER}</div>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Real email notifications for registrations, status updates, and logins will now be delivered to inboxes.</p>
        </div>
      `,
    });

    res.json({
      configured: true,
      sent: true,
      message: `Test email sent successfully to ${targetEmail}!`,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error('[test-email-error]', err);
    res.status(500).json({
      configured: true,
      sent: false,
      message: 'Failed to send test email through SMTP server.',
      error: err.message,
      tip: err.message.includes('Username and Password not accepted')
        ? 'For Gmail, make sure to use an App Password (16 letters generated from Google Account > Security > 2-Step Verification > App Passwords), NOT your regular Gmail account password.'
        : undefined,
    });
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
