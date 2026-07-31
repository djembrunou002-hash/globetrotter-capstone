import { useEffect, useState } from 'react'

const isGeolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(isGeolocationSupported ? '' : 'Geolocation is not supported on this device')

  useEffect(() => {
    if (!isGeolocationSupported) return

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setError('')
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy
        })
      },
      err => {
        setError(err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return { position, error }
}