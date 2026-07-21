# GlobeTrotter – Travel Assistant

## Overview

**GlobeTrotter Travel Assistant** is a **distributed travel recommendation and trip planning application** designed to help users discover new destinations, organize their trips, and receive personalized travel recommendations based on their preferences and interests.

The project starts as a **monolithic Flask application** that serves as the foundation for a semester-long capstone project. Students first build the monolith, then progressively refactor it into a **microservices architecture**, and finally deploy it to the cloud using resilience patterns and cloud-native technologies such as:

- Docker
- Kubernetes
- Cloud-native tooling

## Setup

pip install -r requirements.txt

## Running

python app.py

The API runs on http://localhost:5000

## REST API

| Method | Endpoint            | Auth required | Description                              |
|--------|---------------------|---------------|------------------------------------------|
| POST   | `/register`         | No            | Register a new user                      |
| POST   | `/login`            | No            | Authenticate and receive a JWT token     |
| GET    | `/destinations`     | No            | Search the destination catalogue         |
| POST    | `/destinations/<id>/rating`| Yes    | Rate a destination                       |
| POST    | `/destinations/<id>/favorite`| Yes  | Add a destination to favorite            |
| DELETE   | `/destinations/<id>/favorite`| Yes | Remove a destination from favorite         |
| GET    | `/favorites`| Yes  | list your favorite destinations         |

## Request example

### register
curl -X POST http://localhost:5000/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Jane Doe\", \"email\": \"jane@example.com\", \"number\": \"1234567890\", \"password\": \"supersecret\"}"
### login
 curl -X POST http://localhost:5000/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"password\": \"supersecret\"}"
### get destinations
curl -X GET "http://localhost:5000/destinations"

### rate destintions

curl -X POST http://localhost:5000/destinations/dest_001/rating -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"stars\": 5}"

### add to fav
curl -X POST http://localhost:5000/destinations/dest_001/favorite -H "Authorization: Bearer %TOKEN%"

### remove from fav

curl -X DELETE http://localhost:5000/destinations/dest_001/favorite -H "Authorization: Bearer %TOKEN%"

### get favs
curl -X GET http://localhost:5000/favorites -H "Authorization: Bearer %TOKEN%"





## data storage

| File                    | Purpose                              |
|-------------------------|--------------------------------------|
| `data/destinations.json`| Static catalogue of travel destinations  |
| `data/users.json`       | Registered users  |
| `data/itineraries.json` | User itineraries  |

