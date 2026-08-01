import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDestinations } from '../services/destinationService.js'
import { getItineraries } from '../services/itineraryService.js'
import { searchPlaces, getNearbyPlaces, getRoute } from '../services/mapService.js'
import { getToken } from '../services/tokenStorage.js'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { useVisitedStops } from '../hooks/useVisitedStops.js'
import { CATEGORY_META, buildStraightLineGeoJson } from '../utils/mapCategories.js'
import { haversineDistanceMeters, formatDistance } from '../utils/geo.js'
import BottomNav from '../components/Bottomnav.jsx'
import MapView from '../components/MapView.jsx'
import '../styles/MapPage.css'

const ARRIVAL_THRESHOLD_METERS = 60
const REROUTE_THRESHOLD_METERS = 30
const NEARBY_REFRESH_THRESHOLD_METERS = 400
const MAX_ROUTE_WAYPOINTS = 10
const MAP_STATE_STORAGE_KEY = 'globaltrotter:map-last-view'

const DEFAULT_MAP_STATE = {
  itineraryId: null,
  showRoute: true,
  showServices: true,
  showVisited: false,
  stopIds: null
}

function readPersistedMapState() {
  try {
    const raw = sessionStorage.getItem(MAP_STATE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed ? { ...DEFAULT_MAP_STATE, ...parsed } : { ...DEFAULT_MAP_STATE }
  } catch {
    return { ...DEFAULT_MAP_STATE }
  }
}

function writePersistedMapState(state) {
  try {
    sessionStorage.setItem(MAP_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}

function clearPersistedMapState() {
  try {
    sessionStorage.removeItem(MAP_STATE_STORAGE_KEY)
  } catch {
    return
  }
}

function parseStops(value) {
  if (!value) return null
  const ids = value.split(',').filter(Boolean)
  return ids.length > 0 ? ids : null
}

function hasCoordinates(destination) {
  return Boolean(
    destination &&
      destination.location &&
      Number.isFinite(Number(destination.location.lat)) &&
      Number.isFinite(Number(destination.location.lng))
  )
}

function toMarker(destination, position, visited) {
  return {
    id: destination.id,
    name: destination.name,
    lat: Number(destination.location.lat),
    lng: Number(destination.location.lng),
    position,
    visited: Boolean(visited)
  }
}

function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAuthenticated = Boolean(getToken())
  const mapViewRef = useRef(null)
  const { position: userLocation, error: locationError, requestHeadingPermission } = useGeolocation()

  const destinationParam = searchParams.get('destination')
  const itineraryParam = searchParams.get('itinerary')
  const stopsParam = searchParams.get('stops')

  const [destinations, setDestinations] = useState([])
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [persisted] = useState(readPersistedMapState)

  const [selectedItineraryId, setSelectedItineraryId] = useState(() => {
    if (itineraryParam) return itineraryParam
    if (destinationParam) return null
    return persisted.itineraryId
  })
  const [customStopIds, setCustomStopIds] = useState(() => {
    if (itineraryParam) return parseStops(stopsParam)
    if (destinationParam) return null
    return persisted.stopIds
  })
  const [showRoute, setShowRoute] = useState(() => (itineraryParam || destinationParam ? true : persisted.showRoute))
  const [showServices, setShowServices] = useState(persisted.showServices)
  const [showVisited, setShowVisited] = useState(persisted.showVisited)

  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [route, setRoute] = useState(null)
  const [routeIsFallback, setRouteIsFallback] = useState(false)
  const [routeSummary, setRouteSummary] = useState(null)
  const [stopIndex, setStopIndex] = useState(0)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchedPlace, setSearchedPlace] = useState(null)

  const [menuOpen, setMenuOpen] = useState(false)

  const lastRouteOriginRef = useRef(null)
  const lastRouteStopsKeyRef = useRef('')
  const lastNearbyCenterRef = useRef(null)

  const { visitedIds } = useVisitedStops(selectedItineraryId)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [destinationsResponse, itinerariesResponse] = await Promise.all([
          getDestinations(),
          isAuthenticated ? getItineraries() : Promise.resolve({ itineraries: [] })
        ])
        if (!active) return
        setDestinations(destinationsResponse.destinations || [])
        setItineraries(itinerariesResponse.itineraries || [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (itineraryParam) {
      setSelectedItineraryId(itineraryParam)
      setCustomStopIds(parseStops(stopsParam))
      setShowRoute(true)
      return
    }
    if (destinationParam) {
      setSelectedItineraryId(null)
      setCustomStopIds(null)
      setShowRoute(true)
    }
  }, [itineraryParam, destinationParam, stopsParam])

  const destinationsById = useMemo(
    () => new Map(destinations.map(destination => [destination.id, destination])),
    [destinations]
  )

  const focusDestination = destinationParam ? destinationsById.get(destinationParam) : null

  const activeItinerary = useMemo(
    () => itineraries.find(itinerary => itinerary.id === selectedItineraryId) || null,
    [itineraries, selectedItineraryId]
  )

  useEffect(() => {
    if (!selectedItineraryId || loading) return
    if (itineraries.some(itinerary => itinerary.id === selectedItineraryId)) return
    setSelectedItineraryId(null)
    setCustomStopIds(null)
  }, [selectedItineraryId, itineraries, loading])

  const itineraryStops = useMemo(() => {
    if (!activeItinerary) return []

    const itineraryIds = activeItinerary.destinations || []
    const ordered =
      customStopIds && customStopIds.length > 0
        ? customStopIds.filter(id => itineraryIds.includes(id))
        : itineraryIds

    const source = ordered.length > 0 ? ordered : itineraryIds

    return source
      .map((id, index) => {
        const destination = destinationsById.get(id)
        if (!hasCoordinates(destination)) return null
        return toMarker(destination, index + 1, visitedIds.has(id))
      })
      .filter(Boolean)
  }, [activeItinerary, customStopIds, destinationsById, visitedIds])

  const focusMarkers = useMemo(() => {
    if (!focusDestination || !hasCoordinates(focusDestination)) return []
    return [toMarker(focusDestination, null, false)]
  }, [focusDestination])

  const isItineraryMode = itineraryStops.length > 0

  const destinationMarkers = useMemo(() => {
    if (isItineraryMode) {
      return showVisited ? itineraryStops : itineraryStops.filter(stop => !stop.visited)
    }
    return focusMarkers
  }, [isItineraryMode, itineraryStops, focusMarkers, showVisited])

  const pendingStops = useMemo(() => {
    if (isItineraryMode) return itineraryStops.filter(stop => !stop.visited)
    return focusMarkers
  }, [isItineraryMode, itineraryStops, focusMarkers])

  const pendingStopsKey = pendingStops.map(stop => stop.id).join(',')

  const [stopResetKey, setStopResetKey] = useState(pendingStopsKey)
  if (pendingStopsKey !== stopResetKey) {
    setStopResetKey(pendingStopsKey)
    setStopIndex(0)
  }

  const remainingStops = useMemo(() => pendingStops.slice(stopIndex), [pendingStops, stopIndex])

  const routeWaypoints = useMemo(() => {
    if (remainingStops.length === 0) return []
    const points = remainingStops.slice(0, MAX_ROUTE_WAYPOINTS).map(stop => [stop.lat, stop.lng])
    if (userLocation) return [[userLocation.lat, userLocation.lng], ...points]
    return points
  }, [remainingStops, userLocation])

  const canRoute = routeWaypoints.length >= 2
  const routeEnabled = showRoute && canRoute

  useEffect(() => {
    writePersistedMapState({
      itineraryId: selectedItineraryId,
      showRoute,
      showServices,
      showVisited,
      stopIds: customStopIds
    })
  }, [selectedItineraryId, showRoute, showServices, showVisited, customStopIds])

  useEffect(() => {
    if (!routeEnabled) {
      setRoute(null)
      setRouteIsFallback(false)
      setRouteSummary(null)
      lastRouteOriginRef.current = null
      lastRouteStopsKeyRef.current = ''
      return undefined
    }

    const stopsKey = remainingStops.map(stop => stop.id).join(',')
    const origin = routeWaypoints[0]
    const sameStops = stopsKey === lastRouteStopsKeyRef.current
    const previousOrigin = lastRouteOriginRef.current

    if (
      sameStops &&
      previousOrigin &&
      haversineDistanceMeters(
        { lat: previousOrigin[0], lng: previousOrigin[1] },
        { lat: origin[0], lng: origin[1] }
      ) < REROUTE_THRESHOLD_METERS
    ) {
      return undefined
    }

    let active = true
    lastRouteOriginRef.current = origin
    lastRouteStopsKeyRef.current = stopsKey

    async function loadRoute() {
      try {
        const geojson = await getRoute(routeWaypoints, 'drive', 'short')
        if (!active) return
        setRoute(geojson)
        setRouteIsFallback(false)

        const properties = geojson?.features?.[0]?.properties
        const legs = properties?.legs

        if (legs && legs.length) {
          const toNext = legs[0].distance
          const total = legs.reduce((sum, leg) => sum + (leg.distance || 0), 0)
          setRouteSummary({ toNext, total, source: 'route' })
        } else if (properties?.distance != null) {
          setRouteSummary({ toNext: properties.distance, total: properties.distance, source: 'route' })
        } else {
          setRouteSummary(null)
        }
      } catch {
        if (!active) return
        setRoute(buildStraightLineGeoJson(routeWaypoints))
        setRouteIsFallback(true)

        const toNext = haversineDistanceMeters(
          { lat: routeWaypoints[0][0], lng: routeWaypoints[0][1] },
          { lat: routeWaypoints[1][0], lng: routeWaypoints[1][1] }
        )
        let total = 0
        for (let i = 0; i < routeWaypoints.length - 1; i += 1) {
          total += haversineDistanceMeters(
            { lat: routeWaypoints[i][0], lng: routeWaypoints[i][1] },
            { lat: routeWaypoints[i + 1][0], lng: routeWaypoints[i + 1][1] }
          )
        }
        setRouteSummary({ toNext, total, source: 'straight-line' })
      }
    }

    loadRoute()

    return () => {
      active = false
    }
  }, [routeEnabled, routeWaypoints, remainingStops])

  useEffect(() => {
    if (!userLocation || remainingStops.length === 0) return
    if (stopIndex >= pendingStops.length - 1) return
    const distance = haversineDistanceMeters(userLocation, remainingStops[0])
    if (distance < ARRIVAL_THRESHOLD_METERS) {
      setStopIndex(previous => previous + 1)
    }
  }, [userLocation, remainingStops, stopIndex, pendingStops.length])

  const servicesCenter = useMemo(() => {
    if (userLocation) return { lat: userLocation.lat, lng: userLocation.lng }
    if (destinationMarkers.length === 0) return null
    return {
      lat: destinationMarkers.reduce((sum, marker) => sum + marker.lat, 0) / destinationMarkers.length,
      lng: destinationMarkers.reduce((sum, marker) => sum + marker.lng, 0) / destinationMarkers.length
    }
  }, [userLocation, destinationMarkers])

  const servicesRadius = destinationMarkers.length > 1 ? 2500 : 1500

  useEffect(() => {
    if (!showServices) {
      setNearbyPlaces([])
      lastNearbyCenterRef.current = null
      return undefined
    }

    if (!servicesCenter) return undefined

    const previous = lastNearbyCenterRef.current
    if (previous && haversineDistanceMeters(previous, servicesCenter) < NEARBY_REFRESH_THRESHOLD_METERS) {
      return undefined
    }

    let active = true
    lastNearbyCenterRef.current = servicesCenter

    async function loadNearby() {
      try {
        const response = await getNearbyPlaces(servicesCenter.lat, servicesCenter.lng, { radius: servicesRadius })
        if (active) setNearbyPlaces(response.results || [])
      } catch {
        if (active) setNearbyPlaces([])
      }
    }

    loadNearby()

    return () => {
      active = false
    }
  }, [showServices, servicesCenter, servicesRadius])

  const visibleNearbyPlaces = showServices ? nearbyPlaces : []

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      return undefined
    }

    let active = true
    const timeout = setTimeout(async () => {
      try {
        const response = await searchPlaces(trimmed, userLocation ? { lat: userLocation.lat, lon: userLocation.lng } : {})
        if (active) setSearchResults(response.results || [])
      } catch {
        if (active) setSearchResults([])
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const visibleSearchResults = searchQuery.trim() ? searchResults : []

  const handleDestinationMarkerClick = useCallback(
    marker => {
      navigate(`/destinations/${marker.id}`)
    },
    [navigate]
  )

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

  async function handleMenuOptionMe() {
    setMenuOpen(false)
    await requestHeadingPermission()
    mapViewRef.current?.flyToUser()
  }

  function handleMenuOptionDestination() {
    setMenuOpen(false)
    mapViewRef.current?.flyToDestinations()
  }

  function handleSelectItinerary(value) {
    const nextId = value || null
    setSelectedItineraryId(nextId)
    setCustomStopIds(null)
    setStopIndex(0)
    if (nextId) setShowRoute(true)
    if (itineraryParam || destinationParam) {
      navigate(nextId ? `/map?itinerary=${nextId}` : '/map', { replace: true })
    }
  }

  function handleReset() {
    setMenuOpen(false)
    clearPersistedMapState()
    setSelectedItineraryId(null)
    setCustomStopIds(null)
    setShowRoute(true)
    setShowServices(true)
    setShowVisited(false)
    setSearchedPlace(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setRoute(null)
    setRouteIsFallback(false)
    setRouteSummary(null)
    setNearbyPlaces([])
    setStopIndex(0)
    lastRouteOriginRef.current = null
    lastRouteStopsKeyRef.current = ''
    lastNearbyCenterRef.current = null
    mapViewRef.current?.resetView()
    if (itineraryParam || destinationParam || stopsParam) {
      navigate('/map', { replace: true })
    }
  }

  const presentCategories = useMemo(() => {
    const set = new Set()
    if (destinationMarkers.some(marker => !marker.visited)) set.add('destination')
    if (destinationMarkers.some(marker => marker.visited)) set.add('visited')
    if (searchedPlace) set.add('searched')
    visibleNearbyPlaces.forEach(place => set.add(place.category))
    return [...set]
  }, [destinationMarkers, searchedPlace, visibleNearbyPlaces])

  const visitedCount = itineraryStops.filter(stop => stop.visited).length
  const nextStop = remainingStops[0]
  const hasMultipleStops = pendingStops.length > 1
  const allStopsVisited = isItineraryMode && pendingStops.length === 0

  const itineraryParamMissing =
    Boolean(itineraryParam) && !loading && !itineraries.some(itinerary => itinerary.id === itineraryParam)

  const statusMessage = loading
    ? 'Loading map...'
    : error
      ? error
      : itineraryParamMissing
        ? 'That itinerary is not available on your account.'
        : destinationParam && focusMarkers.length === 0
          ? 'That destination has no map location yet.'
          : ''

  return (
    <div className="map-page">
      <MapView
        ref={mapViewRef}
        destinations={destinationMarkers}
        nearbyPlaces={visibleNearbyPlaces}
        searchedPlace={searchedPlace}
        route={routeEnabled ? route : null}
        routeIsFallback={routeIsFallback}
        userLocation={userLocation}
        onDestinationClick={handleDestinationMarkerClick}
      />

      {statusMessage && (
        <p className={`map-page__status${error ? ' map-page__status--error' : ''}`}>{statusMessage}</p>
      )}

      <button
        type="button"
        className="map-page__menu-trigger"
        aria-label="Map options"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(previous => !previous)}
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

          <button
            type="button"
            className={showRoute ? 'is-active' : ''}
            onClick={() => setShowRoute(previous => !previous)}
            disabled={!canRoute}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19c4-8 12-8 16 0" />
              <circle cx="4" cy="19" r="1.6" />
              <circle cx="20" cy="19" r="1.6" />
            </svg>
            {showRoute ? 'Hide itinerary path' : 'Show itinerary path'}
          </button>

          {isItineraryMode && (
            <button
              type="button"
              className={showVisited ? 'is-active' : ''}
              onClick={() => setShowVisited(previous => !previous)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {showVisited ? 'Hide visited stops' : 'Show visited stops'}
            </button>
          )}

          <button
            type="button"
            className={showServices ? 'is-active' : ''}
            onClick={() => setShowServices(previous => !previous)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            {showServices ? 'Hide nearby services' : 'Show nearby services'}
          </button>

          <button type="button" onClick={handleReset}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            Reset map
          </button>

          {itineraries.length > 0 && (
            <label className="map-page__menu-field">
              <span className="map-page__menu-label">Itinerary on map</span>
              <select
                className="map-page__menu-select"
                value={selectedItineraryId || ''}
                onChange={event => handleSelectItinerary(event.target.value)}
              >
                <option value="">No itinerary</option>
                {itineraries.map(itinerary => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!userLocation && locationError && <p className="map-page__menu-hint">{locationError}</p>}
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
              onChange={event => setSearchQuery(event.target.value)}
              aria-label="Search a place on the map"
              autoFocus
            />
            {(searchQuery || searchedPlace) && (
              <button type="button" className="map-page__search-clear" onClick={handleClearSearch} aria-label="Clear search">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
            <button type="button" className="map-page__search-close" onClick={handleCloseSearch} aria-label="Close search">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {visibleSearchResults.length > 0 && (
            <ul className="map-page__search-results">
              {visibleSearchResults.map(result => (
                <li key={`${result.lat}-${result.lng}-${result.name}`}>
                  <button type="button" onClick={() => handleSelectSearchResult(result)}>
                    {result.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isItineraryMode && activeItinerary && (
        <div className="map-page__itinerary-chip">
          <span className="map-page__itinerary-title">{activeItinerary.title}</span>
          <span className="map-page__itinerary-progress">
            {visitedCount}/{itineraryStops.length} visited
          </span>
        </div>
      )}

      {allStopsVisited && (
        <div className="map-page__banner">
          Every stop is marked visited. Reopen the itinerary to unmark one.
        </div>
      )}

      {routeEnabled && nextStop && routeSummary && (
        <div className="map-page__distance-panel">
          <span className="map-page__distance-label">
            {stopIndex + 1}/{pendingStops.length} · Next: {nextStop.name}
          </span>
          <span className="map-page__distance-value">{formatDistance(routeSummary.toNext)}</span>
          {hasMultipleStops && (
            <span className="map-page__distance-total">Total left: {formatDistance(routeSummary.total)}</span>
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

      <BottomNav />
    </div>
  )
}

export default MapPage