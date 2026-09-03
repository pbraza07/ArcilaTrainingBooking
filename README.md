# Arcila Training Booking App

A mobile-first booking system for private training, seven-player small groups, birthday parties, and team/club practice reservations. The public calendar never exposes customer information.

## Included

- Source-quality Arcila logo rendered at its natural aspect ratio
- Monthly booking calendar and live availability
- Conflict-safe D1/SQLite reservations and seven-player group limits
- Customer and staff SMS/email notification hooks
- Protected staff schedule and approval controls
- Daily 8:00 PM America/New_York report endpoint
- Deployment configuration for ChatGPT Sites and Render

## Local development

Requirements: Node.js 22.13 or newer, Linux, `curl`, `flock`, and GNU `timeout`.

```bash
npm run install:ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill in only the integrations you intend to use. Never commit real credentials.

## GitHub

Unzip this package, create an empty GitHub repository, and run:

```bash
git init
git add .
git commit -m "Initial Arcila Training booking app"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

## Render deployment

The included `render.yaml` creates:

- A Node web service using the Vinext/Cloudflare-compatible build
- A 1 GB persistent disk for the local D1/SQLite database
- An hourly cron check that sends the daily report only at 8:00 PM America/New_York

The app is pinned to Node.js `22.13.0`. Its normal `npm run start` command uses Wrangler's local worker runtime so imports such as `cloudflare:workers` work correctly on Render.

Steps:

1. Push the unzipped project to GitHub.
2. In Render, choose **New > Blueprint** and connect the repository.
3. Enter all values marked `sync: false`.
4. Set `ARCILA_APP_URL` on both services to the final Render URL.
5. Use the exact same `ARCILA_CRON_SECRET` value on the web and cron services.
6. Deploy and open `/staff` to use the password configured in `ARCILA_STAFF_PASSWORD`.

For the complete click-by-click instructions and required values, see [`RENDER_SETUP.md`](RENDER_SETUP.md).

The persistent disk requires a paid Render web-service plan. Removing the disk may allow a lower-cost plan, but reservations can be erased whenever the service restarts or redeploys.

## Notifications

SMS requires a Twilio account, messaging-capable number, and production-approved recipient rules. Email requires a Resend API key and a verified sending domain. Without those credentials, bookings are stored and notification attempts are recorded as `configuration_required`.

## Database and reports

Render startup automatically applies the SQL migrations in `drizzle/`. The daily cron runs hourly because Render schedules in UTC; the script checks America/New_York and exits unless the local hour is 8:00 PM.

The Render startup script also transfers the Render environment variables into the Cloudflare-compatible worker through a private temporary file. That file is created at runtime with owner-only permissions and is never committed to GitHub.

## Production security

- Set a unique staff password of at least 12 characters.
- Keep all secrets in Render environment variables.
- Restrict GitHub access if this code will contain private business changes.
- Back up the persistent data disk regularly.
- Review consent, cancellation, privacy, and messaging language with counsel before taking live customer bookings.
