import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'shopify_stores.db');

// Create or open database
const db = new Database(dbPath);

// Initialize database schema
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
    FOREIGN KEY (shop) REFERENCES shops(shop)
  );
`);

// Shop management functions
export const storeShop = (shop, accessToken, scopes) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO shops (shop, access_token, scopes, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(shop) DO UPDATE SET
        access_token = excluded.access_token,
        scopes = excluded.scopes,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(shop, accessToken, scopes);
    return true;
  } catch (error) {
    console.error('Error storing shop:', error);
    return false;
  }
};

export const getShop = (shop) => {
  try {
    const stmt = db.prepare('SELECT * FROM shops WHERE shop = ?');
    return stmt.get(shop);
  } catch (error) {
    console.error('Error getting shop:', error);
    return null;
  }
};

export const getAccessToken = (shop) => {
  try {
    const stmt = db.prepare('SELECT access_token FROM shops WHERE shop = ?');
    const result = stmt.get(shop);
    return result ? result.access_token : null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

export const storeSitemap = (shop, url, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO sitemaps (shop, url, data)
      VALUES (?, ?, ?)
    `);
    stmt.run(shop, url, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error storing sitemap:', error);
    return false;
  }
};

export const getSitemaps = (shop) => {
  try {
    const stmt = db.prepare('SELECT * FROM sitemaps WHERE shop = ? ORDER BY created_at DESC');
    const results = stmt.all(shop);
    return results.map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }));
  } catch (error) {
    console.error('Error getting sitemaps:', error);
    return [];
  }
};

export default db;
