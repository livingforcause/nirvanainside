/* Nirvana Inside — shared front-end: header/footer, catalog, enquiry → WhatsApp flow, cards, maps, lightbox. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const store = {get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }};

  const TYPES = {
    stay: {label: 'Stays', one: 'Stay', emo: '🏨', color: '#dd9332', href: 'explore.html?type=stay'},
    transport: {label: 'Transport', one: 'Taxi', emo: '🚕', color: '#3f7f95', href: 'explore.html?type=transport'},
    experience: {label: 'Experiences', one: 'Experience', emo: '🪂', color: '#c4573a', href: 'explore.html?type=experience'},
    rental: {label: 'Rentals', one: 'Rental', emo: '🏍️', color: '#5f8f5a', href: 'explore.html?type=rental'},
    package: {label: 'Packages', one: 'Package', emo: '🗺️', color: '#1e4032', href: 'explore.html?type=package'},
  };
  const ENQ_EMO = {stay: '🏨', taxi: '🚕', transport: '🚌', experience: '🪂', rental: '🏍️', package: '🗺️', general: '💬'};

  // Places for autocomplete + map (approximate coordinates).
  const PLACES = [
    ['Kullu', 31.9579, 77.1095], ['Dhalpur, Kullu', 31.9513, 77.1054], ['Kullu Bus Stand', 31.9566, 77.1098], ['Bhuntar Airport (Kullu)', 31.8763, 77.1544], ['Manali', 32.2432, 77.1892], ['Old Manali', 32.2560, 77.1800], ['Solang Valley', 32.3166, 77.1572], ['Atal Tunnel', 32.4120, 77.1450], ['Sissu', 32.4834, 77.1270], ['Naggar', 32.1150, 77.1680], ['Kasol', 32.0099, 77.3149], ['Manikaran', 32.0270, 77.3480], ['Jibhi', 31.5945, 77.3631], ['Tirthan Valley', 31.6260, 77.4380], ['Pirdi (Rafting point)', 31.9300, 77.1200],
    ['Shimla', 31.1048, 77.1734], ['Shimla Airport (Jubbarhatti)', 31.0818, 77.0680], ['Kufri', 31.0979, 77.2678], ['Narkanda', 31.2639, 77.4589], ['Chail', 30.9667, 77.1987], ['Kasauli', 30.9010, 76.9653], ['Solan', 30.9045, 77.0967],
    ['Dharamshala', 32.2190, 76.3234], ['McLeod Ganj', 32.2426, 76.3213], ['Kangra Airport (Gaggal)', 32.1651, 76.2634], ['Bir Billing', 32.0446, 76.7206], ['Palampur', 32.1109, 76.5363], ['Dalhousie', 32.5387, 75.9710], ['Khajjiar', 32.5530, 76.0646], ['Chamba', 32.5534, 76.1258],
    ['Kaza (Spiti)', 32.2276, 78.0710], ['Keylong', 32.5714, 77.0326], ['Chandratal', 32.4747, 77.6170], ['Kalpa', 31.5370, 78.2546], ['Sangla', 31.4246, 78.2634], ['Chitkul', 31.3517, 78.4373],
    ['Mandi', 31.7080, 76.9318], ['Barot', 32.0350, 76.8490], ['Prashar Lake', 31.7543, 77.1003], ['Bilaspur', 31.3397, 76.7568], ['Hamirpur', 31.6862, 76.5213], ['Una', 31.4685, 76.2708], ['Nahan', 30.5596, 77.2950],
    ['Chandigarh', 30.7333, 76.7794], ['Chandigarh Airport', 30.6735, 76.7885], ['Delhi', 28.6139, 77.2090], ['Delhi Airport (IGI)', 28.5562, 77.1000], ['Pathankot', 32.2643, 75.6421], ['Amritsar', 31.6340, 74.8723],
  ];
  const placeCoords = (name) => { const p = PLACES.find((x) => x[0].toLowerCase() === String(name).trim().toLowerCase()); return p ? [p[1], p[2]] : null; };

  const WA_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>';

  // Line-art vehicles (generic, no brands).
  const V = (body) => `<svg viewBox="0 0 220 110" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const wheel = (x) => `<circle cx="${x}" cy="86" r="12" style="fill:var(--vart-bg)"/><circle cx="${x}" cy="86" r="4"/>`;
  const VEHICLES = {
    hatchback: V(`<path d="M30 86H18V66l14-6 22-22h62l26 24 34 6v18h-12M72 86h72"/><path d="M60 42l-14 18h52V42zM106 42v18h40l-22-18z"/>${wheel(52)}${wheel(158)}<path d="M180 70h10" stroke="#ffb800"/>`),
    sedan: V(`<path d="M26 86H12V68l20-6 26-22h70l26 22 40 8v16h-12M68 86h78"/><path d="M64 44l-16 18h54V44zM110 44v18h44l-22-18z"/>${wheel(48)}${wheel(160)}<path d="M188 72h10" stroke="#ffb800"/>`),
    suv: V(`<path d="M26 86H14V56l10-18h112l24 22 40 6v20h-12M66 86h80"/><path d="M30 42v18h40V42zM78 42v18h46V42zM132 44v16h24z"/>${wheel(46)}${wheel(158)}<path d="M186 70h10" stroke="#ffb800"/>`),
    innova: V(`<path d="M26 86H12V54l14-18h118l24 24 38 6v20h-12M66 86h82"/><path d="M28 40v18h36V40zM72 40v18h36V40zM116 40v18h30V40z"/>${wheel(46)}${wheel(162)}<path d="M190 70h10" stroke="#ffb800"/>`),
    crysta: V(`<path d="M26 86H12V54l14-18h118l24 24 38 6v20h-12M66 86h82"/><path d="M28 40v18h36V40zM72 40v18h36V40zM116 40v18h30V40z"/>${wheel(46)}${wheel(162)}<path d="M190 70h10M30 66h150" stroke="#ffb800"/>`),
    tt12: V(`<path d="M26 86H10V30q0-8 8-8h150q8 0 12 8l20 30v26h-14M64 86h96"/><path d="M20 32v22h30V32zM58 32v22h30V32zM96 32v22h30V32zM134 32v22h34l-12-22z"/>${wheel(44)}${wheel(176)}<path d="M200 66h8" stroke="#ffb800"/>`),
    tt17: V(`<path d="M26 86H8V26q0-8 8-8h156q8 0 12 8l22 32v28h-14M62 86h100"/><path d="M18 28v24h28V28zM54 28v24h28V28zM90 28v24h28V28zM126 28v24h28V28zM162 28v24h18l-10-24z"/>${wheel(42)}${wheel(178)}<path d="M202 66h8" stroke="#ffb800"/>`),
    urbania: V(`<path d="M26 86H8V30q0-10 10-10h140q12 0 20 10l26 30v26h-14M62 86h100"/><path d="M18 32v22h34V32zM60 32v22h34V32zM102 32v22h34V32zM144 32v22h40l-16-22z"/>${wheel(42)}${wheel(178)}<path d="M8 62h196" stroke="#7de3ff"/>`),
    minibus: V(`<path d="M24 86H6V24q0-8 8-8h178q8 0 10 8l10 22v40h-14M58 86h108"/><path d="M14 26v22h24V26zM44 26v22h24V26zM74 26v22h24V26zM104 26v22h24V26zM134 26v22h24V26zM164 26v22h32l-6-22z"/>${wheel(40)}${wheel(182)}`),
    'volvo-charter': V(`<path d="M22 86H4V22q0-10 10-10h186q10 0 12 10v64h-16M56 86h112"/><path d="M12 24h190v24H12z"/><path d="M4 62h208" stroke="#dd9332"/>${wheel(38)}${wheel(186)}`),
    volvo: V(`<path d="M22 86H4V22q0-10 10-10h186q10 0 12 10v64h-16M56 86h112"/><path d="M12 24h190v24H12z"/><path d="M4 62h208" stroke="#dd9332"/>${wheel(38)}${wheel(186)}`),
    bus: V(`<path d="M24 86H6V24q0-8 8-8h178q8 0 10 8l10 22v40h-14M58 86h108"/><path d="M14 26v22h24V26zM44 26v22h24V26zM74 26v22h24V26zM104 26v22h24V26zM134 26v22h24V26zM164 26v22h32l-6-22z"/><path d="M6 62h206" stroke="#6ef2c0"/>${wheel(40)}${wheel(182)}`),
    bike: V(`<circle cx="50" cy="78" r="22"/><circle cx="170" cy="78" r="22"/><path d="M50 78l30-36h46l20 36M80 42l-8-12h-14M126 42l18-12h14M106 42l-10 36h-46M146 78l-26-36"/>`),
    scooty: V(`<circle cx="50" cy="82" r="16"/><circle cx="168" cy="82" r="16"/><path d="M50 82h46l20-30h30l10-26h-14M146 26l22 56M66 66h64"/>`),
    car: V(`<path d="M30 86H14V60l18-8 20-20h86l18 20 40 6v28h-12M74 86h74"/><path d="M58 36l-12 18h44V36zM98 36v18h52l-14-18z"/>${wheel(54)}${wheel(162)}`),
    other: V(`<rect x="50" y="20" width="120" height="70" rx="10"/><path d="M50 44h120M100 20v24M120 20v24"/>`),
  };
  const vehicleSvg = (l) => VEHICLES[l.vehicle] || VEHICLES[l.subtype] || VEHICLES.other;

  // ---------- Formatting ----------
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  function priceHTML(p, big = false) {
    if (p?.amount) return `<span class="price"><b>${inr(p.amount)}</b> <small>/ ${esc(p.unit || 'unit')}${p.note && p.note !== 'Best price on WhatsApp' ? ` · ${esc(p.note)}` : ''}</small></span>`;
    return `<span class="price"><span class="ask">${big ? 'Get best price' : 'Best price'} →</span><br><small>${esc(p?.note || 'on WhatsApp')}</small></span>`;
  }
  const fmtDate = (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
  const fmtTime = (v) => { if (!v) return ''; const [h, m] = v.split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const addDays = (v, n) => { const d = new Date(`${v}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // ---------- Lead source: campaign (utm) + agent code (?ref=CODE or /a/CODE) ----------
  const params = new URLSearchParams(location.search);
  const utm = params.get('utm_source');
  if (utm) try { sessionStorage.setItem('ni_utm', utm.slice(0, 60)); } catch {}
  const REF_DAYS = 30; // an agent is credited for enquiries within 30 days of the customer opening their link
  const cleanCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const refParam = cleanCode(params.get('ref'));
  if (refParam.length >= 4) store.set('ni_ref', {code: refParam, at: Date.now()});
  const agentCode = () => { const r = store.get('ni_ref'); return r?.code && Date.now() - r.at < REF_DAYS * 864e5 ? r.code : ''; };
  const source = (agent = agentCode()) => { let u = ''; try { u = sessionStorage.getItem('ni_utm') || ''; } catch {} return {utm: u, agent, page: location.pathname + location.search, referrer: document.referrer.slice(0, 200)}; };
  // Links shared from this browser keep the agent code, so the agent who brought the visitor keeps the credit.
  const withRef = (url, code = agentCode()) => { const u = new URL(url, location.origin); if (code) u.searchParams.set('ref', code); return u.href; };

  // ---------- Share ----------
  const SHARE_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  let shareDlg;
  async function share({title, text = '', url}) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({title, text, url}); return; } catch (e) { if (e?.name === 'AbortError') return; } }
    shareDlg ||= Object.assign(document.createElement('dialog'), {className: 'modal'});
    if (!shareDlg.isConnected) { document.body.append(shareDlg); shareDlg.addEventListener('click', (e) => { if (e.target === shareDlg) shareDlg.close(); }); }
    const msg = `${title}${text ? ' · ' + text : ''}\n${url}`;
    shareDlg.innerHTML = `<div class="modal-card share-card"><div class="modal-top"><div><p class="mono muted">Share</p><h2>${esc(title)}</h2></div><button type="button" class="x" aria-label="Close" data-close>✕</button></div>
      <div class="share-grid">
        <a class="btn btn-wa" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${WA_SVG}WhatsApp</a>
        <a class="btn btn-ghost" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a>
        <a class="btn btn-ghost" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" target="_blank" rel="noopener">Telegram</a>
        <a class="btn btn-ghost" href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(msg)}">Email</a>
      </div>
      <div class="share-link"><input readonly value="${esc(url)}" aria-label="Link"><button class="btn btn-forest btn-sm" type="button" data-copy>Copy link</button></div></div>`;
    $('[data-close]', shareDlg).onclick = () => shareDlg.close();
    $('[data-copy]', shareDlg).onclick = async (e) => { try { await navigator.clipboard.writeText(url); } catch { $('input', shareDlg).select(); document.execCommand?.('copy'); } e.target.textContent = 'Copied ✓'; };
    if (!shareDlg.open) shareDlg.showModal();
  }
  const listingUrl = (l, code) => withRef(`/item.html?id=${encodeURIComponent(l.id)}`, code);
  const shareListing = (l, code) => share({title: l.title, text: [l.tagline, l.location?.area].filter(Boolean).join(' · '), url: listingUrl(l, code)});
  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-share-cat]');
    if (c && TYPES[c.dataset.shareCat]) {
      e.preventDefault(); e.stopPropagation();
      const t = TYPES[c.dataset.shareCat]; const tile = c.closest('.cat'); const desc = tile?.querySelector('p')?.textContent || '';
      share({title: `${tile?.querySelector('h3')?.textContent || t.label} in Himachal · Nirvana Inside`, text: desc, url: withRef(`/${t.href}`)}); return;
    }
    const b = e.target.closest('[data-share]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const {listings} = await catalog();
    const l = listings.find((x) => x.id === b.dataset.share);
    if (l) shareListing(l);
  });

  // ---------- Catalog ----------
  let catalogP;
  const catalog = () => (catalogP ||= fetch('/api/catalog').then((r) => { if (!r.ok) throw new Error('catalog'); return r.json(); }).catch(() => ({settings: {whatsapp: '917220080005', brand: 'Nirvana Inside', phone: '+91 72200 80005'}, listings: []})));

  // ---------- Site search: every listing, by name, place, type or highlight ----------
  const SEARCH_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';
  const BACK_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Words people type → words our listings use.
  const SYN = {cab: ['taxi', 'cab'], cabs: ['taxi', 'cab'], car: ['car', 'sedan', 'suv', 'taxi', 'self-drive'], hotel: ['hotel', 'stay'], hotels: ['hotel', 'stay'], room: ['room', 'stay', 'hotel'], rooms: ['room', 'stay', 'hotel'], homestay: ['homestay', 'stay'],
    bike: ['bike', 'enfield', 'himalayan', 'scooty'], bikes: ['bike', 'enfield', 'himalayan', 'scooty'], scooter: ['scooty', 'scooter', 'activa'], trek: ['trek', 'hike'], trekking: ['trek', 'hike'], tour: ['package', 'tour'], tours: ['package', 'tour'], trip: ['package', 'trip', 'tour'],
    bus: ['bus', 'volvo', 'coach', 'hrtc'], tempo: ['tempo', 'traveller'], paraglide: ['paraglid'], paragliding: ['paraglid'], rafting: ['raft'], ski: ['ski'], skiing: ['ski'], camp: ['camp'], camping: ['camp'], honeymoon: ['honeymoon', 'couple']};
  const POPULAR = ['Manali', 'Paragliding', 'Spiti', 'Innova', 'Royal Enfield', 'Kasol', 'Volvo', 'Rafting'];
  const RECENT_KEY = 'ni_recent_search';
  const recent = () => (store.get(RECENT_KEY) || []).filter((x) => typeof x === 'string').slice(0, 5);
  const remember = (q) => { q = String(q || '').trim(); if (q.length < 2) return; store.set(RECENT_KEY, [q, ...recent().filter((x) => norm(x) !== norm(q))].slice(0, 5)); };
  const alts = (w) => SYN[w] || (w.length > 3 && w.endsWith('s') ? [w, w.slice(0, -1)] : [w]);
  const mark = (text, terms) => {
    let out = esc(text); if (!terms.length) return out;
    const words = [...new Set(terms.flatMap(alts))].filter((w) => w.length > 1).sort((a, b) => b.length - a.length).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return words.length ? out.replace(new RegExp(`(${words.join('|')})`, 'gi'), '<mark>$1</mark>') : out;
  };
  let searchDlg, sType = 'all';

  function searchResults(listings, raw) {
    const terms = norm(raw).split(/[\s,]+/).filter(Boolean);
    return {terms, hits: listings.map((l) => {
      const t = TYPES[l.type];
      const title = norm(l.title), area = norm(`${l.location?.area || ''} ${l.location?.district || ''}`);
      const kind = norm(`${t?.label || ''} ${t?.one || ''} ${l.subtype || ''}`);
      const hay = norm([l.title, l.tagline, l.location?.area, l.location?.district, l.location?.address, t?.label, t?.one, l.subtype, l.duration, l.vehicle, ...(l.highlights || []), l.description].join(' '));
      let score = 0;
      for (const w of terms) {
        const a = alts(w); if (!a.some((x) => hay.includes(x))) return null;
        score += a.some((x) => title.startsWith(x)) ? 8 : a.some((x) => kind.includes(x)) ? 6 : a.some((x) => title.includes(x)) ? 5 : a.some((x) => area.includes(x)) ? 4 : 1;
      }
      return {l, score: score + (l.featured ? 1 : 0) + (l.status === 'published' ? 1 : 0)};
    }).filter(Boolean).sort((a, b) => b.score - a.score)};
  }

  async function openSearch(initial = '') {
    if (!searchDlg) {
      searchDlg = Object.assign(document.createElement('dialog'), {className: 'search-dlg'});
      searchDlg.setAttribute('aria-label', 'Search Nirvana Inside');
      searchDlg.innerHTML = `<div class="search-box">
        <div class="search-top">
          <button class="s-back" type="button" data-close aria-label="Close search">${BACK_SVG}</button>
          <label class="s-field">${SEARCH_SVG}<input type="search" id="site-q" placeholder="Search stays, taxis, treks, places…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search all listings" aria-controls="site-res"><button class="s-clear" type="button" aria-label="Clear search" hidden>✕</button></label>
          <button class="s-esc" type="button" data-close aria-label="Close search"><kbd>Esc</kbd></button>
        </div>
        <div class="s-filters" id="s-filters" role="toolbar" aria-label="Filter by type" hidden></div>
        <div class="search-res" id="site-res" aria-live="polite"></div>
        <div class="s-foot"><span class="muted">Can't find it? We arrange almost anything in Himachal.</span><button class="btn btn-wa btn-sm" type="button" data-enquire="general">${WA_SVG}Ask on WhatsApp</button></div>
      </div>`;
      document.body.append(searchDlg);
      const q = $('#site-q', searchDlg), clr = $('.s-clear', searchDlg);
      searchDlg.addEventListener('click', (e) => {
        if (e.target === searchDlg || e.target.closest('[data-close], [data-enquire]')) { searchDlg.close(); return; }
        const chip = e.target.closest('[data-q]'); if (chip) { q.value = chip.dataset.q; sType = 'all'; paintSearch(); q.focus(); return; }
        const f = e.target.closest('[data-stype]'); if (f) { sType = f.dataset.stype; paintSearch(); return; }
        if (e.target.closest('[data-clear-recent]')) { store.set(RECENT_KEY, []); paintSearch(); return; }
        if (e.target.closest('.sr-item')) remember(q.value);
      });
      searchDlg.addEventListener('close', () => document.body.classList.remove('search-open'));
      q.addEventListener('input', () => { sType = 'all'; paintSearch(); });
      clr.onclick = () => { q.value = ''; sType = 'all'; paintSearch(); q.focus(); };
      q.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); $('.sr-item', searchDlg)?.focus(); }
        if (e.key === 'Enter') { e.preventDefault(); const first = $('.sr-item', searchDlg); if (first) { remember(q.value); location.href = first.href; } }
      });
      searchDlg.addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp'].includes(e.key) || !e.target.classList.contains('sr-item')) return;
        e.preventDefault(); const items = $$('.sr-item', searchDlg); const i = items.indexOf(e.target) + (e.key === 'ArrowDown' ? 1 : -1);
        (i < 0 ? q : items[Math.min(i, items.length - 1)]).focus();
      });
    }
    document.body.classList.add('search-open');
    if (!searchDlg.open) searchDlg.showModal();
    const q = $('#site-q', searchDlg); if (initial) q.value = initial;
    q.focus(); q.select();
    paintSearch();
  }

  async function paintSearch() {
    const q = $('#site-q', searchDlg), box = $('#site-res', searchDlg), bar = $('#s-filters', searchDlg);
    const raw = q.value; $('.s-clear', searchDlg).hidden = !raw;
    const {listings} = await catalog();
    if (q.value !== raw) return; // a newer keystroke is already painting
    const {terms, hits} = searchResults(listings, raw);
    if (!terms.length) {
      bar.hidden = true;
      const rec = recent();
      const count = (k) => listings.filter((l) => l.type === k).length;
      box.innerHTML = `${rec.length ? `<div class="s-sec"><p class="sr-head mono">Recent <button type="button" class="s-link" data-clear-recent>Clear</button></p><div class="s-chips">${rec.map((r) => `<button type="button" class="s-chip" data-q="${esc(r)}">🕘 ${esc(r)}</button>`).join('')}</div></div>` : ''}
        <div class="s-sec"><p class="sr-head mono">Popular searches</p><div class="s-chips">${POPULAR.map((r) => `<button type="button" class="s-chip" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>
        <div class="s-sec"><p class="sr-head mono">Browse</p><div class="s-cats">${Object.values(TYPES).map((t) => `<a class="s-cat" href="${withRef('/' + t.href)}"><span>${t.emo}</span><b>${esc(t.label)}</b><small>${count(Object.keys(TYPES).find((k) => TYPES[k] === t))} listings</small></a>`).join('')}</div></div>`;
      return;
    }
    const byType = Object.keys(TYPES).map((k) => [k, hits.filter((h) => h.l.type === k).length]).filter(([, n]) => n);
    if (sType !== 'all' && !byType.some(([k]) => k === sType)) sType = 'all';
    bar.hidden = byType.length < 2;
    bar.innerHTML = `<button type="button" class="s-f" data-stype="all" aria-pressed="${sType === 'all'}">All <span>${hits.length}</span></button>${byType.map(([k, n]) => `<button type="button" class="s-f" data-stype="${k}" aria-pressed="${sType === k}">${TYPES[k].emo} ${esc(TYPES[k].label)} <span>${n}</span></button>`).join('')}`;
    const shown = hits.filter((h) => sType === 'all' || h.l.type === sType).slice(0, 30);
    box.innerHTML = shown.length
      ? shown.map(({l}) => { const t = TYPES[l.type]; return `<a class="sr-item" href="${withRef(`/item.html?id=${encodeURIComponent(l.id)}`)}">
          ${l.images?.[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy">` : `<span class="sr-emo" style="--c:${t?.color || 'var(--sun)'}">${t?.emo || '📍'}</span>`}
          <span class="sr-body"><b>${mark(l.title, terms)}</b><small>${t?.emo || ''} ${esc(t?.one || '')}${l.location?.area ? ' · ' + mark(l.location.area, terms) : ''}</small>${l.status === 'coming_soon' ? '<span class="sr-soon">Coming soon</span>' : ''}</span>
          <span class="sr-price${l.price?.amount ? '' : ' np'}">${l.price?.amount ? `<b>${inr(l.price.amount)}</b><small>/ ${esc(l.price.unit || '')}</small>` : '<small>Best price<br>on WhatsApp</small>'}</span>
          <span class="sr-go" aria-hidden="true">→</span></a>`; }).join('')
      : `<div class="sr-empty"><span class="sr-empty-ico">🧭</span><p><b>No listing matches “${esc(raw.trim())}”</b></p><p class="muted">Check the spelling, try a place (Manali, Kasol, Spiti) or a service (taxi, homestay, rafting). Or just ask us, we can probably arrange it.</p></div>`;
  }

  // ---------- Header / footer ----------
  function header(active) {
    const el = document.createElement('header');
    el.className = 'site-header'; el.id = 'top-header';
    el.innerHTML = `<div class="bar">
      <a class="brand" href="/" aria-label="Nirvana Inside home"><img class="brand-logo" src="/img/logo-horizontal.png" alt="Nirvana Inside" width="170" height="42"></a>
      <button class="search-btn" type="button" id="search-btn" aria-label="Search stays, taxis, treks and places" aria-haspopup="dialog">${SEARCH_SVG}<span class="sb-long">Search stays, taxis, treks…</span><span class="sb-short">Search</span><kbd>/</kbd></button>
      <nav class="nav" id="nav" aria-label="Main">${Object.entries(TYPES).map(([k, t]) => `<a href="/${t.href}" class="${active === k ? 'on' : ''}"${active === k ? ' aria-current="page"' : ''}>${t.emo} ${t.label}</a>`).join('')}<button class="btn btn-wa nav-cta" type="button" data-enquire="general">${WA_SVG}Chat on WhatsApp</button></nav>
      <button class="btn btn-wa btn-sm hdr-cta" type="button" data-enquire="general">${WA_SVG}Chat now</button>
      <button class="menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span></button></div>`;
    document.body.prepend(el);
    $('#search-btn', el).addEventListener('click', () => openSearch());
    addEventListener('keydown', (e) => { if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); openSearch(); } });
    const solid = () => el.classList.toggle('solid', scrollY > 20 || document.body.dataset.solid === '1');
    addEventListener('scroll', solid, {passive: true}); solid();
    const btn = $('#menu-btn', el);
    const setNav = (o) => { btn.setAttribute('aria-expanded', o); btn.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); document.body.classList.toggle('nav-open', o); };
    btn.addEventListener('click', () => setNav(btn.getAttribute('aria-expanded') !== 'true'));
    $$('.nav a, .nav .nav-cta', el).forEach((a) => a.addEventListener('click', () => setNav(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setNav(false); btn.focus(); } });
    matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) setNav(false); });
    const skip = document.createElement('a'); skip.className = 'skip-link'; skip.href = '#main'; skip.textContent = 'Skip to content'; document.body.prepend(skip);
  }
  async function footer() {
    const {settings: s} = await catalog();
    const f = document.createElement('footer');
    f.innerHTML = `<div class="wrap"><div class="foot">
      <div><a class="brand foot-logo" href="/" aria-label="Nirvana Inside home"><img src="/img/logo-reverse.png" alt="Nirvana Inside" width="150" height="129" loading="lazy"></a>
        <p class="big">Every Himachal plan.<br><span class="hl">One WhatsApp.</span></p>
        <p class="muted">${esc(s.tagline || '')}</p></div>
      <div><h4>Book</h4><ul>${Object.values(TYPES).map((t) => `<li><a href="/${t.href}">${t.emo} ${t.label}</a></li>`).join('')}</ul></div>
      <div><h4>Contact</h4><ul><li><a href="tel:${esc((s.phone || '').replace(/\s/g, ''))}">📞 ${esc(s.phone)}</a></li><li><a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a></li>${s.email ? `<li><a href="mailto:${esc(s.email)}">✉️ ${esc(s.email)}</a></li>` : ''}${s.instagram ? `<li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">📸 Instagram</a></li>` : ''}</ul></div>
      <div><h4>Corporate office</h4><ul><li class="muted">${esc(s.office)}</li>${s.officeMap ? `<li><a href="${esc(s.officeMap)}" target="_blank" rel="noopener">Open in Maps ↗</a></li>` : ''}</ul></div>
    </div><div class="foot-bottom mono"><span>© ${new Date().getFullYear()} Nirvana Inside · nirvanainside.com</span><span>Best price guaranteed · Verified local partners</span></div></div>`;
    document.body.append(f);
    const fab = document.createElement('button'); fab.className = 'fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Chat with us on WhatsApp'); fab.dataset.enquire = 'general'; fab.innerHTML = WA_SVG;
    document.body.append(fab);
  }

  // ---------- Enquiry → WhatsApp ----------
  let modal;
  function buildMessage({type, title, fields, ref, customer, settings, agent}) {
    const lines = [`Hello ${settings.brand || 'Nirvana Inside'}! 👋`, `*${ENQ_EMO[type] || '💬'} ${title}*`, `Ref: ${ref}${agent ? ` · Agent: ${agent}` : ''}`, ''];
    for (const [k, v] of fields) lines.push(`• ${k}: ${v}`);
    lines.push('', `👤 ${customer.name} · ${customer.phone}`, 'Please share availability & your best price. 🙏');
    return lines.join('\n');
  }
  function openWA(number, text) {
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    const w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch {} return {url, opened: true}; }
    return {url, opened: false};
  }
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('dialog'); modal.className = 'modal'; modal.setAttribute('aria-labelledby', 'enq-title');
    document.body.append(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    return modal;
  }
  async function enquire({type = 'general', title = 'Help me plan a Himachal trip', listingId = null, fields = []}) {
    const m = ensureModal();
    const saved = store.get('ni_customer') || {};
    const needsMsg = fields.length === 0;
    m.innerHTML = `<form class="modal-card" novalidate>
      <div class="modal-top"><div><p class="mono muted">${ENQ_EMO[type] || '💬'} ALMOST THERE</p><h2 id="enq-title">${esc(title)}</h2></div><button type="button" class="x" aria-label="Close" data-close>✕</button></div>
      ${fields.length ? `<dl class="summary">${fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${needsMsg ? `<label class="field"><span>What do you need?</span><input name="msg" maxlength="400" placeholder="e.g. Manali trip for 4 in December, need hotel + cab" required></label>` : ''}
      <div class="grid-f" style="--cols:2;grid-template-columns:1fr 1fr">
        <label class="field"><span>Your name</span><input name="name" autocomplete="name" maxlength="80" required value="${esc(saved.name || '')}" placeholder="Full name"></label>
        <label class="field"><span>WhatsApp / phone</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="16" required value="${esc(saved.phone || '+91 ')}" placeholder="+91 98xxxxxxx"></label>
      </div>
      <label class="field agent-field"><span>Agent code (optional)</span><input name="agent" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(agentCode())}" placeholder="If an agent referred you, e.g. RAJ123"></label>
      <p class="form-err" role="alert"></p>
      <button class="btn btn-wa btn-block" type="submit">${WA_SVG}Send enquiry on WhatsApp</button>
      <p class="consent">We'll open WhatsApp with your enquiry ready to send, and save it so our team can follow up. Nothing is booked or charged until you confirm.</p>
    </form>`;
    const form = $('form', m);
    $('[data-close]', m).onclick = () => m.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const err = $('.form-err', m);
      const name = form.name.value.trim(); const phone = form.phone.value.trim();
      if (!name) { err.textContent = 'Please add your name.'; form.name.focus(); return; }
      if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Please add a valid phone number so we can reach you.'; form.phone.focus(); return; }
      let allFields = fields;
      if (needsMsg) { const msg = form.msg.value.trim(); if (!msg) { err.textContent = 'Tell us briefly what you need.'; form.msg.focus(); return; } allFields = [['Request', msg]]; }
      store.set('ni_customer', {name, phone});
      const agent = cleanCode(form.agent.value);
      if (agent.length >= 4) store.set('ni_ref', {code: agent, at: Date.now()});
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Preparing…';
      const {settings} = await catalog();
      let ref = 'NI-' + Date.now().toString(36).toUpperCase().slice(-6);
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 3500);
        const r = await fetch('/api/enquiries', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, title, listingId, fields: allFields, customer: {name, phone}, source: source(agent.length >= 4 ? agent : '')}), signal: ctrl.signal});
        clearTimeout(t);
        if (r.ok) ref = (await r.json()).ref;
      } catch {}
      const text = buildMessage({type, title, fields: allFields, ref, customer: {name, phone}, settings, agent: agent.length >= 4 ? agent : ''});
      const {url, opened} = openWA(settings.whatsapp || '917220080005', text);
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', {method: 'whatsapp', enquiry_type: type});
      m.innerHTML = `<div class="modal-card"><div class="modal-top"><span></span><button type="button" class="x" aria-label="Close" data-close>✕</button></div>
        <div class="done"><div class="tick">✓</div><h2>${opened ? 'WhatsApp is open' : 'One last tap'}</h2>
        <p class="muted">${opened ? 'Press <b>Send</b> in WhatsApp and our team will reply with availability and the best price.' : 'Tap below to open WhatsApp with your enquiry ready, then press <b>Send</b>.'}</p>
        <span class="ref">Ref ${esc(ref)}</span>
        <a class="btn btn-wa" href="${esc(url)}" target="_blank" rel="noopener">${WA_SVG}${opened ? 'Open WhatsApp again' : 'Open WhatsApp'}</a></div></div>`;
      $('[data-close]', m).onclick = () => m.close();
    };
    if (!m.open) m.showModal();
    setTimeout(() => (needsMsg ? form.msg : (saved.name ? $('button[type=submit]', form) : form.name)).focus(), 30);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-enquire]');
    if (b && b.dataset.enquire === 'general') { e.preventDefault(); enquire({}); }
  });

  // ---------- Cards ----------
  function cardHTML(l) {
    const t = TYPES[l.type] || TYPES.stay;
    const soon = l.status === 'coming_soon';
    const sub = {hotel: 'Hotel', homestay: 'Homestay', longterm: 'Long-term', private: 'Private', public: 'Public', paragliding: 'Paragliding', rafting: 'Rafting', bungee: 'Bungee', camping: 'Camping', skiing: 'Skiing', trekking: 'Trekking', bike: 'Bike', scooty: 'Scooty', car: 'Car', other: 'Anything', leisure: 'Leisure', adventure: 'Adventure', backpacking: 'Backpacking', honeymoon: 'Honeymoon'}[l.subtype] || t.one;
    const media = l.images?.length
      ? `<div class="card-img"><img ${photoAttrs(l.images[0])} alt="${esc(l.title)}" loading="lazy" decoding="async">${wmFor(l.images[0])}${soon ? '<span class="sticker berry">Coming soon</span>' : l.featured ? '<span class="sticker">★ Top pick</span>' : `<span class="sticker dark">${esc(sub)}</span>`}${l.images.length > 1 ? `<span class="sticker dark count">📷 ${l.images.length}</span>` : ''}</div>`
      : `<div class="vart">${vehicleSvg(l)}<span class="sticker ${l.subtype === 'public' ? 'mint' : 'ice'}">${esc(sub)}</span>${l.seats > 1 ? `<span class="sticker dark seats">👥 ${l.seats} seats</span>` : ''}</div>`;
    return `<article class="card${soon ? ' soon' : ''}"><a class="card-link" href="/item.html?id=${encodeURIComponent(l.id)}">${media}
      <div class="card-body"><span class="card-loc">📍 ${esc(l.location?.area || 'Himachal Pradesh')}</span><h3>${esc(l.title)}</h3><p class="card-tag">${esc(l.tagline || '')}</p>
      <div class="card-foot">${priceHTML(l.price)}<span class="sticker dark">${l.duration ? esc(l.duration) : t.emo}</span></div></div></a>
      <div class="card-ov"><button class="card-share" type="button" data-share="${esc(l.id)}" aria-label="Share ${esc(l.title)}" title="Share">${SHARE_SVG}</button></div></article>`;
  }

  // ---------- Leaflet map (lazy) ----------
  let leafletP;
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    return (leafletP ||= new Promise((res, rej) => {
      const css = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=', crossOrigin: ''});
      const js = Object.assign(document.createElement('script'), {src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', crossOrigin: ''});
      js.onload = () => res(window.L); js.onerror = rej;
      document.head.append(css, js);
    }));
  }
  async function makeMap(el, {center = [31.9, 77.1], zoom = 7} = {}) {
    const L = await leaflet();
    const map = L.map(el, {scrollWheelZoom: false, zoomControl: true}).setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    el.addEventListener('click', () => map.scrollWheelZoom.enable(), {once: true});
    return {L, map};
  }
  function pinIcon(L, color, emo) { return L.divIcon({className: '', html: `<div class="pin" style="background:${color}"><span>${emo}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28]}); }
  async function listingsMap(el, listings) {
    const {L, map} = await makeMap(el);
    const groups = {};
    const pts = [];
    for (const l of listings) {
      if (l.location?.lat == null || l.location?.lng == null) continue;
      const t = TYPES[l.type] || TYPES.stay;
      const m = L.marker([l.location.lat, l.location.lng], {icon: pinIcon(L, t.color, t.emo)})
        .bindPopup(`<b>${esc(l.title)}</b><br>${esc(l.location.area || '')}<br><a href="/item.html?id=${encodeURIComponent(l.id)}">View & enquire →</a>`);
      (groups[l.type] ||= L.layerGroup().addTo(map)).addLayer(m);
      pts.push([l.location.lat, l.location.lng]);
    }
    if (pts.length > 1) map.fitBounds(pts, {padding: [40, 40], maxZoom: 9});
    else if (pts.length === 1) map.setView(pts[0], 11);
    return {L, map, groups};
  }

  // ---------- Lightbox ----------
  function lightbox(images, start = 0) {
    let i = start;
    const d = document.createElement('dialog'); d.className = 'lightbox';
    d.innerHTML = `<div class="lb-inner"><span class="lb-count mono"></span><div class="lb-stage"><img alt="" class="lb-a"><img alt="" class="lb-b"><img class="wm lb-wm" src="/img/watermark.png" alt="" aria-hidden="true" hidden></div><button class="lb-btn lb-prev" aria-label="Previous">←</button><button class="lb-btn lb-next" aria-label="Next">→</button><button class="lb-btn lb-close" aria-label="Close">✕</button></div>`;
    document.body.append(d);
    let front = $('.lb-a', d), back = $('.lb-b', d);
    const warm = (k) => { const im = new Image(); im.src = images[(k + images.length) % images.length]; };
    const show = async () => {
      const src = images[i]; $('.lb-count', d).textContent = `${i + 1} / ${images.length}`;
      back.src = src; try { await back.decode(); } catch {}
      if (images[i] !== src) return;
      back.classList.add('on'); front.classList.remove('on'); [front, back] = [back, front];
      const wm = $('.lb-wm', d); wm.hidden = isBranded(src);
      if (!wm.hidden) { // pin the logo to the photo's own top-right corner (older photos may not be 4:3)
        const st = $('.lb-stage', d), sw = st.clientWidth, sh = st.clientHeight, r = (front.naturalWidth / front.naturalHeight) || 4 / 3;
        const iw = Math.min(sw, sh * r), ih = iw / r, gapX = (sw - iw) / 2, gapY = (sh - ih) / 2;
        Object.assign(wm.style, {width: `${iw * 0.13}px`, right: `${gapX + iw * 0.03}px`, top: `${gapY + iw * 0.03}px`});
      }
      warm(i + 1); warm(i - 1);
    };
    $('.lb-prev', d).onclick = () => { i = (i - 1 + images.length) % images.length; show(); };
    $('.lb-next', d).onclick = () => { i = (i + 1) % images.length; show(); };
    $('.lb-close', d).onclick = () => d.close();
    d.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') $('.lb-prev', d).click(); if (e.key === 'ArrowRight') $('.lb-next', d).click(); });
    let sx = null; d.addEventListener('pointerdown', (e) => { sx = e.clientX; }); d.addEventListener('pointerup', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 50) $(e.clientX < sx ? '.lb-next' : '.lb-prev', d).click(); sx = null; });
    d.addEventListener('close', () => d.remove());
    show(); d.showModal();
  }

  // ---------- Reveal on scroll ----------
  function reveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'});
    $$('.reveal:not(.in)').forEach((e) => io.observe(e));
  }

  // Photo optimiser: smallest file that still looks sharp on a retina-width gallery.
  // - longest side capped at 1600px (the largest a photo is ever shown on the site), never upscaled
  // - downscaled in ≤2× steps with high-quality smoothing, so detail stays crisp (no jaggies/moire)
  // - WebP from quality .80, stepping down only while the file is over ~300 KB, never below .72
  //   (visually lossless for photos); JPEG fallback for browsers that can't encode WebP
  // - metadata (incl. GPS location) is stripped; phone rotation is applied
  const IMG_MAX = 1600, IMG_TARGET = 300 * 1024;
  const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('could not read this image')); r.readAsDataURL(blob); });
  const encode = (c, type, q) => new Promise((res) => c.toBlob((b) => res(b && b.type === type ? b : null), type, q));
  async function optimiseImage(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, {imageOrientation: 'from-image'}); } catch { bmp = await createImageBitmap(file); }
    const W = bmp.width, H = bmp.height;
    const s = Math.min(1, IMG_MAX / Math.max(W, H));
    const tw = Math.round(W * s), th = Math.round(H * s);
    // Step down by halves until within 2× of the target, then one final high-quality pass.
    let src = bmp, sw = W, sh = H;
    while (sw / 2 >= tw * 1.0001 && sh / 2 >= th) {
      const c = makeCanvas(Math.round(sw / 2), Math.round(sh / 2));
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, c.width, c.height); src = c; sw = c.width; sh = c.height;
    }
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    if (file.type !== 'image/png') { x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th); } // PNGs keep transparency
    x.drawImage(src, 0, 0, tw, th);
    bmp.close?.();
    let blob = null;
    for (const q of [0.8, 0.76, 0.72]) { blob = await encode(c, 'image/webp', q); if (!blob || blob.size <= IMG_TARGET) break; }
    if (!blob) for (const q of [0.84, 0.8, 0.76]) { blob = await encode(c, 'image/jpeg', q); if (!blob || blob.size <= IMG_TARGET) break; }
    if (!blob) throw new Error('could not process this image');
    return {blob, width: tw, height: th};
  }
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }


  // ---------- Listing photo module: 4:3 crop → standard 1600×1200 + 800×600 preview ----------
  // Every listing photo is stored at exactly the same size and shape, so galleries and the lightbox
  // switch photos without jumps, and cards load a small, sharp preview instead of the full photo.
  const PHOTO = {ratio: 4 / 3, full: [1600, 1200], thumb: [800, 600], fullKB: 360, thumbKB: 95, logo: {src: '/img/watermark.png', w: 0.15, m: 0.028}};
  // Our logo, small in the top-right corner of every listing photo (on by default, can be switched off per photo).
  let wmP;
  const watermark = () => (wmP ||= new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = PHOTO.logo.src; }));
  function stamp(c, im) {
    if (!im) return;
    const x = c.getContext('2d'), w = c.width * PHOTO.logo.w, h = w * im.naturalHeight / im.naturalWidth, m = c.width * PHOTO.logo.m;
    x.save(); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = w * 0.07; x.shadowOffsetY = w * 0.01; x.globalAlpha = 0.94; // readable on snow and sky
    x.drawImage(im, c.width - w - m, m, w, h); x.restore();
  }
  // Photos uploaded with the logo baked in are named …-b.webp; every other listing photo gets the logo laid over it on screen.
  const isBranded = (u) => typeof u === 'string' && /^\/uploads\/[a-z0-9-]+-b\.(webp|jpg|png)$/.test(u);
  const wmFor = (u) => (isBranded(u) ? '' : '<img class="wm" src="/img/watermark.png" alt="" aria-hidden="true" decoding="async">');
  const thumbOf = (u) => (typeof u === 'string' && /^\/uploads\/[a-z0-9-]+\.(webp|jpg|png)$/.test(u) ? u.replace(/\.(webp|jpg|png)$/, '-t.$1') : u);
  // <img> attributes for a listing photo: preview for small slots, full photo for big / retina ones.
  const photoAttrs = (u, sizes = '(max-width: 600px) 92vw, 420px') => {
    const t = thumbOf(u);
    return t === u ? `src="${esc(u)}"` : `src="${esc(t)}" srcset="${esc(t)} 800w, ${esc(u)} 1600w" sizes="${sizes}"`;
  };
  async function loadBitmap(file) {
    try { return await createImageBitmap(file, {imageOrientation: 'from-image'}); } catch { return createImageBitmap(file); }
  }
  // High-quality resize of a source rectangle: halve step by step, then one final smooth pass.
  function renderRect(bmp, sx, sy, sw, sh, W, H) {
    let src = bmp, cw = sw, ch = sh, ox = sx, oy = sy;
    while (cw / 2 >= W * 1.0001 && ch / 2 >= H) {
      const c = makeCanvas(Math.round(cw / 2), Math.round(ch / 2)); const x = c.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, ox, oy, cw, ch, 0, 0, c.width, c.height);
      src = c; cw = c.width; ch = c.height; ox = 0; oy = 0;
    }
    const out = makeCanvas(W, H); const x = out.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.drawImage(src, ox, oy, cw, ch, 0, 0, W, H);
    return out;
  }
  // Encode at the best quality that fits the size budget (WebP, JPEG fallback). Never below q .72.
  async function encodeBudget(c, kbMax) {
    let blob = null;
    for (const q of [0.84, 0.8, 0.76, 0.72]) { blob = await encode(c, 'image/webp', q); if (!blob || blob.size <= kbMax * 1024) break; }
    if (!blob) for (const q of [0.86, 0.82, 0.78, 0.74]) { blob = await encode(c, 'image/jpeg', q); if (!blob || blob.size <= kbMax * 1024) break; }
    if (!blob) throw new Error('could not process this image');
    return blob;
  }
  async function makeListingPhoto(bmp, rect, {logo = true} = {}) {
    const {sx, sy, sw, sh} = rect;
    const im = logo ? await watermark() : null;
    const cf = renderRect(bmp, sx, sy, sw, sh, ...PHOTO.full), ct = renderRect(bmp, sx, sy, sw, sh, ...PHOTO.thumb);
    stamp(cf, im); stamp(ct, im);
    const full = await encodeBudget(cf, PHOTO.fullKB);
    const thumb = await encodeBudget(ct, PHOTO.thumbKB);
    return {full, thumb, lowRes: sw < PHOTO.full[0] * 0.75, logo: Boolean(im)};
  }
  const autoRect = (W, H, r = PHOTO.ratio) => (W / H > r ? {sw: H * r, sh: H, sx: (W - H * r) / 2, sy: 0} : {sw: W, sh: W / r, sx: 0, sy: (H - W / r) / 2});

  // Cropper dialog. Resolves {rect} | {auto: true} (use automatic centre crop for this and the rest) | null (skip photo).
  let cropDlg;
  function cropPhoto(bmp, {index = 0, total = 1, name = '', logo = true} = {}) {
    return new Promise((resolve) => {
      cropDlg ||= Object.assign(document.createElement('dialog'), {className: 'crop-dlg'});
      if (!cropDlg.isConnected) document.body.append(cropDlg);
      const W = bmp.width, H = bmp.height;
      cropDlg.innerHTML = `<div class="crop-box">
        <div class="crop-head"><div><p class="mono muted">Photo ${index + 1} of ${total}${name ? ' · ' + esc(name) : ''}</p><h2>Crop to 4:3 landscape</h2></div><button type="button" class="x" data-act="skip" aria-label="Skip this photo">✕</button></div>
        <div class="crop-stage"><canvas class="crop-cv" aria-label="Drag to move the photo, scroll or pinch to zoom"></canvas><div class="crop-grid" aria-hidden="true"></div><img class="crop-logo" src="${PHOTO.logo.src}" alt="" aria-hidden="true"${logo ? '' : ' hidden'}></div>
        <div class="crop-tools"><span aria-hidden="true">−</span><input type="range" class="crop-zoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><span aria-hidden="true">+</span><button type="button" class="btn btn-ghost btn-sm" data-act="reset">Reset</button></div>
        <label class="check crop-logo-opt"><input type="checkbox" class="crop-logo-on"${logo ? ' checked' : ''}> Add Nirvana Inside logo (top right)</label>
        <p class="crop-info"></p>
        <div class="crop-acts">${total - index > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-act="auto">Auto-crop the rest</button>' : '<span></span>'}<span class="row"><button type="button" class="btn btn-ghost btn-sm" data-act="skip">Skip photo</button><button type="button" class="btn btn-sun" data-act="ok">Use photo ✓</button></span></div></div>`;
      const cv = $('.crop-cv', cropDlg), stage = $('.crop-stage', cropDlg), zoomEl = $('.crop-zoom', cropDlg), info = $('.crop-info', cropDlg);
      const ctx = cv.getContext('2d');
      const logoOn = $('.crop-logo-on', cropDlg); logoOn.onchange = () => { $('.crop-logo', cropDlg).hidden = !logoOn.checked; };
      let fw = 0, fh = 0, base = 1, z = 1, ox = 0, oy = 0; // frame size (css px), cover scale, zoom, image offset
      const scale = () => base * z;
      const clamp = () => { const s = scale(); ox = Math.min(0, Math.max(fw - W * s, ox)); oy = Math.min(0, Math.max(fh - H * s, oy)); };
      const rect = () => { const s = scale(); return {sx: -ox / s, sy: -oy / s, sw: fw / s, sh: fh / s}; };
      function layout() {
        fw = stage.clientWidth; fh = Math.round(fw / PHOTO.ratio);
        const dpr = Math.min(3, devicePixelRatio || 1);
        cv.width = Math.round(fw * dpr); cv.height = Math.round(fh * dpr); cv.style.height = fh + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        const prev = base; base = Math.max(fw / W, fh / H);
        if (!prev || prev === 1) { const r = autoRect(W, H); ox = -r.sx * base; oy = -r.sy * base; }
        clamp(); draw();
      }
      function draw() {
        const s = scale();
        ctx.clearRect(0, 0, fw, fh); ctx.drawImage(bmp, ox, oy, W * s, H * s);
        const r = rect(), px = Math.round(r.sw);
        info.innerHTML = px < PHOTO.full[0] * 0.75
          ? `⚠️ This crop is only ${px}px wide, so it may look soft. ${z > 1.05 ? 'Zoom out, or use' : 'Use'} a larger photo if you have one (at least 1600px wide).`
          : `Saved as ${PHOTO.full.join(' × ')} px · same size for every listing photo`;
        info.classList.toggle('warn', px < PHOTO.full[0] * 0.75);
      }
      const zoomTo = (nz, cx = fw / 2, cy = fh / 2) => {
        nz = Math.min(4, Math.max(1, nz)); const s0 = scale(); z = nz; const s1 = scale();
        ox = cx - (cx - ox) * (s1 / s0); oy = cy - (cy - oy) * (s1 / s0); zoomEl.value = z; clamp(); draw();
      };
      // drag + pinch
      const pts = new Map(); let pinch0 = 0, z0 = 1;
      cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = z; } };
      cv.onpointermove = (e) => {
        if (!pts.has(e.pointerId)) return; const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 1) { ox += e.clientX - px; oy += e.clientY - py; clamp(); draw(); }
        else if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; const r = cv.getBoundingClientRect(); zoomTo(z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); }
      };
      cv.onpointerup = cv.onpointercancel = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
      cv.onwheel = (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomTo(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); };
      zoomEl.oninput = () => zoomTo(+zoomEl.value);
      cv.tabIndex = 0;
      cv.onkeydown = (e) => { const k = {ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12]}[e.key]; if (k) { e.preventDefault(); ox += k[0]; oy += k[1]; clamp(); draw(); } if (e.key === '+' || e.key === '=') zoomTo(z * 1.1); if (e.key === '-') zoomTo(z / 1.1); };
      const done = (v) => { removeEventListener('resize', onResize); cropDlg.close(); resolve(v); };
      const onResize = () => { const r = rect(); layout(); const s = scale(); ox = -r.sx * s; oy = -r.sy * s; clamp(); draw(); };
      addEventListener('resize', onResize);
      cropDlg.onclick = (e) => {
        const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
        if (a === 'ok') done({rect: rect(), logo: logoOn.checked});
        if (a === 'auto') done({auto: true, logo: logoOn.checked});
        if (a === 'skip') done(null);
        if (a === 'reset') { z = 1; zoomEl.value = 1; const r = autoRect(W, H); ox = -r.sx * base; oy = -r.sy * base; clamp(); draw(); }
      };
      cropDlg.oncancel = (e) => { e.preventDefault(); done(null); };
      if (!cropDlg.open) cropDlg.showModal();
      base = 1; requestAnimationFrame(layout);
    });
  }
  // Prepare files for upload: crop (or auto-crop) each to 4:3, standardise to 1600×1200 + 800×600 preview.
  // onEach(result, file, i) is called per finished photo, so uploads can start while the next one is cropped.
  async function prepareListingPhotos(files, {onEach, onStatus} = {}) {
    let auto = false, logo = true, before = 0, after = 0, done = 0, low = 0;
    watermark();
    for (const [i, file] of [...files].entries()) {
      let bmp;
      try { bmp = await loadBitmap(file); } catch { onStatus?.(`${file.name}: could not read this image (iPhone HEIC photos: export as JPG first).`, true); continue; }
      let rect = null;
      if (!auto) {
        const r = await cropPhoto(bmp, {index: i, total: files.length, name: file.name, logo});
        if (r === null) { bmp.close?.(); continue; }
        logo = r.logo;
        if (r.auto) auto = true; else rect = r.rect;
      }
      onStatus?.(`Processing ${i + 1} of ${files.length}…`);
      const out = await makeListingPhoto(bmp, rect || autoRect(bmp.width, bmp.height), {logo});
      bmp.close?.();
      before += file.size; after += out.full.size; done++; if (out.lowRes) low++;
      await onEach?.(out, file, i);
    }
    return {done, before, after, low};
  }
  async function uploadListingPhoto(out, endpoint, api) {
    const [dataUrl, thumbDataUrl] = await Promise.all([blobToDataUrl(out.full), out.full.type === out.thumb.type ? blobToDataUrl(out.thumb) : null]);
    return api('POST', endpoint, {dataUrl, thumbDataUrl, branded: Boolean(out.logo)});
  }

  // ---------- Datalist of places ----------
  function placesDatalist() {
    if ($('#ni-places')) return;
    const dl = document.createElement('datalist'); dl.id = 'ni-places';
    dl.innerHTML = PLACES.map(([n]) => `<option value="${esc(n)}">`).join('');
    document.body.append(dl);
  }

  window.NI = {wmFor, isBranded, openSearch, prepareListingPhotos, uploadListingPhoto, thumbOf, photoAttrs, PHOTO, optimiseImage, kb, blobToDataUrl, share, shareListing, listingUrl, withRef, agentCode, SHARE_SVG, $, $$, esc, TYPES, PLACES, placeCoords, WA_SVG, inr, priceHTML, fmtDate, fmtTime, today, addDays, catalog, header, footer, enquire, cardHTML, vehicleSvg, makeMap, pinIcon, listingsMap, lightbox, reveal, placesDatalist, store};
})();
