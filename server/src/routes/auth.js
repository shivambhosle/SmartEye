import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // 10 salt rounds is a reasonable default: enough cost to resist brute force,
    // fast enough not to noticeably slow down signup.
    const passwordHash = await bcrypt.hash(password, 10);

    // Never trust the client to hand you role: 'admin' — only allow 'citizen' or
    // 'officer' at signup; admins should be promoted manually/by another admin.
    const safeRole = role === 'officer' ? 'officer' : 'citizen';

    const user = await User.create({ name, email, passwordHash, role: safeRole });
    res.status(201).json({ message: 'Account created.', userId: user._id });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ message: 'Server error while registering.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    // Deliberately vague error message for both "no such user" and "wrong password" —
    // being specific here lets attackers enumerate which emails are registered.
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ message: 'Server error while logging in.' });
  }
});

export default router;