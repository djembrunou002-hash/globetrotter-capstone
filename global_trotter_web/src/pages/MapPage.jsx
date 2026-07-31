import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDestinations } from '../services/destinationService.js'
import { getItineraries } from '../services/itineraryService.js'
import { searchPlaces, getNearbyPlaces, getRoute } from '../services/mapService.js'
import { getToken } from '../services/tokenStorage.js'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { CATEGORY_META, buildStraightLineGeoJson } from '../utils/mapCategories.js'
import BottomNav from '../components/Bottomnav.jsx'
import MapView from '../components/MapView.jsx'
import '../styles/MapPage.css'

function toMarker(destination) {
  return {
    id: destination.id,
    name: destination.name,
    lat: destination.location.lat,
    lng: destination.location.lng
  }
}

function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAuthenticated = Boolean(getToken())
  const mapViewRef = useRef(null)
  const { position: userLocation } = useGeolocation()

  const destinationParam = searchParams.get('destination')
  const itineraryParam = searchParams.get('itinerary')

  const [destinations, setDestinations] = useState([])
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedItineraryId, setSelectedItineraryId] = useState(itineraryParam || null)
  const [showRoute, setShowRoute] = useState(Boolean(itineraryParam))
  const [showServices, setShowServices] = useState(true)
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [route, setRoute] = useState(null)
  const [routeIsFallback, setRouteIsFallback] = useState(false)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchedPlace, setSearchedPlace] = useState(null)

  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [destinationsResponse, itinerariesResponse] = await Promise.all([
          getDestinations(),
          isAuthenticated ? getItineraries() : Promise.resolve({ itineraries: [] })
        ])
        setDestinations(destinationsResponse.destinations)
        setItineraries(itinerariesResponse.itineraries)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated])

  const destinationsById = useMemo(
    () => new Map(destinations.map(destination => [destination.id, destination])),
    [destinations]
  )

  const focusDestination = destinationParam ? destinationsById.get(destinationParam) : null

  const containingItineraries = useMemo(() => {
    if (!destinationParam) return []
    return itineraries.filter(itinerary => itinerary.destinations.includes(destinationParam))
  }, [itineraries, destinationParam])

  const paramsSignature = `${itineraryParam || ''}::${destinationParam || ''}::${containingItineraries.map(i => i.id).join(',')}`
  const [appliedSignature, setAppliedSignature] = useState('')

  if (paramsSignature !== appliedSignature) {
    setAppliedSignature(paramsSignature)
    if (itineraryParam) {
      setSelectedItineraryId(itineraryParam)
      setShowRoute(true)
    } else if (destinationParam) {
      setSelectedItineraryId(prev => prev || containingItineraries[0]?.id || null)
    }
  }

  const activeItinerary = useMemo(
    () => itineraries.find(itinerary => itinerary.id === selectedItineraryId) || null,
    [itineraries, selectedItineraryId]
  )

  const destinationMarkers = useMemo(() => {
    if ((itineraryParam || showRoute) && activeItinerary) {
      return activeItinerary.destinations
        .map(id => destinationsById.get(id))
        .filter(Boolean)
        .map(toMarker)
    }
    if (focusDestination) {
      return [toMarker(focusDestination)]
    }
    return []
  }, [itineraryParam, showRoute, activeItinerary, focusDestination, destinationsById])

  const routeEnabled = showRoute && destinationMarkers.length > 1

  useEffect(() => {
    if (!routeEnabled) return

    let active = true

    async function loadRoute() {
      const points = destinationMarkers.map(marker => [marker.lat, marker.lng])
      try {
        const geojson = await getRoute(points, 'drive')
        if (active) {
          setRoute(geojson)
          setRouteIsFallback(false)
        }
      } catch (err) {
        console.error('Falling back to a straight-line route:', err.message)
        if (active) {
          setRoute(buildStraightLineGeoJson(points))
          setRouteIsFallback(true)
        }
      }
    }

    loadRoute()
    return () => {
      active = false
    }
  }, [routeEnabled, destinationMarkers])

  const visibleRoute = routeEnabled ? route : null

  useEffect(() => {
    if (!showServices || destinationMarkers.length === 0) return

    let active = true

    async function loadNearby() {
      const centerLat = destinationMarkers.reduce((sum, d) => sum + d.lat, 0) / destinationMarkers.length
      const centerLng = destinationMarkers.reduce((sum, d) => sum + d.lng, 0) / destinationMarkers.length
      const radius = destinationMarkers.length > 1 ? 2500 : 1200
      try {
        const response = await getNearbyPlaces(centerLat, centerLng, { radius })
        if (active) setNearbyPlaces(response.results)
      } catch {
        if (active) setNearbyPlaces([])
      }
    }

    loadNearby()
    return () => {
      active = false
    }
  }, [showServices, destinationMarkers])

  const visibleNearbyPlaces = showServices && destinationMarkers.length > 0 ? nearbyPlaces : []

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    let active = true
    const timeout = setTimeout(async () => {
      try {
        const response = await searchPlaces(trimmed)
        if (active) setSearchResults(response.results)
      } catch {
        if (active) setSearchResults([])
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [searchQuery])

  const visibleSearchResults = searchQuery.trim() ? searchResults : []

  function handleSelectSearchResult(result) {
    setSearchedPlace(result)
    setSearchResults([])
    setSearchQuery(result.name)
    setSearchOpen(false)
  }

  function handleClearSearch() {
    setSearchedPlace(null)
    setSearchQuery('')
    setSearchResults([])
  }

  function handleCloseSearch() {
    setSearchOpen(false)
    handleClearSearch()
  }

  function handleDestinationMarkerClick(marker) {
    navigate(`/destinations/${marker.id}`)
  }

  function handleMenuOptionMe() {
    setMenuOpen(false)
    mapViewRef.current?.flyToUser()
  }

  function handleMenuOptionDestination() {
    setMenuOpen(false)
    mapViewRef.current?.flyToDestinations()
  }

  function handleMenuOptionItinerary() {
    setShowRoute(prev => !prev)
  }

  function handleMenuOptionServices() {
    setShowServices(prev => !prev)
  }

  const presentCategories = useMemo(() => {
    const set = new Set()
    if (destinationMarkers.length > 0) set.add('destination')
    if (searchedPlace) set.add('searched')
    visibleNearbyPlaces.forEach(place => set.add(place.category))
    return [...set]
  }, [destinationMarkers, searchedPlace, visibleNearbyPlaces])

  const canToggleRoute = Boolean(itineraryParam) || containingItineraries.length > 0

  return (
    <div className="map-page">
      {loading && <p className="map-page__status">Loading map...</p>}
      {error && <p className="map-page__status map-page__status--error">{error}</p>}

      {!loading && !error && (
        <>
          <MapView
            ref={mapViewRef}
            destinations={destinationMarkers}
            nearbyPlaces={visibleNearbyPlaces}
            searchedPlace={searchedPlace}
            route={visibleRoute}
            routeIsFallback={routeIsFallback}
            userLocation={userLocation}
            onDestinationClick={handleDestinationMarkerClick}
          />

          <button
            type="button"
            className="map-page__menu-trigger"
            aria-label="Map options"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>

          {menuOpen && (
            <div className="map-page__menu">
              <button type="button" onClick={handleMenuOptionMe} disabled={!userLocation}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" />
                </svg>
                My location
              </button>
              <button type="button" onClick={handleMenuOptionDestination} disabled={destinationMarkers.length === 0}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Destination
              </button>
              {canToggleRoute && (
                <button type="button" className={showRoute ? 'is-active' : ''} onClick={handleMenuOptionItinerary}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19c4-8 12-8 16 0" />
                    <circle cx="4" cy="19" r="1.6" />
                    <circle cx="20" cy="19" r="1.6" />
                  </svg>
                  {showRoute ? 'Hide itinerary path' : 'Show itinerary path'}
                </button>
              )}
              <button type="button" className={showServices ? 'is-active' : ''} onClick={handleMenuOptionServices}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                {showServices ? 'Hide nearby services' : 'Show nearby services'}
              </button>

              {!itineraryParam && showRoute && containingItineraries.length > 1 && (
                <select
                  className="map-page__menu-select"
                  value={selectedItineraryId || ''}
                  onChange={e => setSelectedItineraryId(e.target.value)}
                  aria-label="Choose which itinerary to show"
                >
                  {containingItineraries.map(itinerary => (
                    <option key={itinerary.id} value={itinerary.id}>{itinerary.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!searchOpen && (
            <button
              type="button"
              className="map-page__search-trigger"
              aria-label="Search a place"
              onClick={() => setSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          )}

          {searchOpen && (
            <div className="map-page__search-panel">
              <div className="map-page__search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="map-page__search-input"
                  placeholder="Search a place on the map"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search a place on the map"
                  autoFocus
                />
                {(searchQuery || searchedPlace) && (
                  <button
                    type="button"
                    className="map-page__search-clear"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="map-page__search-close"
                  onClick={handleCloseSearch}
                  aria-label="Close search"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {visibleSearchResults.length > 0 && (
                <ul className="map-page__search-results">
                  {visibleSearchResults.map(result => (
                    <li key={`${result.lat}-${result.lng}`}>
                      <button type="button" onClick={() => handleSelectSearchResult(result)}>
                        {result.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {presentCategories.length > 0 && (
            <div className="map-page__legend">
              {presentCategories.map(category => (
                <span key={category} className="map-page__legend-item">
                  <span
                    className="map-page__legend-dot"
                    style={{ background: CATEGORY_META[category]?.color || CATEGORY_META.other.color }}
                  />
                  {CATEGORY_META[category]?.label || 'Other service'}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <BottomNav />
    </div>
  )
}

export default MapPage