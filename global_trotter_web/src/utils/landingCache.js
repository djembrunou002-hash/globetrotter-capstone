let cachedLandingData = null

export function readLandingCache() {
  return cachedLandingData
}

export function writeLandingCache(patch) {
  cachedLandingData = { ...cachedLandingData, ...patch }
  return cachedLandingData
}

export function clearLandingCache() {
  cachedLandingData = null
}


