# Changelog

## [21-07-2026]

### Added
- Flask app and config
- JSON storage helper functions
- JSON data files: `destinations.json`, `itineraries.json`, `users.json`
- Authentication (user signup and login) + dedicated test file
  - `POST /register` — create an account (name, email, number, password)
  - `POST /login` — returns a JWT access token
  - Include the token as `Authorization: Bearer <token>` on protected routes
- Destinations endpoints + dedicated test file
  - `GET /destinations` — list/search destinations. Filter with `tag`, `budget`, `country`, `region`, `area`, `type`, `q`
  - `POST /destinations/<id>/rating` — rate a destination 1–5 stars *(auth required)*
  - `POST /destinations/<id>/favorite` — add to favorites *(auth required)*
  - `DELETE /destinations/<id>/favorite` — remove from favorites *(auth required)*
  - `GET /favorites` — list your favorite destinations *(auth required)*
- Recommendation scoring logic + dedicated test file
- Recommendations endpoint + dedicated test file (requires itinerary route)
  - `GET /recommendations` *(auth required)* — destinations ranked for you based on travel style, budget, preferred area, and past itineraries
- Itineraries endpoints
  - `POST /itineraries` *(auth required)* — save a titled itinerary
  - `GET /itineraries` *(auth required)* — return titled itineraries

## [22-07-2026]

### Added
- React (Vite + JS) project setup
- API service to link the frontend to the backend
- Auth service to handle register requests
- Register page + dedicated test file
- CORS support on the backend, to allow cross-origin communication between web and server
- `.env` and `python-dotenv` on the backend

## [23-07-2026]

### Added
- Landing page + dedicated test file
- Form constraints
- Login page + dedicated test file
- Shared components for register/login UI and layout: `AuthForm.jsx`, `EmailField.jsx`, `PasswordField.jsx`, `PhoneInput.jsx`
- "GlobalTrotter" logo as a home link

### Changed
- Updated register page UI

## [24-07-2026]

### Added
- `tokenStorage.js` to store each user's token after login
- Home page (`Home.jsx`) + dedicated test file
- Destination card component (`DestinationCard.jsx`) + dedicated test file
- Star rating component (`StarRating.jsx`)
- Destination service (`destinationService.js`) for fetching destinations from the frontend

### Changed
- `api.js` now attaches the token to all outgoing requests
- Login page redirects to the home page on success
- Login test updated to cover token storage
- Landing page updated with more visitable-area images
- Landing test file updated to cover those images

## [25-07-2026]

### Added
- Itineraries page + dedicated test files
- Navigation bar
- `Itinerarycard.jsx` component
- Itinerary form
- Destination selection (for building an itinerary)
- Itinerary detail page
- Checkbox status on destination cards

### Changed
- `Logo.jsx` to render as text after login

## [26-07-2026]

### Added
- Destinations page (`Destinations.jsx`) + dedicated test file

### Changed
- Nav bar to add the destinations page route
- Destinations page (`Destinations.jsx`/`.css`) + dedicated test file, to add a search bar
- Destinations page (`Destinations.jsx`/`.css`) + dedicated test file, to add filters

## [27-07-2026]

### Added
- Destination images
- Additional images
- Destination detail page (`Destinationdetails.jsx`) + dedicated test file

### Changed
- `destinations.json` to add destinations
- Itinerary detail page (`itineraryDetails.jsx`) to add a search bar and filters
- `Additinerarymodal.jsx` to route to the destination page, and to add a search bar and filters
- Destinations page (`Destinations.jsx`) to route to the destination detail page
- `auth.py` + dedicated test file, to return the user object
- `tokenStorage.js`
- `Login.jsx` to store the returned user object
- `Bottomnav.jsx` to add a profile tab
- Profile page (`Profile.jsx`)

## [28-07-2026]

### Added
- Recommendation service (`recommendationService.js`) + dedicated test file
- `.env.production`
- Web app icon

### Changed
- Home page (`Home.jsx`) to include recommendations
- `Starrating.jsx`
- `DestinationCard.css` to update the star UI to reflect your actual vote
- `destinations.json`
- `users.json`
- Itinerary detail page (`itineraryDetails.jsx`), adding a search bar and filters
- `api.js`

## [29-07-2026]

### Added
- Comments data (`comments.json`)
- Comments route (`comments.py`) + dedicated test file
- Comment section (`CommentSection.jsx`)

### Changed
- Destination detail page (`Destinationdetails.jsx`) + CSS + test file
- `destinations.py`
- `app.py`

## [30-07-2026]

### Added
- "Add to itinerary" button (`AddToItineraryButton.jsx`)
- `utils/destinationDisplay.js`

### Changed
- `DestinationCard.jsx`
- `comments.py`
- `conftest.py`
- `destinations.py`
- `CommentSection.jsx` + `CommentSection.css`
- `Destinationcard.jsx`
- `Destinationdetails.jsx`
- `destinations.json`

## [31-07-2026]

### Added
- `uploads/destinations/` images folder
- `uploads.py` — serves uploaded destination images
- Confirm dialog when deleting an itinerary (`Confirmdialog.jsx`)
- Favorites page (`Favorites.jsx`) + dedicated test file
- `SelectStyle.jsx` + dedicated test file
- `ShareItineraryModal.jsx`
- Destination submission & moderation workflow — non-admins now go through a review flow instead of editing live data directly:
  - `POST /destinations` — submit a new destination for review
  - `PUT /destinations/<id>` / `DELETE /destinations/<id>` — request an edit/deletion (admin edits/deletes apply immediately instead)
  - `services/destination_requests.py` — request creation, approval, and rejection logic
  - `routes/admin.py` — `GET /admin/requests`, `POST /admin/requests/<id>/approve`, `POST /admin/requests/<id>/reject`, `DELETE /admin/requests/<id>`
- "My Destinations" page — lets a user see and manage the spots they've submitted:
  - `GET /my-destinations`, `DELETE /my-destinations/requests/<id>` (discard a rejected/approved-delete/admin-edit notice)
  - `MyDestinations.jsx`, `DestinationManageCard.jsx`
- Itinerary sharing & management routes: `PUT /itineraries/<id>/destinations`, `POST /itineraries/<id>/share`, `DELETE /itineraries/<id>/share/<user_id>`, `GET /itineraries/<id>/shared-users`, `DELETE /itineraries/<id>`, `DELETE /itineraries`
- `PUT /users/preferences` — updating a user's travel-style preferences (backs `SelectStyle.jsx`/Profile page above)
- Admin notifications for direct edits/deletes on a user's spot: when an admin edits or deletes a destination directly (no review needed), the owner now sees the change reflected on their "My Destinations" card — an "Edited by admin" badge (dismissible) for edits, and a "Deleted" card with a "Discard" option for deletions
- Map integration, combining OpenFreeMap for rendering with Geoapify for search:
  - `services/geoapify.py` — backend proxy for Geoapify autocomplete search, nearby-places lookup, and routing, so the API key stays server-side
  - `routes/places.py` — `GET /places/search`, `GET /places/nearby`, `GET /places/route`
  - `MapView.jsx` — reusable MapLibre + OpenFreeMap map component, with distinct markers for destinations vs. nearby services (restaurants, hotels, pharmacies, ATMs, fuel, transport)
  - `MapPage.jsx` — map page: single-destination view, full-itinerary route view with a toggle, nearby-services toggle, place search, and legend
  - `mapService.js`, `utils/mapCategories.js`
  - Map tab added to `Bottomnav.jsx`, placed first (leftmost) in the nav bar

### Changed
- `config.py` — added `GEOAPIFY_API_KEY`
- `requirements.txt` — added `requests`
- `app.py` — registered `places_bp`
- `Destinationcard.jsx` / `Destinationdetails.jsx` — enabled the "Location" button to open the map centered on that destination
- `itineraryDetails.jsx` — added a "Show itinerary" button that opens the map with the full route across all of the itinerary's destinations
- `package.json` — added `maplibre-gl`
- `vite.config.js` — excluded `maplibre-gl` from Vite's dependency pre-bundling (its v6 worker file isn't handled correctly by esbuild's optimizer)
- `CommentSection.jsx` — moved the edit-window check out of render and into an effect, so `Date.now()` is no longer read impurely during render
- Persisted the itinerary "visited" checkbox to `localStorage` per itinerary, fixing a bug where a destination card would lose its "visited" (greyed-out) state after opening its detail page and navigating back
- `Destinationcard.test.jsx` / `Destinationdetails.test.jsx` — updated to match the now-enabled Location button

## [01-08-2026]

### Added
- `hooks/useVisitedStops.js` — shared "visited stops" store and hook, replacing the copy of `loadVisitedIds` that lived in both `MapPage.jsx` and `itineraryDetails.jsx`. Writes publish to subscribers (and across tabs via the `storage` event), so marking a stop visited on the itinerary page updates the map immediately instead of waiting for a window `focus` event that never fires on SPA navigation
- "Show visited stops" toggle on the map — renders visited stops as dimmed, dashed pins that stay out of the route. Off by default, so the existing behaviour (a visited stop disappears from the map) is unchanged unless enabled
- Itinerary chip on the map showing the active itinerary's title and visited progress, plus a banner when every stop has been marked visited — previously an all-visited itinerary left an empty map with no explanation
- Full itinerary picker in the map options menu, so an itinerary can always be selected or cleared from the map itself
- Accuracy circle around the user's position marker, scaled from the reported GPS accuracy in metres
- `visited` entry in `CATEGORY_META`, so visited stops appear in the map legend
- Admin request review modal (`RequestDetailModal.jsx`) — clicking a pending or rejected request card in `AdminDashboard.jsx` opens the full submitted details (gallery, tags, budget, hours, address, nearby services, description, advice) before an admin approves or rejects it, instead of judging from the card thumbnail alone. For edit requests, a "What's changing" section diffs the proposed values against the destination's current ones
- Destination detail view for destination owners (`MyDestinationDetails.jsx`) — clicking a card on the "My Destinations" page now opens a detail page for that submission with Edit and Delete/Discard actions built in. Unlike the public destination page, it has no "Add to favorites" or "Add to itinerary" controls and shows the rating as read-only
- `readOnly` prop on `StarRating.jsx`, so a rating can be displayed without being clickable
- Comment ownership tag — comments and replies posted by a destination's owner are now labelled "Owner" in `CommentSection.jsx`, both on the public destination page and the owner's own detail view
- Comment pinning — a destination's owner can pin one top-level comment so it stays at the top of the thread (pinning a new one automatically unpins the previous one; replies can't be pinned)
  - `POST /destinations/<id>/comments/<comment_id>/pin`, `DELETE /destinations/<id>/comments/<comment_id>/pin`
  - Pin/Unpin controls and a "📌 Pinned" badge in `CommentSection.jsx`
- OTP-based email verification (Brevo), replacing single-step registration for email sign-ups: `POST /register` now sends a 6-digit code and does not create the account until `POST /verify-email` succeeds
  - `services/brevo_service.py` — Brevo transactional email + SMS API wrapper, with a dev-mode fallback: when `BREVO_API_KEY` is unset, the code is logged to the console and echoed back in the response as `dev_otp` instead of actually sending, so the full flow can be tested without a Brevo account
  - `services/otp_service.py` — pending-registration and password-reset codes, stored in new `data/otp_pending.json` / `data/otp_reset.json`
  - `utils/identifier.py` — normalizes the client's email/number pair into a single identifier, prioritizing email when both are given
  - `POST /resend-otp` — issues a new code for a pending registration
  - `POST /forgot-password`, `POST /verify-reset-code`, `POST /reset-password` — 3-step password reset by email OTP
  - `VerifyOtp.jsx` (+ `/verify-otp` route) — OTP entry page shown after registering by email, with a resend button and, in dev mode, the code pre-filled
- Google Sign-In / Sign-Up: `POST /auth/google` verifies a Google ID token server-side and creates (or logs into) an already-verified account
  - `services/google_auth_service.py` — wraps `google-auth`'s `id_token.verify_oauth2_token`; returns a clear error if `GOOGLE_CLIENT_ID` isn't configured yet
  - `GoogleButton.jsx` — renders Google's own sign-in button via Google Identity Services (popup mode, no redirect/callback route needed); added to `Login.jsx` and `Register.jsx`; stays hidden until `VITE_GOOGLE_CLIENT_ID` is set
- `verified`, `auth_provider`, `google_id` fields on user records
- `PUT /my-destinations/requests/<request_id>` — lets a user edit the details of their own destination submission while it's still awaiting review (`pending`, `create` requests only), instead of only being able to cancel and resubmit it from scratch
  - `update_pending_payload()` in `services/destination_requests.py`
  - `updateSubmission()` in `myDestinationService.js`

### Fixed
- Toggling "Hide itinerary path" wiped every stop from the map, which looked like a reset. `destinationMarkers` was gated on `showRoute`, so the toggle controlled both the markers and the path. Markers now follow the selected itinerary, and `showRoute` only draws the polyline
- The "Show itinerary path" menu item disappeared after being toggled off, leaving no way to turn it back on. `canToggleRoute` was derived from `destinationMarkers.length`, which the toggle had just emptied — the same root cause as above. The item is now always rendered, and disabled only when there are too few waypoints to route
- Itineraries needed a page refresh to appear. `MapView` was mounted inside `{!loading && !error && ...}`, so it was torn down and rebuilt whenever `loading` flipped, and the marker effect had no cleanup and never re-ran against the new map instance — markers were being added to a destroyed map. `MapView` is now always mounted (loading/error render as an overlay pill), and every sync effect is gated on a per-instance `ready` flag
- Stale map state resurrecting a hidden itinerary on the next mount — session state was only persisted when the view was an itinerary view, so `showRoute: true` could outlive being switched off. Persistence now always writes
- The user's position marker disappearing:
  - The geolocation watch was restarted on every mount of `MapPage`, dropping the current fix. It's now a single module-level watch shared by all consumers, with refcounted subscription
  - Nearby-service markers painted over the user marker. Markers now carry explicit z-index values (user 10, searched 7, destination 6, nearby 3)
  - `fitBounds` re-fired on every change to `nearbyPlaces`, which itself re-ran on every GPS tick, so the camera kept flying away from the user. The map now only refits when the destination set actually changes
- The direction arrow was a detached triangle floating above the dot, hidden until a heading arrived. Replaced with a Google-Maps-style puck: a solid dot with a translucent beam that rotates around it and compensates for the map's bearing
- "Show nearby services" did nothing on a map with no destinations — the fetch was skipped when `destinationMarkers` was empty. Services now centre on the user's position when available and fall back to the destination centroid
- "Reset map" left the camera and the cached nearby-services centre untouched. It now resets the view via a `resetView` handle and clears the cache
- Route layers were removed and re-added on every route change, and could be lost on a style reload. The route now updates through `setData` on a persistent source, with layers re-created if the style drops them
- Stop auto-advance ran as a side effect during render; moved into an effect
- `components/ScrollToTop.jsx` — resets scroll position on route change, mounted inside `BrowserRouter` in `App.jsx`. React Router doesn't reset scroll on navigation, so every page was inheriting the previous page's scroll offset
- The map's 3-dots and search buttons were invisible when the map was opened from the "Location" button or "Show itinerary" — but not when opened from the bottom nav. Both entry points are on scrollable pages, so `/map` loaded with the previous page's scroll offset still applied. `.map-page` was `position: relative; height: 100vh`, and since `100vh` exceeds the visible viewport on mobile, the document stayed scrollable and everything absolutely positioned inside slid up with it — enough to push the two controls (42px tall, at `top: 16px`, or ~57px on a notched phone once `env(safe-area-inset-top)` applies) entirely above the fold. The map canvas filled the screen either way, which is why nothing else looked wrong
- Backend test suite depended on ambient developer secrets: `tests/conftest.py`'s `client` fixture now forces `BREVO_API_KEY` and `GOOGLE_CLIENT_ID` to empty on the test app instance regardless of what's in the real `.env`, so `/register` always echoes `dev_otp` and `/auth/google` always hits its "not configured" branch during tests — the suite no longer breaks when real credentials are added for local/manual testing
- Clicking the "GlobalTrotter" logo on the login, register, or verify-code pages did nothing whenever a stale or expired token was still sitting in storage, since `Logo.jsx` renders as plain (non-clickable) text for anyone it considers authenticated. Those three pages now force the logo to always link back to the landing page, regardless of token state
- A destination submission still awaiting admin review (`pending_review`) could be cancelled but not edited — the "Edit" tab was missing even though the intent (tweak a typo, swap a photo) was reasonable before anyone had reviewed it. `pending_review` is now an editable status, routed through the new `PUT /my-destinations/requests/<request_id>` endpoint above rather than the published-destination edit endpoint
- Action buttons on `DestinationCard.jsx`, `DestinationManageCard.jsx`, and `PendingRequestCard.jsx` sat at inconsistent heights within a grid row whenever cards had differing amounts of content above them (tags, admin notes, submitter info, etc.), since the button row simply followed the content instead of anchoring to the bottom of the card
- Dev-mode LAN access from a phone failed with "failed to fetch": `.env.development`'s `VITE_API_BASE_URL` pointed at `localhost`, which resolves to the phone itself rather than the computer running Flask — updated to the computer's LAN IP
- `.env.production`'s `VITE_API_BASE_URL` had a leading space and no `http://`/`https://` scheme, producing an invalid URL that `fetch()` rejected on any production build

### Changed
- `MapPage.jsx`, `MapView.jsx`, `useGeolocation.js`, `mapCategories.js`, `MapPage.css`, `MapView.css` — rewritten for the above
- `itineraryDetails.jsx` — now uses `useVisitedStops` instead of its own `localStorage` reads and writes
- `useGeolocation.js` — reports a specific reason when the page isn't a secure context, since `navigator.geolocation` is blocked over plain HTTP on a LAN IP (this is why location fails on a phone hitting the dev server directly, while working on `localhost`)
- Route requests capped at 10 waypoints, and re-fetched only when the stop list changes or the origin moves more than 30 m; nearby-services re-fetched only after 400 m of movement
- `PendingRequestCard.jsx` — the whole card is now clickable to open the new request detail modal; the accept/reject/remove buttons stop the click from bubbling up
- `DestinationManageCard.jsx` — accepts an `onView` prop so a card can open a detail view on click, without affecting existing usages (like the admin's "Actual destinations" tab) that don't pass it
- `AdminDashboard.jsx` — wires `PendingRequestCard` clicks into the new `RequestDetailModal`, and keeps it in sync as requests are approved, rejected, or removed
- `MyDestinations.jsx` — card clicks now navigate to the new `/my-destinations/:id` detail view, passing the destination through router state
- `Destinationdetails.jsx` — passes the destination's `owner_id` into `CommentSection` so the "Owner" tag shows up on the public page too
- `App.jsx` — added the `/my-destinations/:id` route
- `comments.py` — comment and reply records now track `pinned_at`; `GET /destinations/<id>/comments` sorts pinned root comments to the top
- `.map-page` — now `position: fixed` with all four insets at `0` instead of `position: relative; height: 100vh`, so the map is anchored to the visible viewport and unaffected by scroll position. Added `overscroll-behavior: none` to stop pull-to-refresh triggering when dragging the map downward
- `App.jsx` — mounts `ScrollToTop`
- `routes/auth.py` rewritten: `/register` branches on identifier type — email goes through the OTP flow above; phone numbers skip OTP entirely (no SMS credits required) and create + log the user in immediately with `verified: true`
- `/login` now rejects unverified accounts with a 403
- `/forgot-password`, `/verify-reset-code`, `/reset-password` reject phone-number identifiers with a clear "not available yet" message instead of attempting an SMS send
- `config.py` / `.env` (backend) — added `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_SMS_SENDER`, `OTP_EXPIRY_MINUTES`, `GOOGLE_CLIENT_ID`
- `.env.development` / `.env.production` (web) — added `VITE_GOOGLE_CLIENT_ID`
- `requirements.txt` (backend) — added `google-auth`
- `authService.js` — added `verifyOtp`, `resendOtp`, `loginWithGoogle`, `forgotPassword`, `verifyResetCode`, `resetPassword`
- `Register.jsx` — routes email sign-ups to `/verify-otp`; phone sign-ups log in immediately (no OTP step); renders `GoogleButton`
- `Login.jsx` — redirects an unverified account to `/verify-otp` instead of just showing an error; renders `GoogleButton`
- `AuthForm.css` — styles for the Google button divider, OTP code input, resend link, and dev-mode code hint
- Existing accounts in `data/users.json` backfilled with `verified: true`, `auth_provider: "local"`, `google_id: null` so pre-OTP accounts aren't locked out of the new `/login` verification check
- `Logo.jsx` — accepts a `forceLink` prop to render as a link to `/` even when the viewer looks authenticated, overriding the default "authenticated users get plain text" behaviour
- `Authlayout.jsx` — accepts and forwards a `forceLogoLink` prop to `Logo`
- `Login.jsx`, `Register.jsx`, `VerifyOtp.jsx` — pass `forceLogoLink` to `AuthLayout` so their logo always routes to the landing page
- `MyDestinations.jsx` — `EDITABLE_STATUSES` now includes `pending_review`
- `DestinationForm.jsx` — tracks whether the destination being edited is a still-pending submission (`isPendingSubmission`) and, when it is, submits through `updateSubmission` instead of `requestDestinationUpdate`, with an adjusted submit label ("Update submission") and hint text
- `DestinationManageCard.css`, `PendingRequestCard.css`, `DestinationCard.css` — card body sections now stretch to fill the card (`flex: 1`), and their action rows use `margin-top: auto` so buttons stay pinned to the bottom of the card regardless of how much content sits above them
- `vite.config.js` — added `server: { host: true }` so the dev server binds to the LAN interface (not just `localhost`), letting a phone on the same Wi-Fi load it via the printed "Network" URL

## [02-08-2026](01-08-2026)

### Added
- Phase 2 — the Flask monolith is now three independently deployable services behind an API gateway. Each service owns its data outright and reaches the others only over REST; nothing reads another service's JSON files:
  - `api-gateway/` (port 5000) — single public entry point. Routes by path prefix, enforces CORS, forwards `Authorization` untouched, and refuses `/internal/*` outright. Its `/health` also probes the three services and reports 503 if any is unreachable, so one call tells you the state of the whole stack
  - `user-service/` (port 5001) — owns `users.json`, `otp_pending.json`, `otp_reset.json`. Registration, login, OTP, Google sign-in, password reset, preferences
  - `itinerary-service/` (port 5002) — owns `itineraries.json`. Itinerary CRUD, ordering, sharing
  - `destination-service/` (port 5003) — owns `destinations.json`, `comments.json`, `destination_requests.json` and `uploads/`. Destinations, comments, moderation, admin review, places, AI, and recommendations. This is the Recommendation Service of the Phase 2 diagram, which attaches DestinationsDB to it
- Internal API — the five places where the monolith reached across what are now service boundaries, each guarded by a shared `X-Internal-Key` header and blocked at the gateway:
  - `GET /internal/users/<id>`, `POST /internal/users/batch`, `GET /internal/users/lookup?email=&number=`, `PUT /internal/users/<id>/favorites` (user-service)
  - `GET /internal/itineraries?user_id=` (itinerary-service)
  - `POST /internal/destinations/batch`, `GET /internal/destinations/<id>` (destination-service)
- `services/service_client.py` — shared HTTP client for internal calls, plus the `internal_only` decorator and a `ServiceUnavailable` exception that every app converts into a 503 rather than a 500 traceback
- `services/clients.py` in itinerary-service and destination-service — every cross-service call funnels through here, which is also what makes the services testable in isolation
- `services/urls.py` in destination-service — builds absolute image URLs from the public gateway address rather than the service's own hostname
- `Dockerfile` per service and `docker-compose.yml` — four containers on an internal network, with only the gateway publishing a port. Health checks on all three services; `data/` and `uploads/` bind-mounted so they live on the host, not inside a container
- `docker-compose.debug.yml` — optional override publishing 5001–5003 for manual testing. Never to be used on a server
- `smoke-test.sh` — end-to-end test against a running stack, through the gateway only. Ten checks covering every path that now crosses a service boundary: internal endpoints sealed, image URLs pointing at the gateway, favourites round-tripping, itinerary tags fetched from destination-service, the recommendations fan-out, comment author resolution, and share-by-email lookup
- Test suites split three ways, one pytest run per service (all three define modules named `config`, `app`, `routes` and `services`, so they cannot share a process). Cross-service calls are replaced with in-memory fakes; tokens are minted directly with `create_access_token` since only user-service can register. 134 tests total:
  - `user-service/tests/` — `test_auth.py` (unchanged), `test_users.py`, `test_internal.py`
  - `itinerary-service/tests/` — `test_itineraries.py`, `test_itinerary_sharing.py`
  - `destination-service/tests/` — `test_destinations.py`, `test_comments.py`, `test_recommendations.py`, `test_scoring.py` (unchanged), `test_internal.py`
- Degradation tests, covering failure modes that could not exist in the monolith: comment authors falling back to "Traveler" and itinerary owner names to "Unknown" when user-service is down; writes to favourites and the recommendations fan-out returning 503 instead
- `README-microservices.md` — architecture, routing table, internal API reference, run instructions, and the known limitations that Phase 3 has to address

### Changed
- `services/storage.py` — creates its data file from an empty schema when missing, instead of raising `FileNotFoundError`. `data/*.json` is gitignored, so a fresh clone on a server would otherwise have four services crashing on their first read
- `services/auth_helpers.py` in destination-service — `get_current_user()` now resolves the JWT identity through user-service's internal API rather than reading `users.json`. The user-service copy is unchanged, since it owns that data
- `routes/itineraries.py` — destination ids are validated and tags collected via destination-service; owner names and share-by-email lookups go to user-service
- `routes/comments.py` — author names come from a single batched user lookup per request rather than a read per comment
- `routes/destinations.py` — favourites are mutated through user-service, which owns the field; the destination-service side only verifies the destination exists
- `routes/admin.py` — submitter names resolved through user-service
- `routes/recommendations.py` — reads the user from user-service and their trips from itinerary-service, which is the "Recommendation Service calls User and Itinerary Service" arrow in the Phase 2 diagram
- CORS moved to the gateway alone; `flask-cors` removed from the three services. A downstream service also setting `Access-Control-Allow-Origin` would produce duplicate headers after proxying, which the browser rejects
- `JWT_SECRET_KEY` is now shared across all three services so `@jwt_required()` verifies locally with no network hop. Only fetching the user record costs a call
- Gunicorn runs `--workers 1 --threads 4`. `storage.py` guards writes with a `threading.Lock`, which only holds within one process
- `.gitignore` — `data/*.json` replaced with `**/data/*.json`. A pattern containing a slash is anchored to the directory holding the `.gitignore`, so the old rule only matched the monolith's `data/` folder and silently stopped covering the services' after the split
- The frontend needs no changes: all 47 endpoints kept their public paths and the gateway listens on 5000, which is what `VITE_API_BASE_URL` already pointed at

### Fixed
- Entering the map through a destination's "Location" button and then navigating away lost the destination on return, while entering through "Show itinerary" survived. The persisted map state stored `itineraryId` but not the focused destination, which was read straight from the `?destination=` query param — so it vanished the moment the map was reopened from the bottom nav without one. The focused destination is now held in state, persisted alongside the itinerary, and kept mutually exclusive with it. `searchedPlace` is persisted too, which had the same problem

### Known limitations
- JSON files are not a database. Each service is capped at one Gunicorn worker, and horizontal scaling is impossible until each owns a real datastore — the first task of Phase 3, since "at least 3 instances of each service" cannot be met while replicas each hold their own copy of the data on local disk
- No service discovery beyond Compose DNS. Addresses are hardcoded environment variables
- All communication is synchronous REST, so a slow dependency slows its caller. Events that need no reply — "itinerary created", "destination approved" — are the natural first candidates for a message queue
- Deleting a user does not cascade to their itineraries or comments; those services degrade to placeholder names instead

## [02-08-2026] — Production deployment

Phase 2 deployed to an Ubuntu VPS at **https://globaltrotter.duckdns.org**, sharing the host with five unrelated applications. Frontend and API live on one domain: Nginx serves the React build at `/` and strips the `/api/` prefix before proxying to the gateway, so every backend route keeps the path it already had and no service code changed. Same-origin means CORS never engages in production.

### Added
- `.dockerignore` in all four services. Every `Dockerfile` does `COPY . .`, which was baking each service's `.env` — live Brevo, Geoapify and OpenRouter keys — into the image layers. Also excludes `data/`, `uploads/`, `__pycache__` and `.pytest_cache`, cutting the destination-service build context from ~12 MB to 108 kB
- `deploy-globaltrotter.sh` on the server — pulls, rebuilds, polls `/health` for up to 60 s, and only then rebuilds and publishes the frontend. A backend failure aborts the run with the previous frontend still serving, rather than publishing a new bundle against a broken API. Asserts both MapLibre worker files exist in `dist/assets` before publishing
- `data/.gitkeep` in each service. `**/data/*.json` is gitignored and git does not track empty directories, so a fresh clone left three services with no `data/` folder at all
- Nginx site config (`/etc/nginx/sites-available/globaltrotter`) — TLS via the existing Let's Encrypt certificate, `/api/` proxy with prefix strip, direct filesystem serving of destination images, gzip, and immutable caching for fingerprinted assets
- `copyMaplibreWorker` plugin in `vite.config.js` — copies `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` into `dist/assets` after every build (see Fixed)

### Changed
- `docker-compose.yml` — the two values that differ between laptop and server are now environment variables with development defaults: `ports: "${GATEWAY_BIND:-0.0.0.0:5000}:5000"` and `volumes: ${UPLOADS_HOST_DIR:-./destination-service/uploads}:/app/uploads`. Local development is unchanged; production sets `GATEWAY_BIND=127.0.0.1:6000` (port 5000 on the host already belongs to another application) and points uploads at `/var/www/globaltrotter-uploads`, outside the repo, so a `git pull` or rebuild cannot destroy user-submitted images
- `docker-compose.prod.yml` — the `!override` tags are gone, since the values they overrode are now environment variables. This also removes the dependency on Compose 2.24.4+. What remains is log rotation on all four containers (`json-file` has no rotation by default, so logs grow until the disk fills) and `--access-logfile -` on the gateway so Gunicorn's request log reaches `docker compose logs`
- `.gitignore` (web) — added `!.env.production`. The existing `.env.*` rule prevented the file from ever reaching the server, and a build with `VITE_API_BASE_URL` undefined produces a frontend that silently fetches `undefined/destinations`. The file holds no secrets: both values are compiled into the public bundle regardless
- `.env.production` (web) — `VITE_API_BASE_URL` now `https://globaltrotter.duckdns.org/api`, was a LAN IP
- Destination images re-encoded at max 1600 px, JPEG quality 82, progressive: **340 MB → 12 MB** across 45 files. At roughly 2 MB each, a destination page with four photos was pulling 8 MB, which does not complete on a mobile connection. The upload itself had also been failing partway through
- `data/` reset for launch: `comments.json`, `destination_requests.json` and `itineraries.json` emptied; `users.json` replaced with the 19 accounts from the earlier deployment, normalised to the current schema (`preferences`, `role`, `verified`, `auth_provider`, `google_id` backfilled; empty-string identifiers converted to `null`). The `scrypt:` hashes on those records validate unchanged — Werkzeug reads both `scrypt` and `pbkdf2:sha256`, and rotating `JWT_SECRET_KEY` invalidates sessions but not passwords
- One user-submitted destination removed along with its image, and all ratings zeroed — its coordinates placed it in the Atlantic, ~900 km from Yaoundé

### Fixed
- Two files were tracked as `Confirmdialog.jsx` and `Preferencesmodal.css` while imported as `ConfirmDialog.jsx` and `PreferencesModal.css`. Windows resolves either; Linux does not, so the production build failed on unresolved imports. Fixed via `git rm --cached` and re-adding under the correct names, since `git mv` cannot express a case-only rename on a case-insensitive filesystem. `git config core.ignorecase false` set locally so future mismatches surface
- **MapLibre rendered no tiles in production.** MapLibre v6 builds its worker URL at runtime — `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — which Rolldown cannot see as a static reference, so the chunk was never emitted and the request 404'd. Dev mode works because the dev server resolves it from `node_modules` directly. Note that `optimizeDeps.exclude` was not the cause and only affects the dev server; scoping it to `command === 'serve'` produced a byte-identical build. Resolved with a build plugin that copies both the worker and the shared module it imports
- `.mjs` is absent from Nginx 1.24's MIME table, so the worker was served as `application/octet-stream` and the browser refused to execute it as a module — reported in DevTools as a request stuck pending rather than a clean error. Added to `/etc/nginx/mime.types`. A per-site `types { }` block was tried first and broke the whole site: `types` *replaces* the inherited table rather than extending it, so `text/html` disappeared and the browser downloaded `index.html` instead of rendering it
- `client_max_body_size` was never set, leaving Nginx's 1 MB default. Any destination photo above that was rejected with a 413 before Flask saw the request. Now 25 MB
- `proxy_read_timeout` raised to 90 s; OpenRouter calls can exceed Nginx's 60 s default

### Infrastructure notes
- `/etc/nginx/mime.types` now maps `mjs` to `application/javascript`. This file is outside the repository and shared with the host's other sites — an Nginx package upgrade may revert it, and a rebuilt server will not have it
- The Nginx site config is likewise not version-controlled
- Uploads live at `/var/www/globaltrotter-uploads`, deliberately outside the repository. The repo copy under `destination-service/uploads/` is a seed catalogue only; user-submitted images exist solely on the server. Never mirror one onto the other with `rsync --delete`
- The backend `.env` is created directly on the server, `chmod 600`, and never committed

### Known limitations
- No admin account exists in the deployed `users.json`; `/admin` is inaccessible until a `role` is promoted by hand
- Registration and OTP delivery via Brevo remain untested in production
- Destination galleries reference four images per entry while only the first exists, so three broken thumbnails appear per destination until the remaining photos are uploaded
- Route geometry is fetched from Geoapify on every request with no caching, and is noticeably slow on mobile connections. The map draws markers immediately and the route line some seconds later, with no loading indicator to explain the gap
- `cameroon-showcase-2.jpg` is 1 MB and sits on the landing page, unaffected by the destination-image compression above
- Google Fonts is loaded from a CDN that responds slowly or times out from the deployment's network; self-hosting the three font files would remove the dependency

## [05-08-2026]

### Added
- Forgot-password flow by email OTP: `ForgotPassword.jsx` and `ResetPassword.jsx` (+ `/forgot-password`, `/reset-password` routes) — enter your email, verify the 6-digit code sent to it (reusing the existing `/forgot-password`, `/verify-reset-code` endpoints), then set a new password twice
- "Forgot password?" link on `Login.jsx`
- `forgotPassword` / `resetPassword` i18n sections and a `validation.passwordMismatch` string, in both English and French
- `nav.finishSelectionFirst` i18n string, shown as a tooltip on the now-disabled nav during destination selection (see Changed)

### Changed
- `routes/auth.py` (user-service) — `/reset-password` now mints a JWT and returns `token` + `user`, the same shape as `/login`/`/register`, so finishing a password reset logs the user straight into the app instead of sending them back to the login screen
- `Bottomnav.jsx` — reads `selectionMode` from the existing `ItineraryDraftContext` and renders every tab as a disabled, non-navigable element (with an explanatory tooltip) for as long as a destination selection is in progress on the Destinations page, rather than leaving the nav fully clickable mid-selection. Applies to both the mobile bottom bar and its desktop top-bar variant, since they're the same component
- `AuthForm.css` — small `.auth__forgot` style for the new Login page link

### Fixed
- Profile page: the Favorites and Manage Destinations/Admin Dashboard rows would disappear and reappear while offline or on a flaky connection. The Favorites row was gated on `favoriteCount !== null`, which stayed `null` for as long as the fetch to `/favorites` hadn't succeeded — and reset to `null` on every remount of the page, so it kept popping in and out as the user navigated back to Profile. Both rows now always render, like the other rows on the page; the favorites count shows a `···` placeholder instead of hiding the row while it loads or fails
- On desktop, the destination-selection cancel button rendered hidden behind the sticky top nav bar. Both elements shared `z-index: 30`, and the nav — painted later in the DOM — won the tie. Raised the button's `z-index` above the nav's, and set its `top` offset to fall inside the nav bar's own height band: before the user scrolls, the nav hasn't stuck yet (it's still below the header in normal flow), so the button simply sits a little above it; once the user scrolls past the header, the nav locks to the top of the viewport and the button — unmoved, since it's `position: fixed` — now lines up perfectly inside it

## [06-08-2026]

### Added
- `utils/nearbyMatch.js` — matches Geoapify nearby-service results against the app's own destinations, so a service that already exists as a destination can be opened from the map. Names are normalised (diacritics stripped, punctuation removed, lowercased) before comparison, so Geoapify's `"Hôtel La Mérina"` matches `"Hotel La Merina"` in `destinations.json`. Three confidence tiers, each with its own distance ceiling: identical names within 500 m, one name containing the other within 300 m, one distinctive word in common within 150 m. Proximity alone never matches — a restaurant 40 m from Marché Central is not Marché Central. The word-overlap tier skips generic tokens (`hotel`, `restaurant`, `marche`, `yaounde`, `chez`, …) so `"Chez Kalli"` matches on `kalli` rather than `chez`. Where several destinations qualify, the strongest tier wins, then the closest
- Nearby-service popups now carry the place name, its address, and — for a matched service — a "View details" button routing to `/destinations/<id>`, replacing the plain name-only popup
- Matched services are drawn with a gold ring and get a `linked` entry in `CATEGORY_META`, so the map legend distinguishes services that exist in GlobalTrotter from ones that only exist in Geoapify
- `map.viewDetails` and `mapCategories.linked` i18n strings, in both English and French
- Invisible 9px hit-area padding on small markers via `.map-marker--small::after`. Nearby-service pins are 18px, well under the ~44px minimum touch target, which made them awkward to tap on a phone
- Nearby services are now searched around two centres instead of one: the user's position and the next stop. Both requests go out in parallel through `Promise.allSettled`, so a failed or rate-limited call still leaves the other set of results on the map, and the merged output is deduplicated on name plus coordinates rounded to 5 decimals (~1 m) — which matters once the two 1500 m circles overlap as the user approaches the stop

### Fixed
- Tapping a nearby-service icon showed the name popup, but neighbouring icons painted over it. MapLibre leaves `.maplibregl-popup` at `z-index: auto`, while the marker z-index values added on 01-08 (3–10) put every marker above it — and since `.map-view` has `z-index: 0` and creates a stacking context, markers and popups compete directly inside it. Popups now sit at `z-index: 12`, above the user puck at 10
- Popups appeared away from the icon that opened them, rather than pointing at it. The `::after` hit area above was added alongside `position: relative` on `.map-marker` to anchor it — but MapLibre positions markers through its own `.maplibregl-marker { position: absolute }` rule, and `MapView.css` is imported after `maplibre-gl.css`, so the equal-specificity override won and knocked every marker out of absolute positioning back into normal flow. Icons drifted from their coordinates while popups, which use a different class, stayed correct. The rule was unnecessary: `.maplibregl-marker` is already positioned, so `::after` anchors to it without help
- The three map toggles (itinerary path, nearby services, visited stops) turned unreadable when activated on a phone — white text on a near-white background. `.map-page__menu button:hover:not(:disabled)` scores 0-3-1 against `.map-page__menu button.is-active` at 0-2-1, so hover won; and since a tap leaves `:hover` stuck on a touch device with no pointer to move away, activating a toggle applied the cream hover background while keeping the white text from `.is-active`. The hover rule is now wrapped in `@media (hover: hover)` so touch devices never get a hover background at all, and `.is-active:hover:not(:disabled)` is listed explicitly (0-4-1) so an already-active toggle stays green under the mouse on desktop
- Nearby services never appeared around a destination while GPS was working, and landed in empty ground when it wasn't. The single search centre was chosen by fallback — the user's position, or otherwise the centroid of every visible marker — so a multi-stop itinerary searched the middle of the itinerary rather than anywhere a traveller would actually be standing
- 42 frontend tests across five suites (Home, Profile, Favorites, DestinationDetails, ItineraryDetails) failed with "useItineraryDraft must be used within an ItineraryDraftProvider". The 05-08 change that let `Bottomnav.jsx` read `selectionMode` from `ItineraryDraftContext` means every page rendering `<BottomNav />` now needs the provider above it. `App.jsx` supplies it in the real app, but each test file builds its own tree — these five rendered their page bare inside `MemoryRouter`. Their render helpers now wrap the page in `ItineraryDraftProvider`, matching the pattern already used in `Itineraries.test.jsx` and `Destinations.test.jsx` (router outside, provider inside, as in `App.jsx`). No `src/` change: the guard in `useItineraryDraft` is doing its job, and the app was never broken in the browser

### Changed
- `MapView.jsx` — accepts `onNearbyClick` and `nearbyActionLabel`; nearby markers build their popup with `setDOMContent` instead of `setText`; matched services get their own z-index tier (5) between plain nearby services and destinations
- `MapPage.jsx` — runs `visibleNearbyPlaces` through `linkNearbyPlaces`, adds the `linked` legend entry when any service matched, and navigates to the destination on a popup action
- `MapPage.jsx` — `servicesCenter` split into `userServicesCenter` (state, still re-queried only after 400 m of movement) and `stopServicesCenter` (derived from `remainingStops[0]`). Using the next pending stop gives the single destination when there's one and only the upcoming stop when there are many, and it advances on its own as stops are reached, since `remainingStops` is sliced by `stopIndex`
- Nearby-services radius is a flat `NEARBY_RADIUS_METERS = 1500` for both centres. The old code widened to 2500 m for multi-stop itineraries to compensate for a centroid that sat far from anything real; with an actual stop as the centre that's unnecessary, and the narrower radius keeps the marker count manageable
- The stop-side request is dropped entirely once the user is within `NEARBY_MERGE_DISTANCE_METERS = 500` of the stop, since one search then covers both. 500 m rather than the 60 m arrival threshold because `userServicesCenter` only updates every 400 m and can be that stale at the moment of arrival; at a 1500 m radius, being 500 m off-centre still covers the stop's surroundings
- "Show nearby services" now defaults to **off** (`DEFAULT_MAP_STATE.showServices` and `handleReset`), so opening the map makes no Geoapify call at all until the user asks for it. The toggle is still persisted to `sessionStorage`, so turning it on keeps it on for the rest of the tab session
- The nearby-services effect keys on the stop's id rather than its coordinates, so switching itineraries or advancing a stop refetches while unrelated re-renders don't
- `map.servicesAreRemote` ("Showing services around the itinerary, not around you") now only appears when there's no position fix at all, since with GPS the user always gets both centres

## [07-08-2026]

### Added
- Walk/drive travel mode on the map. `/places/route` and `services/geoapify.py` already accepted a `mode` parameter and passed it to Geoapify, which supports `walk` alongside `drive` — `MapPage.jsx` was simply hardcoding `'drive'`. A two-button icon switch inside the distance panel now selects the mode; it appears only when a route is drawn, and switching refetches and redraws, since a walking route uses footpaths a car route cannot
- Estimated travel time. Geoapify's routing response already carried `time` in seconds on both the feature and each leg; only `distance` was being read. The panel now leads with the ETA and demotes distance to the line below, showing total remaining time alongside total distance on multi-stop itineraries
- `formatDuration(seconds)` in `utils/geo.js` — renders `< 1 min`, `43 min`, `1 h`, `2 h 15 min`. The unit strings are identical in French, so it stays out of the i18n file
- Travel-time estimates for the straight-line fallback, derived from distance at `FALLBACK_SPEED_MPS` (6.9 m/s driving, ~25 km/h urban; 1.35 m/s walking, ~4.9 km/h). Fallback figures are prefixed `≈` so an approximation never reads as a routed time
- Loading state on the distance panel — three animated dots and a "Calculating..." caption while a route is in flight, replacing the ETA and distance lines while the stop label stays put. Previously, tapping walk kept the *driving* time on screen until the new response arrived, so for a few seconds the panel showed a car ETA under a highlighted walking icon. The panel now also appears as soon as waypoints exist, rather than staying hidden until the first response lands
- `map.travelMode`, `map.onFoot`, `map.byCar` and `map.calculating` i18n strings, in both English and French. The mode buttons render icons only; the first three are used as `aria-label`/`title` so the buttons aren't announced as blank

### Changed
- `travelMode` is persisted with the rest of the map state and resets to `drive` with the map
- Both mode buttons are disabled while a route request is in flight. Without it, rapid tapping queues several requests — the `active` flag stops an out-of-order response overwriting a newer one, but the wasted Geoapify calls are still billed
- Route loading is derived during render rather than held in state: each `routeSummary` carries the `routeKey` (waypoint signature plus travel mode) it was computed for, and `routeLoading` is true whenever the stored summary doesn't match the key currently being requested. Calling `setRouteLoading` inside the effect body tripped the "Calling setState synchronously within an effect can trigger cascading renders" rule — the same problem already solved elsewhere in this codebase with `stopResetKey`. Deriving it is also more correct: the flag now stays true until the summary that returns actually belongs to the current mode and waypoints, so a stale response can no longer briefly read as a settled figure
- The response branch carrying no distance at all now stores a keyed summary with null values instead of `null`, otherwise the derived loading flag would never clear. The panel is gated on `routeSummaryReady` (matching key *and* a real distance), so that case hides the panel rather than rendering blank lines