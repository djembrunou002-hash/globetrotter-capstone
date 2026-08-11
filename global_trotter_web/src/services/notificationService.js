import { apiRequest } from './api.js'

export function getNotifications() {
  return apiRequest('/notifications')
}