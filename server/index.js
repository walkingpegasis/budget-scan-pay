import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());
// Ensure uploads directory and serve statically
const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.dat';
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'budget_scan_pay',
};

async function ensureDatabase() {
  const { database, ...base } = dbConfig;
  const conn = await mysql.createConnection({ ...base, multipleStatements: true });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await conn.end();
  }
}

let pool;
async function getPool() {
  if (!pool) {
    await ensureDatabase();
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

async function ensureSchema() {
  const conn = await (await getPool()).getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        avatar_url VARCHAR(1024) NULL
      ) ENGINE=InnoDB;
    `);
    // Add missing columns if table already existed
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024) NULL`);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        user_email VARCHAR(255) PRIMARY KEY,
        total_funds DECIMAL(12,2) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        limit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        UNIQUE KEY unique_user_category (user_email, category)
      ) ENGINE=InnoDB;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        description VARCHAR(1024) NOT NULL,
        date DATE NOT NULL
      ) ENGINE=InnoDB;
    `);
  } finally {
    conn.release();
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Wallet
app.get('/api/wallet', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT total_funds FROM wallets WHERE user_email = ?', [email]);
  if (rows.length === 0) return res.json({ total_funds: 0 });
  res.json(rows[0]);
});

app.put('/api/wallet', async (req, res) => {
  const { total_funds } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || typeof total_funds !== 'number') return res.status(400).json({ error: 'email and total_funds required' });
  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO wallets (user_email, total_funds) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE total_funds = VALUES(total_funds)`,
    [email, total_funds]
  );
  res.json({ ok: true });
});

// Very basic demo login (no hashing for demo). Do not use in production as-is.
app.post('/api/login', async (req, res) => {
  const { password } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  await ensureSchema();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    await pool.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password]);
  } else if (rows[0].password_hash !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const [[user]] = await pool.query('SELECT email, name, avatar_url FROM users WHERE email = ?', [email]);
  res.json({ token: 'demo-token', email, name: user?.name || null, avatar_url: user?.avatar_url || null });
});

// Signup
app.post('/api/signup', async (req, res) => {
  const { password, name } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  await ensureSchema();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length) return res.status(409).json({ error: 'User already exists' });
  await pool.query('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, password, name || null]);
  // Initialize wallet row lazily when first needed; not required here.
  res.status(201).json({ token: 'demo-token', email, name: name || null, avatar_url: null });
});

// Profile
app.get('/api/profile', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT email, name, avatar_url FROM users WHERE email = ?', [email]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.put('/api/profile', async (req, res) => {
  const email = normalizeEmail((req.body || {}).email);
  const { name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();
  await pool.query('UPDATE users SET name = ? WHERE email = ?', [name || null, email]);
  res.json({ ok: true });
});

app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  const email = normalizeEmail((req.body || {}).email);
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!req.file) return res.status(400).json({ error: 'avatar file is required' });
  await ensureSchema();
  const pool = await getPool();
  const urlPath = `/uploads/${req.file.filename}`;
  await pool.query('UPDATE users SET avatar_url = ? WHERE email = ?', [urlPath, email]);
  res.status(201).json({ ok: true, avatar_url: urlPath });
});

// Budgets
app.get('/api/budgets', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();
  const [rows] = await pool.query(
    'SELECT category, limit_amount AS `limit`, spent_amount AS spent FROM budgets WHERE user_email = ? ORDER BY category',
    [email]
  );
  res.json(rows);
});

app.post('/api/budgets', async (req, res) => {
  const { category, limit } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || !category || typeof limit !== 'number') return res.status(400).json({ error: 'email, category, limit required' });
  await ensureSchema();
  const pool = await getPool();
  try {
    await pool.query(
      'INSERT INTO budgets (user_email, category, limit_amount, spent_amount) VALUES (?, ?, ?, 0)',
      [email, category, limit]
    );
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Budget already exists for category' });
    throw e;
  }
  res.status(201).json({ ok: true });
});

app.patch('/api/budgets/:category', async (req, res) => {
  const category = req.params.category;
  const { limit } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || typeof limit !== 'number') return res.status(400).json({ error: 'email and limit required' });
  await ensureSchema();
  const pool = await getPool();
  const [result] = await pool.query(
    'UPDATE budgets SET limit_amount = ? WHERE user_email = ? AND category = ?',
    [limit, email, category]
  );
  res.json({ ok: true, affected: result.affectedRows });
});

// Expenses
app.get('/api/expenses', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  const from = req.query.from ? String(req.query.from) : undefined;
  const to = req.query.to ? String(req.query.to) : undefined;
  const pageParam = req.query.page ? Number(req.query.page) : 1;
  const limitParam = req.query.limit ? Number(req.query.limit) : 20;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 200 ? limitParam : 20;
  const offset = (page - 1) * limit;
  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();
  const filters = ['user_email = ?'];
  const params = [email];
  if (from) { filters.push('date >= ?'); params.push(from); }
  if (to) { filters.push('date <= ?'); params.push(to); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM expenses ${where}`,
    params
  );
  const total = Number(countRow.total || 0);
  const [rows] = await pool.query(
    `SELECT id, user_email, amount, category, description, date
     FROM expenses ${where}
     ORDER BY date DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ items: rows, total, page, limit });
});

app.post('/api/expenses', async (req, res) => {
  const { amount, category, description, date } = req.body || {};
  const email = normalizeEmail((req.body || {}).email);
  if (!email || typeof amount !== 'number' || !category || !description || !date) {
    return res.status(400).json({ error: 'email, amount, category, description, date required' });
  }
  await ensureSchema();
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO expenses (user_email, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
      [email, amount, category, description, date]
    );
    await conn.query(
      `INSERT INTO budgets (user_email, category, limit_amount, spent_amount) VALUES (?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE spent_amount = spent_amount + VALUES(spent_amount)`,
      [email, category, amount]
    );
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// Export expenses (xlsx or pdf)
app.get('/api/expenses/export', async (req, res) => {
  const email = normalizeEmail(req.query.email);
  const format = String(req.query.format || 'xlsx').toLowerCase();
  const from = req.query.from ? String(req.query.from) : undefined;
  const to = req.query.to ? String(req.query.to) : undefined;

  if (!email) return res.status(400).json({ error: 'email is required' });
  await ensureSchema();
  const pool = await getPool();

  const filters = ['user_email = ?'];
  const params = [email];
  if (from) { filters.push('date >= ?'); params.push(from); }
  if (to) { filters.push('date <= ?'); params.push(to); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT date, description, category, amount FROM expenses ${where} ORDER BY date DESC`,
    params
  );

  if (format === 'xlsx' || format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expenses');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (INR)', key: 'amount', width: 15 },
    ];
    rows.forEach((r) => sheet.addRow({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      description: r.description,
      category: r.category,
      amount: Number(r.amount),
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    const nameParts = ['expenses'];
    if (from) nameParts.push(`from-${from}`);
    if (to) nameParts.push(`to-${to}`);
    const filename = `${nameParts.join('_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(Buffer.from(buffer));
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 36 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const nameParts = ['expenses'];
      if (from) nameParts.push(`from-${from}`);
      if (to) nameParts.push(`to-${to}`);
      const filename = `${nameParts.join('_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(buffer);
    });

    doc.fontSize(16).text('Expense Statement', { align: 'center' });
    const subtitle = [];
    if (from) subtitle.push(`From ${from}`);
    if (to) subtitle.push(`To ${to}`);
    doc.moveDown(0.5).fontSize(10).fillColor('#666').text(subtitle.join('  '), { align: 'center' }).fillColor('black');
    doc.moveDown();

    const colX = [36, 120, 360, 500];
    const headerY = doc.y;
    doc.fontSize(10).text('Date', colX[0], headerY)
      .text('Description', colX[1], headerY)
      .text('Category', colX[2], headerY)
      .text('Amount (INR)', colX[3], headerY, { width: 72, align: 'right' });
    doc.moveTo(36, headerY + 12).lineTo(576, headerY + 12).stroke();

    let y = headerY + 18;
    rows.forEach((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      const amountStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(r.amount));
      doc.text(dateStr, colX[0], y)
        .text(String(r.description), colX[1], y, { width: 230 })
        .text(String(r.category), colX[2], y, { width: 120 })
        .text(amountStr, colX[3], y, { width: 72, align: 'right' });
      y += 16;
      if (y > 760) { doc.addPage(); y = 36; }
    });

    doc.end();
    return;
  }

  // default CSV
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  res.write('date,description,category,amount\n');
  rows.forEach((r) => {
    const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
    const desc = String(r.description).replace(/"/g, '""');
    const cat = String(r.category).replace(/"/g, '""');
    res.write(`${dateStr},"${desc}","${cat}",${Number(r.amount)}\n`);
  });
  res.end();
});

const PORT = Number(process.env.API_PORT || 3001);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});


