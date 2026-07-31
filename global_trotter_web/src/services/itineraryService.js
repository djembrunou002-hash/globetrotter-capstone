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

export function deleteItinerary(itineraryId) {
  return apiRequest(`/itineraries/${itineraryId}`, {
    method: 'DELETE'
  })
}

export function deleteItineraries(itineraryIds) {
  return apiRequest('/itineraries', {
    method: 'DELETE',
    body: JSON.stringify({ ids: itineraryIds })
  })
}

export function shareItinerary(itineraryId, contact) {
  return apiRequest(`/itineraries/${itineraryId}/share`, {
    method: 'POST',
    body: JSON.stringify(contact)
  })
}

export function unshareItinerary(itineraryId, sharedUserId) {
  return apiRequest(`/itineraries/${itineraryId}/share/${sharedUserId}`, {
    method: 'DELETE'
  })
}

export function getSharedUsers(itineraryId) {
  return apiRequest(`/itineraries/${itineraryId}/shared-users`)
}