# Thakur Cottage

A responsive hospitality website for Thakur Cottage, Dhalpur, Kullu — "Orbit" theme: deep night glass panels, glacier/mint gradients and ochre warmth, built in plain HTML, CSS and JavaScript (no build step, no runtime libraries).

## Repository structure

```
thakur-cottage/
├── dist/                 Thakur Cottage website (static, deployed as-is — hosting serves this folder)
│   ├── index.html        content & contact details
│   ├── style.css         appearance
│   ├── app.js            lightbox, navigation, WhatsApp enquiry form
│   ├── intro.js          orbit-to-cottage arrival sequence
│   ├── media/            edited/AI-styled imagery used by the site
│   └── photos/           logo + enhanced real photographs
├── nirvanainside/        Nirvana Inside — Node.js aggregator app (own README, package.json, .env.example)
│   ├── server.js
│   ├── lib/store.js      storage: MySQL (production) or data/db.json (local fallback)
│   ├── db/schema.sql     MySQL tables (created automatically on first start)
│   ├── public/           front-end + admin panel
│   ├── data/seed.js      seed data (local db.json is git-ignored)
│   ├── scripts/          build.js → deploy bundles in build/ (git-ignored); db-import.js → JSON into MySQL
│   └── uploads/          runtime uploads (git-ignored)
├── source-assets/        originals, pre-enhancement photos, old concepts, vendor libs (not deployed)
├── docs/                 image prompts and media-enhancement notes
├── .openai/hosting.json  hosting config (static dir = dist)
└── package.json          root scripts: dev, dev:hp, check
```

Rules: deployable site files go in `dist/`, the app lives in `nirvanainside/`, raw/source material in `source-assets/`, notes in `docs/`. Secrets (`.env`), databases, uploads, `node_modules/` and build bundles are never committed.

## Preview

Run `npm run dev` and open http://localhost:4173. Run `npm run check` for JavaScript syntax validation. Serve `dist/` on any static host.

## Arrival sequence (`dist/intro.js`)

Every visit opens with a ~5 second descent from orbit to the cottage:

1. A ray-traced WebGL2 globe (`media/earth.jpg`, sun lighting, ocean glint, atmosphere) sweeps from Africa to the Kullu valley.
2. It hands over to real satellite imagery (Esri World Imagery, loaded at runtime and credited on screen) that keeps zooming continuously to roof level over the property's GPS point (31.95127° N, 77.10542° E, taken from the photo metadata).
3. The view tilts towards the horizon and resolves into the real photograph of the cottage.

Visitors can skip it (button, Esc, Enter or Space) or replay it ("Replay the arrival" / "View from orbit"). It is disabled for `prefers-reduced-motion`; add `?nointro` to the URL to bypass it. `?introfreeze=2.4` holds the sequence at a given second, which is useful while tuning. Without WebGL2 the sequence falls back to the satellite descent only.

## Imagery

Property and valley views use enhanced photographs in `dist/photos/real/`. The stay gallery displays three professional AI-styled previews based on the actual bedroom, kitchen and bathroom: `dist/media/stay-bedroom.webp`, `dist/media/stay-kitchen.webp` and `dist/media/stay-bathroom.webp`. Furnishings, appliances and fittings shown are illustrative and labelled; guests should confirm the current setup with the property. Empty room and corridor images are no longer displayed. The layout, CSS, JavaScript, arrival sequence and booking behaviour are unchanged. Full image prompts and reference paths are recorded in `docs/stay-image-prompts.md`.

## Editing

Content and contact details: `dist/index.html`. Appearance: `dist/style.css`. Lightbox, navigation and the WhatsApp enquiry form: `dist/app.js` (the lightbox reads `data-src`, `data-title` and `data-caption` from each `.image-open` button). The enquiry form validates dates, rooms and capacity (up to three guests per room) and prepares a WhatsApp message; it does not send automatically, store data or claim live availability.
