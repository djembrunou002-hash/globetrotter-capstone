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


## Request example

curl -X POST http://localhost:5000/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Jane Doe\", \"email\": \"jane@example.com\", \"number\": \"1234567890\", \"password\": \"supersecret\"}"

 curl -X POST http://localhost:5000/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"jane@example.com\", \"password\": \"supersecret\"}"

  

## data storage

| File                    | Purpose                              |
|-------------------------|--------------------------------------|
| `data/destinations.json`| Static catalogue of travel destinations  |
| `data/users.json`       | Registered users  |
| `data/itineraries.json` | User itineraries  |

