import { apiRequest } from './api.js'

export function getComments(destinationId) {
  return apiRequest(`/destinations/${destinationId}/comments`)
}

export function addComment(destinationId, text) {
  return apiRequest(`/destinations/${destinationId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
}

export function replyToComment(destinationId, commentId, text) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
}