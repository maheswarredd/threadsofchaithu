import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Menu, Search, ShoppingBag, UserRound, Heart, ArrowRight, ArrowUpRight,
  Instagram, ShieldCheck, Package, LayoutDashboard, Plus, Upload, X, LogOut,
  Check, Sparkles, Truck, RefreshCw, Bell, AlertCircle, Phone, MapPin,
  CreditCard, QrCode, Copy, CheckCircle2, Clock, Ban, ChevronRight,
  MessageSquare, Settings, Filter, Edit3, Trash2, Volume2, VolumeX, Eye
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Safe network request helper with Cookie + Bearer token
async function request(path, options = {}) {
  const token = localStorage.getItem('tc_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers,
    ...options
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.includes('/login') && !path.includes('/me')) {
      localStorage.removeItem('tc_token');
    }
    throw new Error(data.message || 'Request failed. Please try again.');
  }
  return data;
}

// Browser-safe Web Audio notification chime
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Autoplay fallback
  }
}

function App() {
  // Navigation & Page State
  const [page, setPage] = useState('home'); // 'home' | 'shop' | 'checkout' | 'account' | 'admin'
  const [accountTab, setAccountTab] = useState('orders'); // 'orders' | 'support' | 'profile'
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'orders' | 'products' | 'queries' | 'settings'

  // User & Auth State
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  // Catalogue & Cart State
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  // Checkout State
  const [checkout, setCheckout] = useState({
    name: '',
    phone: '',
    houseAddress: '',
    city: '',
    district: '',
    state: '',
    pincode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [upiDetails, setUpiDetails] = useState({ utr: '', customerName: '', upiId: 'threadsofchaithu@oksbi', upiName: 'Threads of Chaithu Boutique' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Customer Orders & Support Queries
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerQueries, setCustomerQueries] = useState([]);
  const [supportModal, setSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({ queryType: 'Order Delay', orderId: '', subject: '', message: '' });

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin Dashboard State
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrderFilter, setAdminOrderFilter] = useState('ALL');
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminQueries, setAdminQueries] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  const [adminForm, setAdminForm] = useState({
   name: '',
category: 'Kurtis',
price: '',
compareAtPrice: '',
stock: '10',
description: '',
sizes: 'S, M, L, XL',
colors: '',
imageUrls: []
  });
  const [imageCount, setImageCount] = useState(1);
const [imageUploading, setImageUploading] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [replyQueryModal, setReplyQueryModal] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyStatus, setAdminReplyStatus] = useState('RESOLVED');

  // Confirmation & Notice Dialogs
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Initial Load
  useEffect(() => {
    // 1. Fetch products
    loadProducts();

    // 2. Fetch payment config
    request('/config/payment').then(cfg => {
      if (cfg.upiId) setUpiDetails(prev => ({ ...prev, upiId: cfg.upiId, upiName: cfg.upiName }));
    }).catch(() => {});

    // 3. Restore session
    request('/auth/me').then(d => {
      if (d.user) {
        setUser(d.user);
        loadNotifications();
        if (d.user.role === 'customer') {
          loadCustomerData();
        }
      }
    }).catch(() => {
      localStorage.removeItem('tc_token');
    });

    // 4. Handle email verification callback in URL if present
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/verify-email' && params.get('token') && params.get('email')) {
      request('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: params.get('token'), email: params.get('email') })
      }).then(d => {
        setNotice(d.message);
        window.history.replaceState({}, '', '/');
        setAuthModal({ open: true, mode: 'login' });
      }).catch(e => {
        setNotice(e.message);
        window.history.replaceState({}, '', '/');
      });
    }

    // 5. PWA Install handler
    const installHandler = e => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', installHandler);

    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  // Poll notifications occasionally when logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      request('/notifications').then(d => {
        if (d.unreadCount > unreadNotifCount && soundEnabled) {
          playNotificationChime();
        }
        setNotifications(d.notifications || []);
        setUnreadNotifCount(d.unreadCount || 0);
      }).catch(() => {});
    }, 25000);
    return () => clearInterval(interval);
  }, [user, unreadNotifCount, soundEnabled]);

  // Notice auto-dismiss
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);

  // API Loaders
  async function loadProducts() {
    try {
      const data = await request('/products');
      setProducts(data);
    } catch (e) {
      console.warn('Could not load products:', e.message);
    }
  }

  async function loadNotifications() {
    try {
      const data = await request('/notifications');
      setNotifications(data.notifications || []);
      setUnreadNotifCount(data.unreadCount || 0);
    } catch {}
  }

  async function loadCustomerData() {
    try {
      const [ords, qrs] = await Promise.all([
        request('/orders/mine').catch(() => []),
        request('/support/mine').catch(() => [])
      ]);
      setCustomerOrders(ords);
      setCustomerQueries(qrs);
    } catch {}
  }

  async function loadAdminData() {
    try {
      const [sum, ords, prods, qrs, sett] = await Promise.all([
        request('/admin/summary').catch(() => null),
        request('/admin/orders').catch(() => []),
        request('/admin/products').catch(() => []),
        request('/admin/support-queries').catch(() => []),
        request('/admin/settings').catch(() => null)
      ]);
      setAdminSummary(sum);
      setAdminOrders(ords);
      setAdminProducts(prods);
      setAdminQueries(qrs);
      setAdminSettings(sett);
    } catch (e) {
      setNotice(e.message);
    }
  }

  // --- COMMON SINGLE SIGN IN / SIGN UP FLOW ---
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authModal.mode === 'signup') {
        const data = await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            phone: authForm.phone,
            password: authForm.password
          })
        });

        if (data.token) {
          localStorage.setItem('tc_token', data.token);
          setUser(data.user);
          setAuthModal({ open: false, mode: 'login' });
          setNotice(data.message || 'Welcome to Threads of Chaithu!');
          loadNotifications();
          loadCustomerData();
        } else {
          setNotice(data.message);
          setAuthModal({ open: true, mode: 'login' });
        }
      } else {
        // Shared Sign In for BOTH Customer & Admin
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password
          })
        });

        if (data.token) {
          localStorage.setItem('tc_token', data.token);
        }
        setUser(data.user);
        setAuthModal({ open: false, mode: 'login' });
        setNotice(`Welcome back, ${data.user.name}!`);
        loadNotifications();

        // Automatic Role-Based Navigation
        if (data.user.role === 'admin') {
          setPage('admin');
          loadAdminData();
        } else {
          setPage('home');
          loadCustomerData();
        }
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('tc_token');
    setUser(null);
    setPage('home');
    setNotice('You have been signed out.');
  }

  // Navigation helpers
  function openAccount(tab = 'orders') {
    if (!user) {
      setAuthModal({ open: true, mode: 'login' });
      return;
    }
    if (user.role === 'admin') {
      openAdmin('overview');
    } else {
      setAccountTab(tab);
      setPage('account');
      loadCustomerData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function openAdmin(tab = 'overview') {
    if (!user || user.role !== 'admin') {
      setNotice('Administrator authentication required.');
      setAuthModal({ open: true, mode: 'login' });
      return;
    }
    setAdminTab(tab);
    setPage('admin');
    loadAdminData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goShop(cat = 'All') {
    setCategory(cat);
    setPage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Cart operations
  function addToCart(p, size = selectedSize) {
    if (p.stock <= 0) {
      setNotice(`${p.name} is currently sold out.`);
      return;
    }
    const key = `${p._id}-${size}`;
    setCart(prev => {
      const existing = prev.find(item => item.key === key);
      if (existing) {
        if (existing.quantity >= p.stock) {
          setNotice(`Maximum available stock (${p.stock}) reached.`);
          return prev;
        }
        return prev.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        key,
        productId: p._id,
        name: p.name,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image: p.images?.[0]?.url,
        size,
        quantity: 1,
        maxStock: p.stock
      }];
    });
    setNotice(`Added "${p.name}" (${size}) to your bag.`);
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function updateCartQty(key, delta) {
    setCart(prev => prev.map(item => {
      if (item.key === key) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.maxStock) {
          setNotice(`Only ${item.maxStock} pieces available in inventory.`);
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean));
  }

  function removeCartItem(key) {
    setCart(prev => prev.filter(item => item.key !== key));
  }

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartSubtotal = cart.reduce((n, i) => n + (i.price * i.quantity), 0);
  const shippingFee = cartSubtotal >= 1499 || cartSubtotal === 0 ? 0 : 99;
  const cartTotal = cartSubtotal + shippingFee;

  // Checkout submission
  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!user) {
      setAuthModal({ open: true, mode: 'login' });
      setNotice('Please sign in or create an account before completing checkout.');
      return;
    }

    if (cart.length === 0) {
      setNotice('Your shopping bag is empty.');
      return;
    }

    if (paymentMethod === 'ONLINE') {
      if (!upiDetails.utr || upiDetails.utr.trim().length < 6) {
        setNotice('Please enter a valid 12-digit UPI UTR / Transaction Reference number.');
        return;
      }
      if (!upiDetails.customerName || upiDetails.customerName.trim().length < 2) {
        setNotice('Please enter the payer name used for the UPI transaction.');
        return;
      }
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
        shipping: checkout,
        paymentMethod,
        paymentReference: paymentMethod === 'ONLINE' ? upiDetails.utr.trim() : '',
        paymentCustomerName: paymentMethod === 'ONLINE' ? upiDetails.customerName.trim() : ''
      };

      const res = await request('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCart([]);
      setCartOpen(false);
      setLastPlacedOrder(res.order);
      setNotice(`Order #${res.order._id.slice(-7).toUpperCase()} placed successfully!`);
      loadProducts(); // refresh live stock
      loadCustomerData();
      loadNotifications();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  }

  // Customer support ticket submission
  async function handleSupportSubmit(e) {
    e.preventDefault();
    try {
      const res = await request('/support', {
        method: 'POST',
        body: JSON.stringify(supportForm)
      });
      setNotice(res.message);
      setSupportModal(false);
      setSupportForm({ queryType: 'Order Delay', orderId: '', subject: '', message: '' });
      loadCustomerData();
      loadNotifications();
    } catch (err) {
      setNotice(err.message);
    }
  }

  // Admin order status update
  async function handleAdminOrderStatus(orderId, newStatus, reason = '') {
    try {
      const updated = await request(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, cancellationReason: reason })
      });
      setAdminOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      setNotice(`Order status updated to ${newStatus}.`);
      loadAdminData();
    } catch (err) {
      setNotice(err.message);
    }
  }

  // Admin product creation & editing
  async function handleSaveProduct(e) {
  e.preventDefault();

  try {
    const payload = {
      name: adminForm.name.trim(),
      category: adminForm.category,
      price: Number(adminForm.price),
      compareAtPrice: Number(adminForm.compareAtPrice || 0),
      stock: Number(adminForm.stock || 0),
      description: adminForm.description.trim(),
      sizes: adminForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: adminForm.colors.split(',').map(c => c.trim()).filter(Boolean),
      images: adminForm.imageUrls
      .filter(Boolean)
      .map(url => ({
       url,
       alt: adminForm.name
       }))
       };

      if (editingProduct) {
        const updated = await request(`/admin/products/${editingProduct._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setAdminProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
        setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
        setEditingProduct(null);
        setNotice('Product updated successfully.');
      } else {
        const created = await request('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setAdminProducts(prev => [created, ...prev]);
        setProducts(prev => [created, ...prev]);
        setNotice('New product added to catalogue.');
      }

      setAdminForm({
  name: '',
  category: 'Kurtis',
  price: '',
  compareAtPrice: '',
  stock: '10',
  description: '',
  sizes: 'S, M, L, XL',
  colors: '',
  imageUrls: []
});

setImageCount(1);
setImageUploading({});
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function handleDeleteProduct(productId) {
    try {
      await request(`/admin/products/${productId}`, { method: 'DELETE' });
      setAdminProducts(prev => prev.filter(p => p._id !== productId));
      setProducts(prev => prev.filter(p => p._id !== productId));
      setNotice('Product removed from catalogue.');
    } catch (err) {
      setNotice(err.message);
    }
  }

  // Admin query reply
  async function handleAdminReplySubmit(e) {
    e.preventDefault();
    if (!replyQueryModal) return;
    try {
      const res = await request(`/admin/support-queries/${replyQueryModal._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: adminReplyStatus,
          adminReply: adminReplyText
        })
      });
      setAdminQueries(prev => prev.map(q => q._id === replyQueryModal._id ? res.query : q));
      setReplyQueryModal(null);
      setAdminReplyText('');
      setNotice('Reply sent to customer successfully.');
    } catch (err) {
      setNotice(err.message);
    }
  }

  // Cloudinary image upload - one image slot at a time
async function handleImageUpload(file, imageIndex) {
  if (!file) return;

  if (imageIndex < 0 || imageIndex >= imageCount) {
    return;
  }

  setImageUploading(prev => ({
    ...prev,
    [imageIndex]: true
  }));

  try {
    const sig = await request('/admin/upload-signature', {
      method: 'POST',
      body: '{}'
    });

    const fd = new FormData();

    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', String(sig.timestamp));
    fd.append('folder', sig.folder);
    fd.append('signature', sig.signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: fd
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary upload error:', data);

      throw new Error(
        data?.error?.message ||
        `Cloudinary upload failed (${response.status})`
      );
    }

    if (!data.secure_url) {
      throw new Error('Cloudinary did not return an image URL.');
    }

    setAdminForm(prev => {
      const nextImages = [...prev.imageUrls];

      nextImages[imageIndex] = data.secure_url;

      return {
        ...prev,
        imageUrls: nextImages
      };
    });

    setNotice(
      `Image ${imageIndex + 1} uploaded successfully.`
    );
  } catch (error) {
    console.error('Image upload failed:', error);

    setNotice(
      `Image ${imageIndex + 1} upload failed: ${error.message}`
    );
  } finally {
    setImageUploading(prev => ({
      ...prev,
      [imageIndex]: false
    }));
  }
}
  // Mark notifications read
  async function markAllNotificationsRead() {
    try {
      await request('/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    } catch {}
  }

  const categories = ['All', 'New Arrivals', 'Kurtis', 'Ethnic Wear', 'Dresses', 'Tops'];
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = category === 'All' || p.category === category;
      const matchesQuery = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(query.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, category, query]);

  return (
    <div className="app-shell">
      {/* Announcement Bar */}
      <div className="announcement">
        A LITTLE LOVE, IN EVERY THREAD <span>✦</span> Complimentary shipping on orders above ₹1,499 <span>✦</span> Boutique Handcrafted Silhouettes
      </div>

      {/* Main Header */}
      <header className="header modern-header">
  <div className="header-left">
    <button
      className="icon-btn mobile-only modern-icon-btn"
      onClick={() => setMobileMenu(!mobileMenu)}
      aria-label="Menu"
    >
      <Menu />
    </button>

    <button className="wordmark modern-wordmark" onClick={() => setPage('home')}>
      <span className="monogram modern-monogram">TC</span>
      <span className="brand-copy">
        <strong>THREADS OF CHAITHU</strong>
        <small>WHERE EVERY THREAD TELLS A STORY</small>
      </span>
    </button>
  </div>

  <nav className={mobileMenu ? 'nav open modern-nav' : 'nav modern-nav'}>
    <button onClick={() => { setPage('home'); setMobileMenu(false); }}>
      Home
    </button>

    <button onClick={() => { goShop('All'); setMobileMenu(false); }}>
      Shop All
    </button>

    <button onClick={() => { goShop('New Arrivals'); setMobileMenu(false); }}>
      New Arrivals
    </button>

    <button onClick={() => { goShop('Kurtis'); setMobileMenu(false); }}>
      Kurtis
    </button>

    <button onClick={() => { goShop('Ethnic Wear'); setMobileMenu(false); }}>
      Ethnic Wear
    </button>

    <button onClick={() => { goShop('Dresses'); setMobileMenu(false); }}>
      Dresses
    </button>
  </nav>
        {/* Header Action Icons */}
        <div className="header-actions">
          {/* Search Toggle */}
          <button className="icon-btn modern-icon-btn" aria-label="Search collection" onClick={() => { setPage('shop'); setTimeout(() => document.getElementById('search-input')?.focus(), 100); }}>
            <Search />
          </button>

          {/* Website Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="icon-btn bell-btn" aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell />
              {unreadNotifCount > 0 && <span className="badge-count">{unreadNotifCount}</span>}
            </button>

            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-head">
                  <strong>NOTIFICATIONS ({unreadNotifCount} unread)</strong>
                  {unreadNotifCount > 0 && (
                    <button className="text-btn" onClick={markAllNotificationsRead}>Mark all read</button>
                  )}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        className={`notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={async () => {
                          if (!n.read) {
                            request(`/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => {});
                            setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
                            setUnreadNotifCount(c => Math.max(0, c - 1));
                          }
                          setNotifOpen(false);
                          if (user?.role === 'admin') openAdmin('orders');
                          else openAccount('orders');
                        }}
                      >
                        {!n.read && <span className="notif-dot" />}
                        <div>
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account / Single Sign-in Button */}
          <button
            className="icon-btn modern-icon-btn"
            aria-label="Account"
            onClick={() => {
              if (!user) {
                setAuthModal({ open: true, mode: 'login' });
              } else if (user.role === 'admin') {
                openAdmin('overview');
              } else {
                openAccount('orders');
              }
            }}
          >
            <UserRound />
          </button>

          {/* Cart Bag */}
          <button className="icon-btn bag-btn" aria-label="Shopping bag" onClick={() => setCartOpen(true)}>
            <ShoppingBag />
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      {/* PAGE 1: ADMIN DASHBOARD */}
      {page === 'admin' ? (
        <main className="admin-wrap">
          <div className="admin-top">
            <div>
              <p className="eyebrow">STORE CONTROL CENTER</p>
              <h1>Good morning, {user?.name || 'Administrator'}.</h1>
              <p className="muted">Authenticated as <b>{user?.email}</b> (Server ENV Admin Control)</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="outline-btn"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Sound alert enabled' : 'Sound alert muted'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {soundEnabled ? 'Alerts ON' : 'Muted'}
              </button>
              <button className="outline-btn" onClick={() => setPage('home')}>
                View Storefront <ArrowUpRight size={16} />
              </button>
              <button className="outline-btn" onClick={handleSignOut}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-bar">
            <button className={`tab-btn ${adminTab === 'overview' ? 'active' : ''}`} onClick={() => setAdminTab('overview')}>
              <LayoutDashboard size={15} /> Overview & Stats
            </button>
            <button className={`tab-btn ${adminTab === 'orders' ? 'active' : ''}`} onClick={() => { setAdminTab('orders'); loadAdminData(); }}>
              <ShoppingBag size={15} /> Order Management ({adminOrders.length})
            </button>
            <button className={`tab-btn ${adminTab === 'products' ? 'active' : ''}`} onClick={() => setAdminTab('products')}>
              <Package size={15} /> Catalogue & Stock ({adminProducts.length})
            </button>
            <button className={`tab-btn ${adminTab === 'queries' ? 'active' : ''}`} onClick={() => setAdminTab('queries')}>
              <MessageSquare size={15} /> Customer Queries ({adminQueries.length})
            </button>
            <button className={`tab-btn ${adminTab === 'settings' ? 'active' : ''}`} onClick={() => setAdminTab('settings')}>
              <Settings size={15} /> Store Settings
            </button>
          </div>

          {/* Admin Tab 1: Overview & Statistics */}
          {adminTab === 'overview' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <Sparkles />
                  <span>Total Revenue</span>
                  <strong>{money(adminSummary?.revenue || 0)}</strong>
                </div>
                <div className="stat-card">
                  <ShoppingBag />
                  <span>Total Orders</span>
                  <strong>{adminSummary?.orders ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <Clock />
                  <span>Pending / Placed</span>
                  <strong>{adminSummary?.placedOrders ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <CheckCircle2 />
                  <span>Delivered Orders</span>
                  <strong>{adminSummary?.deliveredOrders ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <Package />
                  <span>Catalogue Items</span>
                  <strong>{adminSummary?.products ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <AlertCircle />
                  <span>Low Stock (≤5)</span>
                  <strong>{adminSummary?.lowStockProducts ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <UserRound />
                  <span>Customers</span>
                  <strong>{adminSummary?.customers ?? '0'}</strong>
                </div>
                <div className="stat-card">
                  <MessageSquare />
                  <span>Open Queries</span>
                  <strong>{adminSummary?.openSupportQueries ?? '0'}</strong>
                </div>
              </div>

              {/* Quick links & recent orders preview */}
              <div className="admin-grid" style={{ marginTop: '25px' }}>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">ACTION REQUIRED</p>
                      <h2>Pending Orders ({adminOrders.filter(o => o.status === 'PLACED').length})</h2>
                    </div>
                    <button className="text-btn" onClick={() => setAdminTab('orders')}>View all orders ↗</button>
                  </div>
                  {adminOrders.filter(o => o.status === 'PLACED').length === 0 ? (
                    <p className="muted">No pending orders awaiting review.</p>
                  ) : (
                    adminOrders.filter(o => o.status === 'PLACED').slice(0, 5).map(o => (
                      <div className="order-row" key={o._id}>
                        <div>
                          <strong>#{o._id.slice(-7).toUpperCase()}</strong>
                          <p>{o.shipping?.name || o.customer?.name} · {money(o.total)} · {o.paymentMethod}</p>
                          <small>{new Date(o.createdAt).toLocaleDateString()}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn-sm btn-accept" onClick={() => handleAdminOrderStatus(o._id, 'CONFIRMED')}>
                            Accept
                          </button>
                          <button
                            className="action-btn-sm btn-cancel"
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: `Cancel Order #${o._id.slice(-7).toUpperCase()}?`,
                                message: 'Are you sure you want to cancel this order? Stock will be automatically restored.',
                                onConfirm: () => handleAdminOrderStatus(o._id, 'CANCELLED', 'Cancelled by Admin')
                              });
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">CUSTOMER CARE</p>
                      <h2>Recent Queries</h2>
                    </div>
                    <button className="text-btn" onClick={() => setAdminTab('queries')}>View all ↗</button>
                  </div>
                  {adminQueries.length === 0 ? (
                    <p className="muted">No customer inquiries submitted yet.</p>
                  ) : (
                    adminQueries.slice(0, 5).map(q => (
                      <div className="order-row" key={q._id}>
                        <div>
                          <span className={`status-pill status-${q.status.toLowerCase()}`}>{q.status}</span>
                          <strong style={{ display: 'block', marginTop: '4px' }}>{q.subject}</strong>
                          <small>{q.customer?.name} ({q.queryType})</small>
                        </div>
                        <button
                          className="action-btn-sm"
                          onClick={() => {
                            setReplyQueryModal(q);
                            setAdminReplyText(q.adminReply || '');
                            setAdminReplyStatus(q.status === 'OPEN' ? 'RESOLVED' : q.status);
                          }}
                        >
                          Review / Reply
                        </button>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Admin Tab 2: Complete Order Management */}
          {adminTab === 'orders' && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">FULFILLMENT</p>
                  <h2>Order Management</h2>
                </div>
                <button className="text-btn" onClick={loadAdminData}>Refresh Orders</button>
              </div>

              {/* Status Filters */}
              <div className="filter-bar">
                {['ALL', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(st => (
                  <button
                    key={st}
                    className={`tab-btn ${adminOrderFilter === st ? 'active' : ''}`}
                    onClick={() => setAdminOrderFilter(st)}
                  >
                    {st === 'ALL' ? 'All Orders' : st}
                  </button>
                ))}
              </div>

              {/* Orders Table */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOrders.filter(o => adminOrderFilter === 'ALL' || o.status === adminOrderFilter).length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }} className="muted">
                          No orders found matching this filter.
                        </td>
                      </tr>
                    ) : (
                      adminOrders
                        .filter(o => adminOrderFilter === 'ALL' || o.status === adminOrderFilter)
                        .map(o => (
                          <tr key={o._id}>
                            <td>
                              <strong>#{o._id.slice(-7).toUpperCase()}</strong>
                            </td>
                            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div><strong>{o.shipping?.name || o.customer?.name}</strong></div>
                              <small className="muted">{o.shipping?.phone} · {o.shipping?.city}, {o.shipping?.pincode}</small>
                            </td>
                            <td>
                              {o.items?.map((it, idx) => (
                                <div key={idx} style={{ fontSize: '10px' }}>
                                  {it.name} ({it.size}) × {it.quantity}
                                </div>
                              ))}
                            </td>
                            <td><strong>{money(o.total)}</strong></td>
                            <td>
                              <div>{o.paymentMethod}</div>
                              {o.paymentMethod === 'ONLINE' && (
                                <small style={{ color: '#0284c7' }}>
                                  UTR: {o.paymentReference || 'N/A'}<br />
                                  Sender: {o.paymentCustomerName || 'N/A'}
                                </small>
                              )}
                            </td>
                            <td>
                              <span className={`status-pill status-${o.status.toLowerCase()}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {o.status === 'PLACED' && (
                                  <button className="action-btn-sm btn-accept" onClick={() => handleAdminOrderStatus(o._id, 'CONFIRMED')}>
                                    Accept Order
                                  </button>
                                )}
                                {o.status === 'CONFIRMED' && (
                                  <button className="action-btn-sm btn-ship" onClick={() => handleAdminOrderStatus(o._id, 'SHIPPED')}>
                                    Ship Order
                                  </button>
                                )}
                                {o.status === 'SHIPPED' && (
                                  <button className="action-btn-sm btn-deliver" onClick={() => handleAdminOrderStatus(o._id, 'DELIVERED')}>
                                    Mark as Delivered
                                  </button>
                                )}
                                {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                                  <button
                                    className="action-btn-sm btn-cancel"
                                    onClick={() => {
                                      setConfirmDialog({
                                        open: true,
                                        title: `Cancel Order #${o._id.slice(-7).toUpperCase()}?`,
                                        message: 'Cancelling this order will automatically restore product inventory stock and notify the customer.',
                                        onConfirm: () => handleAdminOrderStatus(o._id, 'CANCELLED', 'Cancelled by Store Admin')
                                      });
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Admin Tab 3: Catalogue & Product Management */}
          {adminTab === 'products' && (
            <div className="admin-grid">
              {/* Product Form (Add / Edit) */}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">{editingProduct ? 'EDITING PRODUCT' : 'NEW ARRIVAL'}</p>
                    <h2>{editingProduct ? 'Edit Product Details' : 'Add a Product'}</h2>
                  </div>
                  {editingProduct && (
                    <button
                      className="text-btn"
                      onClick={() => {
                        setEditingProduct(null);
                        setAdminForm({ name: '', category: 'Kurtis', price: '', compareAtPrice: '', stock: '10', description: '', sizes: 'S, M, L, XL', colors: '', imageUrls: [] });
                        setImageCount(1);
                        setImageUploading({});
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form className="admin-form" onSubmit={handleSaveProduct}>
                  <label>
                    Product Name *
                    <input
                      required
                      value={adminForm.name}
                      onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                      placeholder="e.g. Mogra Floral Peplum Kurti"
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Category *
                      <select value={adminForm.category} onChange={e => setAdminForm({ ...adminForm, category: e.target.value })}>
                        {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                    <label>
                      Price (₹) *
                      <input
                        required
                        type="number"
                        min="0"
                        value={adminForm.price}
                        onChange={e => setAdminForm({ ...adminForm, price: e.target.value })}
                        placeholder="899"
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      MRP / Compare at Price (₹)
                      <input
                        type="number"
                        min="0"
                        value={adminForm.compareAtPrice}
                        onChange={e => setAdminForm({ ...adminForm, compareAtPrice: e.target.value })}
                        placeholder="1199"
                      />
                    </label>
                    <label>
                      Stock Quantity *
                      <input
                        required
                        type="number"
                        min="0"
                        value={adminForm.stock}
                        onChange={e => setAdminForm({ ...adminForm, stock: e.target.value })}
                        placeholder="15"
                      />
                    </label>
                  </div>

                  <label>
                    Available Sizes (comma separated)
                    <input
                      value={adminForm.sizes}
                      onChange={e => setAdminForm({ ...adminForm, sizes: e.target.value })}
                      placeholder="S, M, L, XL, XXL"
                    />
                  </label>

                  <label>
                    Colors / Variants
                    <input
                      value={adminForm.colors}
                      onChange={e => setAdminForm({ ...adminForm, colors: e.target.value })}
                      placeholder="Ivory, Rosewood, Coral"
                    />
                  </label>

                  <label>
                    Description & Fabric Care
                    <textarea
                      rows="3"
                      value={adminForm.description}
                      onChange={e => setAdminForm({ ...adminForm, description: e.target.value })}
                      placeholder="Delicate hand-block motifs, soft pure cotton fabric..."
                    />
                  </label>

                  <div className="product-image-manager">

  <label>
    Number of Product Images
    <select
      value={imageCount}
      onChange={e => {
        const count = Number(e.target.value);

        setImageCount(count);

        setAdminForm(prev => ({
          ...prev,
          imageUrls: prev.imageUrls.slice(0, count)
        }));
      }}
    >
      <option value="1">1 Image</option>
      <option value="2">2 Images</option>
      <option value="3">3 Images</option>
      <option value="4">4 Images</option>
      <option value="5">5 Images</option>
      <option value="6">6 Images</option>
    </select>
  </label>

  <div className="admin-image-upload-grid">

    {Array.from({ length: imageCount }).map((_, index) => {
      const imageUrl = adminForm.imageUrls[index];
      const uploading = imageUploading[index];

      return (
        <div
          className="admin-image-slot"
          key={index}
        >

          <div className="admin-image-slot-title">
            Image {index + 1}
          </div>

          <label className="admin-image-square">

            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Product image ${index + 1}`}
              />
            ) : uploading ? (
              <div className="image-upload-loading">
                Uploading...
              </div>
            ) : (
              <div className="image-upload-placeholder">
                <Upload />
                <span>Select Image</span>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                const file = e.target.files?.[0];

                if (file) {
                  handleImageUpload(file, index);
                }

                e.target.value = '';
              }}
            />

          </label>

          {imageUrl && (
            <button
              type="button"
              className="remove-image-btn"
              onClick={() => {
                setAdminForm(prev => {
                  const nextImages = [...prev.imageUrls];

                  nextImages.splice(index, 1);

                  return {
                    ...prev,
                    imageUrls: nextImages
                  };
                });
              }}
            >
              Remove
            </button>
          )}

        </div>
      );
    })}

  </div>

  <p className="image-upload-help">
    Select 1 to 6 product images. Each image can be previewed
    immediately before saving the product.
  </p>

</div>
                  
                  {adminForm.imageUrls.length > 0 && (
  <div className="admin-image-preview-grid">
    {adminForm.imageUrls.map((url, index) => (
      <div className="admin-image-preview" key={url}>
        <img
          className="upload-preview"
          src={url}
          alt={`Product preview ${index + 1}`}
        />

        <button
          type="button"
          className="remove-image-btn"
          onClick={() => {
            setAdminForm(prev => ({
              ...prev,
              imageUrls: prev.imageUrls.filter((_, i) => i !== index)
            }));
          }}
        >
          ×
        </button>

        <span>Image {index + 1}</span>
      </div>
    ))}
  </div>
)}

                  <button className="primary-btn" type="submit">
                    {editingProduct ? 'Update Product' : 'Save Product to Catalogue'} <ArrowRight size={16} />
                  </button>
                </form>
              </section>

              {/* Product Inventory List */}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">INVENTORY</p>
                    <h2>Catalogue Products ({adminProducts.length})</h2>
                  </div>
                  <button className="text-btn" onClick={loadAdminData}>Refresh</button>
                </div>

                <div className="orders-list">
                  {adminProducts.map(p => (
                    <div className="admin-product" key={p._id} style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {p.images?.[0]?.url ? (
                        <img
                        src={p.images[0].url}
                        alt={p.name}
                        />
                        ) : (
                        <div className="no-product-image">
                        No Image
                        </div>
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.category} · {money(p.price)} · Stock: <b className={p.stock <= 0 ? 'sold-out-text' : ''}>{p.stock}</b>
                            {p.stock <= 0 && ' (SOLD OUT)'}
                          </small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="action-btn-sm"
                          onClick={() => {
                            setEditingProduct(p);
                            setAdminForm({
                              name: p.name,
                              category: p.category,
                              price: String(p.price),
                              compareAtPrice: String(p.compareAtPrice || ''),
                              stock: String(p.stock),
                              description: p.description || '',
                              sizes: (p.sizes || []).join(', '),
                              colors: (p.colors || []).join(', '),
                              imageUrls: Array.isArray(p.images)
                              ? p.images.map(image => image.url).filter(Boolean)
                              : []
                            });
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="action-btn-sm btn-cancel"
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: `Delete "${p.name}"?`,
                              message: 'Are you sure you want to delete this piece from the boutique catalogue?',
                              onConfirm: () => handleDeleteProduct(p._id)
                            });
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Admin Tab 4: Customer Support Queries */}
          {adminTab === 'queries' && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">CUSTOMER ASSISTANCE</p>
                  <h2>Support Queries & Tickets ({adminQueries.length})</h2>
                </div>
                <button className="text-btn" onClick={loadAdminData}>Refresh</button>
              </div>

              {adminQueries.length === 0 ? (
                <p className="muted">No customer inquiries submitted yet.</p>
              ) : (
                adminQueries.map(q => (
                  <div className="query-card" key={q._id}>
                    <div className="query-card-header">
                      <div>
                        <span className={`status-pill status-${q.status.toLowerCase()}`}>{q.status}</span>
                        <strong style={{ marginLeft: '10px', fontSize: '13px' }}>{q.subject}</strong>
                      </div>
                      <small className="muted">{new Date(q.createdAt).toLocaleString()}</small>
                    </div>
                    <p style={{ fontSize: '12px', margin: '8px 0' }}>{q.message}</p>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '15px' }}>
                      <span>Customer: <b>{q.customer?.name}</b> ({q.customer?.email})</span>
                      <span>Category: <b>{q.queryType}</b></span>
                      {q.order && <span>Related Order: <b>#{q.order._id?.slice(-7).toUpperCase()}</b></span>}
                    </div>

                    {q.adminReply && (
                      <div className="query-admin-reply">
                        <strong>Store Reply:</strong> {q.adminReply}
                        <small style={{ display: 'block', marginTop: '4px', color: 'var(--muted)' }}>
                          Replied at {new Date(q.repliedAt || q.updatedAt).toLocaleString()}
                        </small>
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <button
                        className="action-btn-sm"
                        onClick={() => {
                          setReplyQueryModal(q);
                          setAdminReplyText(q.adminReply || '');
                          setAdminReplyStatus(q.status === 'OPEN' ? 'RESOLVED' : q.status);
                        }}
                      >
                        <MessageSquare size={13} /> {q.adminReply ? 'Update Response' : 'Reply to Customer'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Admin Tab 5: Settings */}
          {adminTab === 'settings' && (
            <div className="panel" style={{ maxWidth: '700px' }}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ENVIRONMENT CONFIGURATION</p>
                  <h2>Server & Gateway Settings</h2>
                </div>
              </div>
              <p className="muted">
                These settings are controlled securely from the server <code>.env</code> file and cannot be modified from the client.
              </p>

              <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
                <div className="order-row">
                  <div>
                    <strong>Administrator Account</strong>
                    <p>{adminSettings?.adminEmail || 'admin@threadsofchaithu.example'} (Configured via ADMIN_EMAIL)</p>
                  </div>
                  <span className="status-pill status-delivered">Active</span>
                </div>
                <div className="order-row">
                  <div>
                    <strong>UPI Payment Gateway</strong>
                    <p>UPI ID: <b>{adminSettings?.upiId || upiDetails.upiId}</b> · Payee: <b>{adminSettings?.upiName || upiDetails.upiName}</b></p>
                  </div>
                  <span className="status-pill status-delivered">Configured</span>
                </div>
                <div className="order-row">
                  <div>
                    <strong>Brevo Transactional Email (SMTP)</strong>
                    <p>Handles order confirmation, acceptance, shipping, delivery, and support notices.</p>
                  </div>
                  <span className={`status-pill ${adminSettings?.emailServiceConfigured ? 'status-delivered' : 'status-placed'}`}>
                    {adminSettings?.emailServiceConfigured ? 'Connected' : 'Optional / Disabled'}
                  </span>
                </div>
                <div className="order-row">
                  <div>
                    <strong>Cloudinary Product Image Storage</strong>
                    <p>Enables persistent image hosting for boutique pieces.</p>
                  </div>
                  <span className={`status-pill ${adminSettings?.cloudinaryConfigured ? 'status-delivered' : 'status-placed'}`}>
                    {adminSettings?.cloudinaryConfigured ? 'Connected' : 'Optional'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : page === 'checkout' ? (
        /* PAGE 2: CHECKOUT PAGE */
        <main className="checkout-page">
          <p className="eyebrow">JUST ONE MORE STEP</p>
          <h1>Delivery & Payment</h1>

          {lastPlacedOrder ? (
            <div className="panel" style={{ textAlign: 'center', padding: '45px 25px', maxWidth: '600px', margin: 'auto' }}>
              <CheckCircle2 size={48} color="#15803d" style={{ margin: '0 auto 15px' }} />
              <h2>Thank you for your order!</h2>
              <p className="muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
                Your order <b>#{lastPlacedOrder._id.slice(-7).toUpperCase()}</b> has been placed successfully.
              </p>
              <div style={{ background: 'var(--paper)', padding: '16px', border: '1px solid var(--line)', marginBottom: '25px', textAlign: 'left', fontSize: '12px' }}>
                <p><strong>Total Amount:</strong> {money(lastPlacedOrder.total)}</p>
                <p><strong>Payment Method:</strong> {lastPlacedOrder.paymentMethod === 'ONLINE' ? 'UPI Online Payment (Verification Pending)' : 'Cash on Delivery (COD)'}</p>
                <p><strong>Delivery Address:</strong> {lastPlacedOrder.shipping?.houseAddress}, {lastPlacedOrder.shipping?.city}, {lastPlacedOrder.shipping?.district}, {lastPlacedOrder.shipping?.state} - {lastPlacedOrder.shipping?.pincode}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="primary-btn" onClick={() => { setLastPlacedOrder(null); openAccount('orders'); }}>
                  Track Order <ArrowRight size={16} />
                </button>
                <button className="outline-btn" onClick={() => { setLastPlacedOrder(null); goShop('All'); }}>
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <div className="checkout-grid">
              {/* Delivery Address & Payment Form */}
              <form className="panel admin-form" onSubmit={handlePlaceOrder}>
                <p className="eyebrow">STEP 1 OF 2 · DELIVERY ADDRESS</p>

                <label>
                  Full Name *
                  <input
                    required
                    value={checkout.name}
                    onChange={e => setCheckout({ ...checkout, name: e.target.value })}
                    placeholder="e.g. Priyadarshini Reddy"
                  />
                </label>

                <label>
                  Mobile Number (10 digits) *
                  <input
                    required
                    pattern="[0-9]{10}"
                    value={checkout.phone}
                    onChange={e => setCheckout({ ...checkout, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                  />
                </label>

                <label>
                  House / Flat No., Building, Road Details *
                  <textarea
                    required
                    rows="2"
                    value={checkout.houseAddress}
                    onChange={e => setCheckout({ ...checkout, houseAddress: e.target.value })}
                    placeholder="Flat 302, Sri Sai Nilayam, Road No. 4..."
                  />
                </label>

                <div className="form-row">
                  <label>
                    Village / Town / City *
                    <input
                      required
                      value={checkout.city}
                      onChange={e => setCheckout({ ...checkout, city: e.target.value })}
                      placeholder="e.g. Hyderabad"
                    />
                  </label>
                  <label>
                    District *
                    <input
                      required
                      value={checkout.district}
                      onChange={e => setCheckout({ ...checkout, district: e.target.value })}
                      placeholder="e.g. Rangareddy"
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    State *
                    <input
                      required
                      value={checkout.state}
                      onChange={e => setCheckout({ ...checkout, state: e.target.value })}
                      placeholder="e.g. Telangana"
                    />
                  </label>
                  <label>
                    PIN Code (6 digits) *
                    <input
                      required
                      pattern="[0-9]{6}"
                      value={checkout.pincode}
                      onChange={e => setCheckout({ ...checkout, pincode: e.target.value })}
                      placeholder="e.g. 500081"
                    />
                  </label>
                </div>

                <p className="eyebrow" style={{ marginTop: '20px' }}>STEP 2 OF 2 · PAYMENT METHOD</p>

                {/* Payment Selector */}
                <div className="payment-selector">
                  <label className={`payment-option ${paymentMethod === 'COD' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <div className="payment-option-info">
                      <strong>Cash on Delivery (COD)</strong>
                      <p>Pay with cash or UPI to the courier agent upon arrival.</p>
                    </div>
                  </label>

                  <label className={`payment-option ${paymentMethod === 'ONLINE' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'ONLINE'}
                      onChange={() => setPaymentMethod('ONLINE')}
                    />
                    <div className="payment-option-info">
                      <strong>Online Payment / Direct UPI</strong>
                      <p>Scan boutique UPI QR code using PhonePe, Google Pay, Paytm, or BHIM.</p>
                    </div>
                  </label>
                </div>

                {/* UPI Details & QR Box */}
                {paymentMethod === 'ONLINE' && (
                  <div className="upi-details-box">
                    <div className="upi-header">
                      <div>
                        <strong style={{ fontSize: '13px' }}>Boutique UPI Transfer</strong>
                        <p className="muted" style={{ margin: '2px 0 0' }}>Payable: <b>{money(cartTotal)}</b></p>
                      </div>
                      <button
                        type="button"
                        className="upi-copy-pill"
                        onClick={() => {
                          navigator.clipboard.writeText(upiDetails.upiId);
                          setNotice(`Copied UPI ID: ${upiDetails.upiId}`);
                        }}
                      >
                        <Copy size={13} /> Copy UPI ID
                      </button>
                    </div>

                    <div className="qr-container">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${upiDetails.upiId}&pn=${encodeURIComponent(upiDetails.upiName)}&am=${cartTotal}&cu=INR`)}`}
                        alt="UPI QR Code"
                      />
                      <div className="qr-instructions">
                        <p style={{ margin: '0 0 6px' }}><b>Scan with any UPI App:</b></p>
                        <small>Google Pay · PhonePe · Paytm · BHIM</small>
                        <p style={{ margin: '8px 0 0', color: 'var(--wine)' }}>UPI ID: <b>{upiDetails.upiId}</b></p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
                      <label>
                        UPI Transaction Reference ID / UTR (12 digits) *
                        <input
                          required
                          value={upiDetails.utr}
                          onChange={e => setUpiDetails({ ...upiDetails, utr: e.target.value })}
                          placeholder="e.g. 428901847123"
                        />
                      </label>
                      <label>
                        Sender / Account Holder Name *
                        <input
                          required
                          value={upiDetails.customerName}
                          onChange={e => setUpiDetails({ ...upiDetails, customerName: e.target.value })}
                          placeholder="Name appearing in your UPI app"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <button disabled={orderSubmitting} className="primary-btn full" style={{ marginTop: '15px' }}>
                  {orderSubmitting ? 'Verifying & Submitting...' : `Confirm Order · ${money(cartTotal)}`} <ArrowRight size={16} />
                </button>
              </form>

              {/* Order Summary Column */}
              <div className="panel" style={{ height: 'fit-content' }}>
                <p className="eyebrow">YOUR SELECTION</p>
                <h2>Order Summary</h2>
                {cart.map(i => (
                  <div key={i.key} style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <strong style={{ fontSize: '12px' }}>{i.name}</strong>
                      <div className="muted" style={{ fontSize: '11px' }}>Size: {i.size} × {i.quantity}</div>
                    </div>
                    <strong>{money(i.price * i.quantity)}</strong>
                  </div>
                ))}

                <div style={{ marginTop: '18px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Subtotal</span>
                    <span>{money(cartSubtotal)}</span>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Delivery Charges</span>
                    <span>{shippingFee === 0 ? <b style={{ color: '#15803d' }}>Complimentary (FREE)</b> : money(shippingFee)}</span>
                  </p>
                  <hr style={{ border: '0', borderTop: '1px solid var(--line)', margin: '14px 0' }} />
                  <h3 style={{ display: 'flex', justifyContent: 'space-between', margin: '0', fontSize: '18px' }}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--wine)' }}>{money(cartTotal)}</span>
                  </h3>
                </div>

                <div style={{ marginTop: '25px', padding: '14px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  <ShieldCheck size={16} color="var(--wine)" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Every piece is inspected for quality and carefully packaged with love before dispatch.
                </div>
              </div>
            </div>
          )}
        </main>
      ) : page === 'account' ? (
        /* PAGE 3: CUSTOMER ACCOUNT / TRACKING */
        <main className="account-wrap">
          <div className="admin-top">
            <div>
              <p className="eyebrow">MY BOUTIQUE PROFILE</p>
              <h1>Hello, {user?.name}.</h1>
              <p className="muted">{user?.email} · Member since {new Date().getFullYear()}</p>
            </div>
            <button className="outline-btn" onClick={handleSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>

          <div className="tab-bar">
            <button className={`tab-btn ${accountTab === 'orders' ? 'active' : ''}`} onClick={() => setAccountTab('orders')}>
              <ShoppingBag size={15} /> My Orders ({customerOrders.length})
            </button>
            <button className={`tab-btn ${accountTab === 'support' ? 'active' : ''}`} onClick={() => setAccountTab('support')}>
              <MessageSquare size={15} /> Support & Inquiries ({customerQueries.length})
            </button>
            <button className={`tab-btn ${accountTab === 'profile' ? 'active' : ''}`} onClick={() => setAccountTab('profile')}>
              <UserRound size={15} /> Contact & Profile
            </button>
          </div>

          {accountTab === 'orders' && (
            <div>
              {customerOrders.length === 0 ? (
                <div className="panel empty-cart" style={{ padding: '60px 20px' }}>
                  <ShoppingBag size={48} color="var(--wine)" />
                  <h3>No orders yet.</h3>
                  <p className="muted">When you place an order, live tracking details will appear here.</p>
                  <button className="primary-btn" onClick={() => goShop('All')}>
                    Explore Collection <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                customerOrders.map(o => (
                  <div className="order-card" key={o._id}>
                    <div className="order-card-header">
                      <div>
                        <strong>ORDER #{o._id.slice(-7).toUpperCase()}</strong>
                        <span style={{ margin: '0 8px', color: 'var(--line)' }}>|</span>
                        <small className="muted">{new Date(o.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                      </div>
                      <span className={`status-pill status-${o.status.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </div>

                    {/* Visual Order Stepper */}
                    {o.status === 'CANCELLED' ? (
                      <div className="order-stepper">
                        <div className="step-node cancelled">
                          <div className="step-circle"><Ban size={14} /></div>
                          <span>Order Cancelled</span>
                        </div>
                      </div>
                    ) : (
                      <div className="order-stepper">
                        <div className={`step-node ${['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(o.status) ? 'completed' : ''}`}>
                          <div className="step-circle"><Clock size={14} /></div>
                          <span>Placed</span>
                        </div>
                        <div className={`step-node ${['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(o.status) ? 'completed' : ''}`}>
                          <div className="step-circle"><Check size={14} /></div>
                          <span>Accepted</span>
                        </div>
                        <div className={`step-node ${['SHIPPED', 'DELIVERED'].includes(o.status) ? 'completed' : ''}`}>
                          <div className="step-circle"><Truck size={14} /></div>
                          <span>Shipped</span>
                        </div>
                        <div className={`step-node ${o.status === 'DELIVERED' ? 'completed' : ''}`}>
                          <div className="step-circle"><CheckCircle2 size={14} /></div>
                          <span>Delivered</span>
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="order-items-grid">
                      {o.items?.map((it, idx) => (
                        <div className="order-item-mini" key={idx}>
                          {it.image ? (
                            <img src={it.image} alt={it.name} />
                          ) : (
                            <div className="no-product-image">No Image</div>
                          )}
                          <div>
                            <strong style={{ fontSize: '13px' }}>{it.name}</strong>
                            <div className="muted" style={{ fontSize: '11px' }}>Size: {it.size} · Quantity: {it.quantity}</div>
                            <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--wine)' }}>{money(it.price * it.quantity)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <div>
                        <span style={{ fontSize: '12px' }}>Paid via <b>{o.paymentMethod}</b> ({o.paymentStatus}) · </span>
                        <strong style={{ fontSize: '14px', color: 'var(--wine)' }}>Total: {money(o.total)}</strong>
                        <div className="muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          Delivering to: {o.shipping?.houseAddress}, {o.shipping?.city} ({o.shipping?.pincode})
                        </div>
                      </div>
                      <button
                        className="action-btn-sm"
                        onClick={() => {
                          setSupportForm({ queryType: 'Order Delay', orderId: o._id, subject: `Inquiry on Order #${o._id.slice(-7).toUpperCase()}`, message: '' });
                          setSupportModal(true);
                        }}
                      >
                        <MessageSquare size={13} /> Need Help with this Order?
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {accountTab === 'support' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p className="muted" style={{ margin: 0 }}>View your previous queries or raise a new request.</p>
                <button
                  className="primary-btn"
                  onClick={() => {
                    setSupportForm({ queryType: 'Product Query', orderId: '', subject: '', message: '' });
                    setSupportModal(true);
                  }}
                >
                  <Plus size={15} /> Raise Support Query
                </button>
              </div>

              {customerQueries.length === 0 ? (
                <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p className="muted">You have no open support requests.</p>
                </div>
              ) : (
                customerQueries.map(q => (
                  <div className="query-card" key={q._id}>
                    <div className="query-card-header">
                      <div>
                        <span className={`status-pill status-${q.status.toLowerCase()}`}>{q.status}</span>
                        <strong style={{ marginLeft: '10px' }}>{q.subject}</strong>
                      </div>
                      <small className="muted">{new Date(q.createdAt).toLocaleDateString()}</small>
                    </div>
                    <p style={{ fontSize: '12px', margin: '10px 0' }}>{q.message}</p>
                    {q.adminReply && (
                      <div className="query-admin-reply">
                        <strong>Store Admin Response:</strong> {q.adminReply}
                        <small style={{ display: 'block', marginTop: '4px', color: 'var(--muted)' }}>
                          Replied on {new Date(q.repliedAt || q.updatedAt).toLocaleDateString()}
                        </small>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {accountTab === 'profile' && (
            <div className="panel" style={{ maxWidth: '500px' }}>
              <p className="eyebrow">YOUR DETAILS</p>
              <h2>Personal Information</h2>
              <form
                className="admin-form"
                onSubmit={async e => {
                  e.preventDefault();
                  try {
                    const res = await request('/auth/profile', {
                      method: 'PATCH',
                      body: JSON.stringify({ name: user.name, phone: user.phone })
                    });
                    setUser(res.user);
                    setNotice('Profile details updated successfully.');
                  } catch (err) {
                    setNotice(err.message);
                  }
                }}
              >
                <label>
                  Full Name
                  <input
                    value={user.name || ''}
                    onChange={e => setUser({ ...user, name: e.target.value })}
                  />
                </label>
                <label>
                  Email Address
                  <input disabled value={user.email || ''} />
                </label>
                <label>
                  Phone Number
                  <input
                    value={user.phone || ''}
                    onChange={e => setUser({ ...user, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                  />
                </label>
                <button className="primary-btn" type="submit">
                  Save Changes <ArrowRight size={15} />
                </button>
              </form>
            </div>
          )}
        </main>
      ) : page === 'shop' ? (
        /* PAGE 4: FULL SHOPPING COLLECTION */
        <div className="shop-overlay">
          <div className="shop-head">
            <div>
              <p className="eyebrow">THE COMPLETE CATALOGUE</p>
              <h1>Find your <em>favourite.</em></h1>
            </div>
            <button className="icon-btn" onClick={() => setPage('home')}>
              <X />
            </button>
          </div>

          <div className="shop-controls">
            <div className="search-box">
              <Search />
              <input
                id="search-input"
                placeholder="Search kurtis, ethnic wear, dresses..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="category-pills">
              {categories.map(c => (
                <button
                  key={c}
                  className={category === c ? 'active' : ''}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid shop-products">
            {filteredProducts.map(p => (
              <ProductCard
                key={p._id}
                p={p}
                onOpen={() => { setSelectedProduct(p); setSelectedSize(p.sizes?.[0] || 'M'); }}
                onAdd={() => addToCart(p)}
                liked={wishlist.includes(p._id)}
                onLike={() => setWishlist(w => w.includes(p._id) ? w.filter(x => x !== p._id) : [...w, p._id])}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <p className="center muted" style={{ padding: '60px 0' }}>
              No pieces match your search. Try adjusting keywords or category filters.
            </p>
          )}
        </div>
      ) : (
        /* PAGE 5: HOME PAGE STOREFRONT */
        <main>
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-image" />
            <div className="hero-shade" />
            <div className="hero-copy">
              <p className="eyebrow light">THE NEW ETHNIC EDIT · 2026</p>
              <h1>Made for the<br /><em>moments</em> that<br />become memories.</h1>
              <p>Thoughtful silhouettes. Handpicked fabrics.<br />Everyday elegance, stitched with love.</p>
              <button className="light-btn hero-modern-btn" onClick={() => goShop('All')}>
               Explore the collection
              <ArrowRight size={16} />
              </button>
              <div className="hero-note">
                <span>01 / 03</span>
                <span className="hero-line" />
                <span>THE FESTIVE EDIT</span>
              </div>
            </div>
            <div className="hero-side-note">CRAFTED WITH LOVE · WORN WITH JOY</div>
          </section>

          {/* Trust Strip */}
          <section className="trust-strip">
            <div>
              <Truck />
              <span>Complimentary shipping<br /><small>On orders above ₹1,499</small></span>
            </div>
            <div>
              <ShieldCheck />
              <span>Thoughtful quality<br /><small>Made to be loved longer</small></span>
            </div>
            <div>
              <RefreshCw />
              <span>Dedicated care<br /><small>We’re here to help</small></span>
            </div>
          </section>

          {/* Categories Grid */}
          <section className="section categories-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FIND YOUR FEEL</p>
                <h2>Dress for <em>your story.</em></h2>
              </div>
              <button className="text-link" onClick={() => goShop('All')}>
                View all collections <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="category-grid">
              <button className="category-card cat-ethnic" onClick={() => goShop('Ethnic Wear')}>
                <span>01 / TIMELESS</span>
                <strong>Ethnic wear</strong>
                <small>Tradition, reimagined ↗</small>
              </button>
              <button className="category-card cat-kurti" onClick={() => goShop('Kurtis')}>
                <span>02 / EVERYDAY</span>
                <strong>Kurtis & sets</strong>
                <small>Your everyday favourite ↗</small>
              </button>
              <button className="category-card cat-dress" onClick={() => goShop('Dresses')}>
                <span>03 / STATEMENT</span>
                <strong>Dresses</strong>
                <small>Made to turn heads ↗</small>
              </button>
            </div>
          </section>

          {/* Featured Pieces */}
          <section className="section products-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE PIECES YOU’LL LOVE</p>
                <h2>Curated for <em>you.</em></h2>
                <p className="muted">Fresh boutique finds and forever favourites, in one place.</p>
              </div>
              <button className="text-link" onClick={() => goShop('All')}>
                Shop all <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="category-pills">
              {categories.map(c => (
                <button
                  key={c}
                  className={category === c ? 'active' : ''}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="product-grid">
              {filteredProducts.slice(0, 8).map(p => (
                <ProductCard
                  key={p._id}
                  p={p}
                  onOpen={() => { setSelectedProduct(p); setSelectedSize(p.sizes?.[0] || 'M'); }}
                  onAdd={() => addToCart(p)}
                  liked={wishlist.includes(p._id)}
                  onLike={() => setWishlist(w => w.includes(p._id) ? w.filter(x => x !== p._id) : [...w, p._id])}
                />
              ))}
            </div>

            <div className="center">
              <button className="outline-btn" onClick={() => goShop('All')}>
                Discover all pieces <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {/* Story Banner */}
          <section className="story-banner">
            <div className="story-photo" />
            <div className="story-copy">
              <p className="eyebrow">OUR LITTLE PROMISE</p>
              <h2>Every thread tells<br /><em>a story.</em></h2>
              <p>At Threads of Chaithu, we believe what you wear should feel as special as the moments you live in. Thoughtful details, wearable beauty, and a little love in every stitch.</p>
              <button className="text-link" onClick={() => setNotice('Threads of Chaithu — Handcrafted boutique fashion in India.')}>
                Get to know us <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {/* Newsletter */}
          <section className="newsletter">
            <p className="eyebrow">A NOTE FROM US</p>
            <h2>Good things, <em>in your inbox.</em></h2>
            <p>New collections, styling notes and little boutique surprises.</p>
            <form onSubmit={e => { e.preventDefault(); setNotice('Thank you! You are now subscribed to boutique updates.'); }}>
              <input type="email" required placeholder="Your email address" />
              <button className="primary-btn">Keep me in the loop <ArrowRight size={16} /></button>
            </form>
            <small>By subscribing, you agree to receive boutique announcements.</small>
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-brand">
          <span className="monogram">TC</span>
          <h2>THREADS OF CHAITHU</h2>
          <p>Where every thread tells a story.</p>
          <a href="https://www.instagram.com/threads_of_chaithu_/" target="_blank" rel="noreferrer">
            <Instagram size={18} /> @threads_of_chaithu_ <ArrowUpRight size={14} />
          </a>
        </div>
        <div>
          <strong>EXPLORE</strong>
          <button onClick={() => goShop('All')}>Shop all</button>
          <button onClick={() => goShop('New Arrivals')}>New arrivals</button>
          <button onClick={() => goShop('Ethnic Wear')}>Ethnic wear</button>
          <button onClick={() => goShop('Kurtis')}>Kurtis</button>
        </div>
        <div>
          <strong>HELP & INFO</strong>
          <button onClick={() => {
            if (user) { openAccount('support'); }
            else { setAuthModal({ open: true, mode: 'login' }); }
          }}>Customer Support</button>
          <button onClick={() => setNotice('Complimentary shipping on orders above ₹1,499 across India.')}>Shipping Policy</button>
          <button onClick={() => setNotice('Easy 7-day exchanges on unworn boutique items.')}>Exchanges & Returns</button>
        </div>
        <div>
          <strong>YOUR ACCOUNT</strong>
          <button onClick={() => user ? openAccount('orders') : setAuthModal({ open: true, mode: 'login' })}>
            {user ? 'My Account & Orders' : 'Sign In / Register'}
          </button>
          <button onClick={() => setCartOpen(true)}>Your Bag ({cartCount})</button>
          {user?.role === 'admin' && (
            <button onClick={() => openAdmin('overview')} style={{ color: '#e5c9a4', fontWeight: 'bold' }}>
              Admin Dashboard ↗
            </button>
          )}
        </div>
        <div className="copyright">
          <span>© 2026 Threads of Chaithu Boutique. All rights reserved.</span>
          <span>Thoughtfully made in India.</span>
        </div>
      </footer>

      {/* MODAL 1: PRODUCT DETAIL & QUICK VIEW */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close icon-btn" onClick={() => setSelectedProduct(null)}><X /></button>
            {selectedProduct.images?.[0]?.url ? (
              <img
                src={selectedProduct.images[0].url}
                alt={selectedProduct.name}
              />
            ) : (
              <div className="no-product-image">No Image</div>
            )}
            <div className="product-modal-info">
              <p className="eyebrow">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <div className="price-line">
                <strong>{money(selectedProduct.price)}</strong>
                {selectedProduct.compareAtPrice > selectedProduct.price && (
                  <>
                    <del>{money(selectedProduct.compareAtPrice)}</del>
                    <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 'bold', marginLeft: '6px' }}>
                      {Math.round(((selectedProduct.compareAtPrice - selectedProduct.price) / selectedProduct.compareAtPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p>{selectedProduct.description || 'Thoughtfully tailored silhouette with premium boutique finish.'}</p>

              <label className="size-label">Select Size</label>
              <div className="sizes">
                {(selectedProduct.sizes?.length ? selectedProduct.sizes : ['S', 'M', 'L', 'XL']).map(s => (
                  <button
                    className={selectedSize === s ? 'chosen' : ''}
                    key={s}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {selectedProduct.stock > 0 ? (
                <p className="stock-note" style={{ color: '#15803d' }}>
                  ✓ In Stock ({selectedProduct.stock} pieces available)
                </p>
              ) : (
                <p className="stock-note sold-out-text">
                  ✕ Currently Sold Out
                </p>
              )}

              <button
                disabled={selectedProduct.stock <= 0}
                className={`primary-btn full ${selectedProduct.stock <= 0 ? 'btn-disabled' : ''}`}
                onClick={() => addToCart(selectedProduct, selectedSize)}
              >
                {selectedProduct.stock > 0 ? (
                  <>Add to Bag · {money(selectedProduct.price)} <ShoppingBag size={17} /></>
                ) : (
                  'Sold Out'
                )}
              </button>
              <p className="muted tiny" style={{ marginTop: '14px' }}>
                Standard delivery in 3-5 business days. Color may vary slightly due to screen lighting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMMON SINGLE SIGN IN & REGISTRATION MODAL */}
      {authModal.open && (
        <div className="modal-backdrop" onClick={() => setAuthModal({ ...authModal, open: false })}>
          <div className="auth-modal modern-auth-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close icon-btn" onClick={() => setAuthModal({ ...authModal, open: false })}>
              <X />
            </button>
            <span className="monogram">TC</span>
            <p className="eyebrow">THREADS OF CHAITHU</p>
            <h2>{authModal.mode === 'signup' ? 'Create Your Account' : 'Welcome to Our Boutique.'}</h2>
            <p className="muted">
              {authModal.mode === 'signup'
                ? 'Join us for a personalized boutique shopping experience.'
                : 'Sign in to access your bag, order history, and store services.'}
            </p>

            <form className="admin-form" onSubmit={handleAuthSubmit}>
              {authModal.mode === 'signup' && (
                <>
                  <label>
                    Your Full Name *
                    <input
                      required
                      value={authForm.name}
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="e.g. Chaithu Reddy"
                    />
                  </label>
                  <label>
                    Mobile Phone (optional)
                    <input
                      value={authForm.phone}
                      onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                    />
                  </label>
                </>
              )}

              <label>
                Email Address *
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password *
                <input
                  type="password"
                  required
                  minLength="6"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Enter your password"
                />
              </label>

              <button disabled={authLoading} className="primary-btn full">
                {authLoading ? 'Verifying...' : authModal.mode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={16} />
              </button>
            </form>

            <p className="switch-auth">
              {authModal.mode === 'signup' ? 'Already have an account?' : 'New to Threads of Chaithu?'}
              {' '}
              <button
                type="button"
                onClick={() => setAuthModal({ ...authModal, mode: authModal.mode === 'signup' ? 'login' : 'signup' })}
              >
                {authModal.mode === 'signup' ? 'Sign In' : 'Create Account'}
              </button>
            </p>

            <div style={{ padding: '10px', background: 'var(--paper)', border: '1px solid var(--line)', marginTop: '15px', fontSize: '10px', color: 'var(--muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ShieldCheck size={18} color="var(--wine)" style={{ flexShrink: 0 }} />
              <span>
                One common sign-in for both customers and administrators. Store administrators are verified securely by the server environment.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER SUPPORT REQUEST MODAL */}
      {supportModal && (
        <div className="modal-backdrop" onClick={() => setSupportModal(false)}>
          <div className="auth-modal" style={{ width: 'min(520px, 92vw)' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close icon-btn" onClick={() => setSupportModal(false)}><X /></button>
            <p className="eyebrow">CUSTOMER CARE</p>
            <h2>How can we help you?</h2>
            <p className="muted">Submit an inquiry regarding orders, delivery, cancellation, or product sizing.</p>

            <form className="admin-form" onSubmit={handleSupportSubmit}>
              <label>
                Query Category *
                <select
                  value={supportForm.queryType}
                  onChange={e => setSupportForm({ ...supportForm, queryType: e.target.value })}
                >
                  <option>Order Delay</option>
                  <option>Cancel Order</option>
                  <option>Product Query</option>
                  <option>Payment Query</option>
                  <option>Other</option>
                </select>
              </label>

              {customerOrders.length > 0 && (
                <label>
                  Associated Order (optional)
                  <select
                    value={supportForm.orderId}
                    onChange={e => setSupportForm({ ...supportForm, orderId: e.target.value })}
                  >
                    <option value="">None / General Inquiry</option>
                    {customerOrders.map(o => (
                      <option key={o._id} value={o._id}>
                        Order #{o._id.slice(-7).toUpperCase()} ({money(o.total)}) - {o.status}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Subject *
                <input
                  required
                  value={supportForm.subject}
                  onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="e.g. Question about delivery timeline"
                />
              </label>

              <label>
                Message & Details *
                <textarea
                  required
                  rows="4"
                  value={supportForm.message}
                  onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Please describe your query in detail..."
                />
              </label>

              <button className="primary-btn full">
                Submit Request <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADMIN REPLY TO QUERY MODAL */}
      {replyQueryModal && (
        <div className="modal-backdrop" onClick={() => setReplyQueryModal(null)}>
          <div className="auth-modal" style={{ width: 'min(540px, 92vw)' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close icon-btn" onClick={() => setReplyQueryModal(null)}><X /></button>
            <p className="eyebrow">SUPPORT RESPONSE</p>
            <h2>Reply to {replyQueryModal.customer?.name}</h2>
            <div style={{ background: 'var(--paper)', padding: '12px', border: '1px solid var(--line)', marginBottom: '15px', fontSize: '11px' }}>
              <p><b>Category:</b> {replyQueryModal.queryType}</p>
              <p><b>Subject:</b> {replyQueryModal.subject}</p>
              <p><b>Message:</b> {replyQueryModal.message}</p>
            </div>

            <form className="admin-form" onSubmit={handleAdminReplySubmit}>
              <label>
                Update Ticket Status
                <select value={adminReplyStatus} onChange={e => setAdminReplyStatus(e.target.value)}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>

              <label>
                Response to Customer *
                <textarea
                  required
                  rows="4"
                  value={adminReplyText}
                  onChange={e => setAdminReplyText(e.target.value)}
                  placeholder="Type your official boutique response to the customer..."
                />
              </label>

              <button className="primary-btn full">
                Send Response to Customer <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRMATION MODAL FOR DESTRUCTIVE ACTIONS */}
      {confirmDialog.open && (
        <div className="modal-backdrop" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <AlertCircle size={36} color="#b91c1c" style={{ margin: '0 auto 12px' }} />
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button
                className="outline-btn"
                onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              >
                Go Back
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const cb = confirmDialog.onConfirm;
                  setConfirmDialog({ ...confirmDialog, open: false });
                  if (cb) cb();
                }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: SHOPPING CART DRAWER */}
      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">YOUR SELECTION</p>
                <h2>Your Bag ({cartCount})</h2>
              </div>
              <button className="icon-btn" onClick={() => setCartOpen(false)}><X /></button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={42} />
                <h3>Your bag is waiting.</h3>
                <p className="muted">A beautiful boutique piece might be just around the corner.</p>
                <button className="primary-btn" onClick={() => { setCartOpen(false); goShop('All'); }}>
                  Explore the Collection
                </button>
              </div>
            ) : (
              <>
                {/* Complimentary shipping bar */}
                <div style={{ background: '#f5efe6', padding: '10px 14px', borderRadius: '4px', margin: '14px 0 6px', fontSize: '11px', color: 'var(--wine)' }}>
                  {cartSubtotal >= 1499 ? (
                    <span>🎉 You have unlocked <b>Complimentary Free Shipping!</b></span>
                  ) : (
                    <span>Add <b>{money(1499 - cartSubtotal)}</b> more for Free Shipping!</span>
                  )}
                </div>

                <div className="cart-items">
                  {cart.map(i => (
                    <div className="cart-item" key={i.key}>
                      {i.image ? (
                        <img src={i.image} alt={i.name} />
                      ) : (
                        <div className="no-product-image">No Image</div>
                      )}
                      <div className="cart-item-info">
                        <strong>{i.name}</strong>
                        <small>Size: {i.size}</small>
                        <div className="qty">
                          <button onClick={() => updateCartQty(i.key, -1)}>−</button>
                          <span>{i.quantity}</span>
                          <button onClick={() => updateCartQty(i.key, 1)}>+</button>
                          <button className="remove" onClick={() => removeCartItem(i.key)}>Remove</button>
                        </div>
                      </div>
                      <strong>{money(i.price * i.quantity)}</strong>
                    </div>
                  ))}
                </div>

                <div className="drawer-total">
                  <p>
                    <span>Subtotal</span>
                    <strong>{money(cartSubtotal)}</strong>
                  </p>
                  <p style={{ margin: '6px 0 12px' }}>
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? <b style={{ color: '#15803d' }}>FREE</b> : money(shippingFee)}</span>
                  </p>
                  <button
                    className="primary-btn full"
                    onClick={() => {
                      setCartOpen(false);
                      setPage('checkout');
                    }}
                  >
                    Continue to Checkout · {money(cartTotal)} <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* TOAST ALERTS */}
      {notice && (
        <div className="toast">
          <Check size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

// Product Card Component with Sold Out detection
function ProductCard({ p, onOpen, onAdd, liked, onLike }) {
  const isSoldOut = p.stock <= 0;

  return (
    <article className="product-card modern-product-card">
      <button className="product-image modern-product-image" onClick={onOpen}>
        {p.images?.[0]?.url ? (
          <img
            loading="lazy"
            src={p.images[0].url}
            alt={p.name}
          />
        ) : (
          <div className="no-product-image">No Image</div>
        )}
        {isSoldOut ? (
          <span className="sold-out-badge">SOLD OUT</span>
        ) : (
          <span className="product-tag">{p.featured ? 'EDITOR’S PICK' : p.category}</span>
        )}
      </button>

      <button className={`heart-btn ${liked ? 'liked' : ''}`} onClick={onLike} aria-label="Wishlist">
        <Heart fill={liked ? 'currentColor' : 'none'} />
      </button>

      <div className="product-info">
        <button className="product-name" onClick={onOpen}>{p.name}</button>
        <p>{p.category}</p>
        <div className="product-price">
          <strong>{money(p.price)}</strong>
          {p.compareAtPrice > p.price && <del>{money(p.compareAtPrice)}</del>}
        </div>

        {isSoldOut ? (
          <button className="quick-add" disabled style={{ opacity: 0.5, cursor: 'not-allowed', color: '#b91c1c' }}>
            Sold Out
          </button>
        ) : (
          <button className="quick-add" onClick={onAdd}>
            Quick Add <Plus size={15} />
          </button>
        )}
      </div>
    </article>
  );
}

createRoot(document.getElementById('root')).render(<App />);
