import { apiRequest } from './api.js'

export function getItineraries() {
  return apiRequest('/itineraries')
}

export function createItinerary(payload) {
  return apiRequest('/itineraries', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}