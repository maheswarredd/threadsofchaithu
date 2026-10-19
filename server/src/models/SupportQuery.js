import mongoose from 'mongoose';

const supportQuerySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  queryType: {
    type: String,
    enum: ['Order Delay', 'Cancel Order', 'Product Query', 'Payment Query', 'Other'],
    required: true
  },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
    default: 'OPEN'
  },
  adminReply: { type: String, default: '' },
  repliedAt: Date,
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('SupportQuery', supportQuerySchema);
