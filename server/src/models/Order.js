import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    size: { type: String, default: 'Standard' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  shipping: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    houseAddress: { type: String, required: true },
    city: { type: String, required: true }, // village / town / city
    district: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  total: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'VERIFIED'], default: 'PENDING' },
  paymentReference: { type: String, default: '' }, // UPI UTR / Transaction reference
  paymentCustomerName: { type: String, default: '' }, // Sender name for UPI verification
  status: {
    type: String,
    enum: ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PLACED'
  },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: String, enum: ['customer', 'admin', 'system', ''], default: '' },
  deliveredAt: Date,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
