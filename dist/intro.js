/*
 * Arrival sequence — a 5 second descent from orbit to Thakur Cottage.
 *  1. A ray-traced WebGL2 globe (lit, with ocean glint and atmosphere) rotates to the Kullu valley.
 *  2. It hands over to real satellite imagery (Esri World Imagery) that keeps zooming continuously.
 *  3. The view tilts towards the horizon and resolves into the real photograph of the cottage.
 * Plays on every visit; skippable; replayable; disabled for prefers-reduced-motion.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro) return;

  const TARGET = {lat: 31.95127, lon: 77.10542};          // GPS from the property photographs
  const START = {lat: 6, lon: 22};                         // begin over Africa, sweep east to India
  const R_KM = 6371;
  const H0 = 26000, Z_FINAL = 19.3;                        // start altitude (km); satellite zoom reached at the very end (still moving)
  const T_DESCENT_START = 0.1, T_LAND = 3.95, DURATION = 4.95;
  const END_SPEED = 0.35;                                  // descent never stops: it hands its momentum to the photo
  const FOV = 40 * Math.PI / 180, TAN = Math.tan(FOV / 2);
  const LEVELS = [4, 6, 8, 10, 12, 14, 16, 18];
  const drawFrom = (L) => (L >= 16 ? L - 0.55 : L + 0.2);   // finer level appears at this zoom (earlier for the crisp final levels)
  let H1 = 0.42;
  const SUN = norm(dirOf(14, 52));
  const tileUrl = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

  const $ = (id) => document.getElementById(id);
  const globeCanvas = $('intro-globe');
  const satWrap = $('intro-sat');
  const satCanvas = $('intro-sat-canvas');
  const sat = satCanvas.getContext('2d');
  const horizon = $('intro-horizon');
  const haze = $('intro-haze');
  const reticle = $('intro-reticle');
  const credit = $('intro-credit');
  const progress = $('intro-progress');
  const hudLat = $('hud-lat'), hudLon = $('hud-lon'), hudAlt = $('hud-alt');
  const skipButton = $('intro-skip');

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function clamp(v, a = 0, b = 1) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, v) { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeDescent(t) { // Hermite curve: starts from rest, ends still moving (no stop-and-go before the photo)
    t = clamp(t);
    return (END_SPEED - 2) * t * t * t + (3 - END_SPEED) * t * t;
  }
  function dirOf(lat, lon) { return [Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat)), Math.cos(rad(lat)) * Math.cos(rad(lon))]; }
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function slerp(a, b, t) {
    const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), w = Math.acos(d);
    if (w < 1e-5) return b;
    const s = Math.sin(w), k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
  const worldPx = (lat, lon, n) => [(lon + 180) / 360 * n * 256, (1 - Math.asinh(Math.tan(rad(lat))) / Math.PI) / 2 * n * 256];

  /* ---------- WebGL2 globe ---------- */
  const VERT = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2 uRes; uniform sampler2D uEarth; uniform vec3 uCam, uF, uR, uU, uSun; uniform float uTan, uReady;
  out vec4 o;
  const float PI = 3.14159265359;
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  vec3 stars(vec3 d){
    vec3 c = floor(d * 420.0); float h = hash(c);
    float s = smoothstep(0.9982, 1.0, h) * (0.4 + 0.6 * hash(c + 7.0));
    return mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.8), hash(c + 3.0)) * s * 1.6;
  }
  void main(){
    vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
    vec3 rd = normalize(uF + p.x * uTan * uR + p.y * uTan * uU);
    vec3 ro = uCam;
    float b = dot(ro, rd), c = dot(ro, ro) - 1.0, disc = b * b - c;
    float tca = max(-b, 0.0);
    vec3 cp = ro + rd * tca; float dmin = length(cp);
    vec3 atm = vec3(0.30, 0.56, 1.0);
    vec3 col = stars(rd) * (1.0 - uReady * 0.0);
    bool hit = disc > 0.0 && (-b - sqrt(disc)) > 0.0;
    if (hit) {
      float t = -b - sqrt(disc);
      vec3 n = normalize(ro + rd * t);
      vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);
      vec2 dx = dFdx(uv), dy = dFdy(uv);
      if (abs(dx.x) > 0.5) dx.x -= sign(dx.x);
      if (abs(dy.x) > 0.5) dy.x -= sign(dy.x);
      vec3 tex = pow(textureGrad(uEarth, uv, dx, dy).rgb, vec3(2.2));
      float ndl = dot(n, uSun);
      float day = smoothstep(-0.10, 0.30, ndl);
      float ocean = smoothstep(0.015, 0.06, tex.b - tex.r * 1.15);
      vec3 v = -rd, hv = normalize(uSun + v);
      float spec = pow(max(dot(n, hv), 0.0), 90.0) * ocean * day * 1.4 + pow(max(dot(n, hv), 0.0), 12.0) * ocean * day * 0.06;
      vec3 surf = tex * (0.012 + 2.6 * max(ndl, 0.0)) + vec3(1.0, 0.94, 0.82) * spec;
      float mu = max(dot(n, v), 0.0);
      float fres = pow(1.0 - mu, 3.5);
      surf = mix(surf, atm * (0.05 + 1.15 * day), clamp(fres * 0.9, 0.0, 1.0));
      surf += atm * 0.035 * day;
      // terminator warmth
      surf += vec3(1.0, 0.45, 0.15) * 0.05 * smoothstep(0.2, 0.0, abs(ndl)) * (1.0 - ocean * 0.5);
      col = surf;
    }
    float side = smoothstep(-0.35, 0.6, dot(normalize(cp), uSun));
    float glow = exp(-max(dmin - 1.0, 0.0) * 34.0);
    if (!hit) col += atm * glow * (0.12 + 1.4 * side);
    col = 1.0 - exp(-col * 1.7);
    o = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
  }`;

  let gl = null, prog = null, uni = {}, earthReady = null;
  function initGL() {
    if (gl !== null) return !!gl;
    gl = globeCanvas.getContext('webgl2', {antialias: true, alpha: false, powerPreference: 'high-performance'}) || false;
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (error) { console.warn('[intro] globe shader failed', error); gl = false; return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uEarth', 'uCam', 'uF', 'uR', 'uU', 'uSun', 'uTan', 'uReady'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([8, 18, 40]));
    earthReady = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = 'media/earth.jpg';
    });
    return true;
  }

  function drawGlobe(dir, hKm) {
    if (!gl) return;
    const w = globeCanvas.width, h = globeCanvas.height;
    gl.viewport(0, 0, w, h);
    const cam = dir.map((v) => v * (1 + hKm / R_KM));
    const f = dir.map((v) => -v);
    const north = [0, 1, 0];
    const dn = north[0] * dir[0] + north[1] * dir[1] + north[2] * dir[2];
    const up = norm([north[0] - dn * dir[0], north[1] - dn * dir[1], north[2] - dn * dir[2]]);
    const right = cross(f, up);
    gl.uniform2f(uni.uRes, w, h);
    gl.uniform3fv(uni.uCam, cam);
    gl.uniform3fv(uni.uF, f);
    gl.uniform3fv(uni.uR, right);
    gl.uniform3fv(uni.uU, up);
    gl.uniform3fv(uni.uSun, SUN);
    gl.uniform1f(uni.uTan, TAN);
    gl.uniform1f(uni.uReady, 1);
    gl.uniform1i(uni.uEarth, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- Satellite tiles ---------- */
  const tiles = new Map();
  function requestTile(z, x, y) {
    const key = `${z}/${x}/${y}`;
    if (tiles.has(key)) return tiles.get(key);
    const img = new Image();
    img.decoding = 'async';
    const entry = {img, ok: false, done: false, at: 0};
    img.onload = () => { entry.ok = true; entry.done = true; entry.at = performance.now(); };
    img.onerror = () => { entry.done = true; };
    img.src = tileUrl(z, x, y);
    tiles.set(key, entry);
    return entry;
  }
  function preloadTiles(w, h) {
    // The finer level L is drawn from zoom L + 0.35, so cover the viewport at that scale.
    LEVELS.forEach((L) => {
      const n = 2 ** L, s = 2 ** (drawFrom(L) - L);
      const [cx, cy] = worldPx(TARGET.lat, TARGET.lon, n);
      const x0 = Math.floor((cx - w / 2 / s) / 256), x1 = Math.floor((cx + w / 2 / s) / 256);
      const y0 = Math.floor((cy - h / 2 / s) / 256), y1 = Math.floor((cy + h / 2 / s) / 256);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) requestTile(L, ((x % n) + n) % n, y);
    });
  }
  function drawSat(z, lat, lon, w, h, now) {
    sat.setTransform(1, 0, 0, 1, 0, 0);
    sat.fillStyle = '#0b1416';
    sat.fillRect(0, 0, satCanvas.width, satCanvas.height);
    const k = satCanvas.width / w;
    sat.setTransform(k, 0, 0, k, 0, 0);
    sat.imageSmoothingQuality = 'high';
    for (let i = 0; i < LEVELS.length; i++) {
      const L = LEVELS[i];
      if (i > 0 && z < drawFrom(L)) break;
      const alpha = i === 0 ? 1 : smooth(drawFrom(L), drawFrom(L) + 0.8, z);
      const n = 2 ** L, s = 2 ** (z - L);
      const [cx, cy] = worldPx(lat, lon, n);
      const x0 = Math.floor((cx - w / 2 / s) / 256), x1 = Math.floor((cx + w / 2 / s) / 256);
      const y0 = Math.max(0, Math.floor((cy - h / 2 / s) / 256)), y1 = Math.min(n - 1, Math.floor((cy + h / 2 / s) / 256));
      sat.globalAlpha = alpha;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const t = tiles.get(`${L}/${((x % n) + n) % n}/${y}`) || (i < 2 ? requestTile(L, ((x % n) + n) % n, y) : null);
          if (!t || !t.ok) continue;
          sat.globalAlpha = alpha * Math.min(1, (now - t.at) / 260);   // late tiles fade in instead of popping
          const px = w / 2 + (x * 256 - cx) * s, py = h / 2 + (y * 256 - cy) * s, size = 256 * s;
          sat.drawImage(t.img, Math.floor(px), Math.floor(py), Math.ceil(size + 1), Math.ceil(size + 1));
        }
      }
    }
    sat.globalAlpha = 1;
  }

  /* ---------- Sequence ---------- */
  let running = false, raf = 0, startTime = 0, viewW = 0, viewH = 0, landed = false, lastFocus = null;
  const FREEZE = parseFloat(new URLSearchParams(location.search).get('introfreeze')); // dev aid: hold the sequence at a moment
  const startDir = norm(dirOf(START.lat, START.lon)), targetDir = norm(dirOf(TARGET.lat, TARGET.lon));

  function resize() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    globeCanvas.width = Math.round(viewW * Math.min(dpr, 1.5));
    globeCanvas.height = Math.round(viewH * Math.min(dpr, 1.5));
    satCanvas.width = Math.round(viewW * dpr);
    satCanvas.height = Math.round(viewH * dpr);
    // Choose the landing altitude so the final frame shows zoom Z_FINAL imagery at this viewport size.
    const mpp = 156543.034 * Math.cos(rad(TARGET.lat)) / 2 ** Z_FINAL;
    H1 = mpp * viewH / (2 * TAN) / 1000;
  }

  function formatAlt(km) {
    if (km >= 10) return `${Math.round(km).toLocaleString('en-IN')} km`;
    if (km >= 1) return `${km.toFixed(1)} km`;
    return `${Math.round(km * 1000)} m`;
  }

  function frame(now) {
    if (!running) return;
    const t = Number.isFinite(FREEZE) ? FREEZE : (now - startTime) / 1000;
    const rot = easeInOut(clamp(t / 1.7));
    const dir = slerp(startDir, targetDir, rot);
    const lat = deg(Math.asin(dir[1])), lon = deg(Math.atan2(dir[0], dir[2]));
    const p = easeDescent((t - T_DESCENT_START) / (DURATION - T_DESCENT_START));
    const hKm = Math.exp(Math.log(H0) + (Math.log(H1) - Math.log(H0)) * p);
    const mpp = (2 * hKm * 1000 * TAN) / viewH;
    const z = Math.log2((156543.034 * Math.cos(rad(lat))) / mpp);
    const satAlpha = smooth(4600, 1500, hKm);

    if (satAlpha < 1) drawGlobe(dir, hKm);
    globeCanvas.style.opacity = '1';
    if (satAlpha > 0) drawSat(z, lat, lon, viewW, viewH, now);
    satWrap.style.opacity = String(satAlpha);
    const mask = 62 + 90 * smooth(2600, 40, hKm);
    satWrap.style.setProperty('--mask', `${mask}%`);

    const tilt = 38 * easeInOut(clamp((t - 2.9) / 1.9));
    satWrap.style.transform = `perspective(1100px) rotateX(${tilt.toFixed(2)}deg) scale(${(1 + tilt / 38 * 0.8).toFixed(3)})`;
    horizon.style.opacity = String(tilt / 38);
    haze.style.opacity = String(0.22 * Math.exp(-Math.pow((t - 3.7) / 0.5, 2)));

    const lock = smooth(2.6, 3.3, t);
    reticle.style.opacity = String(lock * (1 - smooth(3.5, 3.95, t)));
    reticle.style.transform = `translate(-50%, -50%) scale(${(1.8 - 0.8 * lock).toFixed(3)})`;
    credit.style.opacity = String(satAlpha * (1 - smooth(T_LAND, DURATION, t)));

    hudLat.textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    hudLon.textContent = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    hudAlt.textContent = formatAlt(hKm);
    progress.style.transform = `scaleX(${clamp(t / DURATION).toFixed(3)})`;

    if (t >= T_LAND && !landed) { landed = true; root.classList.add('landed'); }
    intro.style.opacity = String(1 - smooth(T_LAND, DURATION, t));
    if (t >= DURATION && !Number.isFinite(FREEZE)) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    running = false;
    cancelAnimationFrame(raf);
    intro.hidden = true;
    intro.style.opacity = '';
    root.classList.remove('intro-active');
    root.classList.add('landed');
    window.removeEventListener('keydown', onKey);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({preventScroll: true});
  }

  function skip() {
    if (!running) return;
    const t = (performance.now() - startTime) / 1000;
    if (t < T_LAND) startTime = performance.now() - T_LAND * 1000;
  }
  function onKey(event) { if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') { event.preventDefault(); skip(); } }

  async function play() {
    if (running) return;
    lastFocus = document.activeElement;
    running = true; landed = false;
    root.classList.add('has-intro', 'intro-active');
    root.classList.remove('landed');
    intro.hidden = false;
    intro.style.opacity = '1';
    intro.classList.remove('is-live');
    resize();
    window.scrollTo({top: 0, behavior: 'instant'});
    const hasGL = initGL();
    preloadTiles(viewW * 0.8, viewH * 0.8);   // edges sit under the vignette and leave the frame quickly
    if (hasGL) drawGlobe(startDir, H0);
    // Wait for the Earth texture (and give the first satellite tiles a head start), capped so the visitor never waits long.
    const waitStart = performance.now();
    await Promise.race([earthReady || Promise.resolve(), new Promise((r) => setTimeout(r, 2200))]);
    if (hasGL) drawGlobe(startDir, H0);
    // Give the satellite imagery a head start so nothing pops in mid-flight (capped; cached on later visits).
    await new Promise((resolve) => {
      const check = () => {
        const all = [...tiles.values()];
        const ready = all.filter((e) => e.done).length / Math.max(1, all.length);
        hudAlt.textContent = `SYNC ${Math.round(ready * 100)}%`;
        if (ready >= 0.92 || performance.now() - waitStart > 3800) resolve(); else setTimeout(check, 80);
      };
      check();
    });
    skipButton.tabIndex = 0;
    intro.classList.add('is-live');
    window.addEventListener('keydown', onKey);
    startTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  skipButton.addEventListener('click', skip);
  window.addEventListener('resize', () => { if (running) resize(); });
  window.ThakurIntro = {play};

  if (root.classList.contains('has-intro') && !root.classList.contains('landed')) play();
})();
