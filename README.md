# Thakur Cottage

A responsive static hotel website using Three.js and GSAP. All source and runtime libraries are included; no installation or build step is needed.

## Run

Open a terminal in this folder, run `npm run dev`, then visit http://localhost:4173. Use an HTTP server rather than opening index.html directly, because JavaScript modules need HTTP.

## Your photos

Put JPEG, PNG or WebP photos in **dist/photos/**. Original HEIC files were decoded into web-ready JPEG copies; originals are unchanged. Edit the `photos` array near the top of **dist/app.js** to change gallery images and captions. Hero background: **dist/style.css**, `.hero-image`. About photo: **dist/index.html**. Room comparison: **dist/app.js**.

- IMG_1779.jpg: actual property exterior
- IMG_1813.jpg: actual valley view (hero)
- IMG_1803.jpg: current room
- IMG_1804.jpg: current kitchen
- IMG_1805.jpg: current bathroom
- IMG_1810.jpg: current rooftop
- *-furnished.png: AI-assisted furnishing proposals based on those real photos, preserving visible structure; these are proposed amenities, not proof of current facilities.

These proposals were created with the built-in image generation tool. Prompt briefs: preserve the reference photograph's camera, architecture, windows, doors, original turquoise walls and grey floors; add achievable warm wood bedroom furniture and white bedding; equip the existing kitchen counters; furnish the existing tiled bathroom; furnish the rooftop safely without altering its footprint or mountain skyline. See **image-prompts.md** for complete prompts.

## Editing content

Edit **dist/index.html** for text, phone, map and amenities. Edit **dist/style.css** for colours and layout. `--gold` controls the accent. The actual supplied logo is available at **dist/photos/logo.png**, and the design currently uses an editable text wordmark.

Confirmed information: 50 rooms, a single category, 2–3 guests, parking, Wi-Fi, basic amenities and Kullu bus stand pickup/drop. Additional furnishing proposals are labelled. Prices, email, social profiles, precise street address and the meaning of “101–713” were not confirmed and are omitted. Review names are explicitly illustrative; replace entire cards with genuine guest reviews before public launch.

## Booking and maps

The enquiry form validates dates and guest capacity, then opens WhatsApp with a message. It does not send automatically, store data or reserve inventory. Phone: +91 7220080005. The exact supplied Google Maps short link is used for directions. The embedded map is a labelled regional Kullu map; replace its URL with a verified property embed when available.

## 3D experience

On the first visit per browser session the textured Earth rotates, centres toward Kullu, zooms, then crossfades to the real valley and cottage photographs. Replay via “The journey here”. The regional descent is a cinematic transition, not a satellite terrain simulation. The interactive furnished room uses procedural geometry inspired by the real room's materials. It is not an accurately measured reconstruction or 360° photograph. Upload an equirectangular panorama for a true photographic 360° room tour.

Reduced-motion preference skips the automatic intro and animations. WebGL failure shows the normal website and a useful room fallback. Libraries and imagery are served locally; Google Fonts and the embedded map require internet. Illustrative unused stock photos in assets are not presented as actual property photos.

## Deploy

Serve **dist/** on any static web host. Sites configuration is in **.openai/hosting.json**. No secrets, backend or paid API are required.
