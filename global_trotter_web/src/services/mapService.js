import { apiRequest } from './api.js'

export function searchPlaces(text, { lat, lon } = {}) {
  const params = new URLSearchParams({ text })
  if (lat != null && lon != null) {
    params.set('lat', lat)
    params.set('lon', lon)
  }
  return apiRequest(`/places/search?${params.toString()}`)
}

export function getNearbyPlaces(lat, lng, { radius, categories } = {}) {
  const params = new URLSearchParams({ lat, lng })
  if (radius) params.set('radius', radius)
  if (categories && categories.length) params.set('categories', categories.join(','))
  return apiRequest(`/places/nearby?${params.toString()}`)
}

export function getRoute(points, mode = 'drive') {
  const pointsParam = points.map(([lat, lng]) => `${lat},${lng}`).join('|')
  const params = new URLSearchParams({ points: pointsParam, mode })
  return apiRequest(`/places/route?${params.toString()}`)
}