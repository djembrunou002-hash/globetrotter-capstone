import { apiRequest } from './api.js'

export function getDestinations() {
  return apiRequest('/destinations')
}

export function getFavorites() {
  return apiRequest('/favorites')
}

export function addFavorite(destinationId) {
  return apiRequest(`/destinations/${destinationId}/favorite`, {
    method: 'POST'
  })
}

export function removeFavorite(destinationId) {
  return apiRequest(`/destinations/${destinationId}/favorite`, {
    method: 'DELETE'
  })
}

export function rateDestination(destinationId, stars) {
  return apiRequest(`/destinations/${destinationId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ stars })
  })
}