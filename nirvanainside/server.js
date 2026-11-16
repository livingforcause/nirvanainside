// Nirvana Inside — platform server. Zero dependencies (Node 20+).
// Public site + JSON API + admin panel. Data lives in data/db.json (created from data/seed.js on first run).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// --- .env (optional, simple KEY=VALUE lines) ---
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

// Where listings/enquiries (db.json) and uploaded photos live.
// Hosts like Hostinger replace the app folder on every deploy, so there we default to a folder in the
// account's home directory that survives redeploys. Override with DATA_DIR if you want a specific path.
const onManagedHost = /[/\\]hbuilds[/\\]/.test(ROOT);
const DATA_DIR = process.env.DATA_DIR || (onManagedHost ? path.join(os.homedir(), 'nirvana-inside-data') : ROOT);
const UPLOADS = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'data', 'db.json');

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_HOURS = 12;
if (!ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD is not set — the admin panel is locked until you set it (see .env.example).');

// --- Database (single JSON file, atomic writes) ---
fs.mkdirSync(path.dirname(DB_FILE), {recursive: true});
fs.mkdirSync(UPLOADS, {recursive: true});
let db;
// First start on a host with a separate data folder: import the database + photos bundled with the app (if any).
const BUNDLED_DB = path.join(ROOT, 'data', 'db.json');
if (!fs.existsSync(DB_FILE) && BUNDLED_DB !== DB_FILE && fs.existsSync(BUNDLED_DB)) {
  fs.copyFileSync(BUNDLED_DB, DB_FILE);
  const bundledUploads = path.join(ROOT, 'uploads');
  if (fs.existsSync(bundledUploads)) for (const f of fs.readdirSync(bundledUploads)) if (!f.startsWith('.')) fs.copyFileSync(path.join(bundledUploads, f), path.join(UPLOADS, f));
  console.log('Imported bundled database into', DATA_DIR);
}
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
else {
  const {default: seed} = await import('./data/seed.js');
  db = structuredClone(seed);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log('Created data/db.json from seed.');
}
db.listings ||= []; db.vendors ||= []; db.enquiries ||= []; db.settings ||= {};
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}

// --- Helpers ---
const id = (p = '') => p + crypto.randomBytes(5).toString('hex');
const now = () => new Date().toISOString();
const str = (v, max = 500) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers});
  res.end(data);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Payload too large'), {status: 413})); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), {status: 400})); } });
    req.on('error', reject);
  });
}
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
const hits = new Map();
function rateLimited(key, max, windowMs) {
  const t = Date.now(); const arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
  arr.push(t); hits.set(key, arr);
  return arr.length > max;
}

// --- Sessions: signed, httpOnly cookie ---
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function makeToken() { const exp = Date.now() + SESSION_HOURS * 3600e3; const v = `admin.${exp}`; return `${v}.${sign(v)}`; }
function isAdmin(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)ni_admin=([^;]+)/); if (!m) return false;
  const [who, exp, sig] = m[1].split('.'); if (!sig) return false;
  const expected = sign(`${who}.${exp}`);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) && Number(exp) > Date.now();
}
const secureFlag = (req) => (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '');

// --- Public projections (never expose vendor or internal data) ---
const PUBLIC_SETTINGS = ['brand', 'whatsapp', 'phone', 'email', 'office', 'officeMap', 'instagram', 'tagline'];
function publicListing(l) { const {vendorId, internalNotes, ...rest} = l; return rest; }
function catalog() {
  return {
    settings: Object.fromEntries(PUBLIC_SETTINGS.map((k) => [k, db.settings[k] ?? ''])),
    listings: db.listings.filter((l) => l.status === 'published' || l.status === 'coming_soon').sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.order ?? 999) - (b.order ?? 999)).map(publicListing),
  };
}

// --- Enquiries ---
const ENQ_TYPES = ['stay', 'taxi', 'transport', 'experience', 'rental', 'package', 'general'];
function makeRef() {
  const d = new Date(); const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `NI${ymd}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
function cleanFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.slice(0, 40).map((f) => [str(f?.[0], 60), str(f?.[1], 600)]).filter(([k, v]) => k && v);
}

// --- Static files ---
const TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'};
function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, fs.existsSync(path.join(PUBLIC, '404.html')) ? fs.readFileSync(path.join(PUBLIC, '404.html')) : 'Not found', {'Content-Type': 'text/html; charset=utf-8'});
    const ext = path.extname(file).toLowerCase();
    const longCache = /\.(webp|png|jpe?g|svg|ico)$/.test(ext);
    res.writeHead(200, {'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://nominatim.openstreetmap.org; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

// --- Router ---
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    // ---------- Public API ----------
    if (p === '/api/catalog' && req.method === 'GET') return send(res, 200, catalog());

    if (p === '/api/enquiries' && req.method === 'POST') {
      if (rateLimited('enq:' + clientIp(req), 20, 10 * 60e3)) return send(res, 429, {error: 'Too many requests. Please message us on WhatsApp directly.'});
      const b = await readBody(req, 20_000);
      const type = ENQ_TYPES.includes(b.type) ? b.type : 'general';
      const name = str(b.customer?.name, 80);
      const phone = str(b.customer?.phone, 20).replace(/[^\d+]/g, '');
      if (!name || phone.replace(/\D/g, '').length < 8) return send(res, 400, {error: 'Name and a valid phone number are required.'});
      const listing = b.listingId ? db.listings.find((l) => l.id === b.listingId) : null;
      const enq = {
        id: id('e_'), ref: makeRef(), createdAt: now(), updatedAt: now(), type,
        title: str(b.title, 140), listingId: listing?.id || null, listingTitle: listing?.title || null,
        fields: cleanFields(b.fields),
        customer: {name, phone, email: str(b.customer?.email, 120)},
        source: {utm: str(b.source?.utm, 80), page: str(b.source?.page, 200), referrer: str(b.source?.referrer, 200)},
        status: 'new', vendorId: listing?.vendorId || null, quote: '', notes: [],
      };
      db.enquiries.unshift(enq); save();
      return send(res, 201, {ref: enq.ref});
    }

    // ---------- Admin auth ----------
    if (p === '/api/admin/login' && req.method === 'POST') {
      if (rateLimited('login:' + clientIp(req), 8, 15 * 60e3)) return send(res, 429, {error: 'Too many attempts. Try again in 15 minutes.'});
      if (!ADMIN_PASSWORD) return send(res, 503, {error: 'Admin password is not configured on the server. Set ADMIN_PASSWORD and restart.'});
      const b = await readBody(req, 2_000);
      const h = (v) => crypto.createHash('sha256').update(v).digest();
      const passOk = crypto.timingSafeEqual(h(str(b.password, 200)), h(ADMIN_PASSWORD));
      const userOk = !ADMIN_EMAIL || crypto.timingSafeEqual(h(str(b.email, 200).toLowerCase()), h(ADMIN_EMAIL));
      if (!(passOk && userOk)) return send(res, 401, {error: 'Wrong username or password.'});
      return send(res, 200, {ok: true}, {'Set-Cookie': `ni_admin=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secureFlag(req)}`});
    }
    if (p === '/api/admin/logout' && req.method === 'POST') return send(res, 200, {ok: true}, {'Set-Cookie': `ni_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureFlag(req)}`});

    if (p.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, {error: 'Not signed in.'});
      const parts = p.split('/').slice(3); // e.g. ['listings', ':id']
      const [col, itemId] = parts;

      if (col === 'me') return send(res, 200, {ok: true});
      if (col === 'db' && req.method === 'GET') return send(res, 200, db);

      if (col === 'settings' && req.method === 'PUT') {
        const b = await readBody(req, 20_000);
        for (const [k, v] of Object.entries(b)) if (typeof v === 'string') db.settings[k] = str(v, 400);
        save(); return send(res, 200, db.settings);
      }

      if ((col === 'listings' || col === 'vendors') && itemId) {
        const arr = db[col];
        if (req.method === 'PUT') {
          const b = await readBody(req, 400_000);
          if (typeof b !== 'object' || Array.isArray(b)) return send(res, 400, {error: 'Bad data'});
          const i = arr.findIndex((x) => x.id === itemId);
          const item = {...(i >= 0 ? arr[i] : {createdAt: now()}), ...b, id: itemId === 'new' ? id(col === 'listings' ? 'l_' : 'v_') : itemId, updatedAt: now()};
          if (col === 'listings') { item.title = str(item.title, 140) || 'Untitled'; item.images = (item.images || []).filter((u) => typeof u === 'string' && /^(https:\/\/|\/uploads\/|\/img\/)/.test(u)).slice(0, 20); }
          if (i >= 0) arr[i] = item; else arr.push(item);
          save(); return send(res, 200, item);
        }
        if (req.method === 'DELETE') {
          const i = arr.findIndex((x) => x.id === itemId); if (i < 0) return send(res, 404, {error: 'Not found'});
          arr.splice(i, 1);
          if (col === 'vendors') db.listings.forEach((l) => { if (l.vendorId === itemId) l.vendorId = null; });
          save(); return send(res, 200, {ok: true});
        }
      }

      if (col === 'enquiries' && itemId && req.method === 'PATCH') {
        const e = db.enquiries.find((x) => x.id === itemId); if (!e) return send(res, 404, {error: 'Not found'});
        const b = await readBody(req, 20_000);
        if (['new', 'contacted', 'checking_vendor', 'quoted', 'confirmed', 'completed', 'lost'].includes(b.status)) e.status = b.status;
        if ('vendorId' in b) e.vendorId = b.vendorId || null;
        if ('quote' in b) e.quote = str(b.quote, 200);
        if ('followUp' in b) e.followUp = str(b.followUp, 20);
        if (b.note) e.notes.push({at: now(), text: str(b.note, 1000)});
        e.updatedAt = now(); save(); return send(res, 200, e);
      }
      if (col === 'enquiries' && itemId && req.method === 'DELETE') {
        db.enquiries = db.enquiries.filter((x) => x.id !== itemId); save(); return send(res, 200, {ok: true});
      }

      if (col === 'upload' && req.method === 'POST') {
        const b = await readBody(req, 12_000_000);
        const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(b.dataUrl || '');
        if (!m) return send(res, 400, {error: 'Upload a WEBP, JPG or PNG image.'});
        const buf = Buffer.from(m[2], 'base64');
        const magic = buf.subarray(0, 12).toString('hex');
        const ok = (m[1] === 'png' && magic.startsWith('89504e47')) || (m[1] === 'jpeg' && magic.startsWith('ffd8ff')) || (m[1] === 'webp' && magic.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP');
        if (!ok) return send(res, 400, {error: 'That file does not look like a valid image.'});
        const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
        fs.writeFileSync(path.join(UPLOADS, name), buf);
        return send(res, 201, {url: `/uploads/${name}`});
      }

      if (col === 'export.csv' && req.method === 'GET') {
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Ref', 'Created', 'Type', 'Title', 'Status', 'Customer', 'Phone', 'Vendor', 'Quote', 'Details', 'Source'].map(q).join(',')];
        for (const e of db.enquiries) {
          const v = db.vendors.find((x) => x.id === e.vendorId);
          rows.push([e.ref, e.createdAt, e.type, e.title, e.status, e.customer.name, e.customer.phone, v?.business || '', e.quote, e.fields.map(([k, val]) => `${k}: ${val}`).join(' | '), e.source?.utm || ''].map(q).join(','));
        }
        return send(res, 200, '﻿' + rows.join('\n'), {'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`});
      }
      return send(res, 404, {error: 'Unknown admin route'});
    }

    if (p.startsWith('/api/')) return send(res, 404, {error: 'Not found'});

    // ---------- Files ----------
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (p.startsWith('/uploads/')) return serveFile(res, UPLOADS, p.slice('/uploads/'.length));
    if (p === '/admin' || p === '/admin/') return serveFile(res, PUBLIC, 'admin/index.html');
    if (p === '/') return serveFile(res, PUBLIC, 'index.html');
    if (p === '/sitemap.xml') {
      const host = `https://${db.settings.domain || 'nirvanainside.com'}`;
      const urls = ['/', '/explore.html?type=stay', '/explore.html?type=transport', '/explore.html?type=experience', '/explore.html?type=rental', '/explore.html?type=package', ...catalog().listings.map((l) => `/item.html?id=${l.id}`)];
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${host}${u.replace(/&/g, '&amp;')}</loc></url>`).join('')}</urlset>`, {'Content-Type': 'application/xml'});
    }
    return serveFile(res, PUBLIC, p.replace(/^\/+/, ''));
  } catch (err) {
    console.error(err);
    return send(res, err.status || 500, {error: err.status ? err.message : 'Server error'});
  }
});

server.listen(PORT, () => console.log(`Nirvana Inside running → http://localhost:${PORT}  (admin: /admin)  data: ${DATA_DIR}`));
