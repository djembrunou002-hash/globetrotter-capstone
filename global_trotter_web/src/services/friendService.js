import { apiRequest } from './api.js'

export function getFriends() {
  return apiRequest('/friends')
}

export function getFriendRequests() {
  return apiRequest('/friends/requests')
}

export function sendFriendRequest(payload) {
  return apiRequest('/friends', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function acceptFriendRequest(requestId) {
  return apiRequest(`/friends/requests/${requestId}/accept`, {
    method: 'POST'
  })
}

export function declineFriendRequest(requestId) {
  return apiRequest(`/friends/requests/${requestId}/decline`, {
    method: 'POST'
  })
}

export function removeFriend(friendId) {
  return apiRequest(`/friends/${friendId}`, {
    method: 'DELETE'
  })
}