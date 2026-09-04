# GlobeTrotter – Travel Assistant

**Live:** https://globaltrotter.duckdns.org

## Overview

**GlobeTrotter Travel Assistant** is a distributed travel recommendation and trip-planning application. Users discover destinations, build itineraries, receive recommendations based on their travel style, and talk to each other in a shared chat room.

The project is built in three phases:

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Flask monolith | Complete |
| 2 | Microservices behind an API gateway, containerised, deployed to a VPS | Complete |
| 3 | Kubernetes, auto-scaling, managed datastores, cloud provider | Upcoming |

---

# Architecture

Five containers on a private Docker network. Two publish a port, and in production both bind to loopback with Nginx as the sole public entry point.

```
                    Nginx (443, TLS)
                    ├── /              →  React build on disk
                    ├── /api/          →  127.0.0.1:6000  (prefix stripped)
                    ├── /socket.io/    →  127.0.0.1:6004  (websocket upgrade)
                    ├── /voice/        →  /var/www/globaltrotter-voice
                    └── /media/        →  /var/www/globaltrotter-media
                                             │
                                       api-gateway :5000
                                             │
                ┌────────────────┬───────────┴────────┬────────────────┐
                │                │                    │                │
         user-service     itinerary-service   destination-service  chat-service
             :5001             :5002                :5003             :5004
          users.json      itineraries.json    destinations.json   messages.json
       otp_pending.json                         comments.json        voice/
        otp_reset.json                   destination_requests.json   media/
                                                  uploads/
```

Each service owns its data outright and reaches the others only over REST. Cross-service calls go through `/internal/*` endpoints guarded by a shared `X-Internal-Key` header, which the gateway refuses to proxy.

`JWT_SECRET_KEY` is shared across all services so `@jwt_required()` verifies locally with no network hop; only fetching the user record costs a call.

## Why chat sits beside the gateway, not behind it

`api-gateway` forwards with `requests` — a request in, a response out. A WebSocket has no end: after the handshake there is no request and no response, just frames on a connection held open for as long as the page is open. Proxying that would mean converting the gateway to an async worker and holding one open connection per chat user on the single process that already serves login, destinations and itineraries.

Nginx routes `/socket.io/` straight to chat-service instead. The gateway's three jobs are still covered: Socket.IO runs its own CORS check against `ALLOWED_ORIGINS`, the JWT is verified in `on_connect` with the same shared secret, and chat-service exposes no `/internal/*` routes to block.

File uploads are the exception — those *are* ordinary HTTP, so they go through the gateway at `POST /api/chat/upload`. Chat therefore uses both paths: HTTP through the gateway for uploads, the direct socket for messaging.

---

# Project structure

```
.
├── global_trotter_backend/
│   ├── .env                          # server-side only, never committed
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.debug.yml
│   ├── smoke-test.sh
│   ├── README-microservices.md
│   │
│   ├── api-gateway/                  # :5000 — routing, CORS, /internal blocking
│   │   └── app.py  config.py  routing.py
│   │
│   ├── user-service/                 # :5001 — auth, OTP, Google, preferences
│   │   ├── data/                     # users.json, otp_pending.json, otp_reset.json
│   │   ├── routes/                   # auth.py, users.py, internal.py
│   │   ├── services/                 # brevo_service.py, otp_service.py, google_auth_service.py
│   │   └── tests/
│   │
│   ├── itinerary-service/            # :5002 — itinerary CRUD, ordering, sharing
│   │   ├── data/                     # itineraries.json
│   │   ├── routes/                   # itineraries.py, internal.py
│   │   ├── services/                 # clients.py, service_client.py, storage.py
│   │   └── tests/
│   │
│   ├── destination-service/          # :5003 — destinations, comments, moderation, places, AI
│   │   ├── data/                     # destinations.json, comments.json, destination_requests.json
│   │   ├── uploads/destinations/     # seed images only; live uploads are outside the repo
│   │   ├── routes/                   # destinations.py, comments.py, admin.py, my_destinations.py,
│   │   │                             # places.py, ai.py, recommendations.py, uploads.py, internal.py
│   │   ├── services/                 # geoapify.py, ai_assistant.py, scoring.py, images.py, urls.py
│   │   └── tests/
│   │
│   └── chat-service/                 # :5004 — websocket chat, voice notes, attachments
│       ├── app.py                    # Socket.IO events + /chat/upload + /voice + /media
│       ├── config.py
│       ├── data/                     # messages.json
│       ├── voice/                    # dev only; production mounts /var/www/globaltrotter-voice
│       ├── media/                    # dev only; production mounts /var/www/globaltrotter-media
│       └── services/                 # messages.py, voice.py, media.py, clients.py, storage.py
│
├── global_trotter_web/
│   ├── .env.development
│   ├── .env.production               # tracked; contains no secrets
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx  main.jsx
│       └── components/  pages/  hooks/  services/  utils/  context/  styles/  i18n/
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

`.env.development`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

`vite.config.js` must proxy the three paths that bypass the gateway, or chat, voice playback and attachments all fail in development:

```javascript
server: {
  host: true,
  proxy: {
    '/socket.io': { target: 'http://localhost:5004', ws: true },
    '/voice':     { target: 'http://localhost:5004' },
    '/media':     { target: 'http://localhost:5004' }
  }
}
```

`ws: true` is required — without it the upgrade is dropped and the socket falls back to polling. Without the `/voice` and `/media` entries the dev server answers with `index.html` and a 200, which surfaces in the browser as "no supported source was found" rather than as a routing error.

To reach the dev server from a phone on the same network, `VITE_API_BASE_URL` must point at your machine's LAN IP and the backend's `ALLOWED_ORIGINS` must include that origin. Note that `navigator.geolocation` and `getUserMedia` are both blocked on insecure origins, so the map's location features and voice recording will not work over a plain-HTTP LAN address.

---

# Testing

Each service runs its own pytest suite — all of them define modules named `config`, `app`, `routes` and `services`, so they cannot share a process. Running `pytest` from the backend root collects them into one process and fails with confusing import errors.

```bash
cd global_trotter_backend/user-service        && pytest
cd global_trotter_backend/itinerary-service   && pytest
cd global_trotter_backend/destination-service && pytest
```

134 tests. Cross-service calls are replaced with in-memory fakes; tokens are minted directly with `create_access_token`, since only user-service can register. **chat-service has no test suite yet.**

End-to-end against a running stack, through the gateway only:

```bash
cd global_trotter_backend
bash smoke-test.sh http://localhost:5000
bash smoke-test.sh https://globaltrotter.duckdns.org/api
```

Ten checks covering every path that crosses a service boundary. Chat is not covered — its transport is a socket rather than HTTP.

Frontend:

```bash
cd global_trotter_web && npm test
```

---

# Deployment

## Layout on the server

```
/root/globetrotter-capstone/            repository
/var/www/globaltrotter/                 published React build
/var/www/globaltrotter-uploads/         destination images
/var/www/globaltrotter-voice/           chat voice notes
/var/www/globaltrotter-media/           chat photos, videos, files
/etc/nginx/sites-available/globaltrotter
/root/deploy-globaltrotter.sh
```

All four `/var/www` content directories sit outside the repository, so a pull or rebuild cannot destroy user-submitted content.

## Routing

React routes and API routes are both top-level (`/destinations`, `/itineraries`, `/login` exist in each), so they cannot share a namespace. Nginx serves the SPA at `/` and strips `/api/` before proxying:

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:6000/;
}
```

The trailing slash performs the strip, so `/api/destinations` reaches the gateway as `/destinations`. Being same-origin, CORS never engages in production.

The socket needs the upgrade headers, without which Nginx strips the handshake and the connection fails with a 400:

```nginx
location ^~ /socket.io/ {
    proxy_pass http://127.0.0.1:6004;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

`/voice/` and `/media/` are served straight from disk. Both need explicit audio MIME types, because Nginx's `mime.types` maps `webm` to **video**/webm and an `<audio>` element refuses that. A `types` block is safe in those locations specifically because nothing but media is routed through them.

## Production environment

`.env` on the server adds values absent locally:

```dotenv
GATEWAY_BIND=127.0.0.1:6000
CHAT_BIND=127.0.0.1:6004
UPLOADS_HOST_DIR=/var/www/globaltrotter-uploads
VOICE_HOST_DIR=/var/www/globaltrotter-voice
MEDIA_HOST_DIR=/var/www/globaltrotter-media

ALLOWED_ORIGINS=https://globaltrotter.duckdns.org
PUBLIC_BASE_URL=https://globaltrotter.duckdns.org/api
```

The two `_BIND` values keep both public services on loopback. Port 5000 on that host belongs to another application, which is why the gateway is on 6000. All of these have development defaults in `docker-compose.yml`, so a laptop needs none of them.

`PUBLIC_BASE_URL` must include the `/api` prefix — destination-service uses it to build absolute image URLs, forwarded from the gateway as `X-Gateway-Public-Url`.

## Deploying

```bash
/root/deploy-globaltrotter.sh
```

Pulls, syncs seed images with `cp` (never `rsync --delete`, since user uploads exist only on the server), rebuilds the containers, waits for `/health`, rebuilds the frontend, verifies the MapLibre worker files are present, publishes, and reloads Nginx. If the backend does not come up, it aborts with the previous frontend still serving.

## Server-side state not in the repository

- `global_trotter_backend/.env` — created directly on the server, `chmod 600`
- `/etc/nginx/sites-available/globaltrotter`
- `/etc/nginx/mime.types` — maps `mjs` to `application/javascript`, without which MapLibre's worker is served as `application/octet-stream` and the browser refuses to execute it
- TLS certificate at `/etc/letsencrypt/live/globaltrotter.duckdns.org/`, auto-renewed by certbot
- The four `/var/www` content directories

## Logs

```bash
docker logs -f gt-chat-service
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

Tokens last 30 days and live in `localStorage`. A 401 carrying a token clears the session and redirects to login; a 401 without one surfaces its real error, so a wrong password still reads as a wrong password.

---

# REST API

All paths are public through the gateway. In production they are reached under `/api/`.

| Method | Endpoint | Auth | Service | Description |
|--------|----------|:----:|---------|-------------|
| GET | `/health` | No | gateway | Gateway plus all downstream services |
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
| PUT | `/itineraries/<id>` | Yes | itinerary | Edit title, dates, destinations |
| PUT | `/itineraries/<id>/destinations` | Yes | itinerary | Reorder stops |
| POST | `/itineraries/<id>/share` | Yes | itinerary | Share by email or phone |
| GET | `/itineraries/<id>/shared-users` | Yes | itinerary | List recipients |
| DELETE | `/itineraries/<id>/share/<user_id>` | Yes | itinerary | Revoke access |
| DELETE | `/itineraries/<id>` | Yes | itinerary | Delete |
| POST | `/chat/upload` | Yes | chat | Upload a photo, video or file to the chat |

See `README-microservices.md` for the internal API and the full routing table.

## Socket events

Chat runs over Socket.IO at `/socket.io/`, not through the gateway. The JWT travels in the connect payload, since Socket.IO cannot read an `Authorization` header on the handshake; a bad or missing token means the connection never establishes.

| Direction | Event | Payload |
|-----------|-------|---------|
| → server | `chat:join` | — |
| → server | `chat:leave` | — |
| → server | `chat:send` | `{ text, reply_to }` |
| → server | `chat:voice` | `{ blob, mime, duration, reply_to }` |
| → server | `chat:edit` | `{ id, text }` |
| → server | `chat:delete` | `{ id }` |
| ← client | `chat:history` | `{ messages }` — last 50 |
| ← client | `chat:message` | `{ message }` |
| ← client | `chat:updated` | `{ message }` |
| ← client | `chat:deleted` | `{ id }` |
| ← client | `chat:error` | `{ error }` |

## Examples

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
curl -X POST https://globaltrotter.duckdns.org/api/chat/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg" \
  -F "caption=Mont Fébé at sunset"
```

---

# Frontend

React 19, Vite 8, React Router 7, MapLibre GL 6, socket.io-client. Maps render with OpenFreeMap tiles; search, nearby places and routing go through the backend so the Geoapify key stays server-side. English and French throughout, via a `translations.js` dictionary and a `useTranslation` hook.

## Pages

Landing · Register · Login · Verify OTP · Select style · Home · Destinations · Destination detail · Itineraries · Itinerary detail · Map · Chat · Favorites · My Destinations · My Destination detail · Destination form · Profile · Admin dashboard

## Chat

Opt-in: nothing connects until the user presses "Join general chat", and that choice persists per user in `localStorage` so returning to the tab rejoins automatically. Text messages, replies, editing and deleting your own, voice notes recorded with `MediaRecorder`, and photo, video and file attachments.

Voice notes travel over the socket as an `ArrayBuffer` — small, hard-capped at 60 seconds. Attachments do not: a 20 MB video held in a socket frame blocks the eventlet greenlet and gives no upload progress, so they go over HTTP with `XMLHttpRequest` for its progress events. Images are compressed in the browser first — 1600 px longest edge, JPEG quality 82 — which takes a 4 MB phone photo to roughly 300 KB.

Uploads are restricted to a MIME whitelist that excludes SVG and HTML, since an SVG served inline in a room everyone sees is stored XSS. Non-media is served as a download with `nosniff`.

## Build notes

MapLibre v6 constructs its worker URL at runtime from `import.meta.url`, which Rolldown cannot resolve statically, so the chunk is never emitted. `vite.config.js` carries a `copyMaplibreWorker` plugin that copies `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` into `dist/assets` after each build. Without it the map renders controls and attribution over a blank canvas, and the worker request hangs rather than failing cleanly. The deploy script asserts both files exist before publishing.

`optimizeDeps.exclude` for `maplibre-gl` is scoped to `command === 'serve'`. It affects only the dev server and was not the cause of the missing worker.

---

# Known limitations

- **JSON files are not a database.** Each service is capped at one Gunicorn worker because `storage.py` guards writes with a `threading.Lock`, which holds only within a process. The "at least 3 instances of each service" requirement cannot be met while replicas each hold their own copy on local disk — the first task of Phase 3
- **For chat, `--workers 1` is load-bearing rather than merely limiting.** Broadcasting works because every connected client shares one process's memory; a second worker would deliver each message to only the half of the room connected to it. Redis as a Socket.IO message broker is a prerequisite for the Phase 3 replica count, not an optimisation
- `messages.json` grows without bound and is written far more often than any other data file
- The upload path holds the whole file in memory twice — once in the gateway, once in chat-service
- No chat moderation. Any signed-in user can post to a room everyone sees; admin removal was deferred
- chat-service has no automated tests
- No service discovery beyond Compose DNS; addresses are hardcoded environment variables
- All communication is synchronous REST, so a slow dependency slows its caller
- Deleting a user does not cascade to their itineraries, comments or messages; those degrade to placeholder names
- Route geometry is fetched from Geoapify uncached on every request
- Uploaded media is deleted only when its message is; nothing sweeps files orphaned by a failed write