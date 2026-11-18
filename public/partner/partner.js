/* Nirvana Inside — partner portal: agent link, earnings, my listings (edit → admin approval), referred customers. */
(() => {
  const {$, $$, esc, inr, TYPES} = NI;
  const app = $('#app');
  const STATUS = {new: 'New', contacted: 'In talks', checking_vendor: 'In talks', quoted: 'Quoted', confirmed: 'Confirmed', completed: 'Completed', lost: 'Not booked'};
  const LSTATUS = {published: 'Live', coming_soon: 'Coming soon', draft: 'Hidden'};
  const UNITS = ['night', 'person', 'couple', 'day', 'hour', 'km', 'trip', 'seat', 'month'];
  let D = null;

  async function api(method, url, body) {
    const r = await fetch(url, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin'});
    const data = (r.headers.get('content-type') || '').includes('json') ? await r.json() : {};
    if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), {status: r.status});
    return data;
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2400); }
  async function copy(text, label) { try { await navigator.clipboard.writeText(text); toast(`${label} ✓`); } catch { prompt('Copy this:', text); } }
  const date = (iso) => new Date(iso).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});

  function showLogin(msg = '') {
    app.innerHTML = `<div class="login"><form class="glass" id="login" novalidate>
      <a class="brand login-logo" href="/"><img src="/img/logo.png" alt="Nirvana Inside" width="120" height="103"></a><p class="mono muted" style="text-align:center">Partner login</p>
      <h1>Sign in</h1>
      <label class="in">Phone number<input type="tel" name="phone" inputmode="tel" autocomplete="tel" required placeholder="98xxxxxxxx" autofocus></label>
      <label class="in">PIN<input type="password" name="pin" inputmode="numeric" autocomplete="current-password" maxlength="8" required placeholder="6-digit PIN"></label>
      <p class="form-err" role="alert">${esc(msg)}</p>
      <button class="btn btn-sun btn-block" type="submit">Sign in →</button>
      <p class="hint muted" style="text-align:center;font-size:.84rem">No PIN yet? Ask the Nirvana Inside team on WhatsApp.</p></form></div>`;
    $('#login').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', e.target); btn.disabled = true;
      try { await api('POST', '/api/partner/login', {phone: e.target.phone.value, pin: e.target.pin.value}); await load(); }
      catch (err) { $('.form-err').textContent = err.message; btn.disabled = false; }
    };
  }

  async function load() {
    try { D = await api('GET', '/api/partner/me'); }
    catch (err) { if (err.status === 401) return showLogin(); app.innerHTML = `<p class="empty" style="margin:40px">${esc(err.message)}</p>`; return; }
    render();
  }

  function listingRow(l) {
    const badge = l.pendingEdit ? '<span class="pill st-quoted">Changes waiting for approval</span>'
      : l.editReview?.status === 'rejected' ? '<span class="pill st-lost">Changes not approved</span>'
      : `<span class="pill st-${esc(l.status)}">${esc(LSTATUS[l.status] || l.status)}</span>`;
    return `<div class="p-item">
      ${l.images[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy">` : '<div class="ph0"></div>'}
      <div class="p-item-body"><b>${esc(l.title)}</b><span class="sub muted">${esc(TYPES[l.type]?.one || l.type)}${l.area ? ' · ' + esc(l.area) : ''}</span>${badge}
        ${l.editReview?.status === 'rejected' && l.editReview.reason && !l.pendingEdit ? `<span class="sub">“${esc(l.editReview.reason)}”</span>` : ''}</div>
      <div class="p-item-acts">
        <button class="btn btn-ghost btn-sm" type="button" data-edit="${esc(l.id)}">✎ Edit</button>
        ${l.status === 'draft' ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-pshare="${esc(l.id)}" aria-label="Share ${esc(l.title)}">${NI.SHARE_SVG}</button>`}
      </div></div>`;
  }

  function render() {
    const {partner: p, listings, referrals, earnings: e, site} = D;
    const link = `${location.origin}/a/${p.agentCode}`;
    const pitch = `Plan your Himachal trip with ${site.brand}: stays, taxis, adventures, rentals & tour packages on one WhatsApp, best price guaranteed.`;
    app.innerHTML = `<header class="p-top"><a class="brand" href="/" aria-label="Nirvana Inside website"><img class="brand-logo" src="/img/logo-horizontal.png" alt="Nirvana Inside" width="146" height="36"></a>
        <button class="btn btn-ghost btn-sm" type="button" id="logout">Sign out</button></header>
      <main class="p-wrap">
        <h1 class="p-hello">Namaste, ${esc(p.name || p.business)} 🙏</h1>

        <section class="p-card p-agent" aria-label="Your agent link">
          <div class="p-agent-top"><span class="mono">Your code</span><b class="code">${esc(p.agentCode)}</b></div>
          <p>Earn <b>${p.incentivePct}%</b> on every confirmed booking from your link.</p>
          <div class="share-link"><input readonly value="${esc(link)}" aria-label="Your agent link"><button class="btn btn-sun btn-sm" type="button" id="cp">Copy</button></div>
          <div class="row"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${pitch}\n${link}`)}">${NI.WA_SVG}Share on WhatsApp</a><button class="btn btn-ghost btn-sm" type="button" id="sh">${NI.SHARE_SVG}More</button></div>
        </section>

        <section class="p-card" aria-label="Earnings">
          <div class="p-money">
            <div><span>Earned</span><b>${inr(e.earned)}</b></div>
            <div><span>Paid</span><b>${inr(e.paid)}</b></div>
            <div class="due"><span>Due</span><b>${inr(e.due)}</b></div>
          </div>
          ${site.whatsapp ? `<a class="p-link" target="_blank" rel="noopener" href="https://wa.me/${esc(site.whatsapp)}?text=${encodeURIComponent(`Namaste! Partner ${p.business} (${p.agentCode}) here, about my payout.`)}">Ask about a payout →</a>` : ''}
        </section>

        ${listings.length ? `<section class="p-card"><h2>My listings <span class="mono muted">${listings.length}</span></h2>
          <div class="p-list">${listings.map(listingRow).join('')}</div>
          <p class="hint muted">Edits go live after the Nirvana Inside team approves them.</p></section>` : ''}

        <section class="p-card"><h2>Customers you referred <span class="mono muted">${referrals.length}</span></h2>
          ${referrals.length ? `<div class="p-refs">${referrals.map((r) => `<div class="p-ref"><div><b>${esc(r.customer || 'Customer')}</b><span class="sub muted">${esc(r.title)} · ${date(r.createdAt)}</span></div>
            <div class="p-ref-r"><span class="pill st-${esc(r.status)}">${esc(STATUS[r.status] || r.status)}</span>${r.incentiveAmount != null ? `<b>${inr(r.incentiveAmount)}</b>` : ''}</div></div>`).join('')}</div>`
          : '<p class="muted">No referrals yet. Share your link to get started.</p>'}
        </section>

        <details class="p-pin"><summary>Change PIN</summary>
          <form id="pinf" class="g3" novalidate>
            <label class="in">Current PIN<input name="current" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" required></label>
            <label class="in">New PIN (4–8 digits)<input name="next" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" required></label>
            <label class="in" style="align-self:end"><button class="btn btn-forest btn-sm" type="submit">Update PIN</button></label>
          </form><p class="form-err" id="pin-err" role="alert"></p></details>
      </main>`;

    $('#logout').onclick = async () => { await api('POST', '/api/partner/logout'); showLogin('Signed out.'); };
    $('#cp').onclick = () => copy(link, 'Link copied');
    $('#sh').onclick = () => NI.share({title: site.brand, text: pitch, url: link});
    $$('[data-pshare]', app).forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); const l = listings.find((x) => x.id === b.dataset.pshare); NI.share({title: l.title, text: l.tagline || l.area, url: NI.withRef(`/item.html?id=${encodeURIComponent(l.id)}`, p.agentCode)}); });
    $$('[data-edit]', app).forEach((b) => b.onclick = () => editListing(listings.find((x) => x.id === b.dataset.edit)));
    $('#pinf').onsubmit = async (ev) => {
      ev.preventDefault(); $('#pin-err').textContent = '';
      try { await api('PUT', '/api/partner/pin', {current: ev.target.current.value, next: ev.target.next.value}); ev.target.reset(); toast('PIN updated ✓'); }
      catch (err) { $('#pin-err').textContent = err.message; }
    };
  }

  // ---------- Edit a listing (sent to admin for approval) ----------
  function editListing(l) {
    const base = {title: l.title, tagline: l.tagline, description: l.description, price: {...l.price}, images: [...l.images], highlights: [...l.highlights]};
    const d = structuredClone({...base, ...(l.pendingEdit?.changes || {})});
    d.price ||= {};
    const dlg = document.createElement('dialog'); dlg.className = 'modal p-edit';
    const photos = () => d.images.map((src, i) => `<div class="ph"><img src="${esc(src)}" alt="">${i === 0 ? '<span class="sticker cover">Cover</span>' : ''}<div class="acts"><button type="button" data-img="up" data-i="${i}" aria-label="Move left">←</button><button type="button" data-img="down" data-i="${i}" aria-label="Move right">→</button><button type="button" data-img="del" data-i="${i}" aria-label="Remove photo">✕</button></div></div>`).join('')
      + '<label class="drop">⬆ Add photos<input type="file" id="pe-up" accept="image/jpeg,image/png,image/webp" multiple hidden></label>';
    dlg.innerHTML = `<form method="dialog" class="p-edit-form" novalidate>
      <div class="p-edit-head"><div><p class="mono muted">Edit listing</p><h2>${esc(l.title)}</h2></div><button class="x" type="button" data-x aria-label="Close">✕</button></div>
      ${l.pendingEdit ? '<p class="p-note">You already sent changes for this listing. Sending again replaces them.</p>' : ''}
      <label class="in">Title<input name="title" maxlength="140" value="${esc(d.title)}" required></label>
      <label class="in">One-line tagline<input name="tagline" maxlength="160" value="${esc(d.tagline)}"></label>
      <label class="in">Description<textarea name="description" rows="5" maxlength="4000">${esc(d.description)}</textarea></label>
      <div class="g3"><label class="in">Price (₹)<input name="amount" type="number" min="0" step="1" value="${esc(d.price.amount ?? '')}" placeholder="On request"></label>
        <label class="in">Per<select name="unit">${UNITS.map((u) => `<option${u === d.price.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="in">Price note<input name="pnote" maxlength="120" value="${esc(d.price.note || '')}" placeholder="incl. breakfast"></label></div>
      <div class="in">Photos <span class="muted">(first = cover; photos are compressed automatically)</span><div class="photos" id="pe-photos">${photos()}</div><p class="hint" id="pe-st" role="status"></p></div>
      <label class="in">Highlights (one per line)<textarea name="highlights" rows="4">${esc(d.highlights.join('\n'))}</textarea></label>
      <label class="in">Note for the Nirvana Inside team (optional)<input name="note" maxlength="300" placeholder="e.g. new rates from December"></label>
      <p class="form-err" role="alert"></p>
      <div class="p-edit-acts">${l.pendingEdit ? '<button class="btn btn-ghost btn-sm danger" type="button" data-withdraw>Withdraw changes</button>' : '<span></span>'}<button class="btn btn-sun" type="submit">Send for approval</button></div>
    </form>`;
    document.body.append(dlg); dlg.showModal();
    const close = () => { dlg.close(); dlg.remove(); };
    $('[data-x]', dlg).onclick = close;
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
    const f = $('form', dlg), err = $('.form-err', dlg);
    const paintPhotos = () => { $('#pe-photos', dlg).innerHTML = photos(); bindUpload(); };
    $('#pe-photos', dlg).addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-img]'); if (!b) return;
      const i = +b.dataset.i, a = d.images;
      if (b.dataset.img === 'del') a.splice(i, 1);
      if (b.dataset.img === 'up' && i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]];
      if (b.dataset.img === 'down' && i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]];
      paintPhotos();
    });
    function bindUpload() {
      $('#pe-up', dlg).onchange = async (ev) => {
        const files = [...ev.target.files]; const st = $('#pe-st', dlg);
        for (const [n, file] of files.entries()) {
          if (d.images.length >= 20) { st.textContent = 'Maximum 20 photos.'; break; }
          st.textContent = `Uploading ${n + 1} of ${files.length}…`;
          try { const out = await NI.optimiseImage(file); const {url} = await api('POST', '/api/partner/upload', {dataUrl: await NI.blobToDataUrl(out.blob)}); d.images.push(url); }
          catch (e2) { st.textContent = `${file.name}: ${e2.message || 'could not read this image'} (iPhone HEIC: share as JPG).`; await new Promise((r) => setTimeout(r, 2500)); }
        }
        paintPhotos(); if (!/Maximum|could not/.test(st.textContent)) st.textContent = '';
      };
    }
    bindUpload();
    if ($('[data-withdraw]', dlg)) $('[data-withdraw]', dlg).onclick = async () => {
      if (!confirm('Withdraw the changes you sent?')) return;
      try { D = await api('DELETE', `/api/partner/listings/${encodeURIComponent(l.id)}/edit`); close(); render(); toast('Changes withdrawn'); } catch (e2) { err.textContent = e2.message; }
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault(); err.textContent = '';
      if (!f.title.value.trim()) { err.textContent = 'Add a title.'; f.title.focus(); return; }
      const body = {
        title: f.title.value.trim(), tagline: f.tagline.value.trim(), description: f.description.value.trim(),
        price: {amount: f.amount.value === '' ? null : Number(f.amount.value), unit: f.unit.value, note: f.pnote.value.trim()},
        images: d.images, highlights: f.highlights.value.split('\n').map((s) => s.trim()).filter(Boolean), note: f.note.value.trim(),
      };
      const btn = $('button[type=submit]', dlg); btn.disabled = true;
      try { D = await api('PUT', `/api/partner/listings/${encodeURIComponent(l.id)}/edit`, body); close(); render(); toast('Sent for approval ✓'); }
      catch (e2) { err.textContent = e2.message; btn.disabled = false; }
    };
  }

  load();
})();
