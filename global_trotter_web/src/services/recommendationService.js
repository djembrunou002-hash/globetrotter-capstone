import { apiRequest } from './api.js'

export function getRecommendations(limit) {
  const query = limit ? `?limit=${limit}` : ''
  return apiRequest(`/recommendations${query}`)
}