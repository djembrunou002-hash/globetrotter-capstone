## [21-07-2026]

## ADD ##

*** Flask app and config ***
*** JSON storage helper functions ***
*** JSON data(destinations.json,itineraries.json,users.json) ***
*** Authentication(User signup and login) and dedicated testing file ***

- `POST /register` — create an account (name, email, number, password)
- `POST /login` — returns a JWT access token

Include the token as `Authorization: Bearer <token>` on protected routes.

