// npm run db:import -- [path/to/db.json]
// Copies a JSON database (default: data/db.json) into MySQL, REPLACING what is there.
// Needs DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (or DATABASE_URL) in .env or the environment.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {connectMysql, ensureSchema, importAll, mysqlConfigured} from '../lib/store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

if (!mysqlConfigured()) { console.error('✖ Set DB_HOST, DB_USER, DB_PASSWORD and DB_NAME (or DATABASE_URL) first.'); process.exit(1); }
const file = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('-')) || path.join(ROOT, 'data', 'db.json'));
if (!fs.existsSync(file)) { console.error(`✖ ${file} not found.`); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const pool = await connectMysql();
try {
  await ensureSchema(pool, ROOT);
  await importAll(pool, data);
  console.log(`✓ Imported into MySQL: ${data.listings?.length || 0} listings, ${data.vendors?.length || 0} vendors, ${data.enquiries?.length || 0} enquiries, ${Object.keys(data.settings || {}).length} settings.`);
} catch (err) {
  console.error(`✖ Import failed: ${err.code || ''} ${err.message}`); process.exitCode = 1;
} finally { await pool.end(); }
