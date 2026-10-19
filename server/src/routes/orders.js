import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

// Place Order
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items, shipping, paymentMethod = 'COD', paymentReference = '', paymentCustomerName = '' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your shopping cart is empty.' });
    }

    // Validate delivery details
    if (
      !shipping ||
      !shipping.name?.trim() ||
      !shipping.phone?.trim() ||
      !shipping.houseAddress?.trim() ||
      !shipping.city?.trim() ||
      !shipping.district?.trim() ||
      !shipping.state?.trim() ||
      !shipping.pincode?.trim()
    ) {
      return res.status(400).json({
        message: 'Please complete all required delivery details: name, phone, house/street address, village/city, district, state, and 6-digit pincode.'
      });
    }

    // Validate phone number (must be at least 10 digits)
    const phoneDigits = shipping.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit mobile phone number.' });
    }

    // Validate pincode (must be 6 digits)
    const pincodeDigits = shipping.pincode.replace(/\D/g, '');
    if (pincodeDigits.length !== 6) {
      return res.status(400).json({ message: 'Please provide a valid 6-digit PIN code.' });
    }

    // Validate payment method and UPI fields
    const validMethods = ['COD', 'ONLINE'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method selected.' });
    }

    if (paymentMethod === 'ONLINE') {
      if (!paymentReference || paymentReference.trim().length < 6) {
        return res.status(400).json({
          message: 'Please provide a valid UPI Transaction Reference ID / UTR number (at least 6-12 characters) for online payment verification.'
        });
      }
      if (!paymentCustomerName || paymentCustomerName.trim().length < 2) {
        return res.status(400).json({
          message: 'Please provide the account / sender name used to make the UPI transfer.'
        });
      }
    }

    // Process items and validate stock atomically
    const orderItems = [];
    let subtotal = 0;
    const productsToUpdate = [];

    for (const item of items) {
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const product = await Product.findById(item.productId);

      if (!product || !product.active) {
        return res.status(400).json({
          message: `The product "${item.name || 'item'}" is no longer available in the catalogue.`
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.`
        });
      }

      const unitPrice = product.price;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || item.image || '',
        size: item.size || 'M',
        quantity,
        price: unitPrice
      });

      productsToUpdate.push({ product, quantity });
    }

    // Free shipping above 1499, else 99
    const shippingFee = subtotal >= 1499 ? 0 : 99;
    const total = subtotal + shippingFee;

    // Deduct stock safely
    for (const { product, quantity } of productsToUpdate) {
      product.stock = Math.max(0, product.stock - quantity);
      await product.save();
    }

    // Create Order
    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      shipping: {
        name: shipping.name.trim(),
        email: req.user.email,
        phone: phoneDigits,
        houseAddress: shipping.houseAddress.trim(),
        city: shipping.city.trim(),
        district: shipping.district.trim(),
        state: shipping.state.trim(),
        pincode: pincodeDigits
      },
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'ONLINE' ? 'PENDING' : 'PENDING',
      paymentReference: paymentMethod === 'ONLINE' ? paymentReference.trim() : '',
      paymentCustomerName: paymentMethod === 'ONLINE' ? paymentCustomerName.trim() : '',
      status: 'PLACED',
      statusHistory: [{
        status: 'PLACED',
        timestamp: new Date(),
        note: paymentMethod === 'ONLINE' ? `Order placed with UPI (UTR: ${paymentReference.trim()})` : 'Order placed with Cash on Delivery'
      }]
    });

    const shortId = order._id.toString().slice(-7).toUpperCase();

    // Create Notifications
    await createNotification({
      recipient: req.user._id,
      targetRole: 'customer',
      title: `Order #${shortId} Placed!`,
      message: `Your order for ₹${total} has been placed successfully and is being reviewed.`,
      type: 'order_placed',
      data: { orderId: order._id }
    });

    await createNotification({
      targetRole: 'admin',
      title: `New Order Received: #${shortId}`,
      message: `${shipping.name} placed a ${paymentMethod} order for ₹${total}.`,
      type: 'order_placed',
      data: { orderId: order._id }
    });

    // Send Confirmation Emails
    const itemRowsHtml = orderItems.map(i => `
      <tr style="border-bottom:1px solid #f0ebe3;">
        <td style="padding:10px 0;"><b>${i.name}</b> (${i.size})</td>
        <td style="padding:10px 0;text-align:center;">${i.quantity}</td>
        <td style="padding:10px 0;text-align:right;">₹${i.price * i.quantity}</td>
      </tr>
    `).join('');

    await sendEmail({
      to: req.user.email,
      subject: `Order #${shortId} Confirmation`,
      html: `
        <h2 style="color:#702b43;margin-top:0;">Your order is confirmed!</h2>
        <p>Dear ${shipping.name},</p>
        <p>Thank you for choosing Threads of Chaithu. We've received your order and our team is preparing it with care.</p>
        <div style="background:#faf8f4;padding:16px;border:1px solid #e8e0d7;border-radius:4px;margin:20px 0;">
          <p style="margin:0 0 6px;"><b>Order ID:</b> #${shortId}</p>
          <p style="margin:0 0 6px;"><b>Payment Method:</b> ${paymentMethod === 'ONLINE' ? 'Online UPI (Pending Verification)' : 'Cash on Delivery (COD)'}</p>
          <p style="margin:0;"><b>Delivery to:</b> ${shipping.houseAddress}, ${shipping.city}, ${shipping.district}, ${shipping.state} - ${pincodeDigits}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid #702b43;text-align:left;color:#702b43;">
              <th style="padding:8px 0;">Piece</th>
              <th style="padding:8px 0;text-align:center;">Qty</th>
              <th style="padding:8px 0;text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>
        <p style="text-align:right;font-size:16px;font-weight:bold;margin:15px 0;color:#702b43;">Total: ₹${total}</p>
      `
    });

    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Boutique Order #${shortId} - ₹${total}`,
        html: `
          <h2 style="color:#702b43;">New Order Received</h2>
          <p>Customer: <b>${shipping.name}</b> (${req.user.email})</p>
          <p>Phone: <b>${phoneDigits}</b></p>
          <p>Total: <b>₹${total}</b> (${paymentMethod})</p>
          ${paymentMethod === 'ONLINE' ? `<p style="background:#fff2e0;padding:8px;border:1px solid #e0c8a8;"><b>UPI UTR:</b> ${paymentReference} · <b>Sender:</b> ${paymentCustomerName}</p>` : ''}
          <p>Please log in to the Threads of Chaithu Admin Dashboard to review and accept this order.</p>
        `
      });
    }

    res.status(201).json({
      message: 'Order placed successfully.',
      order
    });
  } catch (err) {
    next(err);
  }
});

// Get logged-in customer's orders
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name images category')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Get single order details for tracking (with ownership authorization)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product', 'name images category');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Role and ownership authorization
    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this order.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
