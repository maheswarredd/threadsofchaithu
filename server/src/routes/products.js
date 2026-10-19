import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

// Get active catalogue for customers
router.get('/', async (req, res, next) => {
  try {
    const filter = { active: true };

    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    if (req.query.featured === 'true') {
      filter.featured = true;
    }

    if (req.query.q) {
      const sanitized = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { category: { $regex: sanitized, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ featured: -1, createdAt: -1 }).limit(100);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Get available categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Product.distinct('category', { active: true });
    res.json(['All', ...categories]);
  } catch (err) {
    next(err);
  }
});

// Get single product details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let product = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findOne({ _id: id, active: true });
    } else {
      product = await Product.findOne({ slug: id, active: true });
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found or is currently unavailable.' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
