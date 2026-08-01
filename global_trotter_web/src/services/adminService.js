import { apiRequest } from './api.js'
import { getDestinations } from './destinationService.js'
import { buildDestinationFormData } from './myDestinationService.js'

export function getPendingRequests() {
  return apiRequest('/admin/requests')
}

export function approveRequest(requestId) {
  return apiRequest(`/admin/requests/${requestId}/approve`, { method: 'POST' })
}

export function rejectRequest(requestId, note) {
  return apiRequest(`/admin/requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note })
  })
}

export function saveRequestNote(requestId, note) {
  return apiRequest(`/admin/requests/${requestId}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ note })
  })
}

export function deleteRequest(requestId) {
  return apiRequest(`/admin/requests/${requestId}`, { method: 'DELETE' })
}

export function getAllDestinations() {
  return getDestinations()
}

export function adminUpdateDestination(destinationId, fields, imageFiles) {
  return apiRequest(`/destinations/${destinationId}`, {
    method: 'PUT',
    body: buildDestinationFormData(fields, imageFiles)
  })
}

export function adminDeleteDestination(destinationId) {
  return apiRequest(`/destinations/${destinationId}`, { method: 'DELETE' })
}