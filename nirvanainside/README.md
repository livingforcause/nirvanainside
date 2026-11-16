# Nirvana Inside — platform

**nirvanainside.com**: stays, taxis, experiences, rentals and tour packages across Himachal Pradesh. Every customer enquiry is saved in the admin panel and sent to **one WhatsApp number**.

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
2. They add their name and phone number. The enquiry is **saved** (`/api/enquiries`) with a reference like `NI261116-2314` and the traffic source (`?utm_source=` or `?ref=`).
3. WhatsApp opens with the full request written out, sent to the number in **Admin → Settings**.
4. In **Admin → Enquiries**, the team assigns a vendor and taps **Ask** to WhatsApp the owner, manager or driver. That message includes the request details but never the customer's number. The team then moves the enquiry through New → Contacted → Checking vendor → Quoted → Confirmed, adds notes and sets follow-up dates. **Export CSV** downloads everything.

## Admin panel

| Section | What you manage |
|---|---|
| Listings | Stays (hotel, homestay, long-term), transport (private & public), experiences, rentals, packages. 7–10 photos (upload or link), room types with prices and amenities, mandatory details, itinerary, map pin, vendor, status (draft / published / coming soon) |
| Vendors | Business, type, owner and manager names and phones, WhatsApp, licence/GST, inventory, net rates, commission, payment terms, rating, notes. **Never shown publicly** |
| Enquiries | Pipeline, customer WhatsApp/call, vendor WhatsApp, quote, follow-up, notes, CSV export |
| Settings | WhatsApp number, phone, email, office address, links |

## Deploying

This app needs a host that runs Node, such as a VPS (Hostinger, DigitalOcean, Lightsail), Render or Railway. A static-only host won't work.

- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` and `DB_HOST` (`127.0.0.1` on Hostinger, never `localhost`), `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` as environment variables.
- Put it behind HTTPS (Nginx/Caddy, or the platform's built-in HTTPS). Admin cookies are marked `Secure` automatically when the proxy sends `X-Forwarded-Proto: https`.
- Use a **persistent disk** for `uploads/` (Hostinger: handled automatically).

## Notes

- **Maps** use Leaflet with OpenStreetMap tiles (no API key needed). For heavy commercial traffic, switch the tile URL in `public/js/common.js` (`makeMap`) to a keyed provider such as MapTiler, Stadia or Google.
- **Photos**: Thakur Cottage uses the real property photos. All other images are hot-linked from Unsplash (free for commercial use, no attribution required). Replace them with your own as you list real partners.
- **Prices** on transport, experiences, rentals and packages show "Best price on WhatsApp" until you add an amount in the admin.
