(async () => {
  const {$, $$, esc, TYPES, priceHTML, inr} = NI;
  const idParam = new URLSearchParams(location.search).get('id');
  const cat = await NI.catalog();
  const l = cat.listings.find((x) => x.id === idParam);
  NI.header(l?.type);
  NI.placesDatalist();
  const root = $('#item');

  if (!l) {
    root.innerHTML = `<div class="empty" style="margin-top:140px"><h2>We couldn't find that listing.</h2><p style="margin:10px 0 18px">It may have been moved or sold out. Ask us and we'll find something similar.</p><a class="btn btn-sun" href="/">Back to home</a></div>`;
    await NI.footer(); return;
  }
  const t = TYPES[l.type] || TYPES.stay;
  document.title = `${l.title} — ${t.label} · Nirvana Inside`;
  document.querySelector('meta[name=description]').content = `${l.title}: ${l.tagline || ''}. ${l.location?.area || 'Himachal'}. Enquire on WhatsApp for the best price.`;
  const soon = l.status === 'coming_soon';
  const imgs = l.images || [];

  const gallery = imgs.length
    ? `<div class="gallery ${imgs.length === 1 ? 'one' : 'n' + Math.min(imgs.length, 5)}">${imgs.slice(0, 5).map((src, i) => `<button type="button" data-i="${i}" aria-label="Open photo ${i + 1} of ${imgs.length}"><img src="${esc(src)}" alt="${esc(l.title)} photo ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>${i === Math.min(4, imgs.length - 1) && imgs.length > 1 ? `<span class="sticker dark more">📷 View all ${imgs.length}</span>` : ''}</button>`).join('')}</div>`
    : `<div class="vart" style="margin-top:100px;border-radius:var(--r-lg);aspect-ratio:21/8">${NI.vehicleSvg(l)}</div>`;

  const rooms = (l.rooms || []).length ? `<div class="block"><h2>Room types</h2><div class="rooms">${l.rooms.map((r, i) => `
    <article class="room">
      ${(r.images?.[0] || imgs[0]) ? `<img src="${esc(r.images?.[0] || imgs[0])}" alt="${esc(r.name)}" loading="lazy">` : '<div></div>'}
      <div><h3>${esc(r.name)}</h3>
        <div class="meta">${r.guests ? `<span>👥 Up to ${r.guests} guests</span>` : ''}${r.beds ? `<span>🛏️ ${esc(r.beds)}</span>` : ''}${r.size ? `<span>📐 ${esc(r.size)}</span>` : ''}${r.count ? `<span>🚪 ${r.count} rooms</span>` : ''}</div>
        ${r.description ? `<p class="muted" style="font-size:.92rem">${esc(r.description)}</p>` : ''}
        ${(r.amenities || []).length ? `<p class="amen-s" style="margin-top:6px">${r.amenities.map(esc).join(' · ')}</p>` : ''}</div>
      <div class="room-cta">${r.price ? `<span class="price"><b>${inr(r.price)}</b> <small>/ ${esc(r.unit || 'night')}</small></span>` : priceHTML(null)}<button class="btn btn-wa btn-sm" type="button" data-room="${i}">${NI.WA_SVG}Enquire</button></div>
    </article>`).join('')}</div></div>` : '';

  const itin = (l.itinerary || []).length ? `<div class="block"><h2>Day-by-day plan</h2><ol class="itin">${l.itinerary.map((d, i) => `<li><b>D${i + 1}</b>${esc(d)}</li>`).join('')}</ol><p class="muted" style="font-size:.88rem">Every package can be changed: add days, upgrade hotels or add activities on WhatsApp.</p></div>` : '';

  const specs = l.type === 'transport' ? [['Seats', l.seats], ['Luggage', l.luggage]].filter(([, v]) => v) : [];
  const details = [...specs, ...(l.details || [])].filter(([k, v]) => k && v);

  root.innerHTML = `${gallery}
  <div class="item-grid">
    <div>
      <div class="item-head">
        <div class="row">${soon ? '<span class="sticker berry">Coming soon</span>' : ''}<span class="sticker dark">${t.emo} ${esc(t.one)}</span>${l.featured ? '<span class="sticker">★ Top pick</span>' : ''}${l.duration ? `<span class="sticker ice">${esc(l.duration)}</span>` : ''}</div>
        <h1>${esc(l.title)}</h1>
        <p class="card-loc">📍 ${esc(l.location?.address || l.location?.area || 'Himachal Pradesh')}</p>
        ${l.tagline ? `<p class="muted" style="margin-top:8px;font-size:1.05rem">${esc(l.tagline)}</p>` : ''}
        <div class="row" style="margin-top:14px"><button class="btn btn-ghost btn-sm share-btn" type="button" data-share="${esc(l.id)}">${NI.SHARE_SVG}Share</button></div>
      </div>
      ${(l.highlights || []).length ? `<div class="block"><h2>Highlights</h2><ul class="hl-list">${l.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
      ${l.description ? `<div class="block"><h2>About</h2><p>${esc(l.description)}</p></div>` : ''}
      ${rooms}${itin}
      ${(l.amenities || []).length ? `<div class="block"><h2>Amenities</h2><ul class="amen">${l.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
      ${details.length ? `<div class="block"><h2>Important information</h2><table class="facts"><tbody>${details.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${l.location?.lat != null ? `<div class="block"><h2>Location</h2><div class="mini-map" id="mini-map"></div><p class="muted" style="margin-top:10px;font-size:.9rem">${esc(l.location.address || l.location.area)} · <a href="https://www.google.com/maps/dir/?api=1&destination=${l.location.lat},${l.location.lng}" target="_blank" rel="noopener">Get directions ↗</a></p></div>` : ''}
    </div>
    <aside class="book" id="book" aria-label="Enquire">
      ${priceHTML(l.price, true)}
      <p class="muted" style="font-size:.86rem;margin-top:6px">${soon ? 'Be the first to know when this opens.' : 'Send your details and we\'ll confirm availability and the best price on WhatsApp.'}</p>
      <div id="book-form"></div>
      <small>💸 Best price guaranteed · Nothing is charged here</small>
    </aside>
  </div>`;

  // Booking box form
  const kind = {stay: 'stay', transport: 'taxi', experience: 'experience', rental: 'rental', package: 'package'}[l.type] || 'stay';
  if (soon) {
    $('#book-form').innerHTML = `<button class="btn btn-wa btn-block" type="button" id="early" style="margin-top:14px">${NI.WA_SVG}Join early access</button>`;
    $('#early').onclick = () => NI.enquire({type: l.type === 'stay' ? 'stay' : 'general', title: `Early access: ${l.title}`, listingId: l.id, fields: [['Interested in', l.title]]});
  } else {
    const oneRoom = kind === 'stay' && (l.rooms || []).length === 1 ? l.rooms[0] : null;
    NI.forms.mount($('#book-form'), kind, {listing: l, catalog: cat, compact: true, extra: oneRoom ? () => [['Room type', oneRoom.name + (oneRoom.price ? ` (${inr(oneRoom.price)}/${oneRoom.unit || 'night'})` : '')]] : null});
  }

  // Room-level enquiry → focus booking form with room chosen
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-room]'); if (!b) return;
    const r = l.rooms[+b.dataset.room];
    const sel = $('#book-form select[name=room]'); if (sel) sel.value = r.name;
    $('#book').scrollIntoView({behavior: 'smooth', block: 'center'});
    $('#book-form input[type=date]')?.focus({preventScroll: true});
  });

  // Gallery lightbox
  $$('.gallery button').forEach((b) => b.addEventListener('click', () => NI.lightbox(imgs, +b.dataset.i)));

  // Mini map
  if (l.location?.lat != null) {
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      try { const {L, map} = await NI.makeMap($('#mini-map'), {center: [l.location.lat, l.location.lng], zoom: 12}); L.marker([l.location.lat, l.location.lng], {icon: NI.pinIcon(L, t.color, t.emo)}).addTo(map); } catch {}
    }, {rootMargin: '200px'});
    io.observe($('#mini-map'));
  }

  // JSON-LD for search engines
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify(l.type === 'stay' ? {'@context': 'https://schema.org', '@type': 'Hotel', name: l.title, description: l.description, image: imgs.map((s) => new URL(s, location.origin).href), address: {'@type': 'PostalAddress', streetAddress: l.location?.address || l.location?.area, addressRegion: 'Himachal Pradesh', addressCountry: 'IN'}, geo: l.location?.lat != null ? {'@type': 'GeoCoordinates', latitude: l.location.lat, longitude: l.location.lng} : undefined, priceRange: l.price?.amount ? `From ₹${l.price.amount}` : undefined, telephone: cat.settings.phone}
    : {'@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.description, image: imgs.map((s) => new URL(s, location.origin).href)});
  document.head.append(ld);

  await NI.footer();
})();
