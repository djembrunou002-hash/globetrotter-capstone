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