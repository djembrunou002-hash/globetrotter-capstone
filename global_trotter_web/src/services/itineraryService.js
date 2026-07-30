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

export function addDestinationToItinerary(itineraryId, destinationId, time) {
  return apiRequest(`/itineraries/${itineraryId}/destinations`, {
    method: 'PUT',
    body: JSON.stringify({
      destination_id: destinationId,
      ...(time ? { time } : {})
    })
  })
}