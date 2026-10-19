import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: { type: String, default: '' },
  category: { type: String, required: true, default: 'Kurtis' },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0, default: 0 },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  images: [{ url: String, publicId: String, alt: String }],
  stock: { type: Number, default: 0, min: 0 },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
