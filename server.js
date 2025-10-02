const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 80;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Bootstrap DB: crear tabla y poblar si está vacía
async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const { rows } = await db.query(`SELECT COUNT(*)::int AS c FROM products`);
  if (rows[0].c === 0) {
    const sample = [
      ['Laptop Pro', 'Electronics', 15, 1299.99, 'High-performance laptop'],
      ['Wireless Mouse', 'Electronics', 45, 29.99, 'Ergonomic wireless mouse'],
      ['Office Chair', 'Furniture', 8, 199.99, 'Comfortable office chair'],
      ['Coffee Beans', 'Food', 120, 12.99, 'Premium coffee beans'],
      ['Notebook Set', 'Office Supplies', 200, 8.99, 'Pack of 3 notebooks'],
    ];
    for (const p of sample) {
      await db.query(
        `INSERT INTO products (name, category, quantity, price, description)
         VALUES ($1,$2,$3,$4,$5)`,
        p
      );
    }
  }
}
initDb().catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, category, quantity, price, description } = req.body;
  if (!name || !category || quantity === undefined || price === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await db.query(
      `INSERT INTO products (name, category, quantity, price, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, category, quantity, price, description]
    );
    res.json({ id: result.rows[0].id, message: 'Product created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, category, quantity, price, description } = req.body;
  try {
    const result = await db.query(
      `UPDATE products
       SET name=$1, category=$2, quantity=$3, price=$4, description=$5, updated_at=NOW()
       WHERE id=$6`,
      [name, category, quantity, price, description, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)::int as total_products,
        COALESCE(SUM(quantity),0)::int as total_items,
        COUNT(DISTINCT category)::int as categories,
        COALESCE(SUM(quantity * price),0)::numeric as total_value
      FROM products
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
