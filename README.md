# 🥦 MD FRESH - 10-Minute Farm-Fresh Grocery Delivery Platform

A production-grade, instant grocery delivery web application built with **Next.js 16**, **Tailwind CSS**, **Zustand**, **SQLite/Supabase REST engine**, **Razorpay Official Payment Gateway & Universal UPI Deep Linking**, **HTML5 GPS Geolocation**, and a **Multi-Branch Dark Store Order Dispatch Terminal**.

---

## 🌟 Key Features

### 🛒 1. Customer Storefront & Catalog
- **Farm-Fresh Produce**: High-resolution image catalog of fruits, vegetables, and daily essentials with quantity controls, discounts, and real-time stock indicators.
- **Smart Cart System**: Persistent local cart store with dynamic subtotal, handling fee, and threshold-based free delivery calculation.
- **Search & Filter**: Real-time product search and category filters.

### 📍 2. Bulletproof GPS & Multi-Branch Nearest Store Routing
- **GPS Geolocation**: HTML5 `navigator.geolocation` with OpenStreetMap Nominatim reverse geocoding and BigDataCloud fallback.
- **Multi-Branch Dark Store Engine**: 5 strategically placed fulfillment hubs in Bengaluru (Indiranagar, Koramangala, HSR Layout, Whitefield, Jayanagar).
- **Haversine Distance**: Dynamically calculates geodesic distance in sub-milliseconds and assigns every order to the geographically nearest dark store.
- **Dynamic Delivery ETA**: Live transit estimates (9 to 25 minutes).

### 💳 3. Payment Gateway & Unified UPI Integration
- **Razorpay Standard Checkout**: Official SDK checkout supporting UPI, Credit/Debit Cards, NetBanking, and Wallets.
- **Direct UPI App Deep Linking**: Instant app launching for **PhonePe**, **Google Pay**, **Paytm**, and **BHIM**.
- **Dynamic NPCI QR Code**: Real-time scannable UPI QR code generation with exact order amount and order reference token.
- **Cash on Delivery (COD)**: Doorstep cash settlement with instant order placement.

### 🏬 4. Shop Manager Order Receiving & Dispatch Terminal (`/admin`)
- **Live Dispatch Dashboard**: Auto-syncing terminal receiving customer orders in real-time.
- **Multi-Branch Filtering**: Branch-specific order views and dark store management.
- **3-Stage Dispatch Workflow**:
  1. `Accept & Start Packing` (Manager approval)
  2. `Dispatch / Hand to Rider` (Out for delivery)
  3. `Mark as Delivered` (Completed)
- **Inventory Management**: Add, update, stock manage products with camera snapshot upload.
- **Razorpay Gateway Manager**: Dynamic test/live API key credentials manager.

### 🚀 5. Customer Live Order Tracker (`/success`)
- **4-Stage Visual Progress Bar**: Placed &rarr; Approved &rarr; On Way &rarr; Delivered.
- **Live Sync Polling**: Real-time updates as the shop manager updates order status.
- **Fulfillment Info**: Displays the assigned store branch name and exact distance.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Server & Client Components)
- **Styling**: Tailwind CSS, Lucide React Icons, Framer Motion
- **State Management**: Zustand
- **Database**: SQLite (Node.js `node:sqlite`) with PostgREST-compatible REST API
- **Payments**: Razorpay Official SDK, UPI Standard Intents, Dynamic NPCI QR, Stripe
- **Geolocation**: OpenStreetMap Nominatim, BigDataCloud Reverse Geocoding, Haversine Engine

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Start Local Database Server
```bash
node scripts/local-db.mjs
```
*The local database server runs on `http://127.0.0.1:54321` and automatically initializes tables and seed products.*

### 4. Start Next.js Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the storefront, and [http://localhost:3000/admin](http://localhost:3000/admin) for the Shop Manager Dispatch Terminal.

