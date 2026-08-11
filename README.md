# GlobeTrotter – Travel Assistant

**Live:** https://globaltrotter.duckdns.org

## Overview

**GlobeTrotter Travel Assistant** is a distributed travel recommendation and trip-planning application. Users discover destinations, build itineraries, and receive recommendations based on their travel style, budget and past trips.

The project is built in three phases:

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Flask monolith | Complete |
| 2 | Microservices behind an API gateway, containerised, deployed to a VPS | Complete |
| 3 | Kubernetes, auto-scaling, managed datastores, cloud provider | Upcoming |

---

# Architecture

Four containers on a private Docker network. Only the gateway publishes a port, and in production it binds to loopback only, with Nginx as the sole public entry point.

```
                    Nginx (443, TLS)
                    ├── /              →  React build on disk
                    └── /api/          →  127.0.0.1:6000  (prefix stripped)
                                             │
                                       api-gateway :5000
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
                 user-service :5001  itinerary-service :5002  destination-service :5003
                   users.json           itineraries.json      destinations.json
                   otp_pending.json                           comments.json
                   otp_reset.json                             destination_requests.json
                                                              uploads/
```

Each service owns its data outright and reaches the others only over REST. Cross-service calls go through `/internal/*` endpoints guarded by a shared `X-Internal-Key` header, which the gateway refuses to proxy.

`JWT_SECRET_KEY` is shared across all services so `@jwt_required()` verifies locally with no network hop; only fetching the user record costs a call.

---

# Project structure

```
.
├── global_trotter_backend/
│   ├── .env                          # server-side only, never committed
│   ├── .gitignore
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.debug.yml
│   ├── smoke-test.sh
│   ├── README-microservices.md
│   │
│   ├── api-gateway/                  # :5000 — routing, CORS, /internal blocking
│   │   ├── .dockerignore
│   │   ├── Dockerfile
│   │   ├── app.py
│   │   ├── config.py
│   │   ├── routing.py
│   │   └── requirements.txt
│   │
│   ├── user-service/                 # :5001 — auth, OTP, Google, preferences
│   │   ├── .dockerignore
│   │   ├── Dockerfile
│   │   ├── app.py
│   │   ├── config.py
│   │   ├── data/                     # users.json, otp_pending.json, otp_reset.json
│   │   ├── routes/                   # auth.py, users.py, internal.py
│   │   ├── services/                 # brevo_service.py, otp_service.py, google_auth_service.py
│   │   ├── utils/identifier.py
│   │   └── tests/
│   │
│   ├── itinerary-service/            # :5002 — itinerary CRUD, ordering, sharing
│   │   ├── .dockerignore
│   │   ├── Dockerfile
│   │   ├── data/                     # itineraries.json
│   │   ├── routes/                   # itineraries.py, internal.py
│   │   ├── services/                 # clients.py, service_client.py, storage.py
│   │   └── tests/
│   │
│   └── destination-service/          # :5003 — destinations, comments, moderation, places, AI
│       ├── .dockerignore
│       ├── Dockerfile
│       ├── data/                     # destinations.json, comments.json, destination_requests.json
│       ├── uploads/destinations/     # seed images only; live uploads are outside the repo
│       ├── routes/                   # destinations.py, comments.py, admin.py, my_destinations.py,
│       │                             # notifications.py, places.py, ai.py, recommendations.py,
│       │                             # uploads.py, internal.py
│       ├── services/                 # geoapify.py, ai_assistant.py, scoring.py, images.py, urls.py
│       └── tests/
│
├── global_trotter_web/
│   ├── .env.development
│   ├── .env.production               # tracked; contains no secrets
│   ├── vite.config.js
│   ├── jest.config.cjs
│   ├── jest.polyfills.cjs
│   ├── index.html
│   ├── public/
│   ├── tests/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── utils/
│       ├── context/
│       ├── i18n/
│       └── styles/
│
├── CHANGELOG.md
└── README.md
```

---

# Local development

## Backend

```bash
cd global_trotter_backend
docker compose up -d --build
```

Gateway on http://localhost:5000. Health check across the whole stack:

```bash
curl http://localhost:5000/health
```

Create `.env` in `global_trotter_backend/`:

```dotenv
JWT_SECRET_KEY=<long random string>
INTERNAL_API_KEY=<long random string>

ALLOWED_ORIGINS=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5000
PROXY_TIMEOUT=30

BREVO_API_KEY=
BREVO_SENDER_EMAIL=no-reply@example.com
BREVO_SENDER_NAME=GlobalTrotter
BREVO_SMS_SENDER=GlobTrot
OTP_EXPIRY_MINUTES=10

GOOGLE_CLIENT_ID=
GEOAPIFY_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Leave `BREVO_API_KEY` empty in development: verification codes are logged to the console and echoed back as `dev_otp`, so the full auth flow works without a Brevo account. The Google button stays hidden until `VITE_GOOGLE_CLIENT_ID` is set.

To reach individual services directly for debugging:

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d
```

This publishes 5001–5003. Never use it on a server.

## Frontend

```bash
cd global_trotter_web
npm install
npm run dev
```

Runs on http://localhost:5173. `.env.development`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

To reach the dev server from a phone on the same network, `VITE_API_BASE_URL` must point at your machine's LAN IP rather than `localhost`, and the backend's `ALLOWED_ORIGINS` must include that origin. Note that `navigator.geolocation` is blocked on insecure origins, so the map's location features will not work over a plain-HTTP LAN address.

---

# Testing

Each service runs its own pytest suite — all three define modules named `config`, `app`, `routes` and `services`, so they cannot share a process.

```bash
cd global_trotter_backend/user-service        && pytest
cd global_trotter_backend/itinerary-service   && pytest
cd global_trotter_backend/destination-service && pytest
```

143 tests. Cross-service calls are replaced with in-memory fakes; tokens are minted directly with `create_access_token`, since only user-service can register.

End-to-end against a running stack, through the gateway only:

```bash
cd global_trotter_backend
bash smoke-test.sh http://localhost:5000
```

Ten checks covering every path that crosses a service boundary. Against production, pass the public base including the prefix:

```bash
bash smoke-test.sh https://globaltrotter.duckdns.org/api
```

Frontend:

```bash
cd global_trotter_web && npm test
```

145 tests across 12 suites, run under Jest with jsdom. `jest.polyfills.cjs` supplies what jsdom lacks — `TextEncoder`/`TextDecoder` and an `IntersectionObserver` stub, without which any page using a scroll observer fails to render in tests.

---

# Deployment

## Layout on the server

```
/root/globetrotter-capstone/            repository
/var/www/globaltrotter/                 published React build
/var/www/globaltrotter-uploads/         user-uploaded images (outside the repo)
/etc/nginx/sites-available/globaltrotter
/root/deploy-globaltrotter.sh
```

## Routing

Both the React routes and the API routes are top-level (`/destinations`, `/itineraries`, `/login` exist in each), so they cannot share a namespace. Nginx serves the SPA at `/` and strips `/api/` before proxying:

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:6000/;
}
```

The trailing slash on `proxy_pass` performs the strip, so `/api/destinations` reaches the gateway as `/destinations` and no backend route changed. Being same-origin, CORS never engages in production.

Destination images are served straight from disk rather than through Flask:

```nginx
location ^~ /api/images/destinations/ {
    alias /var/www/globaltrotter-uploads/destinations/;
}
```

## Production environment

`.env` on the server adds two values absent locally:

```dotenv
GATEWAY_BIND=127.0.0.1:6000
UPLOADS_HOST_DIR=/var/www/globaltrotter-uploads

ALLOWED_ORIGINS=https://globaltrotter.duckdns.org
PUBLIC_BASE_URL=https://globaltrotter.duckdns.org/api
```

`GATEWAY_BIND` keeps the gateway on loopback and off port 5000, which belongs to another application on this host. `UPLOADS_HOST_DIR` puts uploads outside the repository so a pull or rebuild cannot destroy them. Both have development defaults in `docker-compose.yml`, so a laptop needs neither.

`PUBLIC_BASE_URL` must include the `/api` prefix — it is what `destination-service` uses to build absolute image URLs, forwarded from the gateway as `X-Gateway-Public-Url`.

## Deploying

```bash
/root/deploy-globaltrotter.sh
```

Pulls, rebuilds the containers, waits for `/health` to report ok, rebuilds the frontend, verifies the MapLibre worker files are present, publishes to `/var/www/globaltrotter`, and reloads Nginx. If the backend does not come up, it aborts with the previous frontend still serving.

## Server-side state not in the repository

- `global_trotter_backend/.env` — created directly on the server, `chmod 600`
- `/etc/nginx/sites-available/globaltrotter`
- `/etc/nginx/mime.types` — maps `mjs` to `application/javascript`, without which MapLibre's worker is served as `application/octet-stream` and the browser refuses to execute it
- TLS certificate at `/etc/letsencrypt/live/globaltrotter.duckdns.org/`, auto-renewed by certbot
- `/var/www/globaltrotter-uploads/` — user-submitted images exist only here

## Logs

```bash
docker logs -f gt-user-service
tail -f /var/log/nginx/error.log
```

Container logs rotate at 10 MB × 3 files per service.

---

# Authentication

Sign-up branches on identifier type:

- **Email** — two-step OTP. `/register` sends a 6-digit code; the account is created only once `/verify-email` succeeds
- **Phone** — skips OTP entirely (no SMS credits required) and logs the user in immediately
- **Google** — `/auth/google` verifies an ID token server-side and creates or logs into an already-verified account

If both an email and a phone number are supplied, email takes priority.

Passwords use Werkzeug's `pbkdf2:sha256`. Records created before Phase 2 carry `scrypt:` hashes and validate unchanged. Rotating `JWT_SECRET_KEY` invalidates existing sessions but not passwords.

---

# Notifications

`GET /notifications` derives its payload from `destination_requests.json` rather than storing notifications of its own, and returns a different set depending on who is asking:

- **Admins** receive every request still pending review
- **Owners** receive their own requests that have been resolved — approved, rejected, or acted on directly by an admin

Each item carries a key built from the request id, its status and its review timestamp, so a request that is reviewed twice produces a new key. The frontend keeps the set of keys the user has already seen in `localStorage`, namespaced per user id, and treats anything absent from that set as unseen.

Unseen items surface as a dot in three places at once: the profile icon in the nav, the admin dashboard or manage destinations row inside Profile, and the individual request or destination card. Opening the list that contains them marks them seen on leaving the page, so the dots stay visible for the whole visit rather than vanishing on arrival.

`NotificationsProvider` refreshes on navigation (throttled to five seconds), on tab focus, and every sixty seconds. There is no push channel — see the limitations below.

---

# REST API

All paths are public through the gateway. In production they are reached under `/api/`.

| Method | Endpoint | Auth | Service | Description |
|--------|----------|:----:|---------|-------------|
| GET | `/health` | No | gateway | Gateway plus all three services |
| POST | `/register` | No | user | Email sends OTP; phone logs in immediately |
| POST | `/verify-email` | No | user | Confirm OTP and create the account |
| POST | `/resend-otp` | No | user | Reissue a code for a pending registration |
| POST | `/login` | No | user | Authenticate, returns a JWT |
| POST | `/auth/google` | No | user | Sign up or log in with a Google ID token |
| POST | `/forgot-password` | No | user | Send a reset OTP by email |
| POST | `/verify-reset-code` | No | user | Confirm a reset code |
| POST | `/reset-password` | No | user | Set a new password |
| PUT | `/users/preferences` | Yes | user | Update travel-style preferences |
| GET | `/destinations` | No | destination | Search the catalogue |
| POST | `/destinations/<id>/rating` | Yes | destination | Rate a destination |
| POST/DELETE | `/destinations/<id>/favorite` | Yes | destination | Add or remove a favourite |
| GET | `/favorites` | Yes | destination | List favourites |
| GET | `/recommendations` | Yes | destination | Personalised ranking |
| GET/POST | `/destinations/<id>/comments` | Mixed | destination | Read or post comments |
| POST/DELETE | `/destinations/<id>/comments/<cid>/pin` | Yes | destination | Pin or unpin a comment |
| GET | `/notifications` | Yes | destination | Pending requests for admins, resolved requests for owners |
| GET | `/my-destinations` | Yes | destination | Your submissions |
| PUT | `/my-destinations/requests/<id>` | Yes | destination | Edit a pending submission |
| GET | `/admin/requests` | Admin | destination | Pending review queue |
| POST | `/admin/requests/<id>/approve` | Admin | destination | Approve a submission |
| POST | `/admin/requests/<id>/reject` | Admin | destination | Reject a submission |
| GET | `/places/search` | No | destination | Geoapify autocomplete |
| GET | `/places/nearby` | No | destination | Nearby services |
| GET | `/places/route` | No | destination | Route geometry between waypoints |
| GET | `/images/destinations/<file>` | No | destination | Destination image (served by Nginx in production) |
| GET/POST | `/itineraries` | Yes | itinerary | List or create |
| PUT | `/itineraries/<id>/destinations` | Yes | itinerary | Reorder stops |
| POST | `/itineraries/<id>/share` | Yes | itinerary | Share by email |
| GET | `/itineraries/<id>/shared-users` | Yes | itinerary | List recipients |
| DELETE | `/itineraries/<id>` | Yes | itinerary | Delete |

See `README-microservices.md` for the internal API and the full routing table.

## Examples

Register by email — in development, with no `BREVO_API_KEY`, the code is returned as `dev_otp`:

```bash
curl -X POST https://globaltrotter.duckdns.org/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"supersecret"}'
```

```bash
curl -X POST https://globaltrotter.duckdns.org/api/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","code":"482913"}'
```

```bash
curl -X POST https://globaltrotter.duckdns.org/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"supersecret"}'
```

```bash
curl https://globaltrotter.duckdns.org/api/recommendations \
  -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST https://globaltrotter.duckdns.org/api/itineraries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Weekend Trip","destinations":["dest_001","dest_002"]}'
```

---

# Frontend

React 19, Vite 8, React Router 7, MapLibre GL 6. Maps render with OpenFreeMap tiles; search, nearby places and routing go through the backend so the Geoapify key stays server-side. The interface is fully bilingual, English and French, driven by `src/i18n/translations.js` and the `useTranslation` hook.

## Pages

Landing · Register · Login · Verify OTP · Select style · Home · Destinations · Destination detail · Itineraries · Itinerary detail · Map · Favorites · My Destinations · My Destination detail · Destination form · Profile · Admin dashboard

## Navigation

The bottom nav becomes a sticky top bar from 1024px up. Page headers scroll away with the content, and `useHeaderPassed` detects the moment a header clears the top of the viewport — the same moment the nav anchors. At that point `FloatingBackButton` appears: docked at the far left of the nav bar on desktop, floating at the top left on mobile.

## Map

The map draws the active itinerary, nearby services, searched places and the route between stops. Routing defaults to starting from the user's live position, re-routing when they move more than 50 metres; any address can be typed in instead, in which case it is pinned with its own flag marker and the live position is ignored. Three travel modes are available — on foot, by bike, by car — each with a straight-line fallback speed used when Geoapify cannot return a route.

## Build note

MapLibre v6 constructs its worker URL at runtime from `import.meta.url`, which Rolldown cannot resolve statically, so the chunk is never emitted. `vite.config.js` carries a `copyMaplibreWorker` plugin that copies `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` into `dist/assets` after each build. Without it the map renders controls and attribution over a blank canvas, and the worker request hangs rather than failing cleanly.

---

# Known limitations

- JSON files are not a database. Each service is capped at one Gunicorn worker because `storage.py` guards writes with a `threading.Lock`, which holds only within a process. Horizontal scaling is impossible until each service owns a real datastore — the first task of Phase 3
- No service discovery beyond Compose DNS; addresses are hardcoded environment variables
- All communication is synchronous REST, so a slow dependency slows its caller
- Deleting a user does not cascade to their itineraries or comments; those services degrade to placeholder names
- Route geometry is fetched from Geoapify uncached on every request
- Notifications are polled rather than pushed, and which items a user has already seen lives in `localStorage`, so the dots reappear on a different browser or after clearing site data
- Backend fields written by users — descriptions, advice — are stored in a single language; only closed-vocabulary fields and interface strings are translated