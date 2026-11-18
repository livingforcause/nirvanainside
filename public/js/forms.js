/* Search / enquiry forms for every service. Each form ends in NI.enquire() → saved lead → WhatsApp. */
(() => {
  const {esc, today, addDays, fmtDate, fmtTime, WA_SVG} = NI;

  // Field helpers -----------------------------------------------------------
  const F = {
    text: (name, label, o = {}) => ({kind: 'input', type: 'text', name, label, ...o}),
    place: (name, label, o = {}) => ({kind: 'input', type: 'text', list: 'ni-places', name, label, ...o}),
    date: (name, label, o = {}) => ({kind: 'input', type: 'date', name, label, ...o}),
    time: (name, label, o = {}) => ({kind: 'input', type: 'time', name, label, ...o}),
    num: (name, label, o = {}) => ({kind: 'input', type: 'number', name, label, min: 1, ...o}),
    select: (name, label, options, o = {}) => ({kind: 'select', name, label, options, ...o}),
  };

  const DEFS = {
    taxi: {
      label: 'Taxi', emo: '🚕', cta: 'Search cabs',
      seg: {name: 'trip', options: ['One way', 'Round trip', 'Airport transfer', 'Local / hourly']},
      fields: (c, l) => [
        F.place('from', 'From', {placeholder: 'Pickup city / area', required: true}),
        F.place('to', 'To', {placeholder: 'Drop city / area', required: true, hideFor: ['Local / hourly']}),
        F.select('hours', 'Package', ['4 hrs / 40 km', '8 hrs / 80 km', '12 hrs / 120 km', 'Full-day sightseeing'], {onlyFor: ['Local / hourly']}),
        F.date('date', 'Pickup date', {required: true, min: today(), value: today()}),
        F.time('time', 'Pickup time', {value: '09:00', required: true}),
        F.date('ret', 'Return date', {onlyFor: ['Round trip'], required: true}),
        F.num('pax', 'Passengers', {value: 2, max: 60}),
        F.select('vehicle', 'Vehicle', ['Any — suggest best', ...((c?.listings || []).filter((x) => x.type === 'transport').map((x) => x.title))], {value: l?.title}),
      ],
      title: (v, l) => l && l.subtype === 'public' ? `${l.title}: ${v.from} → ${v.to || ''}` : v.trip === 'Local / hourly' ? `Local cab in ${v.from}` : `${v.trip}: ${v.from} → ${v.to}`,
      enqType: 'taxi',
    },
    stay: {
      label: 'Stays', emo: '🏨', cta: 'Search stays',
      fields: (c, l) => [
        l ? null : F.place('where', 'Destination', {placeholder: 'Manali, Kullu, Shimla…', required: true, wide: true}),
        l?.rooms?.length > 1 ? F.select('room', 'Room type', l.rooms.map((r) => r.name)) : null,
        F.date('in', 'Check-in', {required: true, min: today(), value: today()}),
        F.date('out', 'Check-out', {required: true, min: today(), value: addDays(today(), 1)}),
        F.num('rooms', 'Rooms', {value: 1, max: 50}),
        F.num('guests', 'Guests', {value: 2, max: 150}),
        l ? null : F.select('kind', 'Stay type', ['Any', 'Hotel', 'Homestay', 'Long-term rental']),
      ].filter(Boolean),
      title: (v, l) => l ? `Stay at ${l.title}` : `Stay in ${v.where}`,
      enqType: 'stay',
    },
    experience: {
      label: 'Experiences', emo: '🪂', cta: 'Find experiences',
      fields: (c, l) => [
        l ? null : F.select('activity', 'Activity', ['Paragliding', 'River rafting', 'Bungee jumping', 'Camping', 'Skiing & snow', 'Trekking', 'Something else']),
        F.place('where', 'Location', {placeholder: 'Bir, Solang, Kullu…', value: l?.location?.area || ''}),
        F.date('date', 'Date', {required: true, min: today(), value: today()}),
        F.num('people', 'People', {value: 2, max: 100}),
      ].filter(Boolean),
      title: (v, l) => l ? l.title : `${v.activity}${v.where ? ` in ${v.where}` : ''}`,
      enqType: 'experience',
    },
    rental: {
      label: 'Rentals', emo: '🏍️', cta: 'Find rentals',
      fields: (c, l) => [
        l ? null : F.select('what', 'Rent', ['Bike (Royal Enfield etc.)', 'Scooty', 'Self-drive car', 'Car with driver', 'Camping / snow gear', 'Anything else']),
        F.text('model', 'Model / details', {placeholder: l ? l.title : 'e.g. Himalayan, Thar, 2 tents', value: ''}),
        F.place('where', 'Pickup at', {placeholder: 'Manali, Kullu…', required: true, value: l?.location?.area?.split('/')[0]?.trim() || ''}),
        F.date('from', 'From', {required: true, min: today(), value: today()}),
        F.date('to', 'To', {required: true, min: today(), value: addDays(today(), 2)}),
        F.num('qty', 'Quantity', {value: 1, max: 50}),
      ].filter(Boolean),
      title: (v, l) => l ? `Rent: ${l.title}` : `Rent: ${v.what}`,
      enqType: 'rental',
    },
    package: {
      label: 'Packages', emo: '🗺️', cta: 'Plan my trip',
      fields: (c, l) => [
        l ? null : F.place('where', 'Where to', {placeholder: 'Manali, Spiti, Shimla…', required: true, wide: true}),
        F.date('start', 'Start date', {required: true, min: today(), value: addDays(today(), 7)}),
        l ? null : F.select('days', 'Duration', ['3 days', '4 days', '5 days', '6 days', '7 days', '8–10 days', '10+ days'], {value: '5 days'}),
        F.num('adults', 'Adults', {value: 2, max: 100}),
        F.num('kids', 'Children', {value: 0, min: 0, max: 50}),
        F.select('hotel', 'Hotels', ['Budget', 'Standard (3★)', 'Premium (4★)', 'Luxury (5★)']),
        F.place('origin', 'Starting from', {placeholder: 'Delhi, Chandigarh…'}),
      ].filter(Boolean),
      title: (v, l) => l ? `Package: ${l.title}` : `Trip plan: ${v.where}`,
      enqType: 'package',
    },
  };
  DEFS.transport = {...DEFS.taxi};

  const visible = (f, seg) => (!f.onlyFor || f.onlyFor.includes(seg)) && !(f.hideFor || []).includes(seg);

  function fieldHTML(f, seg) {
    const hidden = visible(f, seg) ? '' : ' hidden';
    const attrs = ['name', 'type', 'list', 'placeholder', 'min', 'max'].filter((k) => f[k] != null).map((k) => `${k}="${esc(f[k])}"`).join(' ');
    const ctrl = f.kind === 'select'
      ? `<select name="${f.name}">${f.options.map((o) => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input ${attrs} value="${esc(f.value ?? '')}"${f.type === 'number' ? ' inputmode="numeric"' : ''} autocomplete="off">`;
    return `<label class="field${f.wide ? ' wide' : ''}" data-f="${f.name}"${hidden}><span>${esc(f.label)}</span>${ctrl}</label>`;
  }

  /** Render a form into `el`. opts: {listing, catalog, compact (sidebar layout)} */
  function mount(el, kind, opts = {}) {
    const def = DEFS[kind]; if (!def) return;
    const l = opts.listing || null;
    const fields = def.fields(opts.catalog, l);
    let seg = def.seg?.options[0];
    const segHTML = def.seg ? `<div class="seg" role="radiogroup" aria-label="Trip type">${def.seg.options.map((o, i) => `<label><input type="radio" name="${def.seg.name}" value="${esc(o)}"${i ? '' : ' checked'}><span>${esc(o)}</span></label>`).join('')}</div>` : '';
    const btn = `<button class="btn ${opts.compact ? 'btn-wa btn-block' : 'btn-sun go'}" type="submit">${opts.compact ? WA_SVG + 'Get best price' : esc(def.cta) + ' →'}</button>`;
    el.innerHTML = `<form novalidate>${segHTML}<div class="${opts.compact ? 'two' : 'grid-f'}" style="--cols:${Math.min(fields.length, 5)}">${fields.map((f) => fieldHTML(f, seg)).join('')}${opts.compact ? '' : btn}</div>${opts.compact ? btn : ''}<p class="form-err" role="alert"></p></form>`;
    const form = el.querySelector('form');
    if (opts.compact) form.querySelectorAll('.field').forEach((f) => { if (['where', 'model'].includes(f.dataset.f)) f.style.gridColumn = '1 / -1'; });
    // In compact layout the wrapper is ".two" (2 cols); in console it's grid-f.
    form.addEventListener('change', (e) => {
      if (def.seg && e.target.name === def.seg.name) {
        seg = e.target.value;
        fields.forEach((f) => { form.querySelector(`[data-f="${f.name}"]`).hidden = !visible(f, seg); });
      }
      const d1 = form.elements.date || form.elements.in || form.elements.from;
      const d2 = form.elements.ret || form.elements.out || (form.elements.to?.type === 'date' ? form.elements.to : null);
      if (d1?.type === 'date' && d2 && e.target === d1 && d1.value) { d2.min = d1.value; if (d2.value && d2.value < d1.value) d2.value = kind === 'stay' ? addDays(d1.value, 1) : d1.value; }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-err'); err.textContent = '';
      const v = Object.fromEntries(new FormData(form));
      for (const f of fields) {
        if (!visible(f, seg)) continue;
        if (f.required && !String(v[f.name] ?? '').trim()) { err.textContent = `Please add ${f.label.toLowerCase()}.`; form.elements[f.name].focus(); return; }
      }
      if (kind === 'stay' && v.out <= v.in) { err.textContent = 'Check-out must be after check-in.'; return; }
      if ((kind === 'taxi' || kind === 'transport') && seg === 'Round trip' && v.ret && v.ret < v.date) { err.textContent = 'Return date must be on or after pickup date.'; return; }
      if (kind === 'rental' && v.to < v.from) { err.textContent = '"To" date must be after "From".'; return; }
      const out = [];
      if (def.seg) out.push(['Trip type', seg]);
      if (l) out.push([NI.TYPES[l.type]?.one || 'Listing', l.title]);
      for (const f of fields) {
        if (!visible(f, seg)) continue;
        let val = String(v[f.name] ?? '').trim(); if (!val) continue;
        if (f.type === 'date') val = fmtDate(val);
        if (f.type === 'time') val = fmtTime(val);
        out.push([f.label, val]);
      }
      if (kind === 'stay' && v.in && v.out) { const n = Math.round((Date.parse(v.out) - Date.parse(v.in)) / 864e5); out.push(['Nights', String(n)]); }
      if (opts.extra) out.push(...opts.extra());
      NI.enquire({type: def.enqType, title: def.title({...v, trip: seg}, l), listingId: l?.id || null, fields: out});
    });
    return form;
  }

  NI.forms = {DEFS, mount};
})();
