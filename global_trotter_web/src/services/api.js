import { getToken } from './tokenStorage.js'

export const API_BASE_URL = 'http://localhost:5000'

export async function apiRequest(endpoint, options = {}) {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data && data.error ? data.error : 'Request failed'
    throw new Error(message)
  }

  return data
}