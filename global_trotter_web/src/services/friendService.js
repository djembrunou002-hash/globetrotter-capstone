import { apiRequest } from './api.js'

export function getFriends() {
  return apiRequest('/friends')
}

export function addFriend(payload) {
  return apiRequest('/friends', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function removeFriend(friendId) {
  return apiRequest(`/friends/${friendId}`, {
    method: 'DELETE'
  })
}