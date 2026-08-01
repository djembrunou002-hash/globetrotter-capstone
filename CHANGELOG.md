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

### Fixed
- The map's 3-dots and search buttons were invisible when the map was opened from the "Location" button or "Show itinerary" — but not when opened from the bottom nav. Both entry points are on scrollable pages, so `/map` loaded with the previous page's scroll offset still applied. `.map-page` was `position: relative; height: 100vh`, and since `100vh` exceeds the visible viewport on mobile, the document stayed scrollable and everything absolutely positioned inside slid up with it — enough to push the two controls (42px tall, at `top: 16px`, or ~57px on a notched phone once `env(safe-area-inset-top)` applies) entirely above the fold. The map canvas filled the screen either way, which is why nothing else looked wrong

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