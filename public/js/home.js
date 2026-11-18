(async () => {
  const {$, esc, TYPES, cardHTML} = NI;
  NI.header('home');

  // ---------- Snowfall inside the search form: soft flakes + a few six-armed crystals ----------
  (function snowfall() {
    const cv = $('#snowfall'); if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let W = 0, H = 0, dpr = 1, flakes = [], raf = 0, visible = true, last = 0;
    const rand = (a, b) => a + Math.random() * (b - a);
    const flake = (top) => {
      const r = Math.random() < 0.12 ? rand(3.2, 5.5) : rand(0.8, 2.6); // ~12% are crystals
      return {x: rand(0, W), y: top ? rand(-H, 0) : rand(0, H), r, vy: rand(0.35, 0.9) * (0.55 + r / 4), vx: rand(-0.25, 0.25), a: rand(0.55, 0.95), ph: rand(0, 6.28), sw: rand(0.3, 1.1), rot: rand(0, 6.28), vr: rand(-0.01, 0.01)};
    };
    function size() {
      const rect = cv.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1); W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.round((W * H) / 7000));
      flakes = Array.from({length: n}, () => flake(false));
    }
    function crystal(f) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.strokeStyle = `rgba(255,255,255,${f.a})`; ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -f.r * 1.6);
        ctx.moveTo(0, -f.r * 0.9); ctx.lineTo(f.r * 0.45, -f.r * 1.25); ctx.moveTo(0, -f.r * 0.9); ctx.lineTo(-f.r * 0.45, -f.r * 1.25); ctx.stroke();
      }
      ctx.restore();
    }
    function frame(t) {
      raf = 0; if (!visible || document.hidden) return;
      const dt = Math.min(3, last ? (t - last) / 16.7 : 1); last = t;
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.ph += 0.012 * dt; f.y += f.vy * dt; f.x += (f.vx + Math.sin(f.ph) * f.sw * 0.35) * dt; f.rot += f.vr * dt;
        if (f.y > H + 8) { Object.assign(f, flake(true)); f.y = -8; }
        if (f.x > W + 8) f.x = -8; else if (f.x < -8) f.x = W + 8;
        if (f.r > 3) crystal(f);
        else {
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2);
          g.addColorStop(0, `rgba(255,255,255,${f.a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    }
    const go = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    size(); go();
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(size, 120); }).observe(cv.parentElement); // form height changes with each tab
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }).observe(cv);
    document.addEventListener('visibilitychange', go);
  })();

  // ---------- Hero slideshow: our own Himachal photos, ~2s each, soft crossfade + slow zoom ----------
  (function heroSlides() {
    const box = $('#hero-slides'); if (!box) return;
    const SLIDES = [
    ['01', [1280, 1920], [720, 1080]],
    ['02', [1280, 1920], [720, 1080]],
    ['03', [1280, 1920], [720, 1080]],
    ['04', [1280, 1920], [720, 1080]],
    ['05', [1178], [720, 884]],
    ['06', [1280, 1920], [720, 1080]],
    ['07', [1280, 1320], [720, 837]],
    ['08', [1280, 1920], [720, 1080]],
    ['09', [1280, 1920], [720, 1080]],
    ['10', [1280, 1920], [720, 1080]]];
    const HOLD = 2000, FADE = 1000;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData;
    if (reduce || saveData || SLIDES.length < 2) return; // keep the first photo only
    const MQ = '(max-aspect-ratio: 1/1)';
    const set = (n, k, ws, ext) => ws.map((w) => `/img/hero/h${n}-${k}-${w}.${ext} ${w}w`).join(', ');
    const make = ([n, d, m]) => {
      const pic = document.createElement('picture'); pic.className = 'hs';
      pic.innerHTML = `<source type="image/avif" media="${MQ}" srcset="${set(n, 'm', m, 'avif')}" sizes="100vw"><source type="image/webp" media="${MQ}" srcset="${set(n, 'm', [m[0]], 'webp')}" sizes="100vw"><source type="image/avif" srcset="${set(n, 'd', d, 'avif')}" sizes="100vw"><img src="/img/hero/h${n}-d-${d[0]}.webp" alt="" decoding="async">`;
      box.insertBefore(pic, null);
      const img = pic.querySelector('img');
      return new Promise((res) => { const done = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res(pic)); if (img.complete && img.naturalWidth) done(); else { img.onload = done; img.onerror = () => res(null); } });
    };
    const pics = [box.querySelector('.hs')];
    const ready = [Promise.resolve(pics[0])];
    const get = (i) => (ready[i] ||= make(SLIDES[i]).then((p) => (pics[i] = p)));
    let cur = 0, visible = true, timer = 0, shownAt = performance.now();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) schedule(); }, {threshold: 0.05});
    io.observe(box);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
    async function advance() {
      timer = 0;
      if (!visible || document.hidden) return;
      const next = (cur + 1) % SLIDES.length;
      const pic = await get(next);
      get((next + 1) % SLIDES.length); // fetch one ahead so the next change is instant
      if (!pic) { cur = next; return schedule(); } // skip a photo that failed to load
      const prev = pics[cur];
      pic.classList.remove('was'); void pic.offsetWidth; // restart the zoom
      pic.classList.add('on');
      if (prev && prev !== pic) { prev.classList.replace('on', 'was'); setTimeout(() => prev.classList.remove('was'), FADE + 50); }
      cur = next; shownAt = performance.now();
      schedule();
    }
    function schedule() {
      if (timer || !visible || document.hidden) return;
      timer = setTimeout(advance, Math.max(0, HOLD + FADE - (performance.now() - shownAt)));
    }
    // Start once the first photo is on screen, and warm up the second.
    const first = pics[0].querySelector('img');
    const start = () => { shownAt = performance.now(); get(1); schedule(); };
    if (first.complete) start(); else first.addEventListener('load', start, {once: true});
  })();
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
