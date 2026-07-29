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
- Navigation Bar
- Itinerarycard component
- Itinerary Form
- Destination Selection
- Itinenary detail page
- Checkbox status on destination cards

## Changed
- Logo(`Logo.jsx`) to render as text after login

## [26-07-2026]

### Added
- Destiantions page(`Destiantions.jsx`) and its dedicated test file


## Changed
- NavBar to add destination page route
- Destinations page(`Destiantions.jsx/.css`)and dedicated testing file to add search bar
- Destinatons page(`Destiantions.jsx/.css`)and dedicated testing file to add filters 

## [27-07-2026]

## Added 
- Destination images
- Additional images
- Destination detail page (`Destinationdetails.jsx`) and its dedicated testing files


## Changed 
- Destination.json to add destinations
- Itineraries detail page(`itineraryDetails.jsx`) to add search bar and filters
- additinerarymodal(`Additinerarymodal`) inorder to route to destination page then add a search bar
and filters
- Destinations page(`Destinations`) to route to destination details page
- `auth.py` and dedicated testing file to return user object
- `tokenstorage.js`
- `login.jsx` store the returned user object
- bottomnav (`bottomnav.jsx`) to add profile
- profile page (`profile.jsx`)

## [28-07-2026]

## Added
- Recommendationservice(`recommendationService.jsx`) and dedicated testing file
- .env.production
- web app icon 


## Changed
- Home page(`Home.jsx`) to include recommendations
- Star rating(`Starrating.jsx`) 
- `Destinationcard.css` to update stars UI to your actual vote
- `destinations.json`
- `users.json`
- itinerary details page(`itineraryDetails.jsx`) adding search bar and filters
- api(`api.js`)

## [29-07-2026]

# Added
- comments data(`comments.json`)
- comments route(`comments.py`) + dedicated test file
- Comment section (`CommentSection.jsx`)

## Changed 
- Destination details page(`Destinationdetails.jsx`) + css and test file
- destination route(`destination.py`)
- `app.py`

