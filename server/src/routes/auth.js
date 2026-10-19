import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
});

function generateToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function issueSession(res, user) {
  const token = generateToken(user);
  res.cookie('tc_session', token, cookieOptions());
  return token;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Single Common Sign In
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email address and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // If customer has unverified email but email service is not configured, auto-verify for smooth operation
   const hasEmailService = Boolean(
  process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL
);
    if (!user.emailVerified && user.role !== 'admin') {
      if (!hasEmailService) {
        user.emailVerified = true;
        await user.save();
      } else {
        return res.status(403).json({ message: 'Please verify your email address to sign in. Check your inbox for the activation link.' });
      }
    }

    const token = issueSession(res, user);
    res.json({
      message: 'Signed in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    next(err);
  }
});

// Customer Sign Up (strictly creates role 'customer', never admin)
router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim();

    if (!name || name.length < 2) {
      return res.status(400).json({ message: 'Please enter your full name.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
    }

    const hasEmailService = Boolean(
  process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL
);
    const passwordHash = await bcrypt.hash(password, 12);

    let rawToken = '';
    let verificationTokenHash = undefined;
    let verificationExpires = undefined;

    if (hasEmailService) {
      rawToken = crypto.randomBytes(32).toString('hex');
      verificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      verificationExpires = new Date(Date.now() + 30 * 60 * 1000);
    }

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: 'customer', // strictly customer
      emailVerified: !hasEmailService, // auto-verified if email service not configured
      verificationTokenHash,
      verificationExpires
    });

    if (hasEmailService && rawToken) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const link = `${clientUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: 'Verify your Threads of Chaithu account',
        html: `
          <h2>Welcome to Threads of Chaithu Boutique, ${escapeHtml(name)}!</h2>
          <p>Thank you for creating an account with us. Please verify your email address by clicking below:</p>
          <p style="margin:24px 0;">
            <a href="${link}" style="background-color:#702b43;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;">Verify Email</a>
          </p>
          <p style="font-size:12px;color:#827a72;">This verification link will expire in 30 minutes.</p>
        `
      });

      return res.status(201).json({
        message: 'Account created! Please check your email to verify your account before logging in.',
        requiresVerification: true
      });
    }

    // Auto-sign in if verification is not required
    const token = issueSession(res, user);
    res.status(201).json({
      message: 'Account created successfully! Welcome to Threads of Chaithu.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    next(err);
  }
});

// Email verification endpoint
router.post('/verify-email', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const token = String(req.body.token || '').trim();

    if (!email || !token) {
      return res.status(400).json({ message: 'Missing verification token or email.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email,
      verificationTokenHash: tokenHash,
      verificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired. Please request a new one.' });
    }

    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now sign in with your credentials.' });
  } catch (err) {
    next(err);
  }
});

// Check current session
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      role: req.user.role,
      emailVerified: req.user.emailVerified
    }
  });
});

// Update customer profile
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name) req.user.name = String(name).trim();
    if (phone !== undefined) req.user.phone = String(phone).trim();
    await req.user.save();
    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        role: req.user.role,
        emailVerified: req.user.emailVerified
      }
    });
  } catch (err) {
    next(err);
  }
});

// Sign Out
router.post('/logout', (_req, res) => {
  res.clearCookie('tc_session', cookieOptions());
  res.json({ message: 'Signed out successfully.' });
});

export default router;
