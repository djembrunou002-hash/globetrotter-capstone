import { useCallback, useEffect, useState } from 'react'
import { haversineDistanceMeters, bearingDegrees } from '../utils/geo.js'

const MOVEMENT_HEADING_THRESHOLD_METERS = 5
const POSITION_EPSILON_METERS = 4
const ACCURACY_EPSILON_METERS = 15
const HEADING_EPSILON_DEGREES = 3
const ORIENTATION_MIN_INTERVAL_MS = 120
const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }

const isGeolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator
const isOrientationSupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
const isSecureOrigin = typeof window === 'undefined' ? true : window.isSecureContext !== false

function initialError() {
  if (!isGeolocationSupported) return 'Location is not available on this device'
  if (!isSecureOrigin) {
    return 'Location needs a secure connection. Open this page over https to enable positioning.'
  }
  return ''
}

const store = {
  position: null,
  error: initialError(),
  compassHeading: null,
  movementAnchor: null,
  watchId: null,
  orientationBound: false,
  lastOrientationAt: 0,
  subscribers: 0
}

const listeners = new Set()

function emit() {
  listeners.forEach(listener => listener())
}

function headingDelta(a, b) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function setError(message) {
  if (store.error === message) return
  store.error = message
  emit()
}

function setPosition(next) {
  const previous = store.position

  if (previous) {
    const moved = haversineDistanceMeters(previous, next)

    const headingChanged =
      previous.heading == null || next.heading == null
        ? previous.heading !== next.heading
        : headingDelta(previous.heading, next.heading) >= HEADING_EPSILON_DEGREES

    const accuracyChanged =
      Math.abs((previous.accuracy || 0) - (next.accuracy || 0)) >= ACCURACY_EPSILON_METERS

    if (moved < POSITION_EPSILON_METERS && !headingChanged && !accuracyChanged) return
  }

  store.position = next
  emit()
}

function resolveHeading(gpsHeading, movementHeading) {
  if (store.compassHeading != null) return store.compassHeading
  if (gpsHeading != null) return gpsHeading
  if (movementHeading != null) return movementHeading
  return store.position ? store.position.heading : null
}

function handlePosition(pos) {
  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
  const gpsHeading =
    Number.isFinite(pos.coords.heading) && Number.isFinite(pos.coords.speed) && pos.coords.speed > 0.5
      ? pos.coords.heading
      : null

  let movementHeading = null
  if (store.movementAnchor) {
    const moved = haversineDistanceMeters(store.movementAnchor, coords)
    if (moved >= MOVEMENT_HEADING_THRESHOLD_METERS) {
      movementHeading = bearingDegrees(store.movementAnchor, coords)
      store.movementAnchor = coords
    }
  } else {
    store.movementAnchor = coords
  }

  setError('')
  setPosition({
    lat: coords.lat,
    lng: coords.lng,
    heading: resolveHeading(gpsHeading, movementHeading),
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null
  })
}

function handlePositionError(err) {
  if (err && err.code === 3 && store.position) return
  if (!isSecureOrigin) {
    setError('Location needs a secure connection. Open this page over https to enable positioning.')
    return
  }
  setError(err && err.message ? err.message : 'Location unavailable')
}

function handleOrientation(event) {
  const now = Date.now()
  if (now - store.lastOrientationAt < ORIENTATION_MIN_INTERVAL_MS) return

  const heading =
    event.webkitCompassHeading != null
      ? event.webkitCompassHeading
      : event.absolute && event.alpha != null
        ? (360 - event.alpha) % 360
        : null

  if (heading == null || Number.isNaN(heading)) return
  if (store.compassHeading != null && headingDelta(store.compassHeading, heading) < HEADING_EPSILON_DEGREES) {
    return
  }

  store.lastOrientationAt = now
  store.compassHeading = heading
  if (!store.position) return
  setPosition({ ...store.position, heading })
}

function bindOrientation() {
  if (!isOrientationSupported || store.orientationBound) return
  store.orientationBound = true
  window.addEventListener('deviceorientationabsolute', handleOrientation, true)
  window.addEventListener('deviceorientation', handleOrientation, true)
}

function startWatching() {
  if (!isGeolocationSupported || store.watchId != null) return
  store.watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, GEO_OPTIONS)
  bindOrientation()
}

function stopWatching() {
  if (store.watchId == null) return
  navigator.geolocation.clearWatch(store.watchId)
  store.watchId = null
}

export function useGeolocation() {
  const [snapshot, setSnapshot] = useState(() => ({
    position: store.position,
    error: store.error
  }))

  useEffect(() => {
    function sync() {
      setSnapshot({ position: store.position, error: store.error })
    }

    listeners.add(sync)
    store.subscribers += 1
    startWatching()
    sync()

    return () => {
      listeners.delete(sync)
      store.subscribers -= 1
      if (store.subscribers <= 0) {
        store.subscribers = 0
        stopWatching()
      }
    }
  }, [])

  const requestHeadingPermission = useCallback(async () => {
    if (
      typeof DeviceOrientationEvent === 'undefined' ||
      typeof DeviceOrientationEvent.requestPermission !== 'function'
    ) {
      return true
    }
    try {
      const result = await DeviceOrientationEvent.requestPermission()
      if (result === 'granted') bindOrientation()
      return result === 'granted'
    } catch {
      return false
    }
  }, [])

  return {
    position: snapshot.position,
    error: snapshot.error,
    requestHeadingPermission
  }
}