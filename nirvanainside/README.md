# Nirvana Inside — platform

**nirvanainside.com**: stays, taxis, experiences, rentals and tour packages across Himachal Pradesh. Every customer enquiry is saved in the admin panel and sent to **one WhatsApp number**.

## Run it

Needs Node.js 20 or newer. There are no packages to install.

```bash
cp .env.example .env        # then set ADMIN_PASSWORD and SESSION_SECRET
npm start                   # → http://localhost:8080   admin → /admin
```

On first start, `data/seed.js` is copied to `data/db.json`. After that, everything is managed from **/admin**. Back up `data/db.json` and `uploads/` regularly, because they hold all your listings, vendors and enquiries.

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

- Set `ADMIN_PASSWORD` and `SESSION_SECRET` as environment variables.
- Put it behind HTTPS (Nginx/Caddy, or the platform's built-in HTTPS). Admin cookies are marked `Secure` automatically when the proxy sends `X-Forwarded-Proto: https`.
- Use a **persistent disk** for `data/` and `uploads/`.

## Notes

- **Maps** use Leaflet with OpenStreetMap tiles (no API key needed). For heavy commercial traffic, switch the tile URL in `public/js/common.js` (`makeMap`) to a keyed provider such as MapTiler, Stadia or Google.
- **Photos**: Thakur Cottage uses the real property photos. All other images are hot-linked from Unsplash (free for commercial use, no attribution required). Replace them with your own as you list real partners.
- **Prices** on transport, experiences, rentals and packages show "Best price on WhatsApp" until you add an amount in the admin.
- Data is stored in one JSON file, which is fine for thousands of listings and enquiries. Move to a database (SQLite/Postgres) if you outgrow it.
