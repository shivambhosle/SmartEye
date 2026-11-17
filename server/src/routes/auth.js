import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { isDisposableEmail, generateOtp, verifyTurnstileToken } from '../utils/security.js';
import { sendVerificationOtpEmail, sendLoginAlertEmail } from '../services/notificationService.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply auth rate limiting to all auth endpoints
router.use(authLimiter);

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, cfTurnstileToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required.' });
    }

    // 1. Anti-Bot: Cloudflare Turnstile Verification
    if (cfTurnstileToken) {
      const turnstileRes = await verifyTurnstileToken(cfTurnstileToken, req.ip);
      if (!turnstileRes.success) {
        return res.status(400).json({ message: 'Human verification failed. Please try again.' });
      }
    }

    // 2. Anti-Bot / Fake Account: Disposable email check
    if (isDisposableEmail(email)) {
      return res.status(400).json({
        message: 'Temporary or disposable email addresses are not permitted. Please use a valid email.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const safeRole = role === 'officer' ? 'officer' : 'citizen';

    // 3. Generate 6-digit verification OTP (valid for 15 minutes)
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: safeRole,
      isVerified: false,
      verificationOtp: otp,
      otpExpiresAt,
    });

    // 4. Send verification email asynchronously
    sendVerificationOtpEmail({ toEmail: normalizedEmail, userName: name, otp }).catch((err) =>
      console.warn('[auth/register] OTP email error:', err.message)
    );

    res.status(201).json({
      message: 'Account created. Please verify your email with the 6-digit code.',
      userId: user._id,
      email: user.email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ message: 'Server error while registering.' });
  }
});

// POST /api/auth/verify-otp — Verifies the 6-digit code sent to the citizen
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit verification code are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isVerified) {
      // Already verified, generate token and proceed
      const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET || 'smarteye-secret-key',
        { expiresIn: '7d' }
      );
      return res.json({
        message: 'Account is already verified.',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points },
      });
    }

    if (!user.verificationOtp || user.verificationOtp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.verificationOtp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'smarteye-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email successfully verified!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points },
    });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ message: 'Server error while verifying code.' });
  }
});

// POST /api/auth/resend-otp — Resends fresh OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified.' });

    const otp = generateOtp();
    user.verificationOtp = otp;
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationOtpEmail({ toEmail: user.email, userName: user.name, otp });

    res.json({ message: 'New verification code has been dispatched to your email.' });
  } catch (err) {
    console.error('[auth/resend-otp]', err);
    res.status(500).json({ message: 'Server error while resending verification code.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, cfTurnstileToken } = req.body;

    if (cfTurnstileToken) {
      const turnstileRes = await verifyTurnstileToken(cfTurnstileToken, req.ip);
      if (!turnstileRes.success) {
        return res.status(400).json({ message: 'Human verification failed. Please try again.' });
      }
    }

    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Require email verification before logging in
    if (user.isVerified === false) {
      // Auto-dispatch a fresh OTP if expired or missing
      if (!user.verificationOtp || (user.otpExpiresAt && new Date() > user.otpExpiresAt)) {
        const otp = generateOtp();
        user.verificationOtp = otp;
        user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        sendVerificationOtpEmail({ toEmail: user.email, userName: user.name, otp }).catch((err) =>
          console.warn('[auth/login] Resend OTP error:', err.message)
        );
      }
      return res.status(403).json({
        message: 'Please verify your email address before logging in. A verification code has been dispatched to your email.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'smarteye-secret-key',
      { expiresIn: '7d' }
    );

    // Send security login alert email asynchronously
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    sendLoginAlertEmail({
      toEmail: user.email,
      userName: user.name,
      time: new Date(),
      ip: clientIp,
      userAgent,
    }).catch((err) => console.error('[auth/login-email-error]', err));

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        isVerified: user.isVerified ?? true,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ message: 'Server error while logging in.' });
  }
});

export default router;