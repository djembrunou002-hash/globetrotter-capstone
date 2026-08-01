const EARTH_RADIUS_METERS = 6371000

export function haversineDistanceMeters(a, b) {
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearingDegrees(from, to) {
  const toRad = deg => (deg * Math.PI) / 180
  const toDeg = rad => (rad * 180) / Math.PI
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const deltaLng = toRad(to.lng - from.lng)

  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}