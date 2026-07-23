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

