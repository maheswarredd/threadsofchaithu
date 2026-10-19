import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.tc_session;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      res.clearCookie('tc_session', { path: '/' });
      return res.status(401).json({ message: 'Account no longer exists. Please sign in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('tc_session', { path: '/' });
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication session. Please sign in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Administrator privileges required.' });
  }
  next();
}

export async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.tc_session;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.sub).select('-passwordHash');
    }
  } catch {
    // Continue unauthenticated
  }
  next();
}
