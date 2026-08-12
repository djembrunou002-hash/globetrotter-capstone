import { getToken, clearToken, clearUser } from './tokenStorage.js'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-otp']

function handleExpiredSession() {
  clearToken()
  clearUser()
  if (!PUBLIC_PATHS.includes(window.location.pathname)) {
    window.location.replace('/login')
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken()
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401 && token) {
    handleExpiredSession()
    throw new Error('Session expired')
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : 'Request failed'
    throw new Error(message)
  }

  return data
}