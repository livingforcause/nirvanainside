/* Nirvana Inside — admin panel (vanilla JS). Listings, vendors, enquiry pipeline, settings. */
(() => {
  const {$, $$, esc, inr} = NI;
  const app = $('#app');
  let db = null;

  // ───────── Constants ─────────
  const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['checking_vendor', 'Checking vendor'], ['quoted', 'Quoted'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['lost', 'Lost']];
  const ST = Object.fromEntries(STATUSES);
  const ENQ_TYPES = {stay: '🏨 Stay', taxi: '🚕 Taxi', transport: '🚌 Transport', experience: '🪂 Experience', rental: '🏍️ Rental', package: '🗺️ Package', general: '💬 General'};
  const LT = {
    stay: {label: '🏨 Stays', subs: [['hotel', 'Hotel'], ['homestay', 'Homestay'], ['longterm', 'Long-term rental']]},
    transport: {label: '🚕 Transport', subs: [['private', 'Private (cab / coach)'], ['public', 'Public (bus seats)']]},
    experience: {label: '🪂 Experiences', subs: [['paragliding', 'Paragliding'], ['rafting', 'Rafting'], ['bungee', 'Bungee'], ['camping', 'Camping'], ['skiing', 'Skiing'], ['trekking', 'Trekking'], ['other', 'Other']]},
    rental: {label: '🏍️ Rentals', subs: [['bike', 'Bike'], ['scooty', 'Scooty'], ['car', 'Car'], ['other', 'Other / anything']]},
    package: {label: '🗺️ Packages', subs: [['leisure', 'Leisure'], ['adventure', 'Adventure'], ['backpacking', 'Backpacking'], ['honeymoon', 'Honeymoon'], ['family', 'Family'], ['pilgrimage', 'Pilgrimage']]},
  };
  const VEHICLE_ICONS = ['hatchback', 'sedan', 'suv', 'innova', 'crysta', 'tt12', 'tt17', 'urbania', 'minibus', 'volvo-charter', 'volvo', 'bus', 'bike', 'scooty', 'car', 'other'];
  const UNITS = ['night', 'person', 'couple', 'day', 'hour', 'km', 'trip', 'seat', 'month'];
  const DISTRICTS = ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul & Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una', 'All', 'Outside Himachal'];
  const AMEN = {
    stay: ['Wi-Fi', 'Parking', 'Hot water', 'Power backup', 'Room heater', 'TV', 'Restaurant', 'Room service', 'Kitchen access', 'Pickup & drop', 'Valley view', 'Mountain view', 'Balcony', 'Garden', 'Bonfire', 'Pet friendly', 'Couple friendly', 'Family friendly', 'Daily housekeeping', 'Laundry', 'CCTV', 'Lift', 'Wheelchair accessible', 'General store', 'Workspace'],
    transport: ['AC (where permitted)', 'Music system', 'Charging point', 'Roof carrier', 'First-aid kit', 'GPS tracked', 'Experienced hill driver', 'Sanitised'],
    experience: ['Pickup included', 'GoPro / video', 'Safety gear', 'Certified instructor', 'Meals', 'Insurance'],
    rental: ['Helmet', 'Riding gear', 'Phone holder', 'Luggage carrier', 'Roadside assistance', 'Doorstep delivery'],
    package: ['Hotels', 'Breakfast', 'All meals', 'Private cab', 'Sightseeing', 'Activities', 'Permits', 'Guide'],
  };
  const DETAILS = {
    stay: ['Check-in', 'Check-out', 'Room types', 'Occupancy', 'ID proof', 'Couples', 'Pets', 'Smoking / alcohol', 'Payment', 'Cancellation'],
    transport: ['Seats', 'Luggage', 'Fare includes', 'Tolls / parking / permits', 'Driver allowance', 'Night driving', 'Waiting charges'],
    experience: ['Duration', 'Best season', 'Age limit', 'Weight limit', 'Includes', 'What to carry', 'Cancellation (weather)'],
    rental: ['Documents', 'Security deposit', 'Fuel policy', 'KM limit', 'Late return', 'Permits'],
    package: ['Duration', 'Hotels', 'Meals', 'Transport', 'Includes', 'Excludes', 'Best season', 'Cancellation'],
  };
  const VENDOR_KINDS = [['stay', 'Hotel / Homestay'], ['taxi', 'Taxi driver / operator'], ['bus', 'Bus / coach operator'], ['experience', 'Activity operator'], ['rental', 'Rental shop'], ['tour', 'Tour operator'], ['agent', 'Agent only (refers customers)'], ['other', 'Other']];
  const EARNING = ['confirmed', 'completed'];
  const VK = {...Object.fromEntries(VENDOR_KINDS), inhouse: 'Nirvana Inside (in-house)'};
  const INHOUSE_ID = 'v_inhouse';
  const agents = () => db.vendors.filter((v) => !v.inhouse);
  const pendingN = () => db.listings.filter((l) => l.pendingEdit).length;
  const PREF_KIND = {stay: ['stay'], taxi: ['taxi', 'bus'], transport: ['taxi', 'bus'], experience: ['experience'], rental: ['rental'], package: ['tour', 'stay', 'taxi'], general: []};

  // ───────── Helpers ─────────
  async function api(method, url, body) {
    const r = await fetch(url, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin'});
    const data = (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text();
    if (r.status === 401 && !url.endsWith('/login')) { showLogin(); throw new Error('Signed out'); }
    if (!r.ok) throw new Error(data?.error || 'Request failed');
    return data;
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2400); }
  const ago = (iso) => { const s = (Date.now() - Date.parse(iso)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };
  const dt = (iso) => new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'});
  const waNum = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return d; };
  const waLink = (p, text) => `https://wa.me/${waNum(p)}?text=${encodeURIComponent(text)}`;
  const vendorById = (id) => db.vendors.find((v) => v.id === id);
  const pctOf = (v) => (v?.incentivePct != null && v.incentivePct !== '' ? Number(v.incentivePct) : Number(db.defaultIncentivePct ?? 5));
  const agentLink = (v) => `${location.origin}/a/${v.agentCode}`;
  function stats(pid) {
    const refs = db.enquiries.filter((e) => e.agentId === pid); const won = refs.filter((e) => EARNING.includes(e.status));
    const earned = won.reduce((s, e) => s + (Number(e.incentiveAmount) || 0), 0);
    const paid = (vendorById(pid)?.payouts || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return {refs, referred: refs.length, confirmed: won.length, earned, paid, balance: earned - paid};
  }
  async function copy(text, label = 'Copied') { try { await navigator.clipboard.writeText(text); toast(`${label} ✓`); } catch { prompt('Copy this:', text); } }
  const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel ?? '') ? ' selected' : ''}>${esc(label)}</option>`;
  function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k, i) => { o[k] ??= /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks.at(-1)] = val; }
  function getPath(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj); }
  const route = () => { const [p, qs] = location.hash.replace(/^#\/?/, '').split('?'); return {parts: p.split('/').filter(Boolean), q: new URLSearchParams(qs || '')}; };
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

  // Generic two-way binding for inputs with data-bind / data-lines / data-list
  function bind(root, target, onChange) {
    const handler = (e) => {
      const el = e.target;
      if (e.type === 'change' && el.type !== 'checkbox' && el.tagName !== 'SELECT') return;
      if (e.type === 'input' && (el.type === 'checkbox' || el.tagName === 'SELECT')) return;
      if (el.dataset.bind) {
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.num !== undefined) v = el.value === '' ? null : Number(el.value);
        setPath(target, el.dataset.bind, v);
      } else if (el.dataset.lines) setPath(target, el.dataset.lines, el.value.split('\n').map((s) => s.trim()).filter(Boolean));
      else if (el.dataset.list) setPath(target, el.dataset.list, el.value.split(',').map((s) => s.trim()).filter(Boolean));
      else return;
      onChange?.(el);
    };
    root.addEventListener('input', handler);
    root.addEventListener('change', handler);
  }
  const I = (label, bindPath, val, o = {}) => `<label class="in">${esc(label)}${o.textarea ? `<textarea data-${o.lines ? 'lines' : 'bind'}="${bindPath}" rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(o.lines ? (val || []).join('\n') : val ?? '')}</textarea>` : `<input data-bind="${bindPath}" ${o.num ? 'data-num type="number" step="any"' : `type="${o.type || 'text'}"`} value="${esc(val ?? '')}" placeholder="${esc(o.ph || '')}">`}</label>`;
  const S = (label, bindPath, val, options) => `<label class="in">${esc(label)}<select data-bind="${bindPath}">${options.map(([v, l]) => opt(v, l, val)).join('')}</select></label>`;

  // ───────── Auth ─────────
  function showLogin(msg = '') {
    app.innerHTML = `<div class="login"><form class="glass" id="login">
      <a class="brand login-logo" href="/"><img src="/img/logo.png" alt="Nirvana Inside" width="120" height="103"></a><p class="mono muted" style="text-align:center">Admin</p>
      <h1>Sign in</h1>
      <label class="in">Username (email)<input type="email" name="email" autocomplete="username" required autofocus></label>
      <label class="in">Password<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="form-err" role="alert">${esc(msg)}</p>
      <button class="btn btn-sun btn-block" type="submit">Sign in →</button></form></div>`;
    $('#login').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/admin/login', {email: e.target.email.value, password: e.target.password.value}); await load(); render(); }
      catch (err) { $('.form-err').textContent = err.message; }
    };
  }
  async function load() { db = await api('GET', '/api/admin/db'); }

  // ───────── Shell ─────────
  function shell(active, content) {
    const newCount = db.enquiries.filter((e) => e.status === 'new').length;
    app.innerHTML = `<div class="shell"><aside class="side">
      <a class="brand" href="/" target="_blank" rel="noopener" aria-label="Nirvana Inside (opens site)"><img class="brand-logo" src="/img/logo-horizontal.png" alt="Nirvana Inside" width="146" height="36"></a>
      <a href="#/" class="${active === 'dash' ? 'on' : ''}">📊 Dashboard</a>
      <a href="#/enquiries" class="${active === 'enq' ? 'on' : ''}">💬 Enquiries${newCount ? `<span class="badge">${newCount}</span>` : ''}</a>
      <a href="#/listings" class="${active === 'list' ? 'on' : ''}">🏷️ Listings</a>
      <a href="#/vendors" class="${active === 'ven' ? 'on' : ''}">🤝 Partners</a>
      <a href="#/settings" class="${active === 'set' ? 'on' : ''}">⚙️ Settings</a>
      <span class="spacer"></span>
      <a href="/" target="_blank" rel="noopener">↗ View website</a>
      <button class="link" id="logout" type="button">⎋ Sign out</button>
    </aside><main class="main" id="view">${content}</main></div>`;
    $('#logout').onclick = async () => { await api('POST', '/api/admin/logout'); showLogin('Signed out.'); };
  }

  // ───────── Dashboard ─────────
  function viewDash() {
    const E = db.enquiries;
    const month = new Date().toISOString().slice(0, 7);
    const inProg = E.filter((e) => ['contacted', 'checking_vendor', 'quoted'].includes(e.status)).length;
    const conf = E.filter((e) => e.status === 'confirmed' && e.updatedAt.startsWith(month)).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayN = E.filter((e) => e.createdAt.startsWith(today)).length;
    const due = E.filter((e) => e.followUp && e.followUp <= today && !['confirmed', 'completed', 'lost'].includes(e.status));
    const byType = Object.keys(ENQ_TYPES).map((t) => [t, E.filter((e) => e.type === t).length]).filter(([, n]) => n);
    const max = Math.max(1, ...byType.map(([, n]) => n));
    shell('dash', `<div class="top"><h1>Namaste 👋</h1><a class="btn btn-sun btn-sm" href="#/listings/new?type=stay">+ Add listing</a></div>
      <div class="tiles">
        <a class="tile hot" href="#/enquiries?status=new" style="text-decoration:none"><b>${E.filter((e) => e.status === 'new').length}</b><span>New enquiries</span></a>
        <div class="tile"><b>${todayN}</b><span>Received today</span></div>
        <a class="tile" href="#/enquiries?status=active" style="text-decoration:none"><b>${inProg}</b><span>In progress</span></a>
        <div class="tile"><b>${conf}</b><span>Confirmed this month</span></div>
        <a class="tile" href="#/listings" style="text-decoration:none"><b>${db.listings.filter((l) => l.status === 'published').length}</b><span>Live listings</span></a>
        <a class="tile${pendingN() ? ' hot' : ''}" href="#/listings?review=1" style="text-decoration:none"><b>${pendingN()}</b><span>Partner edits to review</span></a>
        <a class="tile" href="#/vendors" style="text-decoration:none"><b>${agents().length}</b><span>Partners</span></a>
        <a class="tile" href="#/vendors?sort=balance" style="text-decoration:none"><b>${inr(db.vendors.reduce((s, v) => s + Math.max(0, stats(v.id).balance), 0))}</b><span>Incentives due</span></a>
        <div class="tile"><b>${E.filter((e) => e.agentId).length}</b><span>Agent-referred enquiries</span></div>
      </div>
      <div class="cols">
        <div class="box"><h2>Latest enquiries</h2>${E.length ? enqTable(E.slice(0, 8)) : '<p class="muted">No enquiries yet. They will appear here the moment a customer sends one from the website.</p>'}</div>
        <div style="display:grid;gap:16px">
          <div class="box"><h2>⏰ Follow-ups due</h2>${due.length ? due.map((e) => `<p><a href="#/enquiries/${e.id}">${esc(e.ref)}</a> · ${esc(e.customer.name)} · <span class="muted">${esc(e.followUp)}</span></p>`).join('') : '<p class="muted">Nothing due. 🎉</p>'}</div>
          <div class="box"><h2>Enquiries by service</h2><div class="bars">${byType.length ? byType.map(([t, n]) => `<div class="bar-row"><span>${ENQ_TYPES[t]}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join('') : '<p class="muted">No data yet.</p>'}</div></div>
        </div>
      </div>`);
    bindRows();
  }

  // ───────── Enquiries ─────────
  function enqTable(rows) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ref</th><th>Request</th><th>Customer</th><th>Status</th><th>Partner</th><th>Agent</th></tr></thead><tbody>${rows.map((e) => `
      <tr data-href="#/enquiries/${e.id}"><td><b>${esc(e.ref)}</b><div class="sub">${ago(e.createdAt)}</div></td>
      <td>${esc(ENQ_TYPES[e.type] || e.type)}<div class="sub">${esc(e.title)}</div></td>
      <td>${esc(e.customer.name)}<div class="sub">${esc(e.customer.phone)}</div></td>
      <td><span class="pill st-${e.status}">${esc(ST[e.status] || e.status)}</span></td>
      <td class="sub">${esc(vendorById(e.vendorId)?.business || '—')}</td>
      <td>${e.agentId ? `<span class="pill st-quoted">${esc(vendorById(e.agentId)?.agentCode || e.agentCode)}</span>` : e.agentCode ? `<span class="sub" title="Code not matched to a partner">${esc(e.agentCode)} ?</span>` : '<span class="sub">—</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function bindRows() { $$('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => go(tr.dataset.href))); }

  function viewEnquiries(q, openId) {
    const status = q.get('status') || ''; const type = q.get('type') || ''; const s = (q.get('q') || '').toLowerCase(); const agent = q.get('agent') || '';
    const rows = db.enquiries.filter((e) => (!agent || (agent === 'any' ? e.agentId : e.agentId === agent)) && (!status || (status === 'active' ? ['new', 'contacted', 'checking_vendor', 'quoted'].includes(e.status) : e.status === status)) && (!type || e.type === type) && (!s || `${e.ref} ${e.title} ${e.customer.name} ${e.customer.phone} ${e.agentCode || ''} ${e.fields.map((f) => f[1]).join(' ')}`.toLowerCase().includes(s)));
    shell('enq', `<div class="top"><h1>Enquiries</h1><a class="btn btn-ghost btn-sm" href="/api/admin/export.csv">⬇ Export CSV</a></div>
      <div class="filters">
        <select id="f-status" aria-label="Status"><option value="">All statuses</option><option value="active"${status === 'active' ? ' selected' : ''}>Active (open)</option>${STATUSES.map(([k, l]) => opt(k, l, status)).join('')}</select>
        <select id="f-type" aria-label="Service"><option value="">All services</option>${Object.entries(ENQ_TYPES).map(([k, l]) => opt(k, l, type)).join('')}</select>
        <select id="f-agent" aria-label="Agent"><option value="">All sources</option>${opt('any', 'Any agent', agent)}${db.vendors.map((v) => opt(v.id, `${v.agentCode} · ${v.business}`, agent)).join('')}</select>
        <input id="f-q" type="search" placeholder="Search ref, name, phone, place, code…" value="${esc(q.get('q') || '')}">
        <span class="muted">${rows.length} shown</span>
      </div>
      ${rows.length ? enqTable(rows) : '<div class="empty">No enquiries match.</div>'}`);
    bindRows();
    const upd = () => { const p = new URLSearchParams(); if ($('#f-status').value) p.set('status', $('#f-status').value); if ($('#f-type').value) p.set('type', $('#f-type').value); if ($('#f-agent').value) p.set('agent', $('#f-agent').value); if ($('#f-q').value) p.set('q', $('#f-q').value); go('#/enquiries' + (p.toString() ? '?' + p : '')); };
    $('#f-status').onchange = upd; $('#f-type').onchange = upd; $('#f-agent').onchange = upd;
    let t; $('#f-q').oninput = () => { clearTimeout(t); t = setTimeout(upd, 400); };
    if (openId) drawer(openId, q);
  }

  function drawer(id, q) {
    const e = db.enquiries.find((x) => x.id === id); if (!e) return;
    const back = '#/enquiries' + (q.toString() ? '?' + q : '');
    const prefs = PREF_KIND[e.type] || [];
    const vendors = [...db.vendors].sort((a, b) => (prefs.includes(b.kind) ? 1 : 0) - (prefs.includes(a.kind) ? 1 : 0));
    const v = vendorById(e.vendorId);
    const details = e.fields.map(([k, val]) => `• ${k}: ${val}`).join('\n');
    const custMsg = `Namaste ${e.customer.name}! 🙏 This is Nirvana Inside about your enquiry ${e.ref} (${e.title}). `;
    const vendMsg = (who) => `Namaste ${who || ''}! Nirvana Inside here.\nNew request ${e.ref}: *${e.title}*\n${details}\n\nIs this available? Please share your best rate. 🙏`;
    const bg = document.createElement('div'); bg.className = 'drawer-bg';
    const d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', `Enquiry ${e.ref}`);
    d.innerHTML = `<div class="top" style="margin:0"><div><p class="mono muted">${esc(ENQ_TYPES[e.type] || e.type)} · ${dt(e.createdAt)}</p><h2>${esc(e.ref)}</h2></div><button class="x" type="button" data-close aria-label="Close">✕</button></div>
      <h3>${esc(e.title)}</h3>
      <div class="pipeline" role="group" aria-label="Status">${STATUSES.map(([k, l]) => `<button type="button" data-st="${k}" class="${e.status === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <table class="facts"><tbody>${e.fields.map(([k, val]) => `<tr><th>${esc(k)}</th><td>${esc(val)}</td></tr>`).join('')}${e.listingTitle ? `<tr><th>Listing</th><td>${esc(e.listingTitle)}</td></tr>` : ''}${e.source?.utm ? `<tr><th>Source</th><td>${esc(e.source.utm)}</td></tr>` : ''}<tr><th>Page</th><td class="sub">${esc(e.source?.page || '')}</td></tr></tbody></table>
      <div class="who"><div><p class="mono muted">Customer</p><b>${esc(e.customer.name)}</b><div>${esc(e.customer.phone)}</div></div>
        <div class="row"><a class="btn btn-ghost btn-sm" href="tel:${esc(e.customer.phone.replace(/\s/g, ''))}">📞 Call</a><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waLink(e.customer.phone, custMsg))}">${NI.WA_SVG}WhatsApp</a></div></div>
      <div class="fs"><h2>🤝 Agent &amp; incentive</h2>
        <p class="hint">${e.agentId ? `Referred by <b>${esc(vendorById(e.agentId)?.business || 'deleted partner')}</b> (${esc(e.agentCode)}).` : e.agentCode ? `Customer used code <b>${esc(e.agentCode)}</b>, which doesn't match any active partner. Pick the right agent below if needed.` : 'No agent code on this enquiry. Set one if an agent brought this customer.'} The incentive counts once the enquiry is <b>Confirmed</b> or <b>Completed</b>.</p>
        <label class="in">Referring agent<select id="d-agent"><option value="">— No agent —</option>${agents().map((x) => opt(x.id, `${x.agentCode} · ${x.business}`, e.agentId)).join('')}</select></label>
        <div class="g3">
          <label class="in">Booking value (₹)<input id="d-bval" type="number" min="0" step="1" value="${esc(e.bookingValue ?? '')}" placeholder="Final amount customer pays"></label>
          <label class="in">Incentive %<input id="d-ipct" type="number" min="0" max="100" step="0.5" value="${esc(e.incentivePct ?? '')}"></label>
          <label class="in">Incentive (₹)<input id="d-iamt" type="number" min="0" step="1" value="${esc(e.incentiveAmount ?? '')}" ${e.incentiveManual ? '' : 'readonly'}></label></div>
        <div class="row"><label class="check"><input type="checkbox" id="d-iman" ${e.incentiveManual ? 'checked' : ''}> Set incentive amount by hand</label><button class="btn btn-sun btn-sm" type="button" id="d-isave">Save incentive</button></div></div>
      <div class="fs"><h2>Service partner <a class="btn btn-ghost btn-sm" href="#/vendors/new">+ New partner</a></h2>
        <label class="in">Assign service partner<select id="d-vendor"><option value="">— Not assigned —</option>${vendors.map((x) => opt(x.id, `${x.business}${x.area ? ' · ' + x.area : ''} (${VK[x.kind] || x.kind})`, e.vendorId)).join('')}</select></label>
        <div id="d-vcard">${vendorCard(v, vendMsg)}</div></div>
      <div class="fs"><div class="g2">
        <label class="in">Quote sent to customer<input id="d-quote" value="${esc(e.quote || '')}" placeholder="e.g. ₹1,800/night incl. breakfast"></label>
        <label class="in">Follow up on<input id="d-follow" type="date" value="${esc(e.followUp || '')}"></label></div>
        <button class="btn btn-sun btn-sm" type="button" id="d-save" style="justify-self:start">Save</button></div>
      <div class="fs"><h2>Notes &amp; activity</h2>
        <div class="notes">${e.notes.length ? [...e.notes].reverse().map((n) => `<div class="note"><time>${dt(n.at)}</time>${esc(n.text)}</div>`).join('') : '<p class="muted">No notes yet.</p>'}</div>
        <label class="in">Add a note<textarea id="d-note" rows="2" placeholder="Called customer, vendor says available at ₹1,500…"></textarea></label>
        <button class="btn btn-ghost btn-sm" type="button" id="d-addnote" style="justify-self:start">Add note</button></div>
      <button class="btn btn-ghost btn-sm danger" type="button" id="d-del" style="justify-self:start">Delete enquiry</button>`;
    document.body.append(bg, d);
    const close = () => { bg.remove(); d.remove(); go(back); };
    bg.onclick = close; $('[data-close]', d).onclick = close;
    d.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
    $('[data-close]', d).focus();
    const patch = async (body, msg) => { const u = await api('PATCH', `/api/admin/enquiries/${e.id}`, body); Object.assign(e, u); toast(msg || 'Saved'); };
    $$('[data-st]', d).forEach((b) => b.onclick = async () => { await patch({status: b.dataset.st, note: `Status → ${ST[b.dataset.st]}`}, `Marked ${ST[b.dataset.st]}`); $$('[data-st]', d).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#d-vendor', d).onchange = async (ev) => { const nv = vendorById(ev.target.value); await patch({vendorId: ev.target.value || null, note: nv ? `Assigned to ${nv.business}` : 'Vendor unassigned'}, 'Vendor assigned'); $('#d-vcard', d).innerHTML = vendorCard(nv, vendMsg); };
    d.addEventListener('click', async (ev) => {
      const a = ev.target.closest('[data-askvendor]'); if (!a) return;
      if (['new', 'contacted'].includes(e.status)) { patch({status: 'checking_vendor', note: `Asked vendor on WhatsApp (${a.dataset.askvendor})`}, 'Status → Checking vendor'); $$('[data-st]', d).forEach((x) => x.classList.toggle('on', x.dataset.st === 'checking_vendor')); }
    });
    $('#d-save', d).onclick = () => patch({quote: $('#d-quote', d).value, followUp: $('#d-follow', d).value});
    const calc = () => { if ($('#d-iman', d).checked) return; const v = parseFloat($('#d-bval', d).value), p = parseFloat($('#d-ipct', d).value); $('#d-iamt', d).value = $('#d-agent', d).value && v >= 0 && p >= 0 ? Math.round((v * p) / 100) : ''; };
    $('#d-bval', d).oninput = calc; $('#d-ipct', d).oninput = calc;
    $('#d-iman', d).onchange = (ev) => { $('#d-iamt', d).readOnly = !ev.target.checked; calc(); };
    $('#d-agent', d).onchange = async (ev) => {
      const a = vendorById(ev.target.value);
      await patch({agentId: ev.target.value || null, note: a ? `Agent set to ${a.business} (${a.agentCode})` : 'Agent removed'}, a ? 'Agent set' : 'Agent removed');
      $('#d-ipct', d).value = e.incentivePct ?? ''; $('#d-iamt', d).value = e.incentiveAmount ?? '';
    };
    $('#d-isave', d).onclick = async () => {
      const body = {bookingValue: $('#d-bval', d).value, incentivePct: $('#d-ipct', d).value, incentiveManual: $('#d-iman', d).checked};
      if (body.incentiveManual) body.incentiveAmount = $('#d-iamt', d).value;
      await patch(body, 'Incentive saved'); $('#d-iamt', d).value = e.incentiveAmount ?? '';
    };
    $('#d-addnote', d).onclick = async () => { const t = $('#d-note', d).value.trim(); if (!t) return; await patch({note: t}, 'Note added'); close(); go(`#/enquiries/${e.id}`); };
    $('#d-del', d).onclick = async () => { if (!confirm(`Delete enquiry ${e.ref}? This cannot be undone.`)) return; await api('DELETE', `/api/admin/enquiries/${e.id}`); db.enquiries = db.enquiries.filter((x) => x.id !== e.id); bg.remove(); d.remove(); toast('Deleted'); go(back); };
  }
  function vendorCard(v, msg) {
    if (!v) return '<p class="hint">Assign the partner who provides this service to check availability. Their contacts appear here, with a one-tap WhatsApp message that includes the request details (but never the customer\'s number).</p>';
    const people = [['Owner', v.ownerName, v.ownerPhone], ['Manager', v.managerName, v.managerPhone], ['WhatsApp', v.business, v.whatsapp]].filter(([, , p]) => p);
    return `<div class="who" style="display:grid;gap:10px"><div><b>${esc(v.business)}</b><div class="sub muted">${esc(VK[v.kind] || v.kind)}${v.area ? ' · ' + esc(v.area) : ''}${v.rates ? ' · ' + esc(v.rates) : ''}</div></div>
      ${people.length ? people.map(([role, name, phone]) => `<div class="row" style="justify-content:space-between"><span><span class="mono muted">${role}</span> ${esc(name || '')} · ${esc(phone)}</span><span class="row"><a class="btn btn-ghost btn-sm" href="tel:${esc(String(phone).replace(/\s/g, ''))}">📞</a><a class="btn btn-wa btn-sm" data-askvendor="${esc(role)}" target="_blank" rel="noopener" href="${esc(waLink(phone, msg(name)))}">${NI.WA_SVG}Ask</a></span></div>`).join('') : '<p class="hint">No phone numbers saved for this partner. <a href="#/vendors/' + esc(v.id) + '">Add them →</a></p>'}
      ${v.notes ? `<p class="hint">📝 ${esc(v.notes)}</p>` : ''}</div>`;
  }

  // ───────── Listings ─────────
  function viewListings(q) {
    const type = LT[q.get('type')] ? q.get('type') : '';
    const review = q.get('review') === '1';
    const rows = db.listings.filter((l) => (!type || l.type === type) && (!review || l.pendingEdit)).sort((a, b) => a.type.localeCompare(b.type) || (a.order ?? 999) - (b.order ?? 999));
    shell('list', `<div class="top"><h1>Listings</h1><a class="btn btn-sun btn-sm" href="#/listings/new?type=${type || 'stay'}">+ Add ${type ? LT[type].label.split(' ').slice(1).join(' ').replace(/s$/, '').toLowerCase() : 'listing'}</a></div>
      <div class="filters"><a class="chip-btn" aria-pressed="${!type && !review}" href="#/listings">All (${db.listings.length})</a>${pendingN() ? `<a class="chip-btn" aria-pressed="${review}" href="#/listings?review=1">✎ Partner edits (${pendingN()})</a>` : ''}${Object.entries(LT).map(([k, t]) => `<a class="chip-btn" aria-pressed="${type === k}" href="#/listings?type=${k}">${t.label} (${db.listings.filter((l) => l.type === k).length})</a>`).join('')}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Listing</th><th>Location</th><th>Price</th><th>Status</th><th>Partner</th><th>Photos</th></tr></thead><tbody>${rows.map((l) => `
        <tr data-href="#/listings/${l.id}"><td>${l.images?.[0] ? `<img class="thumb" src="${esc(l.images[0])}" alt="">` : '<div class="thumb"></div>'}</td>
        <td><b>${esc(l.title)}</b>${l.featured ? ' ★' : ''}<div class="sub">${esc(LT[l.type]?.label || l.type)} · ${esc((LT[l.type]?.subs.find((s) => s[0] === l.subtype) || [])[1] || l.subtype || '')}</div></td>
        <td class="sub">${esc(l.location?.area || '')}</td>
        <td>${l.price?.amount ? `${inr(l.price.amount)}<div class="sub">/ ${esc(l.price.unit)}</div>` : '<span class="sub">On request</span>'}</td>
        <td><span class="pill st-${l.status}">${esc((l.status || 'draft').replace('_', ' '))}</span>${l.pendingEdit ? '<div><span class="pill st-new">✎ Edit to review</span></div>' : ''}</td>
        <td class="sub">${esc(vendorById(l.vendorId)?.business || '—')}</td>
        <td class="sub">${(l.images || []).length}${l.type === 'stay' && (l.images || []).length < 7 ? ' ⚠️' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint muted" style="margin-top:10px">⚠️ = fewer than 7 photos. Stays look best with 7–10.</p>`);
    bindRows();
  }

  // What a partner proposed vs what's live now.
  const FIELD_LABEL = {title: 'Title', tagline: 'Tagline', description: 'Description', price: 'Price', images: 'Photos', highlights: 'Highlights'};
  function showVal(k, val) {
    if (k === 'price') return val?.amount ? `${inr(val.amount)} / ${esc(val.unit || '')}${val.note ? ' · ' + esc(val.note) : ''}` : 'On request' + (val?.note ? ' · ' + esc(val.note) : '');
    if (k === 'images') return `<div class="rv-imgs">${(val || []).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('') || '<span class="muted">No photos</span>'}</div>`;
    if (k === 'highlights') return (val || []).length ? `<ul>${val.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : '<span class="muted">—</span>';
    return val ? `<span style="white-space:pre-line">${esc(val)}</span>` : '<span class="muted">—</span>';
  }
  function reviewPanel(l) {
    const pe = l.pendingEdit; const who = vendorById(l.vendorId);
    return `<div class="fs review"><h2>✎ ${esc(who?.business || 'Partner')} wants to change this listing <span class="mono muted">${ago(pe.at)}</span></h2>
      ${pe.note ? `<p class="hint">Their note: “${esc(pe.note)}”</p>` : ''}
      <div class="rv">${Object.entries(pe.changes).map(([k, val]) => `<div class="rv-row"><b>${FIELD_LABEL[k] || esc(k)}</b><div><p class="mono muted">Now</p>${showVal(k, l[k])}</div><div><p class="mono muted">Proposed</p>${showVal(k, val)}</div></div>`).join('')}</div>
      <div class="row"><button class="btn btn-sun btn-sm" type="button" id="rv-ok">✓ Approve &amp; publish changes</button><button class="btn btn-ghost btn-sm danger" type="button" id="rv-no">✕ Reject</button></div></div>`;
  }

  function blankListing(type) {
    return {type, subtype: LT[type].subs[0][0], status: 'draft', featured: false, order: 100, vendorId: INHOUSE_ID, title: '', tagline: '', description: '',
      location: {area: '', district: 'Kullu', address: '', lat: null, lng: null}, price: {amount: null, unit: {stay: 'night', transport: 'trip', experience: 'person', rental: 'day', package: 'person'}[type], note: ''},
      images: [], highlights: [], amenities: [], rooms: type === 'stay' ? [{name: 'Standard Room', price: null, unit: 'night', guests: 2, beds: 'Double bed', size: '', count: 1, amenities: [], description: '', images: []}] : [],
      itinerary: [], details: DETAILS[type].map((k) => [k, '']), internalNotes: '', ...(type === 'transport' ? {seats: 4, luggage: '', vehicle: 'sedan'} : {}), ...(type === 'package' ? {duration: ''} : {})};
  }

  let pickerMap = null;
  function viewListingEdit(id, q) {
    const orig = id === 'new' ? null : db.listings.find((l) => l.id === id);
    if (id !== 'new' && !orig) { shell('list', '<div class="empty">Listing not found. <a href="#/listings">Back</a></div>'); return; }
    const draft = structuredClone(orig || blankListing(LT[q.get('type')] ? q.get('type') : 'stay'));
    if (!orig && vendorById(q.get('partner'))) draft.vendorId = q.get('partner');
    delete draft.pendingEdit; delete draft.editReview;
    draft.details ||= []; draft.images ||= []; draft.rooms ||= []; draft.location ||= {}; draft.price ||= {};
    let dirty = false;

    function html() {
      const t = draft.type;
      const amenList = [...new Set([...(AMEN[t] || []), ...(draft.amenities || [])])];
      return `<div class="top"><div><p class="mono muted"><a href="#/listings?type=${t}">← ${esc(LT[t].label)}</a></p><h1>${orig ? esc(orig.title) : 'New listing'}</h1></div>${orig ? `<a class="btn btn-ghost btn-sm" href="/item.html?id=${encodeURIComponent(orig.id)}" target="_blank" rel="noopener">↗ View on site</a>` : ''}</div>
      ${orig?.pendingEdit ? reviewPanel(orig) : ''}
      <form class="form" id="lf" novalidate>
        <div class="fs"><h2>Basics</h2>
          <div class="g3">${S('Category', 'type', t, Object.entries(LT).map(([k, v]) => [k, v.label]))}${S('Sub-type', 'subtype', draft.subtype, LT[t].subs)}${S('Status', 'status', draft.status, [['draft', 'Draft (hidden)'], ['published', 'Published (live)'], ['coming_soon', 'Coming soon']])}</div>
          ${I('Title *', 'title', draft.title, {ph: t === 'stay' ? 'e.g. Pine View Homestay' : ''})}
          ${I('Tagline (one line on cards)', 'tagline', draft.tagline, {ph: 'e.g. 12 rooms with Beas river views'})}
          ${I('Description', 'description', draft.description, {textarea: true, rows: 4})}
          <div class="g3">
            ${S('Partner offering this * (private)', 'vendorId', draft.vendorId || '', [...(draft.vendorId ? [] : [['', '— Choose partner —']]), ...[...db.vendors].sort((a, b) => (b.inhouse ? 1 : 0) - (a.inhouse ? 1 : 0) || a.business.localeCompare(b.business)).map((v) => [v.id, v.inhouse ? v.business : `${v.business}${v.agentCode ? ' · ' + v.agentCode : ''}`])])}
            ${I('Sort order (lower = first)', 'order', draft.order, {num: true})}
            <label class="in">Featured<span class="check"><input type="checkbox" data-bind="featured" ${draft.featured ? 'checked' : ''}> Show as ★ Top pick</span></label>
          </div>
          ${t === 'transport' ? `<div class="g3">${I('Seats', 'seats', draft.seats, {num: true})}${I('Luggage', 'luggage', draft.luggage, {ph: '3 bags'})}${S('Icon', 'vehicle', draft.vehicle, VEHICLE_ICONS.map((k) => [k, k]))}</div>` : ''}
          ${t === 'package' ? I('Duration', 'duration', draft.duration, {ph: '4N / 5D'}) : ''}
        </div>

        <div class="fs"><h2>Price</h2><p class="hint">Leave the amount empty to show "Best price on WhatsApp".</p>
          <div class="g3">${I('Amount (₹)', 'price.amount', draft.price.amount, {num: true, ph: 'e.g. 900'})}${S('Per', 'price.unit', draft.price.unit, UNITS.map((u) => [u, u]))}${I('Note', 'price.note', draft.price.note, {ph: 'per room · incl. breakfast'})}</div></div>

        <div class="fs"><h2>Photos <span class="mono muted">${draft.images.length} / 7–10 recommended</span></h2>
          <p class="hint">The first photo is the cover. Upload JPG, PNG or WEBP (resized automatically), or paste an image link.</p>
          <div class="photos" id="photos">${draft.images.map((src, i) => `<div class="ph"><img src="${esc(src)}" alt="">${i === 0 ? '<span class="sticker cover">Cover</span>' : ''}<div class="acts"><button type="button" data-img="up" data-i="${i}" aria-label="Move left">←</button><button type="button" data-img="down" data-i="${i}" aria-label="Move right">→</button><button type="button" data-img="del" data-i="${i}" aria-label="Remove">✕</button></div></div>`).join('')}
            <label class="drop">⬆ Upload photos<input type="file" id="upl" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div>
          <div class="row"><input class="search-in" id="img-url" placeholder="https://… image link" style="max-width:none;flex:1"><button class="btn btn-ghost btn-sm" type="button" id="add-url">Add link</button></div>
          <p class="hint" id="upl-status" role="status"></p></div>

        <div class="fs"><h2>Location</h2>
          <div class="g2">${I('Area / town (shown on cards)', 'location.area', draft.location.area, {ph: 'Dhalpur, Kullu'})}${S('District', 'location.district', draft.location.district, DISTRICTS.map((d) => [d, d]))}</div>
          ${I('Full address', 'location.address', draft.location.address)}
          <div class="row"><input class="search-in" id="geo-q" placeholder="Search a place to drop the pin…" style="max-width:none;flex:1"><button class="btn btn-ghost btn-sm" type="button" id="geo-go">Find</button></div>
          <div class="picker-map" id="picker"></div>
          <div class="g2">${I('Latitude', 'location.lat', draft.location.lat, {num: true})}${I('Longitude', 'location.lng', draft.location.lng, {num: true})}</div>
          <p class="hint">Click the map to set the pin. Leave empty for services that cover all of Himachal.</p></div>

        ${t === 'stay' ? `<div class="fs"><h2>Room types <button class="btn btn-ghost btn-sm" type="button" id="add-room">+ Add room type</button></h2>${draft.rooms.map((r, i) => `<div class="room-ed">
            <div class="g4">${I('Room name', `rooms.${i}.name`, r.name)}${I('Price (₹)', `rooms.${i}.price`, r.price, {num: true})}${S('Per', `rooms.${i}.unit`, r.unit || 'night', UNITS.map((u) => [u, u]))}${I('Rooms of this type', `rooms.${i}.count`, r.count, {num: true})}</div>
            <div class="g3">${I('Max guests', `rooms.${i}.guests`, r.guests, {num: true})}${I('Beds', `rooms.${i}.beds`, r.beds)}${I('Size', `rooms.${i}.size`, r.size, {ph: '180 sq ft'})}</div>
            <label class="in">Room amenities (comma separated)<input data-list="rooms.${i}.amenities" value="${esc((r.amenities || []).join(', '))}"></label>
            ${I('Room description', `rooms.${i}.description`, r.description, {textarea: true, rows: 2})}
            ${draft.images.length ? `<p class="hint">Room photos (tap to select from the listing photos):</p><div class="photos">${draft.images.map((src) => `<div class="ph pick${(r.images || []).includes(src) ? ' on' : ''}" data-roomimg="${i}" data-src="${esc(src)}" role="button" tabindex="0" aria-pressed="${(r.images || []).includes(src)}"><img src="${esc(src)}" alt=""></div>`).join('')}</div>` : ''}
            <button class="btn btn-ghost btn-sm danger" type="button" data-delroom="${i}" style="justify-self:start">Remove room type</button></div>`).join('')}</div>` : ''}

        ${t === 'package' ? `<div class="fs"><h2>Itinerary</h2>${I('One day per line', 'itinerary', draft.itinerary, {textarea: true, lines: true, rows: 7, ph: 'Arrive Manali · check in\nSolang Valley & Atal Tunnel\n…'})}</div>` : ''}

        <div class="fs"><h2>Highlights &amp; amenities</h2>
          ${I('Highlights (one per line)', 'highlights', draft.highlights, {textarea: true, lines: true, rows: 4})}
          <div class="amen-pick" id="amen">${amenList.map((a) => `<label><input type="checkbox" value="${esc(a)}" ${(draft.amenities || []).includes(a) ? 'checked' : ''}><span>${esc(a)}</span></label>`).join('')}</div>
          <div class="row"><input class="search-in" id="amen-new" placeholder="Add another amenity…" style="max-width:none;flex:1"><button class="btn btn-ghost btn-sm" type="button" id="amen-add">Add</button></div></div>

        <div class="fs"><h2>Mandatory details <span class="row"><button class="btn btn-ghost btn-sm" type="button" id="det-defaults">Load standard fields</button><button class="btn btn-ghost btn-sm" type="button" id="det-add">+ Row</button></span></h2>
          <p class="hint">Shown under "Important information": check-in/out, documents, deposits, inclusions and so on. Empty rows are hidden.</p>
          ${draft.details.map(([k, v], i) => `<div class="kv"><input class="search-in" style="max-width:none" data-bind="details.${i}.0" value="${esc(k)}" placeholder="Label" aria-label="Detail label"><input class="search-in" style="max-width:none" data-bind="details.${i}.1" value="${esc(v)}" placeholder="Value" aria-label="Detail value"><button class="icon-btn" type="button" data-deldet="${i}" aria-label="Remove row">✕</button></div>`).join('')}</div>

        <div class="fs"><h2>Internal notes <span class="mono muted">never shown publicly</span></h2>${I('Notes for the team', 'internalNotes', draft.internalNotes, {textarea: true, rows: 3, ph: 'Commission, contract dates, negotiation notes…'})}</div>

        <div class="savebar">${orig ? '<button class="btn btn-ghost danger" type="button" id="del">Delete</button>' : ''}<a class="btn btn-ghost" href="#/listings?type=${t}">Cancel</a><button class="btn btn-sun" type="submit">💾 Save listing</button></div>
      </form>`;
    }

    function paint() {
      const y = scrollY;
      shell('list', html());
      scrollTo(0, y);
      const f = $('#lf');
      bind(f, draft, (el) => { dirty = true; if (['type', 'subtype'].includes(el.dataset.bind)) { if (el.dataset.bind === 'type') { draft.subtype = LT[draft.type].subs[0][0]; } paint(); } if (el.dataset.bind?.startsWith('location.l')) movePin(); });
      $('#amen').addEventListener('change', () => { draft.amenities = $$('#amen input:checked').map((i) => i.value); dirty = true; });
      $('#amen-add').onclick = () => { const v = $('#amen-new').value.trim(); if (v) { draft.amenities = [...new Set([...(draft.amenities || []), v])]; paint(); } };
      $('#det-add').onclick = () => { draft.details.push(['', '']); paint(); };
      $('#det-defaults').onclick = () => { const have = new Set(draft.details.map(([k]) => k)); DETAILS[draft.type].forEach((k) => have.has(k) || draft.details.push([k, ''])); paint(); };
      f.addEventListener('click', (e) => {
        const b = e.target.closest('button, [data-roomimg]'); if (!b) return;
        if (b.dataset.deldet != null) { draft.details.splice(+b.dataset.deldet, 1); paint(); }
        if (b.dataset.delroom != null) { draft.rooms.splice(+b.dataset.delroom, 1); paint(); }
        if (b.id === 'add-room') { draft.rooms.push({name: '', price: null, unit: 'night', guests: 2, beds: '', size: '', count: 1, amenities: [], description: '', images: []}); paint(); }
        if (b.dataset.roomimg != null) { const r = draft.rooms[+b.dataset.roomimg]; r.images ||= []; const s = b.dataset.src; r.images = r.images.includes(s) ? r.images.filter((x) => x !== s) : [...r.images, s]; b.classList.toggle('on'); b.setAttribute('aria-pressed', r.images.includes(s)); dirty = true; }
        if (b.dataset.img) {
          const i = +b.dataset.i; const a = draft.images;
          if (b.dataset.img === 'del') a.splice(i, 1);
          if (b.dataset.img === 'up' && i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]];
          if (b.dataset.img === 'down' && i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]];
          dirty = true; paint();
        }
      });
      $('#add-url').onclick = () => { const v = $('#img-url').value.trim(); if (!/^https:\/\//.test(v)) { $('#upl-status').textContent = 'Paste a full https:// image link.'; return; } draft.images.push(v); paint(); };
      $('#upl').onchange = async (e) => {
        const files = [...e.target.files]; const st = $('#upl-status'); e.target.value = '';
        let before = 0, after = 0, done = 0;
        for (const [n, file] of files.entries()) {
          st.textContent = `Optimising & uploading ${n + 1} of ${files.length}…`;
          try {
            const out = await optimiseImage(file);
            const {url} = await api('POST', '/api/admin/upload', {dataUrl: await blobToDataUrl(out.blob)});
            draft.images.push(url); before += file.size; after += out.blob.size; done++;
          } catch (err) { st.textContent = `${file.name}: ${err.message || 'could not read this image'} (iPhone HEIC photos: export as JPG first).`; await new Promise((r) => setTimeout(r, 2500)); }
        }
        dirty = true; paint();
        $('#upl-status').textContent = done ? `${done} photo(s) uploaded · ${kb(before)} → ${kb(after)} (${Math.max(0, Math.round(100 - (after / before) * 100))}% smaller)` : 'No photos uploaded.';
      };
      $('#geo-go').onclick = async () => {
        const qv = $('#geo-q').value.trim(); if (!qv) return;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(qv)}`, {headers: {'Accept-Language': 'en'}}).then((x) => x.json());
          if (!r[0]) { toast('Place not found, so click the map instead'); return; }
          draft.location.lat = +(+r[0].lat).toFixed(5); draft.location.lng = +(+r[0].lon).toFixed(5); dirty = true;
          $('[data-bind="location.lat"]').value = draft.location.lat; $('[data-bind="location.lng"]').value = draft.location.lng; movePin(true);
        } catch { toast('Search unavailable, so click the map instead'); }
      };
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (!draft.title.trim()) { toast('Add a title first'); $('[data-bind=title]').focus(); return; }
        draft.details = draft.details.filter(([k, v]) => k?.trim() || v?.trim());
        if (!draft.vendorId) { toast('Choose the partner who offers this listing'); $('[data-bind=vendorId]').focus(); return; }
        try {
          const saved = await api('PUT', `/api/admin/listings/${orig ? orig.id : 'new'}`, draft);
          const i = db.listings.findIndex((l) => l.id === saved.id); if (i >= 0) db.listings[i] = saved; else db.listings.push(saved);
          dirty = false; toast('Listing saved ✓'); go(`#/listings/${saved.id}`);
        } catch (err) { toast(err.message); }
      };
      if (orig?.pendingEdit) {
        const decide = async (action, reason) => {
          if (dirty && !confirm('You have unsaved changes in this form. They will be lost. Continue?')) return;
          const saved = await api('POST', `/api/admin/listings/${orig.id}/edit`, {action, reason});
          const i = db.listings.findIndex((l) => l.id === saved.id); db.listings[i] = saved; dirty = false;
          toast(action === 'approve' ? 'Changes approved and live ✓' : 'Changes rejected'); render();
        };
        $('#rv-ok').onclick = () => decide('approve');
        $('#rv-no').onclick = () => { const r = prompt('Reason for the partner (optional):', ''); if (r !== null) decide('reject', r); };
      }
      if (orig) $('#del').onclick = async () => { if (!confirm(`Delete "${orig.title}"? This cannot be undone.`)) return; await api('DELETE', `/api/admin/listings/${orig.id}`); db.listings = db.listings.filter((l) => l.id !== orig.id); dirty = false; toast('Deleted'); go(`#/listings?type=${orig.type}`); };
      initPicker();
    }
    let marker;
    async function initPicker() {
      try {
        const lat = draft.location.lat, lng = draft.location.lng;
        const {L, map} = await NI.makeMap($('#picker'), {center: lat != null ? [lat, lng] : [31.95, 77.11], zoom: lat != null ? 12 : 8});
        pickerMap = {L, map};
        if (lat != null) marker = L.marker([lat, lng]).addTo(map);
        map.on('click', (e) => {
          draft.location.lat = +e.latlng.lat.toFixed(5); draft.location.lng = +e.latlng.lng.toFixed(5); dirty = true;
          $('[data-bind="location.lat"]').value = draft.location.lat; $('[data-bind="location.lng"]').value = draft.location.lng; movePin();
        });
      } catch { $('#picker').innerHTML = '<p class="empty">Map unavailable. Type the coordinates instead.</p>'; }
    }
    function movePin(fly) {
      if (!pickerMap || draft.location.lat == null || draft.location.lng == null) return;
      const ll = [draft.location.lat, draft.location.lng];
      if (marker) marker.setLatLng(ll); else marker = pickerMap.L.marker(ll).addTo(pickerMap.map);
      if (fly) pickerMap.map.setView(ll, 13);
    }
    window.onbeforeunload = () => (dirty ? true : undefined);
    paint();
  }

  const {optimiseImage, kb, blobToDataUrl} = NI;

  // ───────── Partners (vendor + agent) ─────────
  function viewVendors(q) {
    const sort = q?.get('sort') || '';
    const rows = db.vendors.map((v) => ({v, st: stats(v.id), offers: db.listings.filter((l) => l.vendorId === v.id).length}));
    rows.sort((a, b) => (b.v.inhouse ? 1 : 0) - (a.v.inhouse ? 1 : 0));
    if (sort === 'balance') rows.sort((a, b) => b.st.balance - a.st.balance);
    shell('ven', `<div class="top"><h1>Partners</h1><a class="btn btn-sun btn-sm" href="#/vendors/new">+ Add partner</a></div>
      <p class="muted" style="margin-bottom:14px">Every listing belongs to one partner (listings you run yourself belong to <b>Nirvana Inside (in-house)</b>). A partner can have any number of listings, and every partner is also an <b>agent</b> with their own code and link: when they bring customers they earn their incentive (default ${pctOf(null)}% of the booking value). Contact details and commercials stay private.</p>
      ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Partner</th><th>Type</th><th>Agent code</th><th>Listings</th><th>Referred</th><th>Confirmed</th><th>Earned</th><th>Due</th><th>Login</th></tr></thead><tbody>${rows.map(({v, st, offers}) => `
        <tr data-href="#/vendors/${v.id}"><td><b>${esc(v.business)}</b>${v.active === false ? ' <span class="pill st-lost">inactive</span>' : ''}<div class="sub">${esc(v.ownerName || v.managerName || '')}${v.area ? ' · ' + esc(v.area) : ''}</div></td>
        <td class="sub">${esc(VK[v.kind] || v.kind)}</td>
        <td>${v.inhouse ? '<span class="sub">—</span>' : `<span class="pill st-quoted">${esc(v.agentCode || '—')}</span><div class="sub">${pctOf(v)}%</div>`}</td>
        <td>${offers}</td><td>${st.referred}</td><td>${st.confirmed}</td>
        <td>${st.earned ? inr(st.earned) : '—'}</td>
        <td>${st.balance > 0 ? `<b>${inr(st.balance)}</b>` : '—'}</td>
        <td class="sub">${v.inhouse ? '—' : v.hasPin ? '✅ On' : 'Off'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No partners yet. Add your first hotel, driver, operator or agent.</div>'}`);
    bindRows();
  }

  function viewVendorEdit(id) {
    const orig = id === 'new' ? null : vendorById(id);
    if (id !== 'new' && !orig) { shell('ven', '<div class="empty">Partner not found.</div>'); return; }
    const v = structuredClone(orig || {kind: 'stay', business: '', ownerName: '', ownerPhone: '', managerName: '', managerPhone: '', whatsapp: '', email: '', area: '', district: 'Kullu', licence: '', inventory: '', rates: '', commission: '', payment: '', rating: 3, active: true, notes: '', agentCode: '', incentivePct: null, payouts: []});
    v.payouts ||= [];
    const linked = orig ? db.listings.filter((l) => l.vendorId === orig.id) : [];
    const served = orig ? db.enquiries.filter((e) => e.vendorId === orig.id) : [];
    const st = orig ? stats(orig.id) : null;
    const loginPhone = v.whatsapp || v.ownerPhone || v.managerPhone;
    const IH = Boolean(orig?.inhouse);
    shell('ven', `<div class="top"><div><p class="mono muted"><a href="#/vendors">← Partners</a></p><h1>${orig ? esc(orig.business) : 'New partner'}</h1></div>${orig && !IH ? `<span class="pill st-quoted" style="font-size:.9rem">${esc(orig.agentCode)}</span>` : ''}</div>
      ${IH ? `<p class="muted" style="margin-bottom:16px">Built-in partner for listings Nirvana Inside operates directly. It has no agent code, incentive or login, and can't be deleted. <b>${linked.length}</b> listing(s).</p>` : ''}
      ${orig && !IH ? `<div class="tiles" style="margin-bottom:16px">
        <div class="tile"><b>${linked.length}</b><span>Listings</span></div>
        <a class="tile" href="#/enquiries?agent=${orig.id}" style="text-decoration:none"><b>${st.referred}</b><span>Customers referred</span></a>
        <div class="tile"><b>${st.confirmed}</b><span>Confirmed</span></div>
        <div class="tile"><b>${inr(st.earned)}</b><span>Incentive earned</span></div>
        <div class="tile"><b>${inr(st.paid)}</b><span>Paid out</span></div>
        <div class="tile hot"><b>${inr(st.balance)}</b><span>Due to partner</span></div></div>` : ''}
      <form class="form" id="vf" novalidate>
        <div class="fs"><h2>Business</h2>
          <div class="g2">${I('Business / partner name *', 'business', v.business)}${IH ? '<span></span>' : S('Type', 'kind', v.kind, VENDOR_KINDS)}</div>
          <div class="g3">${I('Area / base', 'area', v.area, {ph: 'Old Manali'})}${S('District', 'district', v.district, DISTRICTS.map((d) => [d, d]))}${I('Licence / GST / RC no.', 'licence', v.licence)}</div>
          ${I('Inventory', 'inventory', v.inventory, {ph: '12 rooms · Deluxe & Suite  /  2 Innova, 1 Tempo Traveller 17'})}
          ${IH ? '' : `<label class="in">Status<span class="check"><input type="checkbox" data-bind="active" ${v.active !== false ? 'checked' : ''}> Active partner (inactive partners can't log in and their code stops crediting)</span></label>`}</div>
        <div class="fs"><h2>People &amp; contacts</h2>
          <div class="g2">${I('Owner name', 'ownerName', v.ownerName)}${I('Owner phone', 'ownerPhone', v.ownerPhone, {type: 'tel', ph: '+91…'})}</div>
          <div class="g2">${I('Manager / driver name', 'managerName', v.managerName)}${I('Manager phone', 'managerPhone', v.managerPhone, {type: 'tel', ph: '+91…'})}</div>
          <div class="g2">${I('WhatsApp (bookings)', 'whatsapp', v.whatsapp, {type: 'tel'})}${I('Email', 'email', v.email, {type: 'email'})}</div></div>
        ${IH ? '' : `<div class="fs"><h2>🤝 Agent code &amp; incentive</h2>
          <p class="hint">Customers who open this partner's link (or type the code) are credited to them for 30 days. They earn the incentive % of the booking value when an enquiry is confirmed.</p>
          <div class="g2">${I('Agent code (letters/numbers, leave empty to auto-create)', 'agentCode', v.agentCode, {ph: 'e.g. RAJ123'})}${I(`Incentive % (empty = default ${pctOf(null)}%)`, 'incentivePct', v.incentivePct, {num: true, ph: String(pctOf(null))})}</div>
          ${orig ? `<div class="share-link"><input readonly value="${esc(agentLink(orig))}" aria-label="Agent link"><button class="btn btn-ghost btn-sm" type="button" id="cp-link">Copy link</button>${loginPhone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waLink(loginPhone, `Namaste ${orig.ownerName || orig.business}! 🙏\nYour Nirvana Inside agent link: ${agentLink(orig)}\nAgent code: ${orig.agentCode}\n\nShare it with your guests and customers. Every booking they make earns you ${pctOf(orig)}% of the booking value.`))}">${NI.WA_SVG}Send</a>` : ''}</div>` : ''}</div>`}
        ${orig && !IH ? `<div class="fs"><h2>🔐 Partner login</h2>
          <p class="hint">Partners log in at <b>${esc(location.origin)}/partner</b> with their phone number (${loginPhone ? esc(loginPhone) : 'add a WhatsApp, owner or manager phone first'}) and a PIN. They see their link, their earnings, the customers they referred (first name and status only) and their listings, and can propose listing changes for your approval.</p>
          <div class="row"><span class="pill ${orig.hasPin ? 'st-completed' : 'st-draft'}">${orig.hasPin ? 'Login on' : 'Login off'}</span>
            <button class="btn btn-sun btn-sm" type="button" id="pin-new" ${loginPhone ? '' : 'disabled'}>${orig.hasPin ? 'Reset PIN' : 'Create login PIN'}</button>
            ${orig.hasPin ? '<button class="btn btn-ghost btn-sm danger" type="button" id="pin-off">Turn login off</button>' : ''}</div>
          <div id="pin-out"></div></div>` : ''}
        <div class="fs"><h2>Commercials <span class="mono muted">private</span></h2>
          <div class="g3">${I('Net rates', 'rates', v.rates, {ph: '₹1,200/night net'})}${I('Commission / margin we keep', 'commission', v.commission, {ph: '15%'})}${I('Payment terms', 'payment', v.payment, {ph: 'Pay at check-in'})}</div>
          <div class="g2">${S('Our rating', 'rating', v.rating, [[5, '★★★★★ Excellent'], [4, '★★★★ Good'], [3, '★★★ OK'], [2, '★★ Poor'], [1, '★ Avoid']])}<span></span></div>
          ${I('Notes', 'notes', v.notes, {textarea: true, rows: 3, ph: 'Best time to call, reliability, special terms…'})}</div>
        ${orig ? `<div class="fs"><h2>Listings <a class="btn btn-ghost btn-sm" href="#/listings/new?type=${{taxi: 'transport', bus: 'transport', tour: 'package', agent: 'stay', other: 'stay', inhouse: 'package'}[orig.kind] || orig.kind}&partner=${orig.id}">+ Add listing</a></h2>${linked.length ? linked.map((l) => `<p><a href="#/listings/${l.id}">${esc(l.title)}</a> <span class="pill st-${l.status}">${esc(String(l.status).replace('_', ' '))}</span>${l.pendingEdit ? ' <span class="pill st-new">✎ Edit to review</span>' : ''}</p>`).join('') : '<p class="hint">No listings yet. Agent-only partners don\'t need any.</p>'}
          <p class="hint">Enquiries for their listings: ${served.length}</p></div>
        ${IH ? '' : `<div class="fs"><h2>Referred customers <a class="btn btn-ghost btn-sm" href="#/enquiries?agent=${orig.id}">Open in Enquiries →</a></h2>
          ${st.refs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ref</th><th>Request</th><th>Status</th><th>Booking</th><th>Incentive</th></tr></thead><tbody>${st.refs.map((e) => `<tr data-href="#/enquiries/${e.id}"><td><b>${esc(e.ref)}</b><div class="sub">${ago(e.createdAt)}</div></td><td class="sub">${esc(e.title)}</td><td><span class="pill st-${e.status}">${esc(ST[e.status] || e.status)}</span></td><td>${e.bookingValue != null ? inr(e.bookingValue) : '—'}</td><td>${e.incentiveAmount != null ? inr(e.incentiveAmount) + (EARNING.includes(e.status) ? '' : ' <span class="sub">(not yet)</span>') : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No referred customers yet.</p>'}</div>
        <div class="fs"><h2>💸 Incentive payouts</h2>
          ${v.payouts.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody>${v.payouts.map((x, i) => `<tr><td>${esc(String(x.at).slice(0, 10))}</td><td><b>${inr(x.amount)}</b></td><td class="sub">${esc(x.note || '')}</td><td><button class="icon-btn" type="button" data-delpay="${i}" aria-label="Remove payout">✕</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No payouts recorded yet.</p>'}
          <div class="g3"><label class="in">Amount paid (₹)<input id="pay-amt" type="number" min="1" step="1" placeholder="${st.balance > 0 ? st.balance : ''}"></label><label class="in">Date<input id="pay-date" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label class="in">Note<input id="pay-note" placeholder="UPI ref, cash, period…"></label></div>
          <button class="btn btn-ghost btn-sm" type="button" id="pay-add" style="justify-self:start">+ Record payout</button></div>`}` : ''}
        <div class="savebar">${orig && !IH ? '<button class="btn btn-ghost danger" type="button" id="vdel">Delete</button>' : ''}<a class="btn btn-ghost" href="#/vendors">Cancel</a><button class="btn btn-sun" type="submit">💾 Save partner</button></div>
      </form>`);
    bindRows();
    const f = $('#vf');
    bind(f, v);
    f.querySelector('[data-bind=rating]').addEventListener('change', (e) => { v.rating = Number(e.target.value); });
    const save = async (msg = 'Partner saved ✓') => {
      v.rating = Number(v.rating);
      const saved = await api('PUT', `/api/admin/vendors/${orig ? orig.id : 'new'}`, v);
      const i = db.vendors.findIndex((x) => x.id === saved.id); if (i >= 0) db.vendors[i] = saved; else db.vendors.push(saved);
      toast(msg); go(`#/vendors/${saved.id}`);
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!v.business.trim()) { toast('Add the partner name'); return; }
      try { await save(); } catch (err) { toast(err.message); }
    };
    if (!orig || IH) return;
    $('#cp-link').onclick = () => copy(agentLink(orig), 'Agent link copied');
    $('#pay-add').onclick = async () => {
      const amount = Number($('#pay-amt').value); if (!(amount > 0)) { toast('Enter the amount paid'); return; }
      v.payouts.push({at: $('#pay-date').value || new Date().toISOString().slice(0, 10), amount, note: $('#pay-note').value.trim()});
      try { await save('Payout recorded ✓'); } catch (err) { v.payouts.pop(); toast(err.message); }
    };
    f.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-delpay]'); if (!b) return;
      if (!confirm('Remove this payout record?')) return;
      v.payouts.splice(+b.dataset.delpay, 1);
      try { await save('Payout removed'); } catch (err) { toast(err.message); }
    });
    $('#pin-new').onclick = async () => {
      if (orig.hasPin && !confirm('Create a new PIN? The old PIN stops working and the partner is signed out.')) return;
      const {partner, pin} = await api('POST', `/api/admin/vendors/${orig.id}/pin`);
      Object.assign(orig, partner);
      const msg = `Namaste ${orig.ownerName || orig.business}! 🙏\nYour Nirvana Inside partner login:\n${location.origin}/partner\nPhone: ${loginPhone}\nPIN: ${pin}\n\nYour agent link: ${agentLink(orig)}\nPlease change the PIN after your first login.`;
      $('#pin-out').innerHTML = `<div class="who" style="display:grid;gap:8px;margin-top:10px"><div><p class="mono muted">New PIN, shown only once</p><b style="font-size:1.8rem;letter-spacing:.2em;font-family:var(--mono)">${pin}</b></div>
        <div class="row"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waLink(loginPhone, msg))}">${NI.WA_SVG}Send login on WhatsApp</a><button class="btn btn-ghost btn-sm" type="button" id="pin-copy">Copy</button></div></div>`;
      $('#pin-copy').onclick = () => copy(msg, 'Login details copied');
      toast('PIN created');
    };
    if ($('#pin-off')) $('#pin-off').onclick = async () => {
      if (!confirm('Turn off partner login? They are signed out immediately.')) return;
      const {partner} = await api('DELETE', `/api/admin/vendors/${orig.id}/pin`);
      Object.assign(orig, partner); toast('Login turned off'); render();
    };
    $('#vdel').onclick = async () => { if (!confirm(`Delete partner "${orig.business}"? Their listings move to Nirvana Inside (in-house), and their agent code stops working.`)) return; await api('DELETE', `/api/admin/vendors/${orig.id}`); await load(); toast('Deleted'); go('#/vendors'); };
  }

  // ───────── Settings ─────────
  function viewSettings() {
    const s = structuredClone(db.settings);
    shell('set', `<div class="top"><h1>Settings</h1></div>
      <form class="form" id="sf">
        <div class="fs"><h2>Contact &amp; brand</h2>
          <div class="g2">${I('Brand name', 'brand', s.brand)}${I('WhatsApp number for ALL enquiries (country code, digits only)', 'whatsapp', s.whatsapp, {ph: '917220080005'})}</div>
          <div class="g2">${I('Display phone', 'phone', s.phone)}${I('Email', 'email', s.email)}</div>
          ${I('Corporate office address', 'office', s.office)}
          ${I('Default agent incentive % (used when a partner has no own %)', 'defaultIncentivePct', s.defaultIncentivePct ?? '5', {ph: '5'})}
          <div class="g2">${I('Office Google Maps link', 'officeMap', s.officeMap)}${I('Instagram URL', 'instagram', s.instagram)}</div>
          ${I('Tagline', 'tagline', s.tagline, {textarea: true, rows: 2})}
          ${I('Domain', 'domain', s.domain)}</div>
        <div class="savebar"><button class="btn btn-sun" type="submit">💾 Save settings</button></div>
      </form>`);
    bind($('#sf'), s);
    $('#sf').onsubmit = async (e) => {
      e.preventDefault();
      if (!/^\d{10,15}$/.test(s.whatsapp || '')) { toast('WhatsApp number must be digits only, with country code (e.g. 917220080005)'); return; }
      if (s.defaultIncentivePct !== undefined && s.defaultIncentivePct !== '' && !(Number(s.defaultIncentivePct) >= 0 && Number(s.defaultIncentivePct) <= 100)) { toast('Default incentive % must be between 0 and 100'); return; }
      db.settings = await api('PUT', '/api/admin/settings', {...s, defaultIncentivePct: String(s.defaultIncentivePct ?? '5')}); db.defaultIncentivePct = Number(db.settings.defaultIncentivePct || 5); toast('Settings saved ✓');
    };
  }

  // ───────── Router ─────────
  async function render() {
    if (!db) return;
    window.onbeforeunload = null;
    $$('.drawer, .drawer-bg').forEach((x) => x.remove());
    const {parts, q} = route();
    const [sec, id] = parts;
    if (!sec) return viewDash();
    if (sec === 'enquiries') return viewEnquiries(q, id);
    if (sec === 'listings') return id ? viewListingEdit(id, q) : viewListings(q);
    if (sec === 'vendors') return id ? viewVendorEdit(id) : viewVendors(q);
    if (sec === 'settings') return viewSettings();
    viewDash();
  }
  addEventListener('hashchange', render);

  // Refresh enquiries every 60s so new leads show up without reloading.
  setInterval(async () => {
    if (!db || document.hidden || $('.drawer') || route().parts[0] === 'listings' || route().parts[0] === 'vendors' || route().parts[0] === 'settings') return;
    const before = db.enquiries.length;
    try { await load(); if (db.enquiries.length > before) { toast(`🔔 ${db.enquiries.length - before} new enquiry`); render(); } } catch {}
  }, 60000);

  (async () => {
    try { await api('GET', '/api/admin/me'); await load(); render(); }
    catch { if (!$('#login')) showLogin(); }
  })();
})();
