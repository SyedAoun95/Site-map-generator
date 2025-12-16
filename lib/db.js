import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'shopify_stores.db');

// Hashing algorithm
const HASH_ALGO = 'sha256';

// Open/create database
const db = new Database(dbPath);

// ------------------ SCHEMA ------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    scopes TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sitemaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT NOT NULL,
    url TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop) REFERENCES shops(shop) ON DELETE CASCADE
  );
`);

// ------------------ HELPERS ------------------
const hashValue = (value) => {
  if (!value || typeof value !== 'string') {
    throw new Error('Cannot hash undefined or non-string value');
  }
  return crypto.createHash(HASH_ALGO).update(value).digest('hex');
};

// ------------------ SHOP FUNCTIONS ------------------
export const storeShop = (shop, accessToken, scopes) => {
  try {
    if (!shop || !accessToken || !scopes) {
      throw new Error('Missing required parameter for storing shop');
    }

    const hashedToken = hashValue(accessToken);

    const stmt = db.prepare(`
      INSERT INTO shops (shop, access_token, scopes, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(shop) DO UPDATE SET
        access_token = excluded.access_token,
        scopes = excluded.scopes,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(shop, hashedToken, scopes);
    return true;
  } catch (e) {
    console.error('Error storing shop:', e);
    return false;
  }
};

export const getAccessToken = (shop) => {
  try {
    const stmt = db.prepare(`SELECT access_token FROM shops WHERE shop = ?`);
    const row = stmt.get(shop);
    return row ? row.access_token : null; // Already hashed
  } catch (e) {
    console.error('Error getting token:', e);
    return null;
  }
};

export const getShopScopes = (shop) => {
  const row = db.prepare(`SELECT scopes FROM shops WHERE shop = ?`).get(shop);
  return row ? row.scopes.split(',') : [];
};

export const deleteShop = (shop) => {
  db.prepare(`DELETE FROM shops WHERE shop = ?`).run(shop);
};

// ------------------ SITEMAP FUNCTIONS ------------------
export const storeSitemap = (shop, url, data) => {
  try {
    if (!shop || !url || !data) throw new Error('Missing sitemap parameters');
    db.prepare(`
      INSERT INTO sitemaps (shop, url, data)
      VALUES (?, ?, ?)
    `).run(shop, url, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error storing sitemap:', e);
    return false;
  }
};

export const getSitemaps = (shop) => {
  const rows = db
    .prepare(`SELECT * FROM sitemaps WHERE shop = ? ORDER BY created_at DESC`)
    .all(shop);

  return rows.map(r => ({
    ...r,
    data: JSON.parse(r.data),
  }));
};

export default db;
