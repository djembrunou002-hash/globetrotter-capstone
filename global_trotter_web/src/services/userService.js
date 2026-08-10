import { apiRequest } from './api.js'

export function getUserStats() {
  return apiRequest('/users/stats')
}

export function updatePreferences(travelStyle) {
  return apiRequest('/users/preferences', {
    method: 'PUT',
    body: JSON.stringify({ travel_style: travelStyle })
  })
}