import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';

const initialDemoProducts = [
  {
    name: 'Mogra Floral Peplum Kurti',
    category: 'Kurtis',
    price: 899,
    compareAtPrice: 1199,
    stock: 18,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Ivory', 'Coral'],
    featured: true,
    description: 'A playful floral peplum kurti with delicate gold zari piping and a flattering silhouette.',
    images: [{ url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80', alt: 'Mogra Floral Peplum Kurti' }]
  },
  {
    name: 'Sage Printed Straight Kurta',
    category: 'Ethnic Wear',
    price: 1099,
    compareAtPrice: 1499,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Sage Green'],
    featured: true,
    description: 'An easy everyday straight kurta with traditional hand-block inspired motifs and breathable fabric.',
    images: [{ url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e5?auto=format&fit=crop&w=900&q=80', alt: 'Sage Printed Kurta' }]
  },
  {
    name: 'Rosewood Flared Dress',
    category: 'Dresses',
    price: 1299,
    compareAtPrice: 1699,
    stock: 8,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Rosewood'],
    featured: true,
    description: 'A graceful flared midi dress with tiered flare, crafted for celebrations and evening gatherings.',
    images: [{ url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80', alt: 'Rosewood Flared Dress' }]
  },
  {
    name: 'Everyday Cotton Printed Top',
    category: 'Tops',
    price: 649,
    compareAtPrice: 799,
    stock: 22,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Cream', 'Olive'],
    featured: false,
    description: 'Soft pure cotton everyday top with delicate floral motifs and comfortable relaxed fit.',
    images: [{ url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80', alt: 'Cotton Printed Top' }]
  },
  {
    name: 'Festive Floral Anarkali Set',
    category: 'Ethnic Wear',
    price: 1899,
    compareAtPrice: 2399,
    stock: 6,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Blush Pink'],
    featured: true,
    description: 'A festive Anarkali suit with organza dupatta and delicate gota patti borders for celebrations.',
    images: [{ url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80', alt: 'Festive Floral Anarkali' }]
  },
  {
    name: 'Minimal Co-ord Set',
    category: 'New Arrivals',
    price: 1499,
    compareAtPrice: 1899,
    stock: 10,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Sand Beige'],
    featured: true,
    description: 'Modern two-piece matching linen-blend co-ord set with a clean, effortless contemporary finish.',
    images: [{ url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=80', alt: 'Minimal Co-ord Set' }]
  },
  {
    name: 'Zari Border Banarasi Chanderi Kurti',
    category: 'Kurtis',
    price: 1399,
    compareAtPrice: 1799,
    stock: 0, // Demonstrate sold out status
    sizes: ['M', 'L'],
    colors: ['Royal Wine'],
    featured: false,
    description: 'Woven Banarasi silk-blend Chanderi kurti with antique gold zari border. (Limited edition)',
    images: [{ url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80', alt: 'Zari Border Kurti' }]
  }
];

export async function ensureAdminAndSeed() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@threadsofchaithu.example').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin123';
    const adminName = process.env.ADMIN_NAME || 'Boutique Admin';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        emailVerified: true
      });
      console.log(`✅ Administrator account initialized: ${adminEmail}`);
    } else {
      let updated = false;
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        updated = true;
      }
      if (!admin.emailVerified) {
        admin.emailVerified = true;
        updated = true;
      }
      // If the admin password in .env has been set and doesn't match the DB, update it
      const passwordMatches = await bcrypt.compare(adminPassword, admin.passwordHash);
      if (!passwordMatches) {
        admin.passwordHash = await bcrypt.hash(adminPassword, 12);
        updated = true;
        console.log(`🔐 Administrator password synchronized with server environment variable`);
      }
      if (updated) {
        await admin.save();
      }
      console.log(`✅ Administrator account verified: ${adminEmail} (role: admin)`);
    }

    // Auto-seed demo products if inventory is empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      for (const p of initialDemoProducts) {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await Product.create({ ...p, slug });
      }
      console.log(`🛍️ Initial catalogue seeded: ${initialDemoProducts.length} boutique products created.`);
    }
  } catch (err) {
    console.error('Error during auto-initialization of admin / catalogue:', err.message);
  }
}

export default ensureAdminAndSeed;
