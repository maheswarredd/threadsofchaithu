# Threads of Chaithu Boutique — Full-Stack MERN E-Commerce

A professional, responsive full-stack MERN e-commerce application for **Threads of Chaithu Boutique**, designed for mobile, tablet, and desktop.

## ✨ Key Features & Architecture

1. **Unified Common Sign In (Customer & Administrator)**:
   - Exactly **one single sign-in page/modal** for all users. There is no separate admin login route.
   - Customers and administrators log in through the same credentials form.
   - The backend securely determines the role from the database.
   - If the authenticated role is `admin`, the frontend automatically navigates to the **Admin Control Center / Dashboard**.
   - If the authenticated role is `customer`, the user is directed to the customer storefront / account.
   - Administrator accounts are provisioned exclusively from the server environment (`ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`). Admin credentials are never exposed in client code.

2. **Automated Server Bootstrap & Database Management**:
   - Resolves dotenv loading reliably regardless of invocation directory.
   - Validates `MONGODB_URI` before connecting and displays clear configuration guidance.
   - Server startup automatically provisions/synchronizes the environment-defined administrator in MongoDB and seeds initial boutique products if inventory is empty.

3. **Boutique Shopping Experience**:
   - Browse curated collections (Kurtis, Ethnic Wear, Dresses, Tops, New Arrivals).
   - Real-time search across names, categories, and descriptions.
   - Detailed product view with size selector, pricing, discount calculation, and stock availability.
   - **Sold-out pieces** cannot be ordered; the UI displays clear "Sold Out" badges and disables checkout.

4. **Cart & Secure Checkout Flow**:
   - Slide-out cart drawer with live quantity controls, subtotal, and complimentary shipping progress (free above ₹1,499).
   - Professional delivery address form validating:
     - Full Name, 10-digit Phone, House/Flat/Road address details, Village/Town/City, District, State, and 6-digit PIN code.
   - Dual payment methods:
     - **Cash on Delivery (COD)**
     - **Online Payment / UPI**: Displays boutique UPI ID (`threadsofchaithu@oksbi`), payee name, one-click copy, dynamic QR code, and requires mandatory 12-digit UTR/transaction reference ID and sender account name.
   - Atomic inventory deduction upon order placement.

5. **Professional Admin Control Center**:
   - **Overview**: Real-time statistics on total orders, revenue, pending/placed, confirmed, shipped, delivered, cancelled, active items, low stock alerts, and customer counts.
   - **Order Fulfillment**: Complete order lifecycle actions:
     - **Accept Order** (moves to `CONFIRMED`)
     - **Ship Order** (moves to `SHIPPED`)
     - **Mark as Delivered** (moves to `DELIVERED`)
     - **Cancel Order** (with confirmation dialog; automatically restores inventory stock)
   - **Catalogue Management**: Add new boutique pieces, edit existing prices, stock, categories, sizes, colors, and Cloudinary/direct image URLs, or delete products with confirmation.
   - **Customer Care**: Ticket resolution system to review customer inquiries and send responses with automatic email & notification triggers.
   - **Store Settings**: Real-time configuration audit.

6. **Customer Account & Order Tracking**:
   - "My Orders" tab with visual 4-stage tracking stepper (`Placed` → `Accepted` → `Shipped` → `Delivered`).
   - Order history with full item breakdown, totals, and delivery details.
   - In-app Customer Support ticketing (Order Delay, Cancel Order, Product Query, Payment Query).

7. **In-App Notification Center & Sound Alerts**:
   - Notification bell in header with unread badge counter.
   - Real-time event notifications for both customers and administrators.
   - Browser-safe Web Audio API chime for store notifications.

8. **Transactional Email**:
   - Brevo / Nodemailer integration for order confirmation, order acceptance, dispatch, delivery, and support responses.
   - Graceful fallback: If credentials are not present, logs clear warning and continues normal execution without crashing.

---

## 🚀 Local Development Setup

### 1. Server Configuration
```bash
cd server
# Copy example env
cp .env.example .env
```
Ensure `server/.env` contains your `MONGODB_URI` and desired admin credentials:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/threads_boutique?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
JWT_SECRET=tc_super_boutique_secure_jwt_secret_key_2026_9988
COOKIE_SECURE=false

ADMIN_EMAIL=admin@threadsofchaithu.example
ADMIN_INITIAL_PASSWORD=Admin123
ADMIN_NAME=Threads Admin

UPI_ID=threadsofchaithu@oksbi
UPI_PAYEE_NAME=Threads of Chaithu Boutique
```

### 2. Start Backend API
```bash
cd server
npm install
npm run dev
```
*(On boot, the server connects to MongoDB, auto-ensures the admin account, seeds initial catalogue, and listens on port 5000)*

### 3. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Credentials for Testing

- **Administrator Account** (from server `.env`):
  - Email: `admin@threadsofchaithu.example`
  - Password: `Admin123`
  - *Logs into Admin Dashboard directly through the standard Sign In form.*
- **Customer Account**:
  - Click "Sign In / Register" → "Create Account" to register as a customer.
  - *Logs into Customer Storefront and My Account.*

---

## ☁️ Deployment (Render / Production)

The repository includes a ready-to-use [`render.yaml`](render.yaml) configuration:
1. Push this repository to GitHub or GitLab.
2. In [Render Dashboard](https://dashboard.render.com), choose **New → Blueprint**.
3. Select your repository. Render will automatically configure:
   - **`threads-of-chaithu-api`** (Node.js Web Service)
   - **`threads-of-chaithu-client`** (Static Site)
4. Set your private environment variables in Render:
   - `MONGODB_URI`
   - `ADMIN_EMAIL`
   - `ADMIN_INITIAL_PASSWORD`
   - `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL` (optional)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional)
