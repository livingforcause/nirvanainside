// Nirvana Inside — platform server (Node 20+). Only dependency: mysql2.
// Public site + JSON API + admin panel. Data lives in MySQL (or data/db.json locally) — see lib/store.js.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {openStore} from './lib/store.js';
import seed from './data/seed.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// --- .env (optional, simple KEY=VALUE lines) ---
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

// Where uploaded photos (and db.json, when MySQL is not configured) live.
// Hosts like Hostinger replace the app folder on every deploy, so there we default to a folder in the
// account's home directory that survives redeploys. Override with DATA_DIR if you want a specific path.
const onManagedHost = /[/\\]hbuilds[/\\]/.test(ROOT);
const DATA_DIR = process.env.DATA_DIR || (onManagedHost ? path.join(os.homedir(), 'nirvana-inside-data') : ROOT);
const UPLOADS = path.join(DATA_DIR, 'uploads');

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_HOURS = 12;
if (!ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD is not set — the admin panel is locked until you set it (see .env.example).');

// --- Storage: MySQL when DB_HOST / DATABASE_URL is set, else data/db.json (see lib/store.js) ---
fs.mkdirSync(UPLOADS, {recursive: true});
// Starting data for an empty store: the database bundled by `npm run build` if present, else data/seed.js.
const BUNDLED_DB = path.join(ROOT, 'data', 'db.json');
function initialData() {
  if (fs.existsSync(BUNDLED_DB)) {
    const bundledUploads = path.join(ROOT, 'uploads');
    if (bundledUploads !== UPLOADS && fs.existsSync(bundledUploads)) for (const f of fs.readdirSync(bundledUploads)) if (!f.startsWith('.') && !fs.existsSync(path.join(UPLOADS, f))) fs.copyFileSync(path.join(bundledUploads, f), path.join(UPLOADS, f));
    console.log('Storage: starting from the bundled database');
    return JSON.parse(fs.readFileSync(BUNDLED_DB, 'utf8'));
  }
  console.log('Storage: starting from data/seed.js');
  return structuredClone(seed);
}
// Opened in start() below. No top-level await: Hostinger/LiteSpeed loads this file with require().
let store, db;

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
// Forget visitors with no recent activity so the map can't grow forever.
setInterval(() => { const t = Date.now(); for (const [k, arr] of hits) if (!arr.length || t - arr[arr.length - 1] > 20 * 60e3) hits.delete(k); }, 10 * 60e3).unref();

// --- Sessions: signed, httpOnly cookies (admin and partner use different cookies and signing domains) ---
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
const sigOk = (sig, expected) => typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
const cookie = (req, name) => (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || '';
function makeToken() { const exp = Date.now() + SESSION_HOURS * 3600e3; const v = `admin.${exp}`; return `${v}.${sign(v)}`; }
function isAdmin(req) {
  const [who, exp, sig] = cookie(req, 'ni_admin').split('.');
  return who === 'admin' && sigOk(sig, sign(`${who}.${exp}`)) && Number(exp) > Date.now();
}
const secureFlag = (req) => (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '');

// --- Partners (vendor + agent in one record, stored in the `vendors` collection) ---
// Every partner has an agent code. Customers who arrive through /a/<CODE> or ?ref=<CODE> (or type the code)
// are credited to that partner, who earns incentivePct % of the booking value once the enquiry is confirmed.
const CODE_RE = /^[A-Z0-9]{4,12}$/;
const normCode = (v) => str(v, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
const EARNING = ['confirmed', 'completed'];
const defaultPct = () => { const n = Number(db.settings.defaultIncentivePct); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 5; };
const partnerPct = (v) => (v && v.incentivePct != null && v.incentivePct !== '' ? Number(v.incentivePct) : defaultPct());
const findAgent = (code) => (code ? db.vendors.find((v) => v.agentCode === code && v.active !== false && !v.inhouse) : null);
// Every listing belongs to exactly one partner. Listings Nirvana Inside runs itself belong to this built-in
// in-house partner (no agent code, no incentive, no portal login, can't be deleted).
const INHOUSE_ID = 'v_inhouse';
const INHOUSE = {id: INHOUSE_ID, inhouse: true, kind: 'inhouse', business: 'Nirvana Inside (in-house)', area: 'Kullu', active: true, incentivePct: 0, agentCode: '', notes: 'Listings Nirvana Inside operates directly.'};
const partnerExists = (pid) => db.vendors.some((v) => v.id === pid);

// Partner listing edits: a partner proposes changes to these fields; they go live only when admin approves.
const PARTNER_FIELDS = ['title', 'tagline', 'description', 'price', 'images', 'highlights'];
const LISTING_TYPES = {stay: 'night', transport: 'trip', experience: 'person', rental: 'day', package: 'person'};
const UNITS_OK = ['night', 'person', 'couple', 'day', 'hour', 'km', 'trip', 'seat', 'month'];
// Save an uploaded photo (data URL from the browser optimiser). Checks the real file signature, not just the label.
function decodeImage(dataUrl) {
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw Object.assign(new Error('Upload a WEBP, JPG or PNG image.'), {status: 400});
  const buf = Buffer.from(m[2], 'base64');
  const magic = buf.subarray(0, 12).toString('hex');
  const ok = (m[1] === 'png' && magic.startsWith('89504e47')) || (m[1] === 'jpeg' && magic.startsWith('ffd8ff')) || (m[1] === 'webp' && magic.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP');
  if (!ok) throw Object.assign(new Error('That file does not look like a valid image.'), {status: 400});
  return {buf, ext: m[1] === 'jpeg' ? 'jpg' : m[1]};
}
// Listing photo: full 1600×1200 as NAME.ext, plus (optional) 800×600 card preview as NAME-t.ext.
function saveUpload(dataUrl, thumbDataUrl, branded = false) {
  const full = decodeImage(dataUrl);
  const stem = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}${branded ? '-b' : ''}`; // -b = our logo is in the photo
  fs.writeFileSync(path.join(UPLOADS, `${stem}.${full.ext}`), full.buf);
  if (thumbDataUrl) {
    const t = decodeImage(thumbDataUrl);
    if (t.ext === full.ext && t.buf.length < full.buf.length * 1.2) fs.writeFileSync(path.join(UPLOADS, `${stem}-t.${t.ext}`), t.buf);
  }
  return {url: `/uploads/${stem}.${full.ext}`};
}
function cleanPartnerEdit(b, listing) {
  const out = {};
  if ('title' in b) out.title = str(b.title, 140);
  if ('tagline' in b) out.tagline = str(b.tagline, 160);
  if ('description' in b) out.description = str(b.description, 4000);
  if (b.price && typeof b.price === 'object') {
    const unit = UNITS_OK.includes(b.price.unit) ? b.price.unit : listing.price?.unit || 'trip';
    out.price = {...(listing.price || {}), amount: num(b.price.amount, 0, 1e7), unit, note: str(b.price.note, 120)};
  }
  if (Array.isArray(b.images)) {
    const own = new Set(listing.images || []);
    // Partners may keep/reorder existing photos and add ones they uploaded; no outside links.
    out.images = [...new Set(b.images.filter((u) => typeof u === 'string' && (own.has(u) || /^\/uploads\/[a-z0-9-]+\.(webp|jpg|png)$/.test(u))))].slice(0, 20);
  }
  if (Array.isArray(b.highlights)) out.highlights = b.highlights.map((h) => str(h, 120)).filter(Boolean).slice(0, 12);
  if (out.title === '') delete out.title;
  // Keep only fields that actually differ from what's live.
  for (const k of Object.keys(out)) if (JSON.stringify(out[k]) === JSON.stringify(listing[k] ?? (k === 'images' || k === 'highlights' ? [] : k === 'price' ? {} : ''))) delete out[k];
  return out;
}
function genCode(business) {
  const stem = (String(business || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'NI').padEnd(2, 'X');
  for (let i = 0; i < 200; i++) { const c = stem + String(crypto.randomInt(100, 1000)); if (!db.vendors.some((v) => v.agentCode === c)) return c; }
  return 'NI' + crypto.randomBytes(4).toString('hex').toUpperCase();
}
const num = (v, min = 0, max = 1e9) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
function agentStats(partnerId) {
  const refs = db.enquiries.filter((e) => e.agentId === partnerId);
  const won = refs.filter((e) => EARNING.includes(e.status));
  const earned = won.reduce((s, e) => s + (Number(e.incentiveAmount) || 0), 0);
  const p = db.vendors.find((v) => v.id === partnerId);
  const paid = (p?.payouts || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return {referred: refs.length, confirmed: won.length, earned, paid, balance: earned - paid};
}
// Admin-facing copy of a partner: never send the PIN hash anywhere.
const adminPartner = (v) => { const {pinHash, ...rest} = v; return {...rest, hasPin: Boolean(pinHash)}; };

// Partner PINs: scrypt hashes. The session token embeds a fingerprint of the hash, so resetting a PIN signs the partner out everywhere.
function hashPin(pin) { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(pin, salt, 32).toString('hex')}`; }
function pinMatches(pin, stored) {
  const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return false;
  const got = crypto.scryptSync(String(pin), salt, 32); const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const pinFp = (v) => String(v.pinHash || '').slice(0, 12);
function makePartnerToken(v) { const exp = Date.now() + 30 * 24 * 3600e3; return `${v.id}.${exp}.${sign(`partner|${v.id}|${exp}|${pinFp(v)}`)}`; }
function currentPartner(req) {
  const [pid, exp, sig] = cookie(req, 'ni_partner').split('.');
  if (!pid || !(Number(exp) > Date.now())) return null;
  const v = db.vendors.find((x) => x.id === pid);
  if (!v || !v.pinHash || v.active === false || v.inhouse) return null;
  return sigOk(sig, sign(`partner|${pid}|${exp}|${pinFp(v)}`)) ? v : null;
}
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
function partnerView(v) {
  const listings = db.listings.filter((l) => l.vendorId === v.id).map((l) => ({
    id: l.id, type: l.type, status: l.status, area: l.location?.area || '',
    title: l.title, tagline: l.tagline || '', description: l.description || '', price: l.price || {}, images: l.images || [], highlights: l.highlights || [],
    pendingEdit: l.pendingEdit || null, editReview: l.editReview || null, createdBy: l.createdBy || 'admin',
  }));
  const referrals = db.enquiries.filter((e) => e.agentId === v.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map((e) => ({ref: e.ref, createdAt: e.createdAt, title: e.title, status: e.status, customer: String(e.customer?.name || '').split(/\s+/)[0], incentiveAmount: EARNING.includes(e.status) ? e.incentiveAmount ?? null : null}));
  const s = agentStats(v.id);
  return {
    partner: {business: v.business, name: v.ownerName || v.managerName || '', agentCode: v.agentCode, incentivePct: partnerPct(v)},
    listings, referrals, earnings: {earned: s.earned, paid: s.paid, due: s.balance},
    site: {whatsapp: db.settings.whatsapp || '', brand: db.settings.brand || 'Nirvana Inside'},
  };
}
function cleanPayouts(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 500).map((x) => ({id: str(x?.id, 20) || id('p_'), at: str(x?.at, 30) || now(), amount: num(x?.amount, 0) ?? 0, note: str(x?.note, 200)})).filter((x) => x.amount > 0);
}

// --- Public projections (never expose vendor or internal data) ---
const PUBLIC_SETTINGS = ['brand', 'whatsapp', 'phone', 'email', 'office', 'officeMap', 'instagram', 'tagline'];
function publicListing(l) { const {vendorId, internalNotes, pendingEdit, editReview, ...rest} = l; return rest; }
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
const TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'};
function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, fs.existsSync(path.join(PUBLIC, '404.html')) ? fs.readFileSync(path.join(PUBLIC, '404.html')) : 'Not found', {'Content-Type': 'text/html; charset=utf-8'});
    const ext = path.extname(file).toLowerCase();
    const longCache = /\.(webp|avif|png|jpe?g|svg|ico)$/.test(ext);
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
      // Spam guard: generous per-IP ceiling (many customers can share one mobile/office/proxy IP) + a tighter per-phone limit.
      if (rateLimited('enq-ip:' + clientIp(req), 120, 10 * 60e3)) return send(res, 429, {error: 'Too many requests. Please message us on WhatsApp directly.'});
      const b = await readBody(req, 20_000);
      const type = ENQ_TYPES.includes(b.type) ? b.type : 'general';
      const name = str(b.customer?.name, 80);
      const phone = str(b.customer?.phone, 20).replace(/[^\d+]/g, '');
      if (!name || phone.replace(/\D/g, '').length < 8) return send(res, 400, {error: 'Name and a valid phone number are required.'});
      if (rateLimited('enq-ph:' + phone.replace(/\D/g, '').slice(-10), 15, 10 * 60e3)) return send(res, 429, {error: 'You have sent several enquiries already. Please continue on WhatsApp.'});
      const listing = b.listingId ? db.listings.find((l) => l.id === b.listingId) : null;
      // Agent attribution: code from the agent link (?ref= / /a/CODE) or typed by the customer.
      const agentCode = normCode(b.source?.agent);
      const agent = findAgent(agentCode);
      const enq = {
        id: id('e_'), ref: makeRef(), createdAt: now(), updatedAt: now(), type,
        title: str(b.title, 140), listingId: listing?.id || null, listingTitle: listing?.title || null,
        fields: cleanFields(b.fields),
        customer: {name, phone, email: str(b.customer?.email, 120)},
        source: {utm: str(b.source?.utm, 80), page: str(b.source?.page, 200), referrer: str(b.source?.referrer, 200)},
        status: 'new', vendorId: listing?.vendorId || null, quote: '', notes: [],
        agentId: agent?.id || null, agentCode: agentCode || '', incentivePct: agent ? partnerPct(agent) : null, bookingValue: null, incentiveAmount: null, incentiveManual: false,
      };
      await store.put('enquiries', enq);
      db.enquiries.unshift(enq);
      return send(res, 201, {ref: enq.ref, agent: agent ? agent.agentCode : null});
    }

    // ---------- Agent short link: /a/CODE → home page with the code attached ----------
    if (p.startsWith('/a/') && req.method === 'GET') {
      const code = normCode(p.slice(3));
      return send(res, 302, '', {Location: CODE_RE.test(code) ? `/?ref=${code}` : '/'});
    }

    // ---------- Partner portal ----------
    if (p === '/api/partner/login' && req.method === 'POST') {
      if (rateLimited('plogin:' + clientIp(req), 10, 15 * 60e3)) return send(res, 429, {error: 'Too many attempts. Try again in 15 minutes.'});
      const b = await readBody(req, 2_000);
      const phone = last10(b.phone); const pin = str(b.pin, 12);
      if (phone.length < 10 || !/^\d{4,8}$/.test(pin)) return send(res, 400, {error: 'Enter your 10-digit phone number and PIN.'});
      if (rateLimited('plogin-ph:' + phone, 10, 60 * 60e3)) return send(res, 429, {error: 'Too many attempts for this number. Try again later.'});
      const v = db.vendors.find((x) => x.pinHash && x.active !== false && [x.whatsapp, x.ownerPhone, x.managerPhone].some((ph) => last10(ph) === phone) && pinMatches(pin, x.pinHash));
      if (!v) return send(res, 401, {error: 'Wrong phone number or PIN.'});
      return send(res, 200, {ok: true}, {'Set-Cookie': `ni_partner=${makePartnerToken(v)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 3600}${secureFlag(req)}`});
    }
    if (p === '/api/partner/logout' && req.method === 'POST') return send(res, 200, {ok: true}, {'Set-Cookie': `ni_partner=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag(req)}`});
    if (p.startsWith('/api/partner/')) {
      const v = currentPartner(req);
      if (!v) return send(res, 401, {error: 'Not signed in.'});
      if (p === '/api/partner/me' && req.method === 'GET') return send(res, 200, partnerView(v));
      if (p === '/api/partner/upload' && req.method === 'POST') {
        if (rateLimited('pupload:' + v.id, 60, 60 * 60e3)) return send(res, 429, {error: 'Upload limit reached. Try again in an hour.'});
        const b = await readBody(req, 12_000_000);
        return send(res, 201, saveUpload(b.dataUrl, b.thumbDataUrl, b.branded === true));
      }
      // Propose changes to one of my listings → stored as pendingEdit until admin approves (DELETE withdraws).
      if (p === '/api/partner/listings' && req.method === 'POST') {
        if (rateLimited('pnew:' + v.id, 15, 60 * 60e3)) return send(res, 429, {error: 'Too many new listings in an hour. Try again later.'});
        if (db.listings.filter((l) => l.vendorId === v.id && l.pendingEdit?.isNew).length >= 25) return send(res, 400, {error: 'You have 25 listings waiting for approval. Please wait for the team to review them.'});
        const b = await readBody(req, 100_000);
        const type = LISTING_TYPES[b.type] ? b.type : null;
        if (!type) return send(res, 400, {error: 'Choose what you are listing.'});
        const blank = {images: [], highlights: [], price: {unit: LISTING_TYPES[type]}};
        const f = cleanPartnerEdit(b, blank);
        if (!f.title) return send(res, 400, {error: 'Add a title.'});
        const area = str(b.area, 120);
        const l = {id: id('l_'), type, subtype: '', status: 'draft', featured: false, order: 100, vendorId: v.id, createdBy: 'partner',
          title: f.title, tagline: f.tagline || '', description: f.description || '', price: f.price || {amount: null, unit: LISTING_TYPES[type], note: ''},
          images: f.images || [], highlights: f.highlights || [], amenities: [], rooms: [], itinerary: [], details: [],
          location: {area, district: '', address: '', lat: null, lng: null}, internalNotes: '',
          pendingEdit: {isNew: true, changes: {}, note: str(b.note, 300), at: now()}, editReview: null, createdAt: now(), updatedAt: now()};
        await store.put('listings', l); db.listings.push(l);
        return send(res, 201, partnerView(v));
      }
      const pm = /^\/api\/partner\/listings\/([\w-]+)\/edit$/.exec(p);
      if (pm) {
        const li = db.listings.findIndex((l) => l.id === pm[1] && l.vendorId === v.id);
        if (li < 0) return send(res, 404, {error: 'Listing not found.'});
        const l = db.listings[li];
        if (req.method === 'PUT') {
          if (rateLimited('pedit:' + v.id, 30, 60 * 60e3)) return send(res, 429, {error: 'Too many edits. Try again later.'});
          const b = await readBody(req, 100_000);
          const changes = cleanPartnerEdit(b, l);
          const resend = !l.pendingEdit && l.status === 'draft' && l.createdBy === 'partner' && l.editReview?.isNew; // fixing a rejected new listing
          if (l.pendingEdit?.isNew || resend) {
            const area = 'area' in b ? str(b.area, 120) : l.location?.area;
            const updated = {...l, ...changes, location: {...(l.location || {}), area}, pendingEdit: {isNew: true, changes: {}, note: str(b.note, 300) || l.pendingEdit?.note || '', at: now()}, editReview: null, updatedAt: now()};
            await store.put('listings', updated); db.listings[li] = updated;
            return send(res, 200, partnerView(v));
          }
          if (!Object.keys(changes).length) return send(res, 400, {error: 'Nothing has changed.'});
          const updated = {...l, pendingEdit: {changes, note: str(b.note, 300), at: now()}, editReview: null, updatedAt: now()};
          await store.put('listings', updated); db.listings[li] = updated;
          return send(res, 200, partnerView(v));
        }
        if (req.method === 'DELETE') {
          if (l.pendingEdit?.isNew || (l.createdBy === 'partner' && l.status === 'draft' && l.editReview?.status === 'rejected')) {
            await store.remove('listings', l.id); db.listings.splice(li, 1);
            return send(res, 200, partnerView(v));
          }
          const updated = {...l, pendingEdit: null, updatedAt: now()};
          await store.put('listings', updated); db.listings[li] = updated;
          return send(res, 200, partnerView(v));
        }
      }
      if (p === '/api/partner/pin' && req.method === 'PUT') {
        const b = await readBody(req, 1_000);
        if (!pinMatches(str(b.current, 12), v.pinHash)) return send(res, 400, {error: 'Your current PIN is wrong.'});
        const next = str(b.next, 12);
        if (!/^\d{4,8}$/.test(next)) return send(res, 400, {error: 'New PIN must be 4 to 8 digits.'});
        const i = db.vendors.findIndex((x) => x.id === v.id);
        const updated = {...v, pinHash: hashPin(next), updatedAt: now()};
        await store.put('vendors', updated); db.vendors[i] = updated;
        return send(res, 200, {ok: true}, {'Set-Cookie': `ni_partner=${makePartnerToken(updated)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 3600}${secureFlag(req)}`});
      }
      return send(res, 404, {error: 'Unknown partner route'});
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
      if (col === 'db' && req.method === 'GET') return send(res, 200, {...db, vendors: db.vendors.map(adminPartner), defaultIncentivePct: defaultPct()});

      // Partner portal PIN: POST generates a new 6-digit PIN (shown once), DELETE turns portal access off.
      if (col === 'vendors' && itemId && parts[2] === 'pin' && (req.method === 'POST' || req.method === 'DELETE')) {
        const i = db.vendors.findIndex((x) => x.id === itemId); if (i < 0) return send(res, 404, {error: 'Not found'});
        if (db.vendors[i].inhouse) return send(res, 400, {error: 'The in-house partner has no portal login.'});
        const pin = req.method === 'POST' ? String(crypto.randomInt(0, 1e6)).padStart(6, '0') : null;
        const updated = {...db.vendors[i], pinHash: pin ? hashPin(pin) : '', updatedAt: now()};
        await store.put('vendors', updated); db.vendors[i] = updated;
        return send(res, 200, {partner: adminPartner(updated), pin});
      }

      if (col === 'settings' && req.method === 'PUT') {
        const b = await readBody(req, 20_000);
        const changes = Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === 'string').map(([k, v]) => [str(k, 64), str(v, 400)]));
        await store.putSettings(changes);
        Object.assign(db.settings, changes);
        return send(res, 200, db.settings);
      }

      // Review a partner's proposed listing changes: approve applies them, reject keeps the listing as it is.
      if (col === 'listings' && itemId && parts[2] === 'edit' && req.method === 'POST') {
        const li = db.listings.findIndex((l) => l.id === itemId); if (li < 0) return send(res, 404, {error: 'Not found'});
        const l = db.listings[li]; const pe = l.pendingEdit;
        if (!pe) return send(res, 400, {error: 'No changes are waiting for review.'});
        const b = await readBody(req, 4_000);
        let updated;
        if (b.action === 'approve') {
          const apply = Object.fromEntries(Object.entries(pe.changes || {}).filter(([k]) => PARTNER_FIELDS.includes(k)));
          updated = {...l, ...apply, ...(pe.isNew ? {status: 'published'} : {}), pendingEdit: null, editReview: {status: 'approved', at: now(), isNew: Boolean(pe.isNew)}, updatedAt: now()};
        } else if (b.action === 'reject') {
          updated = {...l, pendingEdit: null, editReview: {status: 'rejected', at: now(), reason: str(b.reason, 300), changes: pe.changes, isNew: Boolean(pe.isNew)}, updatedAt: now()};
        } else return send(res, 400, {error: 'Choose approve or reject.'});
        await store.put('listings', updated); db.listings[li] = updated;
        return send(res, 200, updated);
      }

      if ((col === 'listings' || col === 'vendors') && itemId) {
        const arr = db[col];
        if (req.method === 'PUT') {
          const b = await readBody(req, 400_000);
          if (typeof b !== 'object' || Array.isArray(b)) return send(res, 400, {error: 'Bad data'});
          const i = arr.findIndex((x) => x.id === itemId);
          if (col === 'vendors') { delete b.pinHash; delete b.hasPin; delete b.inhouse; }
          if (col === 'listings') { delete b.pendingEdit; delete b.editReview; } // only changed via the review route / partner portal
          const item = {...(i >= 0 ? arr[i] : {createdAt: now()}), ...b, id: itemId === 'new' ? id(col === 'listings' ? 'l_' : 'v_') : itemId, updatedAt: now()};
          if (col === 'listings') {
            item.title = str(item.title, 140) || 'Untitled'; item.images = (item.images || []).filter((u) => typeof u === 'string' && /^(https:\/\/|\/uploads\/|\/img\/)/.test(u)).slice(0, 20);
            if (!partnerExists(item.vendorId)) return send(res, 400, {error: 'Choose the partner who offers this listing (or Nirvana Inside in-house).'});
          }
          if (col === 'vendors' && item.id === INHOUSE_ID) Object.assign(item, {inhouse: true, kind: 'inhouse', agentCode: '', incentivePct: 0, payouts: [], active: true});
          else if (col === 'vendors') {
            item.agentCode = normCode(item.agentCode) || genCode(item.business);
            if (!CODE_RE.test(item.agentCode)) return send(res, 400, {error: 'Agent code must be 4–12 letters or numbers.'});
            if (db.vendors.some((v) => v.id !== item.id && v.agentCode === item.agentCode)) return send(res, 409, {error: `Agent code ${item.agentCode} is already used by another partner.`});
            item.incentivePct = num(item.incentivePct, 0, 100);
            item.payouts = cleanPayouts(item.payouts);
          }
          await store.put(col, item);
          if (i >= 0) arr[i] = item; else arr.push(item);
          return send(res, 200, col === 'vendors' ? adminPartner(item) : item);
        }
        if (req.method === 'DELETE') {
          const i = arr.findIndex((x) => x.id === itemId); if (i < 0) return send(res, 404, {error: 'Not found'});
          if (col === 'vendors' && itemId === INHOUSE_ID) return send(res, 400, {error: 'The in-house partner can’t be deleted.'});
          await store.remove(col, itemId);
          arr.splice(i, 1);
          if (col === 'vendors') {
            // Listings never go without a partner: they move to in-house.
            for (const [j, l] of db.listings.entries()) {
              if (l.vendorId !== itemId) continue;
              const updated = {...l, vendorId: INHOUSE_ID, pendingEdit: null, updatedAt: now()};
              await store.put('listings', updated); db.listings[j] = updated;
            }
          }
          return send(res, 200, {ok: true});
        }
      }

      if (col === 'enquiries' && itemId && req.method === 'PATCH') {
        const idx = db.enquiries.findIndex((x) => x.id === itemId); if (idx < 0) return send(res, 404, {error: 'Not found'});
        const e = structuredClone(db.enquiries[idx]);
        const b = await readBody(req, 20_000);
        if (['new', 'contacted', 'checking_vendor', 'quoted', 'confirmed', 'completed', 'lost'].includes(b.status)) e.status = b.status;
        if ('vendorId' in b) e.vendorId = b.vendorId || null;
        if ('quote' in b) e.quote = str(b.quote, 200);
        if ('followUp' in b) e.followUp = str(b.followUp, 20);
        if ('agentId' in b) {
          const a = b.agentId ? db.vendors.find((v) => v.id === b.agentId && !v.inhouse) : null;
          if (b.agentId && !a) return send(res, 400, {error: 'Unknown partner'});
          if ((a?.id || null) !== (e.agentId || null)) { e.agentId = a?.id || null; e.agentCode = a?.agentCode || ''; e.incentivePct = a ? partnerPct(a) : null; }
        }
        if ('bookingValue' in b) e.bookingValue = num(b.bookingValue, 0);
        if ('incentivePct' in b) e.incentivePct = num(b.incentivePct, 0, 100);
        if ('incentiveManual' in b) e.incentiveManual = Boolean(b.incentiveManual);
        if (e.incentiveManual && 'incentiveAmount' in b) e.incentiveAmount = num(b.incentiveAmount, 0);
        if (!e.incentiveManual) e.incentiveAmount = e.agentId && e.bookingValue != null && e.incentivePct != null ? Math.round((e.bookingValue * e.incentivePct) / 100) : null;
        if (b.note) e.notes.push({at: now(), text: str(b.note, 1000)});
        e.updatedAt = now();
        await store.put('enquiries', e);
        db.enquiries[idx] = e;
        return send(res, 200, e);
      }
      if (col === 'enquiries' && itemId && req.method === 'DELETE') {
        await store.remove('enquiries', itemId);
        db.enquiries = db.enquiries.filter((x) => x.id !== itemId);
        return send(res, 200, {ok: true});
      }

      if (col === 'upload' && req.method === 'POST') {
        const b = await readBody(req, 12_000_000);
        return send(res, 201, saveUpload(b.dataUrl, b.thumbDataUrl, b.branded === true));
      }

      if (col === 'export.csv' && req.method === 'GET') {
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Ref', 'Created', 'Type', 'Title', 'Status', 'Customer', 'Phone', 'Service partner', 'Quote', 'Details', 'Source', 'Agent', 'Agent code', 'Booking value', 'Incentive %', 'Incentive'].map(q).join(',')];
        for (const e of db.enquiries) {
          const v = db.vendors.find((x) => x.id === e.vendorId);
          const a = db.vendors.find((x) => x.id === e.agentId);
          rows.push([e.ref, e.createdAt, e.type, e.title, e.status, e.customer.name, e.customer.phone, v?.business || '', e.quote, e.fields.map(([k, val]) => `${k}: ${val}`).join(' | '), e.source?.utm || '', a?.business || '', e.agentCode || '', e.bookingValue ?? '', e.incentivePct ?? '', e.incentiveAmount ?? ''].map(q).join(','));
        }
        return send(res, 200, '﻿' + rows.join('\n'), {'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`});
      }
      return send(res, 404, {error: 'Unknown admin route'});
    }

    if (p.startsWith('/api/')) return send(res, 404, {error: 'Not found'});

    // ---------- Files ----------
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (p.startsWith('/uploads/')) {
      let rel = p.slice('/uploads/'.length);
      const t = /^([a-z0-9-]+)-t\.(webp|jpg|png)$/.exec(rel);
      if (t && !fs.existsSync(path.join(UPLOADS, rel))) rel = `${t[1]}.${t[2]}`; // no preview for older photos: use the full one
      return serveFile(res, UPLOADS, rel);
    }
    if (p === '/admin' || p === '/admin/') return serveFile(res, PUBLIC, 'admin/index.html');
    if (p === '/partner' || p === '/partner/') return serveFile(res, PUBLIC, 'partner/index.html');
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

async function start() {
  try { store = await openStore({dataDir: DATA_DIR, root: ROOT, initial: initialData}); }
  catch (err) {
    console.error(`✖ Could not open the database: ${err.code || ''} ${err.message}`);
    if (/ECONNREFUSED|ER_ACCESS_DENIED|ENOTFOUND|ER_BAD_DB/.test(`${err.code} ${err.message}`)) console.error('  Check DB_HOST (use 127.0.0.1 on Hostinger, not localhost), DB_USER, DB_PASSWORD and DB_NAME.');
    process.exit(1);
  }
  db = store.db;
  console.log('Storage:', store.kind);
  // Built-in in-house partner, and every listing must have a partner: unassigned ones (or ones pointing at a
  // deleted partner) go to in-house.
  try {
    if (!partnerExists(INHOUSE_ID)) { const v = {...INHOUSE, createdAt: now(), updatedAt: now()}; await store.put('vendors', v); db.vendors.push(v); console.log('Created in-house partner'); }
    let moved = 0;
    for (const [i, l] of db.listings.entries()) {
      if (l.vendorId && partnerExists(l.vendorId)) continue;
      const updated = {...l, vendorId: INHOUSE_ID, updatedAt: now()};
      await store.put('listings', updated); db.listings[i] = updated; moved++;
    }
    if (moved) console.log(`${moved} listing(s) without a partner assigned to in-house`);
  } catch (err) { console.error('Could not set up the in-house partner:', err.message); }
  // Every partner needs an agent code: give one to partners created before the agent system existed.
  try {
    for (const [i, v] of db.vendors.entries()) {
      if (v.inhouse || (v.agentCode && CODE_RE.test(v.agentCode))) continue;
      const updated = {...v, agentCode: genCode(v.business), updatedAt: now()};
      await store.put('vendors', updated); db.vendors[i] = updated;
      console.log(`Partner ${v.business || v.id}: agent code ${updated.agentCode}`);
    }
  } catch (err) { console.error('Could not assign agent codes:', err.message); }
  server.listen(PORT, () => console.log(`Nirvana Inside running → http://localhost:${PORT}  (admin: /admin)  uploads: ${UPLOADS}`));
}
start();

for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => {
  server.close();
  (store ? store.close() : Promise.resolve()).catch(() => {}).finally(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
});
