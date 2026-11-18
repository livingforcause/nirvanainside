// Storage for Nirvana Inside.
//   MySQL / MariaDB  — when DB_HOST (or DATABASE_URL) is set. Used in production (Hostinger).
//   JSON file        — otherwise (data/db.json). Handy for local development without MySQL.
// Both keep the whole catalogue in memory for fast reads and write every change through immediately.
import fs from 'node:fs';
import path from 'node:path';

const COLLECTIONS = ['listings', 'vendors', 'enquiries'];

export function mysqlConfigured(env = process.env) {
  return Boolean(env.DATABASE_URL || (env.DB_HOST && env.DB_NAME));
}

/** Opens the configured store. `initial()` returns the data used when the store is empty. */
export async function openStore({dataDir, root, initial, log = console.log}) {
  const store = mysqlConfigured() ? await openMysql({root, initial, log}) : openFile({dataDir, initial, log});
  const db = store.db;
  db.listings ||= []; db.vendors ||= []; db.enquiries ||= []; db.settings ||= {};
  return store;
}

// ───────────────────────── JSON file ─────────────────────────
function openFile({dataDir, initial, log}) {
  const file = path.join(dataDir, 'data', 'db.json');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  let db;
  if (fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
  else { db = initial(); fs.writeFileSync(file, JSON.stringify(db, null, 2)); log('Storage: created data/db.json'); }
  let timer;
  const flush = () => { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, file); };
  const save = () => { clearTimeout(timer); timer = setTimeout(flush, 150); };
  return {
    kind: `JSON file (${file})`,
    db,
    async put() { save(); },
    async remove() { save(); },
    async putSettings() { save(); },
    async close() { clearTimeout(timer); flush(); },
  };
}

// ───────────────────────── MySQL / MariaDB ─────────────────────────
const ROW = {
  listings: {table: 'ni_listings', cols: ['id', 'type', 'status', 'title', 'vendor_id', 'data'], values: (l) => [l.id, l.type || '', l.status || '', String(l.title || '').slice(0, 200), l.vendorId || null, JSON.stringify(l)]},
  vendors: {table: 'ni_vendors', cols: ['id', 'business', 'kind', 'data'], values: (v) => [v.id, String(v.business || '').slice(0, 200), v.kind || '', JSON.stringify(v)]},
  enquiries: {table: 'ni_enquiries', cols: ['id', 'ref', 'created_at', 'type', 'status', 'customer', 'phone', 'vendor_id', 'data'], values: (e) => [e.id, e.ref, new Date(e.createdAt || Date.now()), e.type || '', e.status || '', String(e.customer?.name || '').slice(0, 120), String(e.customer?.phone || '').slice(0, 24), e.vendorId || null, JSON.stringify(e)]},
};
const upsertSql = ({table, cols}) => `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${cols.filter((c) => c !== 'id').map((c) => `${c} = VALUES(${c})`).join(', ')}`;

export async function connectMysql(env = process.env) {
  const {default: mysql} = await import('mysql2/promise');
  const base = {charset: 'utf8mb4', timezone: 'Z', connectionLimit: Number(env.DB_POOL || 5), waitForConnections: true, enableKeepAlive: true, dateStrings: false};
  return env.DATABASE_URL
    ? mysql.createPool({uri: env.DATABASE_URL, ...base})
    : mysql.createPool({host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, ...base});
}

export async function ensureSchema(pool, root) {
  const sql = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8').replace(/^\s*--.*$/gm, '');
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(stmt);
}

/** Replaces everything in MySQL with `data` (one transaction). Used for the first import and by `npm run db:import`. */
export async function importAll(pool, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const col of COLLECTIONS) {
      await conn.query(`DELETE FROM ${ROW[col].table}`);
      for (const item of data[col] || []) await conn.query(upsertSql(ROW[col]), ROW[col].values(item));
    }
    await conn.query('DELETE FROM ni_settings');
    for (const [k, v] of Object.entries(data.settings || {})) await conn.query('INSERT INTO ni_settings (k, v) VALUES (?, ?)', [k, String(v ?? '')]);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

async function loadAll(pool) {
  const parse = (rows) => rows.map((r) => JSON.parse(r.data));
  const [listings] = await pool.query('SELECT data FROM ni_listings');
  const [vendors] = await pool.query('SELECT data FROM ni_vendors');
  const [enquiries] = await pool.query('SELECT data FROM ni_enquiries ORDER BY created_at DESC');
  const [settings] = await pool.query('SELECT k, v FROM ni_settings');
  return {listings: parse(listings), vendors: parse(vendors), enquiries: parse(enquiries), settings: Object.fromEntries(settings.map((r) => [r.k, r.v]))};
}

async function openMysql({root, initial, log}) {
  const pool = await connectMysql();
  await pool.query('SELECT 1');
  await ensureSchema(pool, root);
  const [[{n}]] = await pool.query('SELECT (SELECT COUNT(*) FROM ni_listings) + (SELECT COUNT(*) FROM ni_vendors) + (SELECT COUNT(*) FROM ni_enquiries) + (SELECT COUNT(*) FROM ni_settings) AS n');
  if (Number(n) === 0) { await importAll(pool, initial()); log('Storage: MySQL was empty, imported starting data'); }
  const db = await loadAll(pool);
  const name = process.env.DB_NAME || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : '');
  return {
    kind: `MySQL (${name})`,
    db,
    async put(col, item) { await pool.query(upsertSql(ROW[col]), ROW[col].values(item)); },
    async remove(col, id) { await pool.query(`DELETE FROM ${ROW[col].table} WHERE id = ?`, [id]); },
    async putSettings(settings) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const [k, v] of Object.entries(settings)) await conn.query('INSERT INTO ni_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, String(v ?? '')]);
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
    },
    async close() { await pool.end(); },
  };
}
