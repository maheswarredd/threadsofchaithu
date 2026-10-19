import { Router } from 'express';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import SupportQuery from '../models/SupportQuery.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

// Strictly protect all admin routes
router.use(requireAuth, requireAdmin);

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// 1. Dashboard summary and statistics
router.get('/summary', async (_req, res, next) => {
  try {
    const [
      totalProducts,
      lowStockProducts,
      totalCustomers,
      totalOrders,
      placedOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      openSupportQueries,
      revenueResult
    ] = await Promise.all([
      Product.countDocuments({ active: true }),
      Product.countDocuments({ active: true, stock: { $lte: 5 } }),
      User.countDocuments({ role: 'customer' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'PLACED' }),
      Order.countDocuments({ status: 'CONFIRMED' }),
      Order.countDocuments({ status: 'SHIPPED' }),
      Order.countDocuments({ status: 'DELIVERED' }),
      Order.countDocuments({ status: 'CANCELLED' }),
      SupportQuery.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      products: totalProducts,
      lowStockProducts,
      customers: totalCustomers,
      orders: totalOrders,
      placedOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      openSupportQueries,
      revenue: revenueResult[0]?.total || 0
    });
  } catch (err) {
    next(err);
  }
});

// 2. Orders Management
router.get('/orders', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name images category')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Update order status: Accept, Cancel, Ship, Deliver
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status, cancellationReason, paymentStatus } = req.body;
    const allowed = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status transition.' });
    }

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const oldStatus = order.status;

    // Handle cancellation: restore product inventory
    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          });
        }
      }
      order.cancelledBy = 'admin';
      order.cancellationReason = cancellationReason || 'Cancelled by Store Administrator';
    }

    // Handle payment status auto-updates
    if (status === 'CONFIRMED' && order.paymentMethod === 'ONLINE') {
      order.paymentStatus = 'PAID';
    } else if (status === 'DELIVERED') {
      order.paymentStatus = 'PAID';
      order.deliveredAt = new Date();
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: cancellationReason || `Order status updated to ${status} by administrator.`
    });

    await order.save();

    const shortId = order._id.toString().slice(-7).toUpperCase();

    // Map user-friendly messages for notifications and emails
    let notificationTitle = `Order #${shortId} Status Update`;
    let notificationMsg = `Your order #${shortId} is now ${status.toLowerCase()}.`;
    let emailSubject = `Order #${shortId} update: ${status}`;

    if (status === 'CONFIRMED') {
      notificationTitle = `Order #${shortId} Accepted!`;
      notificationMsg = `Good news! Your order #${shortId} has been accepted and is being carefully packed.`;
      emailSubject = `Your order #${shortId} has been accepted!`;
    } else if (status === 'SHIPPED') {
      notificationTitle = `Order #${shortId} Shipped!`;
      notificationMsg = `Your package is on its way. Estimated delivery in 3-5 business days.`;
      emailSubject = `Your order #${shortId} has been dispatched!`;
    } else if (status === 'DELIVERED') {
      notificationTitle = `Order #${shortId} Delivered!`;
      notificationMsg = `Your order has been delivered! We hope you love your new pieces.`;
      emailSubject = `Your order #${shortId} has been delivered!`;
    } else if (status === 'CANCELLED') {
      notificationTitle = `Order #${shortId} Cancelled`;
      notificationMsg = `Your order #${shortId} has been cancelled. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`;
      emailSubject = `Order #${shortId} has been cancelled`;
    }

    // Customer Notification
    await createNotification({
      recipient: order.customer._id,
      targetRole: 'customer',
      title: notificationTitle,
      message: notificationMsg,
      type: `order_${status.toLowerCase()}`,
      data: { orderId: order._id }
    });

    // Customer Email
    await sendEmail({
      to: order.customer.email,
      subject: emailSubject,
      html: `
        <h2 style="color:#702b43;">${notificationTitle}</h2>
        <p>Dear ${order.shipping?.name || order.customer.name},</p>
        <p>${notificationMsg}</p>
        <div style="background:#faf8f4;padding:16px;border:1px solid #e8e0d7;border-radius:4px;margin:20px 0;">
          <p style="margin:0 0 6px;"><b>Order ID:</b> #${shortId}</p>
          <p style="margin:0 0 6px;"><b>Status:</b> ${status}</p>
          <p style="margin:0 0 6px;"><b>Payment Method:</b> ${order.paymentMethod} (${order.paymentStatus})</p>
          <p style="margin:0;"><b>Total Amount:</b> ₹${order.total}</p>
        </div>
        <p>You can track your order anytime by visiting your Threads of Chaithu account.</p>
      `
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// 3. Products Management
router.get('/products', async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(500);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.name?.trim() || !Number.isFinite(Number(body.price))) {
      return res.status(400).json({ message: 'Product name and valid price are required.' });
    }

    const slug = `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${crypto.randomBytes(3).toString('hex')}`;
    const product = await Product.create({
      ...body,
      slug,
      name: body.name.trim(),
      category: body.category || 'Kurtis',
      price: Number(body.price),
      compareAtPrice: Number(body.compareAtPrice || 0),
      stock: Math.max(0, parseInt(body.stock, 10) || 0),
      sizes: Array.isArray(body.sizes) ? body.sizes : (body.sizes ? String(body.sizes).split(',').map(s => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL']),
      colors: Array.isArray(body.colors) ? body.colors : (body.colors ? String(body.colors).split(',').map(c => c.trim()).filter(Boolean) : []),
      active: body.active !== false
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.compareAtPrice !== undefined) updates.compareAtPrice = Number(updates.compareAtPrice);
    if (updates.stock !== undefined) updates.stock = Math.max(0, parseInt(updates.stock, 10) || 0);
    if (typeof updates.sizes === 'string') {
      updates.sizes = updates.sizes.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof updates.colors === 'string') {
      updates.colors = updates.colors.split(',').map(c => c.trim()).filter(Boolean);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Product removed from catalogue successfully.' });
  } catch (err) {
    next(err);
  }
});

// 4. Cloudinary Upload Signature
router.post('/upload-signature', async (_req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(503).json({ message: 'Cloudinary is not configured.' });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: 'threads-of-chaithu/products' };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  res.json({
    ...params,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY
  });
});

// 5. Customer Support Queries Management
router.get('/support-queries', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }

    const queries = await SupportQuery.find(filter)
      .populate('customer', 'name email phone')
      .populate('order', 'total status createdAt')
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (err) {
    next(err);
  }
});

router.patch('/support-queries/:id', async (req, res, next) => {
  try {
    const { status, adminReply } = req.body;
    const query = await SupportQuery.findById(req.params.id).populate('customer', 'name email');

    if (!query) {
      return res.status(404).json({ message: 'Support query not found.' });
    }

    if (status) query.status = status;
    if (adminReply) {
      query.adminReply = adminReply.trim();
      query.repliedAt = new Date();
      query.repliedBy = req.user._id;
    }

    await query.save();

    const shortId = query._id.toString().slice(-6).toUpperCase();

    // Customer Notification
    await createNotification({
      recipient: query.customer._id,
      targetRole: 'customer',
      title: `Response on Query #${shortId}`,
      message: adminReply ? `Admin replied: "${adminReply.slice(0, 80)}..."` : `Status updated to ${query.status}`,
      type: 'support_replied',
      data: { queryId: query._id }
    });

    // Send customer email
    if (adminReply) {
      await sendEmail({
        to: query.customer.email,
        subject: `Response to your query: ${query.subject}`,
        html: `
          <h2 style="color:#702b43;">Support Update</h2>
          <p>Dear ${query.customer.name},</p>
          <p>Our team has replied to your query regarding <b>${query.queryType} - ${query.subject}</b>:</p>
          <div style="background:#faf8f4;padding:16px;border-left:4px solid #702b43;margin:20px 0;">
            <p style="margin:0;font-style:italic;">"${adminReply}"</p>
          </div>
          <p>Status: <b>${query.status}</b></p>
          <p>Thank you for reaching out to Threads of Chaithu Boutique.</p>
        `
      });
    }

    res.json({ message: 'Support query updated successfully.', query });
  } catch (err) {
    next(err);
  }
});

// 6. Settings status
router.get('/settings', async (_req, res) => {
  res.json({
    emailServiceConfigured: Boolean(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    adminEmail: process.env.ADMIN_EMAIL || 'admin@threadsofchaithu.example',
    upiId: process.env.UPI_ID || 'threadsofchaithu@oksbi',
    upiName: process.env.UPI_PAYEE_NAME || 'Threads of Chaithu Boutique'
  });
});

export default router;
