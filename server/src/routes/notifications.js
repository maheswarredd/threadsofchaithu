import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get user notifications (customer or admin)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? { $or: [{ recipient: req.user._id }, { targetRole: 'admin' }, { targetRole: 'all' }] }
      : { $or: [{ recipient: req.user._id }, { targetRole: 'all' }] };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ ...filter, read: false });

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
});

// Mark single notification as read
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.read = true;
    await notification.save();
    res.json({ message: 'Marked as read.', notification });
  } catch (err) {
    next(err);
  }
});

// Mark all as read
router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? { $or: [{ recipient: req.user._id }, { targetRole: 'admin' }, { targetRole: 'all' }] }
      : { $or: [{ recipient: req.user._id }, { targetRole: 'all' }] };

    await Notification.updateMany({ ...filter, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
