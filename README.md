# Thakur Cottage

A responsive hospitality website for Thakur Cottage, Dhalpur, Kullu — "Orbit" theme: deep night glass panels, glacier/mint gradients and ochre warmth, built in plain HTML, CSS and JavaScript (no build step, no runtime libraries).

## Preview

Run `npm run dev` and open http://localhost:4173. Run `npm run check` for JavaScript syntax validation. Serve `dist/` on any static host.

## Arrival sequence (`dist/intro.js`)

Every visit opens with a ~5 second descent from orbit to the cottage:

1. A ray-traced WebGL2 globe (`media/earth.jpg`, sun lighting, ocean glint, atmosphere) sweeps from Africa to the Kullu valley.
2. It hands over to real satellite imagery (Esri World Imagery, loaded at runtime and credited on screen) that keeps zooming continuously to roof level over the property's GPS point (31.95127° N, 77.10542° E, taken from the photo metadata).
3. The view tilts towards the horizon and resolves into the real photograph of the cottage.

Visitors can skip it (button, Esc, Enter or Space) or replay it ("Replay the arrival" / "View from orbit"). It is disabled for `prefers-reduced-motion`; add `?nointro` to the URL to bypass it. `?introfreeze=2.4` holds the sequence at a given second, which is useful while tuning. Without WebGL2 the sequence falls back to the satellite descent only.

## Imagery

Every photograph on the site is a real, unretouched photo of the property (`dist/photos/real/`), converted from the original HEIC files with only basic exposure/contrast correction. No AI-edited or generated images are displayed. The previous AI-edited set remains in `dist/media/` (unused) and `source-assets/`.

## Editing

Content and contact details: `dist/index.html`. Appearance: `dist/style.css`. Lightbox, navigation and the WhatsApp enquiry form: `dist/app.js` (the lightbox reads `data-src`, `data-title` and `data-caption` from each `.image-open` button). The enquiry form validates dates, rooms and capacity (up to three guests per room) and prepares a WhatsApp message; it does not send automatically, store data or claim live availability.
