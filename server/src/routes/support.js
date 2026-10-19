import { Router } from 'express';
import SupportQuery from '../models/SupportQuery.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { sendEmail } from '../services/email.js';

const router = Router();

// Submit a new support query
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { queryType, subject, message, orderId } = req.body;

    const validTypes = ['Order Delay', 'Cancel Order', 'Product Query', 'Payment Query', 'Other'];
    if (!queryType || !validTypes.includes(queryType)) {
      return res.status(400).json({ message: 'Please select a valid query category.' });
    }

    if (!subject || subject.trim().length < 4) {
      return res.status(400).json({ message: 'Please enter a clear subject (at least 4 characters).' });
    }

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide full details of your request (at least 10 characters).' });
    }

    let verifiedOrder = null;
    if (orderId) {
      verifiedOrder = await Order.findOne({ _id: orderId, customer: req.user._id });
      if (!verifiedOrder) {
        return res.status(400).json({ message: 'Associated order not found or does not belong to your account.' });
      }
    }

    const query = await SupportQuery.create({
      customer: req.user._id,
      order: verifiedOrder ? verifiedOrder._id : undefined,
      queryType,
      subject: subject.trim(),
      message: message.trim(),
      status: 'OPEN'
    });

    const shortId = query._id.toString().slice(-6).toUpperCase();

    // Notify customer
    await createNotification({
      recipient: req.user._id,
      targetRole: 'customer',
      title: `Query Submitted: #${shortId}`,
      message: `Your query regarding "${queryType}" has been received. Our team will review and reply shortly.`,
      type: 'support_created',
      data: { queryId: query._id, orderId: verifiedOrder?._id }
    });

    // Notify admin
    await createNotification({
      targetRole: 'admin',
      title: `New Customer Query: #${shortId}`,
      message: `${req.user.name} submitted a ${queryType} query: "${subject.trim()}".`,
      type: 'support_created',
      data: { queryId: query._id, orderId: verifiedOrder?._id }
    });

    // Email admin
    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Customer Query #${shortId} [${queryType}]`,
        html: `
          <h2 style="color:#702b43;">New Support Query</h2>
          <p><b>From:</b> ${req.user.name} (${req.user.email})</p>
          <p><b>Type:</b> ${queryType}</p>
          ${verifiedOrder ? `<p><b>Related Order:</b> #${verifiedOrder._id.toString().slice(-7).toUpperCase()}</p>` : ''}
          <p><b>Subject:</b> ${subject}</p>
          <div style="background:#faf8f4;padding:12px;border:1px solid #e8e0d7;border-radius:4px;">
            ${message}
          </div>
          <p>Please respond to this ticket in the Admin Dashboard.</p>
        `
      });
    }

    res.status(201).json({
      message: 'Your query has been submitted successfully. Our team will get back to you shortly.',
      query
    });
  } catch (err) {
    next(err);
  }
});

// Get customer's submitted support queries
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const queries = await SupportQuery.find({ customer: req.user._id })
      .populate('order', 'total status createdAt')
      .sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    next(err);
  }
});

// Get single support query details
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const query = await SupportQuery.findById(req.params.id).populate('order', 'total status items createdAt');
    if (!query) {
      return res.status(404).json({ message: 'Support query not found.' });
    }

    if (query.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(query);
  } catch (err) {
    next(err);
  }
});

export default router;
