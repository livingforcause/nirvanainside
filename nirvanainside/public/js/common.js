/* Nirvana Inside — shared front-end: header/footer, catalog, enquiry → WhatsApp flow, cards, maps, lightbox. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const store = {get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }};

  const TYPES = {
    stay: {label: 'Stays', one: 'Stay', emo: '🏨', color: '#ffb800', href: 'explore.html?type=stay'},
    transport: {label: 'Transport', one: 'Taxi', emo: '🚕', color: '#7de3ff', href: 'explore.html?type=transport'},
    experience: {label: 'Experiences', one: 'Experience', emo: '🪂', color: '#ff5d8f', href: 'explore.html?type=experience'},
    rental: {label: 'Rentals', one: 'Rental', emo: '🏍️', color: '#6ef2c0', href: 'explore.html?type=rental'},
    package: {label: 'Packages', one: 'Package', emo: '🗺️', color: '#9b8cff', href: 'explore.html?type=package'},
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
  const wheel = (x) => `<circle cx="${x}" cy="86" r="12" fill="#07080c"/><circle cx="${x}" cy="86" r="4"/>`;
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
    'volvo-charter': V(`<path d="M22 86H4V22q0-10 10-10h186q10 0 12 10v64h-16M56 86h112"/><path d="M12 24h190v24H12z"/><path d="M4 62h208" stroke="#ff6b35"/>${wheel(38)}${wheel(186)}`),
    volvo: V(`<path d="M22 86H4V22q0-10 10-10h186q10 0 12 10v64h-16M56 86h112"/><path d="M12 24h190v24H12z"/><path d="M4 62h208" stroke="#ff6b35"/>${wheel(38)}${wheel(186)}`),
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

  // ---------- Lead source (utm / ref) ----------
  const params = new URLSearchParams(location.search);
  const utm = params.get('utm_source') || params.get('ref');
  if (utm) try { sessionStorage.setItem('ni_utm', utm.slice(0, 60)); } catch {}
  const source = () => { let u = ''; try { u = sessionStorage.getItem('ni_utm') || ''; } catch {} return {utm: u, page: location.pathname + location.search, referrer: document.referrer.slice(0, 200)}; };

  // ---------- Catalog ----------
  let catalogP;
  const catalog = () => (catalogP ||= fetch('/api/catalog').then((r) => { if (!r.ok) throw new Error('catalog'); return r.json(); }).catch(() => ({settings: {whatsapp: '917220080005', brand: 'Nirvana Inside', phone: '+91 72200 80005'}, listings: []})));

  // ---------- Header / footer ----------
  function header(active) {
    const el = document.createElement('header');
    el.className = 'site-header'; el.id = 'top-header';
    el.innerHTML = `<div class="bar">
      <a class="brand" href="/" aria-label="Nirvana Inside home"><img src="/img/logo.png" alt="" width="38" height="38"><b>Nirvana Inside<small>HIMACHAL · ONE WHATSAPP</small></b></a>
      <nav class="nav" id="nav" aria-label="Main">${Object.entries(TYPES).map(([k, t]) => `<a href="/${t.href}" class="${active === k ? 'on' : ''}">${t.emo} ${t.label}</a>`).join('')}</nav>
      <button class="btn btn-wa btn-sm hdr-cta" type="button" data-enquire="general">${WA_SVG}Chat now</button>
      <button class="menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span></button></div>`;
    document.body.prepend(el);
    const solid = () => el.classList.toggle('solid', scrollY > 20 || document.body.dataset.solid === '1');
    addEventListener('scroll', solid, {passive: true}); solid();
    const btn = $('#menu-btn', el);
    btn.addEventListener('click', () => { const o = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', o); document.body.classList.toggle('nav-open', o); });
    $$('.nav a', el).forEach((a) => a.addEventListener('click', () => { document.body.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); }));
    const skip = document.createElement('a'); skip.className = 'skip-link'; skip.href = '#main'; skip.textContent = 'Skip to content'; document.body.prepend(skip);
  }
  async function footer() {
    const {settings: s} = await catalog();
    const f = document.createElement('footer');
    f.innerHTML = `<div class="wrap"><div class="foot">
      <div><a class="brand" href="/"><img src="/img/logo.png" alt="" width="38" height="38" loading="lazy"><b>Nirvana Inside<small>HIMACHAL PRADESH</small></b></a>
        <p class="big">Every Himachal plan.<br><span class="hl">One WhatsApp.</span></p>
        <p class="muted">${esc(s.tagline || '')}</p></div>
      <div><h4>Book</h4><ul>${Object.values(TYPES).map((t) => `<li><a href="/${t.href}">${t.emo} ${t.label}</a></li>`).join('')}</ul></div>
      <div><h4>Contact</h4><ul><li><a href="tel:${esc((s.phone || '').replace(/\s/g, ''))}">📞 ${esc(s.phone)}</a></li><li><a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a></li>${s.email ? `<li><a href="mailto:${esc(s.email)}">✉️ ${esc(s.email)}</a></li>` : ''}${s.instagram ? `<li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">📸 Instagram</a></li>` : ''}</ul></div>
      <div><h4>Corporate office</h4><ul><li class="muted">${esc(s.office)}</li>${s.officeMap ? `<li><a href="${esc(s.officeMap)}" target="_blank" rel="noopener">Open in Maps ↗</a></li>` : ''}<li><a href="/item.html?id=l_thakur">Stay at Thakur Cottage →</a></li></ul></div>
    </div><div class="foot-bottom mono"><span>© ${new Date().getFullYear()} Nirvana Inside · nirvanainside.com</span><span>Best price guaranteed · Verified local partners</span></div></div>`;
    document.body.append(f);
    const fab = document.createElement('button'); fab.className = 'fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Chat with us on WhatsApp'); fab.dataset.enquire = 'general'; fab.innerHTML = WA_SVG;
    document.body.append(fab);
  }

  // ---------- Enquiry → WhatsApp ----------
  let modal;
  function buildMessage({type, title, fields, ref, customer, settings}) {
    const lines = [`Hello ${settings.brand || 'Nirvana Inside'}! 👋`, `*${ENQ_EMO[type] || '💬'} ${title}*`, `Ref: ${ref}`, ''];
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
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Preparing…';
      const {settings} = await catalog();
      let ref = 'NI-' + Date.now().toString(36).toUpperCase().slice(-6);
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 3500);
        const r = await fetch('/api/enquiries', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, title, listingId, fields: allFields, customer: {name, phone}, source: source()}), signal: ctrl.signal});
        clearTimeout(t);
        if (r.ok) ref = (await r.json()).ref;
      } catch {}
      const text = buildMessage({type, title, fields: allFields, ref, customer: {name, phone}, settings});
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
      ? `<div class="card-img"><img src="${esc(l.images[0])}" alt="${esc(l.title)}" loading="lazy">${soon ? '<span class="sticker berry">Coming soon</span>' : l.featured ? '<span class="sticker">★ Top pick</span>' : `<span class="sticker dark">${esc(sub)}</span>`}${l.images.length > 1 ? `<span class="sticker dark count">📷 ${l.images.length}</span>` : ''}</div>`
      : `<div class="vart">${vehicleSvg(l)}<span class="sticker ${l.subtype === 'public' ? 'mint' : 'ice'}">${esc(sub)}</span>${l.seats > 1 ? `<span class="sticker dark seats">👥 ${l.seats} seats</span>` : ''}</div>`;
    return `<a class="card${soon ? ' soon' : ''}" href="/item.html?id=${encodeURIComponent(l.id)}">${media}
      <div class="card-body"><span class="card-loc">📍 ${esc(l.location?.area || 'Himachal Pradesh')}</span><h3>${esc(l.title)}</h3><p class="card-tag">${esc(l.tagline || '')}</p>
      <div class="card-foot">${priceHTML(l.price)}<span class="sticker dark">${l.duration ? esc(l.duration) : t.emo}</span></div></div></a>`;
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
    d.innerHTML = `<div class="lb-inner"><span class="lb-count mono"></span><img alt=""><button class="lb-btn lb-prev" aria-label="Previous">←</button><button class="lb-btn lb-next" aria-label="Next">→</button><button class="lb-btn lb-close" aria-label="Close">✕</button></div>`;
    document.body.append(d);
    const show = () => { $('img', d).src = images[i]; $('.lb-count', d).textContent = `${i + 1} / ${images.length}`; };
    $('.lb-prev', d).onclick = () => { i = (i - 1 + images.length) % images.length; show(); };
    $('.lb-next', d).onclick = () => { i = (i + 1) % images.length; show(); };
    $('.lb-close', d).onclick = () => d.close();
    d.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') $('.lb-prev', d).click(); if (e.key === 'ArrowRight') $('.lb-next', d).click(); });
    d.addEventListener('close', () => d.remove());
    show(); d.showModal();
  }

  // ---------- Reveal on scroll ----------
  function reveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'});
    $$('.reveal:not(.in)').forEach((e) => io.observe(e));
  }

  // ---------- Datalist of places ----------
  function placesDatalist() {
    if ($('#ni-places')) return;
    const dl = document.createElement('datalist'); dl.id = 'ni-places';
    dl.innerHTML = PLACES.map(([n]) => `<option value="${esc(n)}">`).join('');
    document.body.append(dl);
  }

  window.NI = {$, $$, esc, TYPES, PLACES, placeCoords, WA_SVG, inr, priceHTML, fmtDate, fmtTime, today, addDays, catalog, header, footer, enquire, cardHTML, vehicleSvg, makeMap, pinIcon, listingsMap, lightbox, reveal, placesDatalist, store};
})();
