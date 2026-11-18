// SEO: clean URLs, server-rendered titles/descriptions/content, structured data and the sitemap.
// Search engines get real HTML (headings, text, links) without running any JavaScript; the page scripts
// then take over exactly as before.
import fs from 'node:fs';
import path from 'node:path';

// Category pages: /stays, /taxis, /experiences, /rentals, /tour-packages
export const CAT = {
  stay: {path: 'stays', label: 'Stays', one: 'Stay', emo: '🏨', title: 'Stays across Himachal', h1: 'Stays across Himachal',
    desc: 'Hotels, homestays and long-term rentals across Himachal Pradesh: Manali, Kullu, Kasol, Shimla, Dharamshala and more. Best price on WhatsApp.'},
  transport: {path: 'taxis', label: 'Taxis & transport', one: 'Taxi', emo: '🚕', title: 'Taxis, cabs & buses in Himachal', h1: 'Taxis, cabs & buses',
    desc: 'Taxis and cabs from hatchback to Innova Crysta, Tempo Travellers and Volvo coaches across Himachal Pradesh. One-way, round trip, airport and hourly. Best fare on WhatsApp.'},
  experience: {path: 'experiences', label: 'Experiences', one: 'Experience', emo: '🪂', title: 'Adventures & experiences in Himachal', h1: 'Adventures & experiences',
    desc: 'Paragliding in Bir Billing and Solang, river rafting on the Beas, bungee, camping, skiing and treks, run by certified operators. Book on WhatsApp.'},
  rental: {path: 'rentals', label: 'Rentals', one: 'Rental', emo: '🏍️', title: 'Bike, scooty & car rentals in Himachal', h1: 'Rent anything, anywhere',
    desc: 'Royal Enfield and Himalayan bikes, scooties, self-drive cars, snow gear and camping kit for rent in Manali, Kullu and across Himachal.'},
  package: {path: 'tour-packages', label: 'Tour packages', one: 'Package', emo: '🗺️', title: 'Himachal tour packages', h1: 'Tour packages, A–Z',
    desc: 'Complete Himachal tour packages: Manali, Spiti, Shimla, Dharamshala, honeymoon and backpacker trips with stays, cab, sightseeing and activities.'},
};
export const CAT_BY_PATH = Object.fromEntries(Object.entries(CAT).map(([k, v]) => [v.path, k]));
const LIVE = (l) => l.status === 'published' || l.status === 'coming_soon';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '') || 'listing';

/** Give every listing a stable, unique slug (kept when the title changes, so links never break). Returns listings that changed. */
export function ensureSlugs(listings) {
  const used = new Set(listings.map((l) => l.slug).filter(Boolean));
  const changed = [];
  for (const l of listings) {
    if (l.slug) continue;
    const base = slugify(l.title); let s = base, n = 2;
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s); l.slug = s; changed.push(l);
  }
  return changed;
}
export const listingPath = (l) => `/${(CAT[l.type] || CAT.stay).path}/${l.slug}`;
export const catPath = (type) => `/${(CAT[type] || CAT.stay).path}`;

const abs = (origin, u) => (!u ? '' : /^https?:\/\//.test(u) ? u : origin + u);
function head({title, desc, canonical, image, origin, type = 'website', settings, ld = []}) {
  const img = abs(origin, image) || `${origin}/img/og.jpg`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="${type}">`, `<meta property="og:site_name" content="Nirvana Inside">`, `<meta property="og:locale" content="en_IN">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`, `<meta property="og:image" content="${esc(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(desc)}">`, `<meta name="twitter:image" content="${esc(img)}">`,
    verifyMeta(settings),
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n  ');
}
export function verifyMeta(settings = {}) {
  const tags = [];
  const g = String(settings.googleVerification || '').trim().replace(/^.*content=["']?([^"' >]+).*$/s, '$1');
  const b = String(settings.bingVerification || '').trim().replace(/^.*content=["']?([^"' >]+).*$/s, '$1');
  if (/^[\w-]{10,100}$/.test(g)) tags.push(`<meta name="google-site-verification" content="${g}">`);
  if (/^[\w-]{10,100}$/.test(b)) tags.push(`<meta name="msvalidate.01" content="${b}">`);
  return tags.join('\n  ');
}
// Replace the template's own <title>, description, canonical and social tags with ours.
function setHead(html, block) {
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta (property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '')
    .replace(/\s*<meta name="(google-site-verification|msvalidate\.01)"[^>]*>/g, '');
  return html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  ${block}`);
}
const crumbs = (origin, items) => ({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({'@type': 'ListItem', position: i + 1, name, item: origin + url}))});
const org = (origin, s) => ({'@type': 'TravelAgency', name: s.brand || 'Nirvana Inside', url: origin + '/', logo: `${origin}/img/logo.png`, telephone: s.phone || '+91 72200 80005',
  address: {'@type': 'PostalAddress', streetAddress: s.office || 'Dhalpur', addressLocality: 'Kullu', addressRegion: 'Himachal Pradesh', postalCode: '175101', addressCountry: 'IN'}});
const priceText = (p) => (p?.amount ? `₹${Number(p.amount).toLocaleString('en-IN')} / ${p.unit || 'unit'}${p.note && p.note !== 'Best price on WhatsApp' ? ` · ${p.note}` : ''}` : 'Best price on WhatsApp');
const linkList = (ls) => `<ul class="seo-links">${ls.map((l) => `<li><a href="${listingPath(l)}">${esc(l.title)}</a>${l.location?.area ? ` <span>· ${esc(l.location.area)}</span>` : ''}</li>`).join('')}</ul>`;

// ---------- Listing page ----------
export function renderListing(tpl, l, {origin, settings}) {
  const c = CAT[l.type] || CAT.stay;
  const area = l.location?.area || 'Himachal Pradesh';
  const place = String(l.location?.area || '').split(/[\/,·|–-]/)[0].trim();
  const needPlace = place && !l.title.toLowerCase().includes(place.toLowerCase()) && !/^(all|across|on request)/i.test(place);
  const title = `${clip(`${l.title}${needPlace ? `, ${place}` : ''}`, 52)} | Nirvana Inside`;
  const desc = clip(`${l.title}${l.tagline ? ` – ${l.tagline}` : ''}. ${l.description || ''} ${area}. ${l.price?.amount ? `From ${priceText(l.price)}.` : ''} Book on WhatsApp with Nirvana Inside, best price guaranteed.`, 158);
  const url = origin + listingPath(l);
  const images = (l.images || []).slice(0, 6).map((u) => abs(origin, u));
  const schemaType = {stay: 'LodgingBusiness', transport: 'TaxiService', experience: 'TouristAttraction', rental: 'Service', package: 'TouristTrip'}[l.type] || 'Service';
  const item = {'@context': 'https://schema.org', '@type': schemaType, name: l.title, description: clip(l.description || l.tagline || l.title, 300), url, image: images,
    ...(schemaType === 'TouristAttraction' || schemaType === 'LodgingBusiness' ? {address: {'@type': 'PostalAddress', addressLocality: area, addressRegion: 'Himachal Pradesh', addressCountry: 'IN'}} : {areaServed: {'@type': 'State', name: 'Himachal Pradesh'}}),
    ...(l.location?.lat != null && l.location?.lng != null ? {geo: {'@type': 'GeoCoordinates', latitude: l.location.lat, longitude: l.location.lng}} : {}),
    ...(['TaxiService', 'Service', 'TouristTrip'].includes(schemaType) ? {provider: org(origin, settings)} : {}),
    ...(l.price?.amount ? {offers: {'@type': 'Offer', price: l.price.amount, priceCurrency: 'INR', url, availability: l.status === 'coming_soon' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock'}} : {}),
  };
  const ld = [item, crumbs(origin, [['Home', '/'], [c.label, catPath(l.type)], [l.title, listingPath(l)]])];
  let html = setHead(tpl, head({title, desc, canonical: url, image: l.images?.[0], origin, type: 'article', settings, ld}));
  const wa = (settings.whatsapp || '917220080005').replace(/\D/g, '');
  const body = `<article class="seo-pre" style="margin-top:110px">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${catPath(l.type)}">${esc(c.label)}</a> › <span>${esc(l.title)}</span></nav>
    <h1>${esc(l.title)}</h1>
    <p>📍 ${esc(area)}${l.tagline ? ` · ${esc(l.tagline)}` : ''}</p>
    ${l.images?.[0] ? `<img src="${esc(l.images[0])}" alt="${esc(l.title)}" width="800" height="600" style="max-width:100%;height:auto;border-radius:16px">` : ''}
    ${l.description ? `<p>${esc(l.description)}</p>` : ''}
    ${(l.highlights || []).length ? `<ul>${l.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    <p><b>${esc(priceText(l.price))}</b></p>
    <p><a href="https://wa.me/${wa}?text=${encodeURIComponent(`Hello Nirvana Inside! I'm interested in: ${l.title}`)}">Enquire on WhatsApp</a></p>
  </article>`;
  html = html.replace(/<div id="item">[\s\S]*?<\/div>\s*<\/main>/, `<div id="item">${body}</div></main>`);
  return html.replace('<body data-solid="1">', `<body data-solid="1" data-id="${esc(l.id)}">`);
}

// ---------- Category page ----------
export function renderCategory(tpl, type, listings, {origin, settings}) {
  const c = CAT[type];
  const mine = listings.filter((l) => LIVE(l) && l.type === type);
  const url = origin + catPath(type);
  const title = `${c.title} | Nirvana Inside`;
  const ld = [crumbs(origin, [['Home', '/'], [c.label, catPath(type)]]),
    {'@context': 'https://schema.org', '@type': 'ItemList', name: c.title, itemListElement: mine.map((l, i) => ({'@type': 'ListItem', position: i + 1, url: origin + listingPath(l), name: l.title}))}];
  let html = setHead(tpl, head({title, desc: c.desc, canonical: url, image: mine.find((l) => l.images?.[0])?.images[0], origin, settings, ld}));
  html = html.replace(/<p class="eyebrow mono" id="ex-eyebrow">[^<]*<\/p>/, `<p class="eyebrow mono" id="ex-eyebrow">${c.emo} ${esc(c.label)}</p>`)
    .replace(/<h1 id="ex-title">[^<]*<\/h1>/, `<h1 id="ex-title">${esc(c.h1)}</h1>`)
    .replace(/<p id="ex-sub"><\/p>/, `<p id="ex-sub">${esc(c.desc)}</p>`)
    .replace(/<div class="cards" id="ex-grid"><\/div>/, `<div class="cards" id="ex-grid">${linkList(mine)}</div>`);
  return html.replace('<body data-solid="1">', `<body data-solid="1" data-type="${type}">`);
}

// ---------- Home ----------
export function renderHome(tpl, listings, {origin, settings}) {
  const live = listings.filter(LIVE);
  const site = {'@context': 'https://schema.org', '@type': 'WebSite', name: 'Nirvana Inside', url: origin + '/', inLanguage: 'en-IN'};
  const agency = {'@context': 'https://schema.org', ...org(origin, settings), image: `${origin}/img/og.jpg`, areaServed: {'@type': 'State', name: 'Himachal Pradesh'},
    priceRange: '₹₹', ...(settings.instagram ? {sameAs: [settings.instagram]} : {}),
    description: 'Himachal Pradesh travel: hotels & homestays, taxis, paragliding, rafting, bike rentals and tour packages, all booked on one WhatsApp.'};
  let html = setHead(tpl, head({title: 'Nirvana Inside – Himachal Stays, Taxis, Adventures, Rentals & Tour Packages',
    desc: 'Book anything in Himachal Pradesh on one WhatsApp: hotels & homestays, taxis from hatchback to Volvo, paragliding, rafting, bike rentals and complete tour packages. Best price guaranteed.',
    canonical: origin + '/', origin, settings, ld: [site, agency]}));
  html = html.replace(/<div id="rails"><\/div>/, `<div id="rails"><section class="section"><div class="wrap">${Object.keys(CAT).map((t) => {
    const ls = live.filter((l) => l.type === t); if (!ls.length) return '';
    return `<h2><a href="${catPath(t)}">${CAT[t].emo} ${esc(CAT[t].title)}</a></h2>${linkList(ls)}`;
  }).join('')}</div></section></div>`);
  // category tiles + nav links in the static HTML use the clean URLs
  return html.replace(/\/explore\.html\?type=(stay|transport|experience|rental|package)/g, (m, t) => catPath(t));
}

// Any other page (404 etc.): just add verification tags.
export const withVerify = (html, settings) => { const v = verifyMeta(settings); return v ? html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  ${v}`) : html; };

export function sitemap(listings, origin) {
  const live = listings.filter(LIVE);
  const day = (d) => (d ? String(d).slice(0, 10) : '');
  const newest = (ls) => ls.map((l) => day(l.updatedAt || l.createdAt)).sort().pop();
  const urls = [['/', newest(live), '1.0'], ...Object.keys(CAT).map((t) => [catPath(t), newest(live.filter((l) => l.type === t)), '0.8']),
    ...live.map((l) => [listingPath(l), day(l.updatedAt || l.createdAt), '0.7', (l.images || [])[0]])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(([u, d, pr, img]) =>
    `<url><loc>${esc(origin + u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${pr}</priority>${img ? `<image:image><image:loc>${esc(abs(origin, img))}</image:loc></image:image>` : ''}</url>`).join('\n')}\n</urlset>`;
}

// Templates are read once (they only change on deploy).
const cache = new Map();
export function template(publicDir, file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.join(publicDir, file), 'utf8'));
  return cache.get(file);
}
