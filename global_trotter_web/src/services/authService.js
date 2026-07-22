import { apiRequest } from './api.js'

export function registerUser(payload) {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}