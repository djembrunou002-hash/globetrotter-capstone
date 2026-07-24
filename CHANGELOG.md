## [21-07-2026]

## ADD ##

*** Flask app and config ***
***  added JSON storage helper functions ***
*** added JSON data(destinations.json,itineraries.json,users.json) ***
*** added Authentication(User signup and login) and dedicated testing file ***

- `POST /register` — create an account (name, email, number, password)
- `POST /login` — returns a JWT access token

Include the token as `Authorization: Bearer <token>` on protected routes.

*** added Destinations and dedicated testing file***

- `GET /destinations` — list/search destinations. Filter with `tag`, `budget`, `country`, `region`, `area`, `type`, `q`
- `POST /destinations/<id>/rating` — rate a destination 1–5 stars *(auth required)*
- `POST /destinations/<id>/favorite` — add to favorites *(auth required)*
- `DELETE /destinations/<id>/favorite` — remove from favorites *(auth required)*
- `GET /favorites` — list your favorite destinations *(auth required)*

*** added Recommendation Scoring logic and dedicated testing file ***

*** added Recommendations nd dedicated test file(requires itinerary route) ***

- `GET /recommendations` *(auth required)* — destinations ranked for you based
  on travel style, budget, preferred area, and past itineraries

*** added Itineraries ***

- `POST /itineraries` *(auth required)* — save a titled itinerary 
- `GET /itineraries` *(auth required)* — return titled itinerary 


## [22-07-2026]

*** React(Vite + JS) project setup ***
*** added an api service to link create a link to the backend ***
*** added authservice to handle register routes ***
*** added register page and its dedicated testing file ***
*** added CORS to backend to allow communication between different origin (web to server and vice versa) ***
*** added .env and python-dotenv to backend ***

## [23-07-2026]

*** added landing page and its dedicated testing file ***
*** Updated register page UI ***
*** added form constraints ***
*** added login page and its dedicated testing file ***
*** added shared files to manage both register and login page UI and layout(authform.jsx,emailfield.jsx,passwordfield.jsx,phoneinput.jsx) ***
*** added "GLOBALTROTTER" logo as home link ***

## [24-07-2026]

*** added tokenStorage.js inorder to store each user token after login ***
*** updated api.js so it attaches token to all request going forward ***
*** added home page (home.jsx) and dedicated testing file ***
*** added destination cards component (Destinationcard.jsx) and dedicated testing file ***
*** added star rating component (starrating.jsx) ***
*** added destiantion service (destinationService.js) for destination fetching from frontend ***
*** updated login page to redirect to home page ***
*** updated login test to test token storage ***
*** updated landing page with more visitable areas images ***
*** updated landing test file to include those images ***
