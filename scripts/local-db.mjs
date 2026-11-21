import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = 54321;
const HOST = '127.0.0.1';
const DB_FILE = path.join(rootDir, 'supabase', 'fruitmart.sqlite');
const UPLOADS_DIR = path.join(rootDir, 'public', 'images', 'uploads');

if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    unit TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'In Stock',
    image TEXT NOT NULL,
    description TEXT,
    rating REAL DEFAULT 4.8,
    reviews INTEGER DEFAULT 24,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    handling_fee REAL NOT NULL,
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Paid',
    stripe_payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    assigned_branch_id TEXT,
    assigned_branch_name TEXT,
    branch_distance_km REAL,
    status TEXT NOT NULL DEFAULT 'received',
    delivery_notes TEXT,
    upi_utr_number TEXT,
    payment_verified_via TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS qr_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    upi_id TEXT NOT NULL,
    customer_phone TEXT,
    utr_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    verified_via TEXT,
    created_at TEXT NOT NULL,
    verified_at TEXT
  );
`);

// Ensure migration for Razorpay & UPI columns if table already existed
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN razorpay_signature TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN assigned_branch_id TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN assigned_branch_name TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN branch_distance_km REAL;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN upi_utr_number TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN payment_verified_via TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN rider_name TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN rider_phone TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN arrival_time TEXT;
  `);
} catch (e) {}
try {
  db.exec(`
    ALTER TABLE orders ADD COLUMN payment_collected_by TEXT;
  `);
} catch (e) {}

// Seed initial products if table is empty
const countResult = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (countResult.count === 0) {
  console.log('Seeding initial products into local SQLite database...');
  const initialProducts = [
    { name: 'Red Apples', category: 'Fruits', price: 120, original_price: 150, unit: 'kg', stock: 150, image: '/images/products/apples.jpg', description: 'Fresh, crisp red apples sourced directly from farms. Rich in fiber and vitamin C.' },
    { name: 'Bananas', category: 'Fruits', price: 50, original_price: null, unit: 'dozen', stock: 200, image: '/images/products/bananas.png', description: 'Bright yellow bananas, perfectly ripe. High in potassium and natural sugars.' },
    { name: 'Mangoes', category: 'Fruits', price: 150, original_price: 180, unit: 'kg', stock: 100, image: '/images/products/mangoes.jpg', description: 'Golden mangoes, the king of fruits. Seasonal specialty with sweet, juicy flesh.' },
    { name: 'Oranges', category: 'Fruits', price: 80, original_price: null, unit: 'kg', stock: 120, image: '/images/products/oranges.jpg', description: 'Juicy, sweet oranges packed with vitamin C. Great for fresh juice or eating whole.' },
    { name: 'Strawberries', category: 'Fruits', price: 180, original_price: 220, unit: 'box', stock: 60, image: '/images/products/strawberries.jpg', description: 'Fresh, red strawberries with natural sweetness. Rich in vitamin C and antioxidants.' },
    { name: 'Green Grapes', category: 'Fruits', price: 150, original_price: null, unit: 'kg', stock: 80, image: '/images/products/green-grapes.png', description: 'Crisp, seedless green grapes. Sweet and refreshing. Perfect for snacking or desserts.' },
    { name: 'Watermelon', category: 'Fruits', price: 40, original_price: null, unit: 'piece', stock: 110, image: '/images/products/watermelon.png', description: 'Large, sweet watermelons. 92% water content, perfect for hydration in summer.' },
    { name: 'Papaya', category: 'Fruits', price: 60, original_price: null, unit: 'piece', stock: 90, image: '/images/products/papaya.jpg', description: 'Golden, sweet papayas. Aids digestion with natural enzymes. Rich in vitamin A and C.' },
    { name: 'Pineapple', category: 'Fruits', price: 70, original_price: 90, unit: 'piece', stock: 75, image: '/images/products/pineapple.jpg', description: 'Fresh, juicy pineapples with natural sweetness. High in vitamin C and bromelain.' },
    { name: 'Pomegranate', category: 'Fruits', price: 180, original_price: null, unit: 'piece', stock: 50, image: '/images/products/pomegranate.png', description: 'Ruby red pomegranates, full of antioxidants. Packed with arils. Premium quality fruit.' },
    { name: 'Tomato', category: 'Vegetables', price: 48, original_price: 60, unit: 'kg', stock: 220, image: '/images/products/tomatoes.jpg', description: 'Fresh red tomatoes, juicy and flavorful. Essential for Indian cooking. Rich in lycopene.' },
    { name: 'Potato', category: 'Vegetables', price: 25, original_price: null, unit: 'kg', stock: 300, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop', description: 'Starchy potatoes, versatile staple vegetable. Perfect for cooking, frying, boiling.' },
    { name: 'Onion', category: 'Vegetables', price: 70, original_price: null, unit: 'kg', stock: 250, image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=400&fit=crop', description: 'Fresh red onions with strong flavor. Essential for Indian cooking. Long storage life.' },
    { name: 'Spinach', category: 'Vegetables', price: 35, original_price: null, unit: 'bunch', stock: 140, image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop', description: 'Fresh green spinach, nutrient-dense leafy green. Rich in iron and calcium.' },
    { name: 'Carrot', category: 'Vegetables', price: 45, original_price: 55, unit: 'kg', stock: 180, image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop', description: 'Bright orange carrots, sweet and crunchy. High in beta-carotene. Great for eyes and skin.' },
    { name: 'Capsicum', category: 'Vegetables', price: 45, original_price: null, unit: 'kg', stock: 140, image: '/images/products/capsicum.jpg', description: 'Colorful bell peppers (green). Sweet and crunchy. Great for salads and cooking.' },
    { name: 'Cauliflower', category: 'Vegetables', price: 40, original_price: null, unit: 'piece', stock: 90, image: '/images/products/cauliflower.jpg', description: 'Fresh cauliflower head, white and dense. Low carb, keto-friendly. Great roasted or curried.' },
    { name: 'Broccoli', category: 'Vegetables', price: 55, original_price: 70, unit: 'piece', stock: 70, image: '/images/products/broccoli.png', description: 'Fresh, green broccoli crowns. Nutrient-dense superfood. Great for immunity and health.' },
    { name: 'Cucumber', category: 'Vegetables', price: 35, original_price: null, unit: 'kg', stock: 130, image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&h=400&fit=crop', description: 'Cool, refreshing cucumbers. Mostly water, hydrating vegetable. Perfect for salads and pickles.' },
    { name: 'Green Chilli', category: 'Vegetables', price: 83, original_price: null, unit: 'kg', stock: 85, image: '/images/products/green-chilli.jpg', description: 'Spicy green chillies, sharp heat. Essential for Indian cooking. High in vitamin C.' }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO products (name, category, price, original_price, unit, stock, status, image, description, rating, reviews, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of initialProducts) {
    insertStmt.run(
      p.name,
      p.category,
      p.price,
      p.original_price,
      p.unit,
      p.stock,
      p.stock > 0 ? 'In Stock' : 'Out of Stock',
      p.image,
      p.description,
      4.8,
      24,
      new Date().toISOString()
    );
  }
  console.log(`Seeded ${initialProducts.length} products successfully.`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(buffer.toString('utf8')));
        } catch (e) {
          resolve({});
        }
      } else {
        resolve(buffer);
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || HOST}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. PostgREST /rest/v1/products endpoint
  if (pathname === '/rest/v1/products') {
    try {
      // GET products with filtering and sorting
      if (req.method === 'GET') {
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        // Check for filters
        for (const [key, val] of searchParams.entries()) {
          if (key === 'select' || key === 'order') continue;
          if (key === 'id') {
            if (val.startsWith('eq.')) {
              sql += ' AND id = ?';
              params.push(Number(val.slice(3)));
            }
          } else if (key === 'category') {
            if (val.startsWith('ilike.')) {
              sql += ' AND LOWER(category) = LOWER(?)';
              params.push(val.slice(6));
            } else if (val.startsWith('eq.')) {
              sql += ' AND category = ?';
              params.push(val.slice(3));
            }
          } else if (key === 'name') {
            if (val.startsWith('ilike.')) {
              let pattern = val.slice(6);
              try {
                pattern = decodeURIComponent(pattern);
              } catch (e) {
                // Ignore decoding error
              }
              pattern = pattern.replace(/^\*|\*$/g, '%');
              sql += ' AND LOWER(name) LIKE LOWER(?)';
              params.push(pattern);
            }
          }
        }

        // Check for order
        const orderParam = searchParams.get('order');
        if (orderParam) {
          const parts = orderParam.split(',').map(part => {
            const [col, dir] = part.split('.');
            const safeCol = ['id', 'name', 'category', 'price', 'stock', 'created_at'].includes(col) ? col : 'id';
            const safeDir = (dir && dir.toLowerCase().startsWith('desc')) ? 'DESC' : 'ASC';
            return `${safeCol} ${safeDir}`;
          });
          sql += ' ORDER BY ' + parts.join(', ');
        } else {
          sql += ' ORDER BY id ASC';
        }

        const rows = db.prepare(sql).all(...params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
      }

      // POST create product(s) or upsert
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const items = Array.isArray(body) ? body : [body];
        const inserted = [];

        const insertStmt = db.prepare(`
          INSERT INTO products (name, category, price, original_price, unit, stock, status, image, description, rating, reviews, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            price = excluded.price,
            stock = excluded.stock,
            status = excluded.status,
            image = excluded.image,
            category = excluded.category,
            description = excluded.description
        `);

        for (const item of items) {
          const name = item.name;
          const category = item.category || 'Fruits';
          const price = Number(item.price || 0);
          const original_price = item.original_price ? Number(item.original_price) : null;
          const unit = item.unit || 'kg';
          const stock = Number(item.stock || 0);
          const status = item.status || (stock > 0 ? 'In Stock' : 'Out of Stock');
          const image = item.image || '/images/products/apples.jpg';
          const description = item.description || `${name} - Fresh and farm-picked directly for you.`;
          const rating = item.rating ? Number(item.rating) : 4.8;
          const reviews = item.reviews ? Number(item.reviews) : 24;
          const created_at = new Date().toISOString();

          insertStmt.run(name, category, price, original_price, unit, stock, status, image, description, rating, reviews, created_at);
          const row = db.prepare('SELECT * FROM products WHERE name = ?').get(name);
          inserted.push(row);
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(inserted));
        return;
      }

      // PATCH update product
      if (req.method === 'PATCH') {
        const body = await parseBody(req);
        let id = null;
        for (const [key, val] of searchParams.entries()) {
          if (key === 'id' && val.startsWith('eq.')) {
            id = Number(val.slice(3));
          }
        }

        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id for PATCH' }));
          return;
        }

        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(body)) {
          if (['name', 'category', 'price', 'original_price', 'unit', 'stock', 'status', 'image', 'description', 'rating', 'reviews'].includes(key)) {
            updates.push(`${key} = ?`);
            params.push(val);
          }
        }

        if (updates.length > 0) {
          params.push(id);
          db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const updatedRow = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([updatedRow]));
        return;
      }

      // DELETE product
      if (req.method === 'DELETE') {
        let id = null;
        for (const [key, val] of searchParams.entries()) {
          if (key === 'id' && val.startsWith('eq.')) {
            id = Number(val.slice(3));
          }
        }

        if (id) {
          db.prepare('DELETE FROM products WHERE id = ?').run(id);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
    } catch (err) {
      console.error('Database error in /rest/v1/products:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 1b. PostgREST /rest/v1/orders endpoint
  if (pathname === '/rest/v1/orders') {
    try {
      // GET orders
      if (req.method === 'GET') {
        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        for (const [key, val] of searchParams.entries()) {
          if (key === 'select' || key === 'order') continue;
          if (key === 'id') {
            if (val.startsWith('eq.')) {
              sql += ' AND id = ?';
              params.push(val.slice(3));
            }
          } else if (key === 'status') {
            if (val.startsWith('eq.')) {
              sql += ' AND status = ?';
              params.push(val.slice(3));
            }
          } else if (key === 'assigned_branch_id') {
            if (val.startsWith('eq.')) {
              sql += ' AND assigned_branch_id = ?';
              params.push(val.slice(3));
            }
          } else if (key === 'upi_utr_number') {
            if (val.startsWith('eq.')) {
              sql += ' AND upi_utr_number = ?';
              params.push(val.slice(3));
            }
          }
        }

        const orderParam = searchParams.get('order');
        if (orderParam && orderParam.includes('asc')) {
          sql += ' ORDER BY created_at ASC';
        } else {
          sql += ' ORDER BY created_at DESC';
        }

        const rows = db.prepare(sql).all(...params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
      }

      // POST create order
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const item = Array.isArray(body) ? body[0] : body;

        const id = item.id || `MD-${Date.now().toString().slice(-6)}`;
        const customer_name = item.customer_name || 'Customer';
        const customer_phone = item.customer_phone || '+91 9876543210';
        const delivery_address = item.delivery_address || 'Bengaluru, Karnataka';
        const latitude = item.latitude ? Number(item.latitude) : null;
        const longitude = item.longitude ? Number(item.longitude) : null;
        const items = typeof item.items === 'string' ? item.items : JSON.stringify(item.items || []);
        const subtotal = Number(item.subtotal || item.total_amount || 0);
        const delivery_fee = Number(item.delivery_fee || 0);
        const handling_fee = Number(item.handling_fee || 2);
        const total_amount = Number(item.total_amount || (subtotal + delivery_fee + handling_fee));
        const payment_method = item.payment_method || 'Online';
        const payment_status = item.payment_status || (payment_method.includes('Cash') ? 'Pending (COD)' : 'Paid');
        const stripe_payment_id = item.stripe_payment_id || null;
        const razorpay_order_id = item.razorpay_order_id || null;
        const razorpay_payment_id = item.razorpay_payment_id || null;
        const razorpay_signature = item.razorpay_signature || null;
        const assigned_branch_id = item.assigned_branch_id || null;
        const assigned_branch_name = item.assigned_branch_name || null;
        const branch_distance_km = item.branch_distance_km != null ? Number(item.branch_distance_km) : null;
        const upi_utr_number = item.upi_utr_number || null;
        const payment_verified_via = item.payment_verified_via || null;
        const status = item.status || 'received';
        const delivery_notes = item.delivery_notes || '';
        const created_at = item.created_at || new Date().toISOString();
        const updated_at = new Date().toISOString();

        const insertStmt = db.prepare(`
          INSERT INTO orders (
            id, customer_name, customer_phone, delivery_address, latitude, longitude,
            items, subtotal, delivery_fee, handling_fee, total_amount, payment_method,
            payment_status, stripe_payment_id, razorpay_order_id, razorpay_payment_id,
            razorpay_signature, assigned_branch_id, assigned_branch_name, branch_distance_km,
            upi_utr_number, payment_verified_via, status, delivery_notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
          id, customer_name, customer_phone, delivery_address, latitude, longitude,
          items, subtotal, delivery_fee, handling_fee, total_amount, payment_method,
          payment_status, stripe_payment_id, razorpay_order_id, razorpay_payment_id,
          razorpay_signature, assigned_branch_id, assigned_branch_name, branch_distance_km,
          upi_utr_number, payment_verified_via, status, delivery_notes, created_at, updated_at
        );

        const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        console.log(`[Order Created] ID: ${id}, Branch: ${assigned_branch_name || 'N/A'}, Amount: ₹${total_amount}`);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([newOrder]));
        return;
      }

      // PATCH update order status
      if (req.method === 'PATCH') {
        const body = await parseBody(req);
        let id = null;
        for (const [key, val] of searchParams.entries()) {
          if (key === 'id' && val.startsWith('eq.')) {
            id = val.slice(3);
          }
        }

        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id for PATCH' }));
          return;
        }

        const updates = ['updated_at = ?'];
        const params = [new Date().toISOString()];

        if (body.status) {
          updates.push('status = ?');
          params.push(body.status);
        }
        if (body.payment_status) {
          updates.push('payment_status = ?');
          params.push(body.payment_status);
        }
        if (body.assigned_branch_id) {
          updates.push('assigned_branch_id = ?');
          params.push(body.assigned_branch_id);
        }
        if (body.assigned_branch_name) {
          updates.push('assigned_branch_name = ?');
          params.push(body.assigned_branch_name);
        }
        if (body.branch_distance_km != null) {
          updates.push('branch_distance_km = ?');
          params.push(Number(body.branch_distance_km));
        }
        if (body.upi_utr_number) {
          updates.push('upi_utr_number = ?');
          params.push(body.upi_utr_number);
        }
        if (body.payment_verified_via) {
          updates.push('payment_verified_via = ?');
          params.push(body.payment_verified_via);
        }
        if (body.payment_method) {
          updates.push('payment_method = ?');
          params.push(body.payment_method);
        }
        if (body.rider_name) {
          updates.push('rider_name = ?');
          params.push(body.rider_name);
        }
        if (body.rider_phone) {
          updates.push('rider_phone = ?');
          params.push(body.rider_phone);
        }
        if (body.arrival_time) {
          updates.push('arrival_time = ?');
          params.push(body.arrival_time);
        }
        if (body.payment_collected_by) {
          updates.push('payment_collected_by = ?');
          params.push(body.payment_collected_by);
        }

        params.push(id);
        db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        console.log(`[Order Updated] ID: ${id}, New Status: ${body.status}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([updatedOrder]));
        return;
      }

      // DELETE order
      if (req.method === 'DELETE') {
        let id = null;
        for (const [key, val] of searchParams.entries()) {
          if (key === 'id' && val.startsWith('eq.')) {
            id = val.slice(3);
          }
        }
        if (id) {
          db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
    } catch (err) {
      console.error('Database error in /rest/v1/orders:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 1c. PostgREST /rest/v1/qr_payments endpoint (Automated UPI QR Payment Ledger)
  if (pathname === '/rest/v1/qr_payments') {
    try {
      // GET qr_payments
      if (req.method === 'GET') {
        let sql = 'SELECT * FROM qr_payments WHERE 1=1';
        const params = [];
        for (const [key, val] of searchParams.entries()) {
          if (key === 'select' || key === 'order') continue;
          if (key === 'id' && val.startsWith('eq.')) {
            sql += ' AND id = ?';
            params.push(val.slice(3));
          } else if (key === 'order_id' && val.startsWith('eq.')) {
            sql += ' AND order_id = ?';
            params.push(val.slice(3));
          } else if (key === 'status' && val.startsWith('eq.')) {
            sql += ' AND status = ?';
            params.push(val.slice(3));
          }
        }
        sql += ' ORDER BY created_at DESC';
        const rows = db.prepare(sql).all(...params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
      }

      // POST create qr_payment
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const item = Array.isArray(body) ? body[0] : body;
        const id = item.id || `PAY-${Date.now().toString(36).toUpperCase()}`;
        const order_id = item.order_id || '';
        const amount = Number(item.amount || 0);
        const upi_id = item.upi_id || 'mdfresh@upi';
        const customer_phone = item.customer_phone || '';
        const utr_number = item.utr_number || null;
        const status = item.status || 'pending';
        const verified_via = item.verified_via || null;
        const created_at = item.created_at || new Date().toISOString();
        const verified_at = item.verified_at || null;

        const insertStmt = db.prepare(`
          INSERT INTO qr_payments (
            id, order_id, amount, upi_id, customer_phone, utr_number, status, verified_via, created_at, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(id, order_id, amount, upi_id, customer_phone, utr_number, status, verified_via, created_at, verified_at);

        const newPayment = db.prepare('SELECT * FROM qr_payments WHERE id = ?').get(id);
        console.log(`[QR Payment Created] ID: ${id}, Order: ${order_id}, Amount: ₹${amount}`);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([newPayment]));
        return;
      }

      // PATCH update qr_payment (verify)
      if (req.method === 'PATCH') {
        const body = await parseBody(req);
        let id = null;
        let order_id = null;
        for (const [key, val] of searchParams.entries()) {
          if (key === 'id' && val.startsWith('eq.')) id = val.slice(3);
          if (key === 'order_id' && val.startsWith('eq.')) order_id = val.slice(3);
        }

        const targetField = id ? 'id' : order_id ? 'order_id' : null;
        const targetValue = id || order_id;

        if (!targetField) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id or order_id for PATCH' }));
          return;
        }

        const existing = db.prepare(`SELECT * FROM qr_payments WHERE ${targetField} = ?`).get(targetValue);
        if (!existing) {
          const id = body.id || `PAY-${Date.now().toString(36).toUpperCase()}`;
          const order_id = body.order_id || targetValue;
          const amount = Number(body.amount || 0);
          const upi_id = body.upi_id || 'mdfresh@upi';
          const customer_phone = body.customer_phone || '';
          const utr_number = body.utr_number || null;
          const status = body.status || 'pending';
          const verified_via = body.verified_via || null;
          const created_at = body.created_at || new Date().toISOString();
          const verified_at = body.verified_at || (status === 'verified' ? new Date().toISOString() : null);

          db.prepare(`
            INSERT INTO qr_payments (id, order_id, amount, upi_id, customer_phone, utr_number, status, verified_via, created_at, verified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, order_id, amount, upi_id, customer_phone, utr_number, status, verified_via, created_at, verified_at);
          const inserted = db.prepare('SELECT * FROM qr_payments WHERE id = ?').get(id);
          console.log(`[QR Payment Inserted via PATCH] Target: ${targetValue}, Status: ${status}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([inserted]));
          return;
        }

        const updates = [];
        const params = [];
        if (body.status) {
          updates.push('status = ?');
          params.push(body.status);
        }
        if (body.utr_number) {
          updates.push('utr_number = ?');
          params.push(body.utr_number);
        }
        if (body.verified_via) {
          updates.push('verified_via = ?');
          params.push(body.verified_via);
        }
        updates.push('verified_at = ?');
        params.push(body.verified_at || new Date().toISOString());

        params.push(targetValue);
        db.prepare(`UPDATE qr_payments SET ${updates.join(', ')} WHERE ${targetField} = ?`).run(...params);

        const updated = db.prepare(`SELECT * FROM qr_payments WHERE ${targetField} = ?`).get(targetValue);
        console.log(`[QR Payment Verified/Updated] Target: ${targetValue}, Status: ${body.status}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([updated]));
        return;
      }
    } catch (err) {
      console.error('Database error in /rest/v1/qr_payments:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 2. Storage Upload: POST /storage/v1/object/product-images/:filename
  if (pathname.startsWith('/storage/v1/object/product-images/')) {
    if (req.method === 'POST') {
      const filename = pathname.replace('/storage/v1/object/product-images/', '');
      const body = await parseBody(req);
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, body);
      console.log(`Saved uploaded image to: ${filePath}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        Key: `product-images/${filename}`,
        Id: filename
      }));
      return;
    }
  }

  // 3. Storage Get Public Image: GET /storage/v1/object/public/product-images/:filename
  if (pathname.startsWith('/storage/v1/object/public/product-images/')) {
    const filename = pathname.replace('/storage/v1/object/public/product-images/', '');
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const fileData = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fileData);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Image not found' }));
      return;
    }
  }

  // 4. Auth OTP: POST /auth/v1/otp
  if (pathname === '/auth/v1/otp') {
    const body = await parseBody(req);
    console.log(`Auth OTP request for phone: ${body.phone}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'OTP sent successfully' }));
    return;
  }

  // 5. Auth Verify: POST /auth/v1/verify
  if (pathname === '/auth/v1/verify') {
    const body = await parseBody(req);
    console.log(`Auth Verify request for phone: ${body.phone}, token: ${body.token}`);
    const token = 'local-jwt-token-' + Date.now();
    const user = {
      id: 'local-user-id-01',
      phone: body.phone,
      role: 'authenticated',
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };
    const responsePayload = {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'local-refresh-token',
      user: user,
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'local-refresh-token',
        user: user
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
    return;
  }

  // Fallback for general health / ping
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'Local Supabase/SQLite DB is running', timestamp: new Date().toISOString() }));
});

server.listen(PORT, HOST, () => {
  console.log(`FruitMart Local SQLite Database Server listening at http://${HOST}:${PORT}`);
});
