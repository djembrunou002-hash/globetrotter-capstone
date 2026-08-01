import { apiRequest } from './api.js'

export function getAiDestinationSuggestions(query) {
  return apiRequest('/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({ query })
  })
}