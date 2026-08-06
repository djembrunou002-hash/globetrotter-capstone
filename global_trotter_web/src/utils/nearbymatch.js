import { haversineDistanceMeters } from './geo.js'

const EXACT_MATCH_MAX_METERS = 500
const CONTAINS_MATCH_MAX_METERS = 300
const TOKEN_MATCH_MAX_METERS = 150
const MIN_TOKEN_LENGTH = 4

const GENERIC_TOKENS = new Set([
  'hotel',
  'motel',
  'lodge',
  'auberge',
  'restaurant',
  'resto',
  'cafe',
  'coffee',
  'lounge',
  'grill',
  'pizzeria',
  'snack',
  'market',
  'marche',
  'supermarket',
  'pharmacie',
  'pharmacy',
  'hopital',
  'hospital',
  'clinique',
  'clinic',
  'banque',
  'bank',
  'station',
  'centre',
  'center',
  'central',
  'yaounde',
  'douala',
  'cameroun',
  'cameroon',
  'chez',
  'maison',
  'house',
  'club',
  'bar'
])

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function significantTokens(normalized) {
  return normalized
    .split(' ')
    .filter(token => token.length >= MIN_TOKEN_LENGTH && !GENERIC_TOKENS.has(token))
}

function hasCoordinates(destination) {
  return Boolean(
    destination &&
      destination.location &&
      Number.isFinite(Number(destination.location.lat)) &&
      Number.isFinite(Number(destination.location.lng))
  )
}

function buildCandidates(destinations) {
  return (destinations || []).filter(hasCoordinates).map(destination => {
    const normalized = normalizeName(destination.name)
    return {
      id: destination.id,
      name: destination.name,
      normalized,
      tokens: significantTokens(normalized),
      lat: Number(destination.location.lat),
      lng: Number(destination.location.lng)
    }
  })
}

function tierFor(placeNormalized, placeTokens, candidate, distance) {
  if (!placeNormalized || !candidate.normalized) return null

  if (placeNormalized === candidate.normalized) {
    return distance <= EXACT_MATCH_MAX_METERS ? 1 : null
  }

  const shorter =
    placeNormalized.length <= candidate.normalized.length ? placeNormalized : candidate.normalized
  const longer =
    placeNormalized.length <= candidate.normalized.length ? candidate.normalized : placeNormalized

  if (shorter.length >= MIN_TOKEN_LENGTH && longer.includes(shorter)) {
    return distance <= CONTAINS_MATCH_MAX_METERS ? 2 : null
  }

  if (placeTokens.length > 0 && candidate.tokens.length > 0) {
    const overlaps = placeTokens.some(token => candidate.tokens.includes(token))
    if (overlaps) return distance <= TOKEN_MATCH_MAX_METERS ? 3 : null
  }

  return null
}

function findMatch(place, candidates) {
  const lat = Number(place.lat)
  const lng = Number(place.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const placeNormalized = normalizeName(place.name)
  const placeTokens = significantTokens(placeNormalized)

  let best = null

  candidates.forEach(candidate => {
    const distance = haversineDistanceMeters({ lat, lng }, { lat: candidate.lat, lng: candidate.lng })
    if (distance > EXACT_MATCH_MAX_METERS) return

    const tier = tierFor(placeNormalized, placeTokens, candidate, distance)
    if (tier == null) return

    if (!best || tier < best.tier || (tier === best.tier && distance < best.distance)) {
      best = { candidate, tier, distance }
    }
  })

  return best
}

export function linkNearbyPlaces(nearbyPlaces, destinations) {
  if (!nearbyPlaces || nearbyPlaces.length === 0) return nearbyPlaces || []

  const candidates = buildCandidates(destinations)
  if (candidates.length === 0) return nearbyPlaces

  return nearbyPlaces.map(place => {
    const match = findMatch(place, candidates)
    if (!match) return place
    return {
      ...place,
      destinationId: match.candidate.id,
      destinationName: match.candidate.name
    }
  })
}