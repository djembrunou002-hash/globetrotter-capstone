import { apiRequest } from './api.js'

export function registerUser(payload) {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function verifyOtp(payload) {
  return apiRequest('/verify-email', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function resendOtp(payload) {
  return apiRequest('/resend-otp', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function loginUser(payload) {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function loginWithGoogle(credential) {
  return apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  })
}

export function forgotPassword(payload) {
  return apiRequest('/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function verifyResetCode(payload) {
  return apiRequest('/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function resetPassword(payload) {
  return apiRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}