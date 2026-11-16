(async () => {
  const {$, esc, TYPES, cardHTML} = NI;
  const params = new URLSearchParams(location.search);
  const type = TYPES[params.get('type')] ? params.get('type') : 'stay';
  const t = TYPES[type];
  NI.header(type);
  NI.placesDatalist();
  const cat = await NI.catalog();

  const COPY = {
    stay: ['Stays across Himachal', 'Hotels, homestays and long-term rentals. Pick one or tell us where you want to be, and we\'ll find the best stay at the best price.'],
    transport: ['Taxis, cabs & buses', 'From hatchbacks to 45-seater Volvo coaches, one-way, round trip, airport or hourly. Tell us the route and get the best fare on WhatsApp.'],
    experience: ['Adventures & experiences', 'Paragliding, rafting, bungee, camping, skiing and treks, all run by certified operators.'],
    rental: ['Rent anything, anywhere', 'Bikes, scooties, self-drive cars, snow gear and camping kit, delivered where possible.'],
    package: ['Tour packages, A–Z', 'Complete trips with stays, cab, sightseeing and activities, tailored to you on WhatsApp.'],
  };
  document.title = `${COPY[type][0]} — Nirvana Inside`;
  $('#ex-eyebrow').textContent = `${t.emo} ${t.label}`;
  $('#ex-title').innerHTML = esc(COPY[type][0]).replace(/(\S+)$/, '<span class="hl">$1</span>');
  $('#ex-sub').textContent = COPY[type][1];
  NI.forms.mount($('#ex-form'), type === 'transport' ? 'taxi' : type, {catalog: cat});

  const all = cat.listings.filter((l) => l.type === type);
  const SUB_LABEL = {hotel: 'Hotels', homestay: 'Homestays', longterm: 'Long-term', private: 'Private cabs', public: 'Public / bus', paragliding: 'Paragliding', rafting: 'Rafting', bungee: 'Bungee', camping: 'Camping', skiing: 'Skiing', trekking: 'Trekking', bike: 'Bikes', scooty: 'Scooty', car: 'Cars', other: 'Other', leisure: 'Leisure', adventure: 'Adventure', backpacking: 'Backpacking', honeymoon: 'Honeymoon'};
  const subs = [...new Set(all.map((l) => l.subtype).filter(Boolean))];
  if (type === 'stay') ['hotel', 'homestay', 'longterm'].forEach((s) => subs.includes(s) || subs.push(s));
  let sub = params.get('sub') || 'all'; let q = '';
  $('#ex-chips').innerHTML = [['all', 'All'], ...subs.map((s) => [s, SUB_LABEL[s] || s])].map(([k, l]) => `<button class="chip-btn" type="button" data-s="${k}" aria-pressed="${k === sub}">${esc(l)}</button>`).join('');

  function render() {
    const list = all.filter((l) => (sub === 'all' || l.subtype === sub) && (!q || `${l.title} ${l.tagline} ${l.location?.area} ${l.location?.district}`.toLowerCase().includes(q)));
    $('#ex-count').textContent = `${list.length} ${list.length === 1 ? 'listing' : 'listings'}`;
    $('#ex-grid').innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><p><b>${sub === 'homestay' ? 'Homestays are being added soon.' : 'Nothing listed here yet.'}</b></p><p style="margin:8px 0 16px">We probably still have it. Ask us and we'll find it for you.</p><button class="btn btn-wa" type="button" data-enquire="general">${NI.WA_SVG}Ask on WhatsApp</button></div>`;
  }
  $('#ex-chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip-btn'); if (!b) return;
    sub = b.dataset.s; $('#ex-chips').querySelectorAll('.chip-btn').forEach((c) => c.setAttribute('aria-pressed', c === b)); render(); drawMap();
  });
  $('#ex-q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); drawMap(); });
  render();

  // Map: listings with coordinates; transport/rentals without pins show pickup hubs instead.
  const mapEl = $('#ex-map');
  let map, L, layer;
  async function drawMap() {
    try {
      if (!map) ({map, L} = await NI.makeMap(mapEl));
      layer?.remove(); layer = L.layerGroup().addTo(map);
      const list = all.filter((l) => (sub === 'all' || l.subtype === sub) && (!q || `${l.title} ${l.tagline} ${l.location?.area}`.toLowerCase().includes(q)));
      const pts = [];
      for (const l of list) {
        if (l.location?.lat == null) continue;
        L.marker([l.location.lat, l.location.lng], {icon: NI.pinIcon(L, t.color, t.emo)}).bindPopup(`<b>${esc(l.title)}</b><br>${esc(l.location.area || '')}<br><a href="/item.html?id=${encodeURIComponent(l.id)}">View & enquire →</a>`).addTo(layer);
        pts.push([l.location.lat, l.location.lng]);
      }
      if (!pts.length && (type === 'transport' || type === 'rental')) {
        for (const name of ['Kullu', 'Manali', 'Shimla', 'Dharamshala', 'Chandigarh', 'Bhuntar Airport (Kullu)', 'Kangra Airport (Gaggal)', 'Kaza (Spiti)', 'Dalhousie']) {
          const c = NI.placeCoords(name); if (!c) continue;
          L.marker(c, {icon: NI.pinIcon(L, t.color, t.emo)}).bindPopup(`<b>${esc(name)}</b><br>Pickups available`).addTo(layer); pts.push(c);
        }
      }
      if (pts.length > 1) map.fitBounds(pts, {padding: [40, 40], maxZoom: 10}); else if (pts.length) map.setView(pts[0], 11);
    } catch { mapEl.innerHTML = '<p class="empty">Map could not load.</p>'; }
  }
  drawMap();

  await NI.footer();
})();
