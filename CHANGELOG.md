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