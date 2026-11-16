(async () => {
  const {$, esc, TYPES, cardHTML} = NI;
  NI.header('home');
  NI.placesDatalist();
  const cat = await NI.catalog();

  // ---- Console tabs ----
  const TABS = [['stay', '🏨', 'Stays'], ['taxi', '🚕', 'Taxi'], ['experience', '🪂', 'Experiences'], ['rental', '🏍️', 'Rentals'], ['package', '🗺️', 'Packages']];
  const tabs = $('#tabs'); const panel = $('#console-panel');
  tabs.innerHTML = TABS.map(([k, e, l]) => `<button class="tab" role="tab" type="button" data-k="${k}" aria-selected="false"><span class="emo">${e}</span>${l}</button>`).join('');
  function select(k) {
    tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.k === k));
    NI.forms.mount(panel, k, {catalog: cat});
  }
  tabs.addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) select(t.dataset.k); });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const all = [...tabs.querySelectorAll('.tab')]; const i = all.indexOf(document.activeElement);
    const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length]; n.focus(); n.click();
  });
  const startTab = new URLSearchParams(location.search).get('tab');
  select(TABS.some(([k]) => k === startTab) ? startTab : 'stay');

  // ---- Rails from catalog ----
  const by = (t) => cat.listings.filter((l) => l.type === t);
  const SECTIONS = [
    ['stay', 'Stays', 'Places to <span class="hl">crash.</span>', 'Hotels, homestays and soon long-term rentals. We add new properties every week.'],
    ['transport', 'Transport', 'Every ride, <span class="hl-cool">hatchback to Volvo.</span>', 'Private cabs for any route, plus Volvo and HRTC bus seats. One-way, round trip, airport or hourly.'],
    ['experience', 'Experiences', 'Do something <span class="hl">wild.</span>', 'Paragliding, rafting, bungee, camping, skiing and treks, all with certified operators.'],
    ['rental', 'Rentals', 'Rent <span class="hl-cool">anything</span>, anywhere.', 'Royal Enfields, scooties, self-drive cars, snow gear… if it\'s rentable, we\'ll find it.'],
    ['package', 'Tour packages', 'A–Z trips, <span class="hl">handled.</span>', 'Stays, cab, sightseeing and activities planned end to end, then tailored on WhatsApp.'],
  ];
  $('#rails').innerHTML = SECTIONS.map(([t, eyebrow, h, p]) => {
    const items = by(t); if (!items.length) return '';
    return `<section class="section" style="padding-top:0" aria-label="${esc(eyebrow)}"><div class="wrap">
      <div class="head reveal"><div><p class="eyebrow mono">${TYPES[t].emo} ${esc(eyebrow)}</p><h2>${h}</h2></div><div><p>${esc(p)}</p><a class="btn btn-ghost btn-sm" style="margin-top:12px" href="/${TYPES[t].href}">View all ${items.length} →</a></div></div>
      <div class="rail">${items.slice(0, 8).map(cardHTML).join('')}</div></div></section>`;
  }).join('');

  // ---- Map ----
  const legend = $('#legend');
  const types = Object.keys(TYPES).filter((t) => by(t).some((l) => l.location?.lat != null));
  legend.innerHTML = types.map((t) => `<button type="button" data-t="${t}" aria-pressed="true"><i style="background:${TYPES[t].color}"></i>${TYPES[t].emo} ${TYPES[t].label}</button>`).join('');
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    try {
      const {map, groups} = await NI.listingsMap($('#map'), cat.listings);
      legend.addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
        const g = groups[b.dataset.t]; if (g) on ? g.addTo(map) : g.remove();
      });
    } catch { $('#map').innerHTML = '<p class="empty">Map could not load. Please check your connection.</p>'; }
  }, {rootMargin: '200px'});
  io.observe($('#map'));

  // ---- Partner ----
  $('#partner-btn').addEventListener('click', () => NI.enquire({type: 'general', title: 'I want to list with Nirvana Inside', fields: [['Partner type', 'Hotel / homestay / taxi / rental / activity'], ['Location', 'Himachal Pradesh']]}));

  await NI.footer();
  NI.reveal();
})();
