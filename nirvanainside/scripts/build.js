// npm run build → build/nirvana-inside/ (deploy folder) + build/nirvana-inside-<version>.tar.gz
// Copies only what production needs, adds cache-busting hashes to CSS/JS links, and never includes .env, db.json or uploads.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'build');
const APP = path.join(OUT_DIR, 'nirvana-inside');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const INCLUDE = ['server.js', 'package.json', 'README.md', '.env.example', 'data/seed.js', 'public'];

fs.rmSync(OUT_DIR, {recursive: true, force: true});
fs.mkdirSync(APP, {recursive: true});
for (const rel of INCLUDE) fs.cpSync(path.join(ROOT, rel), path.join(APP, rel), {recursive: true});
fs.mkdirSync(path.join(APP, 'uploads'), {recursive: true});
fs.writeFileSync(path.join(APP, 'uploads', '.gitkeep'), '');
// Include the current database + uploaded photos (imported on the server's first start; never overwrites live data).
const dbSrc = path.join(ROOT, 'data', 'db.json');
const withData = fs.existsSync(dbSrc) && !process.argv.includes('--no-data');
if (withData) {
  fs.copyFileSync(dbSrc, path.join(APP, 'data', 'db.json'));
  for (const f of fs.readdirSync(path.join(ROOT, 'uploads'))) if (!f.startsWith('.')) fs.copyFileSync(path.join(ROOT, 'uploads', f), path.join(APP, 'uploads', f));
}
fs.writeFileSync(path.join(APP, '.gitignore'), fs.readFileSync(path.join(ROOT, '.gitignore')));

// Syntax-check every script in the build.
const scripts = [path.join(APP, 'server.js'), ...fs.readdirSync(path.join(APP, 'public/js')).map((f) => path.join(APP, 'public/js', f)), path.join(APP, 'public/admin/admin.js')];
for (const f of scripts) execFileSync(process.execPath, ['--check', f], {stdio: 'inherit'});

// Cache-busting: /css/site.css → /css/site.css?v=<hash>
const pub = path.join(APP, 'public');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
const htmlFiles = [];
(function walk(dir) { for (const e of fs.readdirSync(dir, {withFileTypes: true})) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.html')) htmlFiles.push(p); } })(pub);
let busted = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8').replace(/(href|src)="(\/(?:css|js|admin)\/[^"?]+\.(?:css|js))"/g, (m, attr, url) => {
    const target = path.join(pub, url);
    if (!fs.existsSync(target)) return m;
    busted++;
    return `${attr}="${url}?v=${hash(target)}"`;
  });
  fs.writeFileSync(file, html);
}

// Build info
const version = `${pkg.version}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
fs.writeFileSync(path.join(APP, 'BUILD.txt'), `Nirvana Inside ${version}\nBuilt ${new Date().toISOString()}\n\nDeploy: upload this folder, create .env from .env.example, run "npm start".\nThe bundled database (if any) is imported only on first start; live data is never overwritten.\n`);

// Archive
const archive = `nirvana-inside-${version}.tar.gz`;
execFileSync('tar', ['-czf', archive, 'nirvana-inside'], {cwd: OUT_DIR});
// Hostinger "Upload your files": package.json must sit at the top of the archive.
const hzip = `nirvana-inside-hostinger-${version}.zip`;
execFileSync('zip', ['-qr', path.join(OUT_DIR, hzip), '.', '-x', '.DS_Store'], {cwd: APP});

const size = (p) => { let s = 0; (function w(d) { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const q = path.join(d, e.name); e.isDirectory() ? w(q) : (s += fs.statSync(q).size); } })(p); return s; };
console.log(`✓ Build ready
  Folder : build/nirvana-inside  (${(size(APP) / 1048576).toFixed(1)} MB)
  Archive: build/${archive}  (${(fs.statSync(path.join(OUT_DIR, archive)).size / 1048576).toFixed(1)} MB)
  Hostinger: build/${hzip}  (${(fs.statSync(path.join(OUT_DIR, hzip)).size / 1048576).toFixed(1)} MB)
  ${htmlFiles.length} pages, ${busted} cache-busted asset links, ${scripts.length} scripts checked
  Database: ${withData ? 'included (data/db.json + uploads)' : 'not included'}
  Excluded: .env (login secrets)`);
