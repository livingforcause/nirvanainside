# Thakur Cottage

A focused, responsive hospitality website with an editorial design in pine, parchment and muted ochre. The cottage itself leads the experience. The site uses plain HTML, CSS and JavaScript, with no runtime libraries or build step.

## Preview

Run `npm run dev` and open http://localhost:4173. Run `npm run check` for JavaScript syntax validation. Serve `dist/` on a static host; Sites identity is retained in `.openai/hosting.json`.

## Selected imagery

Only the edited images in `dist/media/` and the supplied brand logo are displayed. All selected images were produced with the built-in image-generation tool, reviewed, and exported as WebP. Complete prompt briefs and saved filenames are recorded in `image-prompts.md`.

- `cottage-hero.webp`: architectural hero edited using the supplied front photographs IMG_1780, IMG_1779 and IMG_1783 as references. Retains the recognisable green-and-ochre cottage, with cleaned foreground and softer lighting.
- `cottage-detail.webp`: edited close architectural view from IMG_1783 with IMG_1779 as reference.
- `cottage-mobile.webp`: dedicated portrait composition of the edited cottage hero, preserving the full façade on small screens.
- `room.webp`: refined furnishing proposal based on the existing room concept; plain linen, muted runner, walnut furniture and softer daylight.
- `terrace.webp`: refined existing terrace furnishing concept with reduced foreground, controlled light and no photographer shadow.
- `garden.webp`: refined existing garden furnishing concept with natural colour and removal of the overhead cable.
- `valley.webp`: edited actual valley photograph from IMG_1813 with reframing and lighting adjustments.

AI-assisted exterior edits and property views are identified. Room, terrace and garden images remain clearly labelled styling concepts, because their furnishings and landscaping are proposals, not verified existing facilities. Confirm current room photographs and amenities with the property.

Original photos remain unchanged under `source-assets/originals/`. Earlier concepts, unused stock images and unused runtime libraries are retained in sibling folders under `source-assets/`, outside the published static directory.

## Website behaviour

The site contains property information, rooms, a curated image collection, directions and a booking enquiry. Image enlargement supports previous/next controls, arrow keys, Escape and focus restoration. Mobile navigation and a contextual enquiry link make the main actions accessible on a small screen. Motion respects reduced-motion preferences. There is no forced intro, globe journey, procedural room model, fake guest book, generic attractions grid or speculative trip-planning tool.

The enquiry form checks date order, past dates, room count and capacity of up to three guests per room. It shows a room/guest/night summary, then prepares a WhatsApp message. It does not send automatically, reserve inventory, store data, claim live availability or invent prices.

Confirmed property information retained: 50 rooms, one category, 2–3 guests, Wi-Fi, parking, basic amenities, Kullu bus stand pickup/drop, phone +91 7220080005 and the supplied Google Maps property pin. Transfer timing and charges require confirmation.

## Editing

Change content, contact details and media references in `dist/index.html`, appearance in `dist/style.css`, and gallery captions or form behaviour in `dist/app.js`. Keep every published photograph edited and reviewed; do not reconnect the original-photo folder to the page. Google Fonts is the only external presentation dependency; serif and sans-serif system fallbacks are supplied.
