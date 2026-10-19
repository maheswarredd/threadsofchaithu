import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if intended for all admins
  targetRole: { type: String, enum: ['customer', 'admin', 'all'], default: 'customer' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['order_placed', 'order_accepted', 'order_shipped', 'order_delivered', 'order_cancelled', 'support_created', 'support_replied', 'payment_review', 'general'],
    default: 'general'
  },
  read: { type: Boolean, default: false },
  data: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportQuery' },
    extra: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
