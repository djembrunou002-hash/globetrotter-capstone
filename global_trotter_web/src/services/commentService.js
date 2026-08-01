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

export function editComment(destinationId, commentId, text) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ text })
  })
}

export function deleteComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}`, {
    method: 'DELETE'
  })
}

export function likeComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/like`, {
    method: 'POST'
  })
}

export function unlikeComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/like`, {
    method: 'DELETE'
  })
}

export function dislikeComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/dislike`, {
    method: 'POST'
  })
}

export function undislikeComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/dislike`, {
    method: 'DELETE'
  })
}

export function pinComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/pin`, {
    method: 'POST'
  })
}

export function unpinComment(destinationId, commentId) {
  return apiRequest(`/destinations/${destinationId}/comments/${commentId}/pin`, {
    method: 'DELETE'
  })
}