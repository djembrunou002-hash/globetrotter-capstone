# GlobeTrotter – Travel Assistant

## Overview

**GlobeTrotter Travel Assistant** is a **distributed travel recommendation and trip planning application** designed to help users discover new destinations, organize their trips, and receive personalized travel recommendations based on their preferences and interests.

The project starts as a **monolithic Flask application** that serves as the foundation for a semester-long capstone project. Students first build the monolith, then progressively refactor it into a **microservices architecture**, and finally deploy it to the cloud using resilience patterns and cloud-native technologies such as:

- Docker
- Kubernetes
- Cloud-native tooling

# BACKEND

## Project Structure

```
.
├── .git/
├── global_trotter_backend/
│   ├── .env
│   ├── .gitignore
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── data/
│   │   ├── destinations.json
│   │   ├── itineraries.json
│   │   ├── comments.json
│   │   ├── destination_requests.json
│   │   ├── otp_pending.json        # pending email sign-ups awaiting OTP verification
│   │   ├── otp_reset.json          # active password-reset codes
│   │   └── users.json
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── comments.py
│   │   ├── destinations.py
│   │   ├── itineraries.py
│   │   ├── my_destinations.py
│   │   ├── places.py
│   │   ├── recommendations.py
│   │   ├── uploads.py
│   │   └── users.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_helpers.py
│   │   ├── brevo_service.py        # Brevo transactional email/SMS wrapper (OTP delivery)
│   │   ├── destination_requests.py
│   │   ├── geoapify.py
│   │   ├── google_auth_service.py  # Google ID token verification (Sign-In)
│   │   ├── images.py
│   │   ├── otp_service.py          # pending-registration + reset-code storage
│   │   ├── scoring.py
│   │   └── storage.py
│   ├── utils/
│   │   ├── __init__.py
│   │   └── identifier.py          # normalizes the email/phone pair, prioritizing email
│   ├── uploads/
│   │   └── destinations/
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_comments.py
│       ├── test_destinations.py
│       ├── test_itineraries.py
│       ├── test_itinerary_sharing.py
│       ├── test_recommendations.py
│       └── test_scoring.py
├── global_trotter_web/
│   ├── .env.development
│   ├── .env.production
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
├── CHANGELOG.md
└── README.md
```

## Setup

```bash
cd global_trotter_backend
pip install -r requirements.txt
```

Create a `.env` file (or copy an existing one) with:

```dotenv
JWT_SECRET_KEY=<a long random string>
ALLOWED_ORIGINS=http://localhost:5173

GEOAPIFY_API_KEY=

# --- Brevo (OTP email/SMS delivery). Leave BREVO_API_KEY empty during
# dev: verification codes are logged to the console and echoed back in
# the API response as "dev_otp", so the full auth flow works without a
# Brevo account.
BREVO_API_KEY=
BREVO_SENDER_EMAIL=no-reply@example.com
BREVO_SENDER_NAME=GlobalTrotter
BREVO_SMS_SENDER=GlobTrot
OTP_EXPIRY_MINUTES=10

# --- Google Sign-In. Leave empty until you create an OAuth Client ID
# in Google Cloud Console (Credentials -> OAuth client ID -> Web application).
GOOGLE_CLIENT_ID=
```

## Running

```bash
python app.py
```

The API runs on http://localhost:5000

## Authentication

Sign-up behaves differently depending on which identifier is used:

- **Email** — goes through a 2-step OTP flow: `/register` sends a 6-digit code by email, and the account is only created once that code is confirmed via `/verify-email`.
- **Phone number** — skips OTP entirely (no SMS credits required) and creates + logs the user in immediately from `/register`.
- **Google** — `/auth/google` verifies a Google ID token server-side and creates (or logs into) an already-verified account in one step.

If both an email and a phone number are supplied, the email always takes priority.

## REST API

| Method | Endpoint                         | Auth required | Description                                                        |
|--------|-----------------------------------|:--------------:|---------------------------------------------------------------------|
| POST   | `/register`                      | No             | Register a new user (email → sends OTP; phone → logs in immediately)|
| POST   | `/verify-email`                  | No             | Confirm the OTP code and create the account (email sign-ups only)   |
| POST   | `/resend-otp`                    | No             | Resend a new OTP code for a pending email registration              |
| POST   | `/login`                         | No             | Authenticate and receive a JWT token                                |
| POST   | `/auth/google`                   | No             | Sign up or log in with a Google ID token                            |
| POST   | `/forgot-password`               | No             | Send a password-reset OTP by email (not available for phone numbers)|
| POST   | `/verify-reset-code`             | No             | Confirm a password-reset OTP code                                   |
| POST   | `/reset-password`                | No             | Set a new password using a confirmed reset code                     |
| POST   | `/change-password`               | No             | Change a known password while logged in                             |
| GET    | `/destinations`                  | No             | Search the destination catalogue                                    |
| POST   | `/destinations/<id>/rating`      | Yes            | Rate a destination                                                   |
| POST   | `/destinations/<id>/favorite`    | Yes            | Add a destination to favorites                                      |
| DELETE | `/destinations/<id>/favorite`    | Yes            | Remove a destination from favorites                                 |
| GET    | `/favorites`                     | Yes            | List your favorite destinations                                     |
| GET    | `/recommendations`               | Yes            | Get personalized recommendations                                    |
| POST   | `/itineraries`                   | Yes (JWT)      | Create a new itinerary                                               |
| GET    | `/itineraries`                   | Yes (JWT)      | List all itineraries for the logged-in user                         |

*(Comments, admin review, map/places, and itinerary-sharing endpoints exist too — see `routes/` for the full set; this table covers auth + the original core routes.)*

## Request examples

### register (email — sends an OTP)
```bash
curl -X POST http://localhost:5000/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Jane Doe\", \"email\": \"jane@example.com\", \"password\": \"supersecret\"}"
```
Response (dev mode, no `BREVO_API_KEY` set):
```json
{
  "message": "Verification code sent to your email",
  "identifier": "jane@example.com",
  "channel": "email",
  "dev_otp": "482913"
}
```

### verify-email
```bash
curl -X POST http://localhost:5000/verify-email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"code\": \"482913\"}"
```
Returns a JWT `token` + the created `user`, same shape as `/login`.

### resend-otp
```bash
curl -X POST http://localhost:5000/resend-otp ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\"}"
```

### register (phone — no OTP, logs in immediately)
```bash
curl -X POST http://localhost:5000/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Jane Doe\", \"number\": \"677123456\", \"password\": \"supersecret\"}"
```
Returns a JWT `token` + `user` directly.

### login
```bash
curl -X POST http://localhost:5000/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"password\": \"supersecret\"}"
```

### Google sign-in / sign-up
```bash
curl -X POST http://localhost:5000/auth/google ^
  -H "Content-Type: application/json" ^
  -d "{\"credential\": \"<google-id-token>\"}"
```

### forgot-password / verify-reset-code / reset-password
```bash
curl -X POST http://localhost:5000/forgot-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\"}"

curl -X POST http://localhost:5000/verify-reset-code ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"code\": \"482913\"}"

curl -X POST http://localhost:5000/reset-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"code\": \"482913\", \"new_password\": \"newsecret\"}"
```

### get destinations
```bash
curl -X GET "http://localhost:5000/destinations"
```

### rate a destination
```bash
curl -X POST http://localhost:5000/destinations/dest_001/rating -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"stars\": 5}"
```

### add to favorites
```bash
curl -X POST http://localhost:5000/destinations/dest_001/favorite -H "Authorization: Bearer %TOKEN%"
```

### remove from favorites
```bash
curl -X DELETE http://localhost:5000/destinations/dest_001/favorite -H "Authorization: Bearer %TOKEN%"
```

### get favorites
```bash
curl -X GET http://localhost:5000/favorites -H "Authorization: Bearer %TOKEN%"
```

### get recommendations
```bash
curl -X GET http://localhost:5000/recommendations -H "Authorization: Bearer %TOKEN%"
```

### create itinerary
```bash
curl -X POST http://localhost:5000/itineraries -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"Weekend Trip\",\"destinations\":[\"dest_001\",\"dest_002\"]}"
```

### get itineraries
```bash
curl -X GET http://localhost:5000/itineraries -H "Authorization: Bearer %TOKEN%"
```

## Data storage

| File                        | Purpose                                              |
|-----------------------------|-------------------------------------------------------|
| `data/destinations.json`    | Static catalogue of travel destinations               |
| `data/users.json`           | Registered users                                       |
| `data/itineraries.json`     | User itineraries                                        |
| `data/otp_pending.json`     | Email sign-ups awaiting OTP verification (auto-cleaned once verified) |
| `data/otp_reset.json`       | Active password-reset codes                            |

## Testing

```bash
pytest
```

The test fixture in `tests/conftest.py` copies `data/` into a disposable temp directory and forces `BREVO_API_KEY` / `GOOGLE_CLIENT_ID` to empty on the test app instance — so the suite always exercises the dev-mode OTP fallback and the "Google not configured" branch, regardless of whatever real credentials are sitting in your local `.env`.

# FRONTEND

React web app (Vite + JS), lives in `global_trotter_web/`.

## Pages

- Landing page
- Register page (email OTP, phone, or Google)
- Login page (email/phone, or Google)
- Verify OTP page (shown after registering by email)
- Home page
- Itineraries
- Destinations page
- Profile page
- Itinerary details page
- Destination detail page
- Destination choose page
- Favorites page
- Map page
- My Destinations / destination detail (owner view)
- Admin dashboard + request review

### Setup

```bash
cd global_trotter_web
npm install
```

Create `.env.development` (used by `npm run dev`) with:

```dotenv
VITE_API_BASE_URL=http://localhost:5000

# Leave empty until you create a Google OAuth Client ID (see backend
# setup above) — the Google button on Login/Register just won't render
# until this is set.
VITE_GOOGLE_CLIENT_ID=
```

And `.env.production` (used by `npm run build`) with the equivalent values for your deployed backend/domain.

### Running

```bash
npm run dev
```

The app runs on http://localhost:5173 and expects the backend on http://localhost:5000 (or whatever `VITE_API_BASE_URL` points to).

To reach the dev server from another device on your network (e.g. a phone), run `npm run dev -- --host` and make sure `VITE_API_BASE_URL` points at your machine's LAN IP rather than `localhost`, and that the backend's `ALLOWED_ORIGINS` includes that LAN origin.