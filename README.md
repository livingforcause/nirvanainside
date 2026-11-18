# Nirvana Inside — platform

**nirvanainside.com**: stays, taxis, experiences, rentals and tour packages across Himachal Pradesh. Every customer enquiry is saved in the admin panel and sent to **one WhatsApp number**.

## Repository structure

```
├── server.js           Node.js server: website, admin API, enquiries (no framework)
├── lib/store.js        storage: MySQL in production, data/db.json locally
├── db/schema.sql       MySQL tables (created automatically on first start)
├── data/seed.js        starting listings for an empty database
├── public/             website (index, explore, item, 404) + admin/ panel + partner/ portal
│   └── img/            logo set + favicons
├── scripts/            build.js → Hostinger bundle in build/; db-import.js → JSON into MySQL
├── uploads/            admin photo uploads (local only, git-ignored)
└── brand/              master logo (not deployed)
```

Never committed: `.env`, `data/db.json`, `uploads/*`, `build/`, `node_modules/`.

## Brand

Master logo: `brand/nirvana-inside-logo-master.png`. Palette from the logo: forest `#1e4032`, saffron `#dd9332`, cream `#f6efe5`; colour tokens sit at the top of `public/css/site.css`. Logo files in `public/img/`: `logo-horizontal.png` (header), `logo-reverse.png` (forest footer), `logo.png` (stacked), `logo-mark.png`, favicons.

## Run it

Needs Node.js 20 or newer.

```bash
npm install                 # installs the MySQL driver (mysql2)
cp .env.example .env        # then set the admin login and the DB_* settings
npm start                   # → http://localhost:8080   admin → /admin
```

## Database

Listings, vendors, enquiries and settings are stored in **MySQL** (or MariaDB) when `DB_HOST` + `DB_NAME` (or `DATABASE_URL`) are set. The server creates its tables on first start (`db/schema.sql`: `ni_listings`, `ni_vendors`, `ni_enquiries`, `ni_settings`). If the database is empty, it imports the database bundled by `npm run build` or, failing that, `data/seed.js`.

Without database settings the app falls back to a local JSON file (`data/db.json`), which is handy for working on your computer without MySQL.

- `npm run db:import` copies `data/db.json` (or a file you name) into MySQL, **replacing** what is there.
- Uploaded photos are files, not database rows: they live in `uploads/` (on Hostinger, `~/nirvana-inside-data/uploads`). Back them up with the database.
- Storage code: `lib/store.js`.

## How an enquiry flows

1. A customer searches (Stays / Taxi / Experiences / Rentals / Packages) or taps **Get best price** on a listing.
2. They add their name and phone number. The enquiry is **saved** (`/api/enquiries`) with a reference like `NI261116-2314`, the campaign (`?utm_source=`) and the **agent code** if a partner referred them (see below).
3. WhatsApp opens with the full request written out, sent to the number in **Admin → Settings**.
4. In **Admin → Enquiries**, the team assigns the service partner and taps **Ask** to WhatsApp the owner, manager or driver. That message includes the request details but never the customer's number. The team then moves the enquiry through New → Contacted → Checking vendor → Quoted → Confirmed, adds notes and sets follow-up dates. **Export CSV** downloads everything.

## Partners & agents

Vendors and agents are one thing: a **Partner** (stored in the `vendors` table). Every partner has an **agent code**.

- **Every listing belongs to exactly one partner.** A partner can have any number of listings, or none (agent only). Listings Nirvana Inside runs itself belong to the built-in **Nirvana Inside (in-house)** partner (`v_inhouse`: no agent code, incentive or login, can't be deleted). On startup, any listing without a partner is assigned to in-house, and deleting a partner moves their listings to in-house.
- **Agent link:** `nirvanainside.com/a/CODE` (or any page with `?ref=CODE`). The browser remembers the code for **30 days**; the enquiry form also has an "Agent code" field customers can type into. Links shared from the site's 🔗 share buttons keep the code.
- **Incentive:** when a referred enquiry is **Confirmed** or **Completed**, the agent earns *booking value × incentive %*. The % comes from the partner (or **Settings → Default agent incentive %**, 5% unless changed). Admin enters the booking value in the enquiry drawer; the amount is calculated automatically and can be set by hand.
- **Payouts:** record what you pay on the partner page. Due = earned − paid.
- **Partner portal** (`/partner`): admin creates a 6-digit PIN on the partner page (**Create login PIN**, then send it on WhatsApp). The partner signs in with their WhatsApp/owner/manager phone + PIN. The portal is kept short: their **code & link**, **earnings** (earned / paid / due), **my listings** and **customers referred** (first name and status only, never phone numbers), plus a tucked-away "Change PIN". Resetting the PIN or turning login off signs them out everywhere.
- **Partner edits need approval:** from the portal a partner can propose changes to their listing's title, tagline, description, price, photos and highlights. Nothing goes live until admin opens the listing (Dashboard → *Partner edits to review*, or the ✎ badge in Listings), compares *Now* vs *Proposed*, and clicks **Approve** (changes go live) or **Reject** (with a reason the partner sees). Partners can only add photos they upload themselves (compressed in the browser, max 60 uploads/hour).

## Admin panel

| Section | What you manage |
|---|---|
| Listings | Stays (hotel, homestay, long-term), transport (private & public), experiences, rentals, packages. 7–10 photos (upload or link), room types with prices and amenities, mandatory details, itinerary, map pin, partner (required), partner edits to approve, status (draft / published / coming soon) |
| Partners | Business, type (incl. agent only), contacts, licence/GST, inventory, commercials, rating, notes, **agent code & link, incentive %, portal PIN, listings, referred customers, earned / paid / due, payouts**. **Never shown publicly** |
| Enquiries | Pipeline, customer WhatsApp/call, service-partner WhatsApp, **referring agent, booking value, incentive**, quote, follow-up, notes, filter by agent, CSV export |
| Settings | WhatsApp number, phone, email, office address, links, default agent incentive % |

## Deploying

This app needs a host that runs Node, such as a VPS (Hostinger, DigitalOcean, Lightsail), Render or Railway. A static-only host won't work.

- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` and `DB_HOST` (`127.0.0.1` on Hostinger, never `localhost`), `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` as environment variables.
- Put it behind HTTPS (Nginx/Caddy, or the platform's built-in HTTPS). Admin cookies are marked `Secure` automatically when the proxy sends `X-Forwarded-Proto: https`.
- Use a **persistent disk** for `uploads/` (Hostinger: handled automatically).

## Notes

- **Maps** use Leaflet with OpenStreetMap tiles (no API key needed). For heavy commercial traffic, switch the tile URL in `public/js/common.js` (`makeMap`) to a keyed provider such as MapTiler, Stadia or Google.
- **Photos**: seed listings hot-link images from Unsplash (free for commercial use, no attribution required). Replace them with your own photos from the admin as you list real partners.
- **Prices** on transport, experiences, rentals and packages show "Best price on WhatsApp" until you add an amount in the admin.
