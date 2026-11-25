const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(num) {
  let result = '';
  while (num > 0) {
    result = ALPHABET[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result || '0';
}

// ─── Route 1: Shorten a URL ───────────────────────────────────────────────────
router.post('/shorten', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Insert with a temp code first to get the auto-generated ID
  const insert = await pool.query(
    'INSERT INTO links (original, code) VALUES ($1, $2) RETURNING id',
    [url, 'tmp']
  );
  const id = insert.rows[0].id;

  // Now we know the ID, generate the real code and update
  const code = toBase62(id);
  await pool.query('UPDATE links SET code = $1 WHERE id = $2', [code, id]);

  res.json({ code, short: `${req.protocol}://${req.get('host')}/${code}` });
});

// ─── Route 2: Redirect ────────────────────────────────────────────────────────
// IMPORTANT: This must come AFTER /api/links — otherwise "api" gets
// treated as a short code!
router.get('/api/links', async (req, res) => {
  const result = await pool.query(
    'SELECT code, original, clicks, created_at FROM links ORDER BY created_at DESC'
  );
  res.json(result.rows);
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.APP_VERSION || '1.0.0' });
});

// ─── Route 3: Handle short link visits ───────────────────────────────────────
router.get('/:code', async (req, res) => {
  const { code } = req.params;
  const result = await pool.query(
    'UPDATE links SET clicks = clicks + 1 WHERE code = $1 RETURNING original',
    [code]
  );
  if (result.rows.length === 0) return res.status(404).send('Not found');
  res.redirect(301, result.rows[0].original);
});

module.exports = router;