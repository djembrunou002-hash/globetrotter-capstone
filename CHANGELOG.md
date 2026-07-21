## [21-07-2026]

## ADD ##

*** Flask app and config ***
*** JSON storage helper functions ***
*** JSON data(destinations.json,itineraries.json,users.json) ***
*** Authentication(User signup and login) and dedicated testing file ***

- `POST /register` — create an account (name, email, number, password)
- `POST /login` — returns a JWT access token

Include the token as `Authorization: Bearer <token>` on protected routes.

*** Destinations and dedicated testing file***

- `GET /destinations` — list/search destinations. Filter with `tag`, `budget`, `country`, `region`, `area`, `type`, `q`
- `POST /destinations/<id>/rating` — rate a destination 1–5 stars *(auth required)*
- `POST /destinations/<id>/favorite` — add to favorites *(auth required)*
- `DELETE /destinations/<id>/favorite` — remove from favorites *(auth required)*
- `GET /favorites` — list your favorite destinations *(auth required)*

*** Recommendation Scoring logic and dedicated testing file ***

