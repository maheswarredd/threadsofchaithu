import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: String,
  verificationExpires: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);
