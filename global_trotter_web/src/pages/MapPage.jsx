import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDestinations } from '../services/destinationService.js'
import { getItineraries } from '../services/itineraryService.js'
import { searchPlaces, getNearbyPlaces, getRoute } from '../services/mapService.js'
import PlanetLoader from '../components/PlanetLoader.jsx'
import { getToken } from '../services/tokenStorage.js'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { useVisitedStops } from '../hooks/useVisitedStops.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { CATEGORY_META, buildStraightLineGeoJson } from '../utils/mapCategories.js'
import { haversineDistanceMeters, formatDistance, formatDuration } from '../utils/geo.js'
import BottomNav from '../components/Bottomnav.jsx'
import MapView from '../components/MapView.jsx'
import '../styles/MapPage.css'

const ARRIVAL_THRESHOLD_METERS = 60
const REROUTE_THRESHOLD_METERS = 50
const NEARBY_REFRESH_THRESHOLD_METERS = 400
const NEARBY_RADIUS_METERS = 1500
const NEARBY_MERGE_DISTANCE_METERS = 500
const TRAVEL_MODES = ['drive', 'motorcycle', 'walk', 'bicycle']
const DEFAULT_TRAVEL_MODE = 'drive'
const FALLBACK_SPEED_MPS = { drive: 6.9, motorcycle: 7.5, walk: 1.35, bicycle: 4.2 }
const MAX_ROUTE_WAYPOINTS = 10
const MAP_STATE_STORAGE_KEY = 'globaltrotter:map-last-view'

const EMPTY_PLACES = []

const DEFAULT_MAP_STATE = {
  itineraryId: null,
  destinationId: null,
  showRoute: true,
  travelMode: DEFAULT_TRAVEL_MODE,
  showServices: false,
  showVisited: false,
  stopIds: null,
  searchedPlace: null,
  startPlace: null
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
  const { t } = useTranslation()
  const isAuthenticated = Boolean(getToken())
  const mapViewRef = useRef(null)
  const {
    position: userLocation,
    errorCode: locationErrorCode,
    errorMessage: locationErrorMessage,
    requestHeadingPermission
  } = useGeolocation()

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
  const [focusDestinationId, setFocusDestinationId] = useState(() => {
    if (itineraryParam) return null
    if (destinationParam) return destinationParam
    return persisted.destinationId
  })
  const [showRoute, setShowRoute] = useState(() => (itineraryParam || destinationParam ? true : persisted.showRoute))
  const [showServices, setShowServices] = useState(persisted.showServices)
  const [showVisited, setShowVisited] = useState(persisted.showVisited)
  const [travelMode, setTravelMode] = useState(() =>
    TRAVEL_MODES.includes(persisted.travelMode) ? persisted.travelMode : DEFAULT_TRAVEL_MODE
  )

  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [route, setRoute] = useState(null)
  const [routeIsFallback, setRouteIsFallback] = useState(false)
  const [routeSummary, setRouteSummary] = useState(null)
  const [stopIndex, setStopIndex] = useState(0)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchedPlace, setSearchedPlace] = useState(persisted.searchedPlace)

  const [customStart, setCustomStart] = useState(persisted.startPlace)
  const [startQuery, setStartQuery] = useState('')
  const [startResults, setStartResults] = useState([])
  const [startSearching, setStartSearching] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [distancePanelSunk, setDistancePanelSunk] = useState(false)

  const [routeOrigin, setRouteOrigin] = useState(null)
  const [userServicesCenter, setUserServicesCenter] = useState(null)

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

  const paramsKey = `${itineraryParam || ''}|${destinationParam || ''}|${stopsParam || ''}`
  const [lastParamsKey, setLastParamsKey] = useState(paramsKey)

  if (paramsKey !== lastParamsKey) {
    setLastParamsKey(paramsKey)
    if (itineraryParam) {
      setSelectedItineraryId(itineraryParam)
      setCustomStopIds(parseStops(stopsParam))
      setFocusDestinationId(null)
      setShowRoute(true)
    } else if (destinationParam) {
      setSelectedItineraryId(null)
      setCustomStopIds(null)
      setFocusDestinationId(destinationParam)
      setShowRoute(true)
    }
  }

  const destinationsById = useMemo(
    () => new Map(destinations.map(destination => [destination.id, destination])),
    [destinations]
  )

  const focusDestination = focusDestinationId ? destinationsById.get(focusDestinationId) : null

  const activeItinerary = useMemo(
    () => itineraries.find(itinerary => itinerary.id === selectedItineraryId) || null,
    [itineraries, selectedItineraryId]
  )

  if (!loading && selectedItineraryId && !itineraries.some(itinerary => itinerary.id === selectedItineraryId)) {
    setSelectedItineraryId(null)
    setCustomStopIds(null)
  }

  if (!loading && focusDestinationId && !destinationsById.has(focusDestinationId)) {
    setFocusDestinationId(null)
  }

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

  const searchedMarker = useMemo(() => {
    if (!searchedPlace) return null
    const lat = Number(searchedPlace.lat)
    const lng = Number(searchedPlace.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
      id: `searched:${lat},${lng}`,
      name: searchedPlace.name,
      lat,
      lng,
      position: null,
      visited: false
    }
  }, [searchedPlace])

  const isItineraryMode = itineraryStops.length > 0

  const destinationMarkers = useMemo(() => {
    if (isItineraryMode) {
      return showVisited ? itineraryStops : itineraryStops.filter(stop => !stop.visited)
    }
    return focusMarkers
  }, [isItineraryMode, itineraryStops, focusMarkers, showVisited])

  const pendingStops = useMemo(() => {
    if (isItineraryMode) return itineraryStops.filter(stop => !stop.visited)
    if (focusMarkers.length > 0) return focusMarkers
    if (searchedMarker) return [searchedMarker]
    return EMPTY_PLACES
  }, [isItineraryMode, itineraryStops, focusMarkers, searchedMarker])

  const pendingStopsKey = pendingStops.map(stop => stop.id).join(',')

  const [stopResetKey, setStopResetKey] = useState(pendingStopsKey)
  const remainingStops = useMemo(() => pendingStops.slice(stopIndex), [pendingStops, stopIndex])

  if (pendingStopsKey !== stopResetKey) {
    setStopResetKey(pendingStopsKey)
    setStopIndex(0)
  } else if (
    userLocation &&
    remainingStops.length > 0 &&
    stopIndex < pendingStops.length - 1 &&
    haversineDistanceMeters(userLocation, remainingStops[0]) < ARRIVAL_THRESHOLD_METERS
  ) {
    setStopIndex(stopIndex + 1)
  }

  if (!userLocation) {
    if (routeOrigin !== null) setRouteOrigin(null)
  } else if (
    !routeOrigin ||
    haversineDistanceMeters(routeOrigin, userLocation) >= REROUTE_THRESHOLD_METERS
  ) {
    setRouteOrigin({ lat: userLocation.lat, lng: userLocation.lng })
  }

  const routeWaypoints = useMemo(() => {
    if (remainingStops.length === 0) return EMPTY_PLACES
    const points = remainingStops.slice(0, MAX_ROUTE_WAYPOINTS).map(stop => [stop.lat, stop.lng])
    if (customStart) return [[customStart.lat, customStart.lng], ...points]
    if (routeOrigin) return [[routeOrigin.lat, routeOrigin.lng], ...points]
    return points
  }, [remainingStops, routeOrigin, customStart])

  const canRoute = routeWaypoints.length >= 2
  const routeEnabled = showRoute && canRoute

  const routeKey = useMemo(() => {
    if (!routeEnabled) return ''
    const points = routeWaypoints.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|')
    return `${travelMode}@${points}`
  }, [routeEnabled, travelMode, routeWaypoints])

  const routeLoading = routeEnabled && (!routeSummary || routeSummary.key !== routeKey)
  const routeSummaryReady =
    Boolean(routeSummary) && routeSummary.key === routeKey && routeSummary.toNext != null

  useEffect(() => {
    writePersistedMapState({
      itineraryId: selectedItineraryId,
      destinationId: focusDestinationId,
      showRoute,
      travelMode,
      showServices,
      showVisited,
      stopIds: customStopIds,
      searchedPlace,
      startPlace: customStart
    })
  }, [
    selectedItineraryId,
    focusDestinationId,
    showRoute,
    travelMode,
    showServices,
    showVisited,
    customStopIds,
    searchedPlace,
    customStart
  ])

  useEffect(() => {
    if (!routeEnabled) return undefined

    let active = true

    async function loadRoute() {
      try {
        const geojson = await getRoute(routeWaypoints, travelMode, travelMode === 'drive' || travelMode === 'motorcycle' ? 'balanced' : 'short')
        if (!active) return
        setRoute(geojson)
        setRouteIsFallback(false)

        const properties = geojson?.features?.[0]?.properties
        const legs = properties?.legs

        if (legs && legs.length) {
          const toNext = legs[0].distance
          const total = legs.reduce((sum, leg) => sum + (leg.distance || 0), 0)
          const timeToNext = legs[0].time ?? null
          const timeTotal = legs.every(leg => leg.time == null)
            ? null
            : legs.reduce((sum, leg) => sum + (leg.time || 0), 0)
          setRouteSummary({ key: routeKey, toNext, total, timeToNext, timeTotal, source: 'route' })
        } else if (properties?.distance != null) {
          setRouteSummary({
            key: routeKey,
            toNext: properties.distance,
            total: properties.distance,
            timeToNext: properties.time ?? null,
            timeTotal: properties.time ?? null,
            source: 'route'
          })
        } else {
          setRouteSummary({
            key: routeKey,
            toNext: null,
            total: null,
            timeToNext: null,
            timeTotal: null,
            source: 'route'
          })
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
        const speed = FALLBACK_SPEED_MPS[travelMode] || FALLBACK_SPEED_MPS[DEFAULT_TRAVEL_MODE]
        setRouteSummary({
          key: routeKey,
          toNext,
          total,
          timeToNext: toNext / speed,
          timeTotal: total / speed,
          source: 'straight-line'
        })
      }
    }

    loadRoute()

    return () => {
      active = false
    }
  }, [routeEnabled, routeWaypoints, travelMode, routeKey])

  const rawUserServicesCenter = useMemo(() => {
    if (!userLocation) return null
    return { lat: userLocation.lat, lng: userLocation.lng }
  }, [userLocation])

  if (!rawUserServicesCenter) {
    if (userServicesCenter !== null) setUserServicesCenter(null)
  } else if (
    !userServicesCenter ||
    haversineDistanceMeters(userServicesCenter, rawUserServicesCenter) >= NEARBY_REFRESH_THRESHOLD_METERS
  ) {
    setUserServicesCenter(rawUserServicesCenter)
  }

  const stopServicesCenter = useMemo(() => {
    const stop = remainingStops[0] || destinationMarkers[0]
    if (!stop) return null
    return { id: stop.id, lat: stop.lat, lng: stop.lng }
  }, [remainingStops, destinationMarkers])

  const extraStopServicesCenter = useMemo(() => {
    if (!stopServicesCenter) return null
    if (!userServicesCenter) return stopServicesCenter
    const apart = haversineDistanceMeters(userServicesCenter, stopServicesCenter)
    return apart < NEARBY_MERGE_DISTANCE_METERS ? null : stopServicesCenter
  }, [stopServicesCenter, userServicesCenter])

  const userCenterKey = userServicesCenter
    ? `${userServicesCenter.lat.toFixed(4)},${userServicesCenter.lng.toFixed(4)}`
    : ''
  const stopCenterKey = extraStopServicesCenter ? extraStopServicesCenter.id : ''

  useEffect(() => {
    if (!showServices) return undefined
    if (!userServicesCenter && !extraStopServicesCenter) return undefined

    let active = true

    async function loadNearby() {
      const centers = []
      if (userServicesCenter) centers.push(userServicesCenter)
      if (extraStopServicesCenter) centers.push(extraStopServicesCenter)

      const settled = await Promise.allSettled(
        centers.map(center => getNearbyPlaces(center.lat, center.lng, { radius: NEARBY_RADIUS_METERS }))
      )

      if (!active) return

      const seen = new Set()
      const merged = []

      settled.forEach(outcome => {
        if (outcome.status !== 'fulfilled') return
        const results = outcome.value?.results || []
        results.forEach(place => {
          const lat = Number(place.lat)
          const lng = Number(place.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
          const key = `${place.name}@${lat.toFixed(5)},${lng.toFixed(5)}`
          if (seen.has(key)) return
          seen.add(key)
          merged.push(place)
        })
      })

      setNearbyPlaces(merged.length > 0 ? merged : EMPTY_PLACES)
    }

    loadNearby()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showServices, userCenterKey, stopCenterKey])

  const visibleNearbyPlaces = useMemo(
    () => (showServices ? nearbyPlaces : EMPTY_PLACES),
    [showServices, nearbyPlaces]
  )

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return undefined

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

  useEffect(() => {
    const trimmed = startQuery.trim()
    if (!trimmed) return undefined

    let active = true
    const timeout = setTimeout(async () => {
      try {
        const response = await searchPlaces(
          trimmed,
          userLocation ? { lat: userLocation.lat, lon: userLocation.lng } : {}
        )
        if (active) setStartResults(response.results || [])
      } catch {
        if (active) setStartResults([])
      } finally {
        if (active) setStartSearching(false)
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startQuery])

  const visibleSearchResults = searchQuery.trim() ? searchResults : []
  const visibleStartResults = startQuery.trim() ? startResults : []

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
    setStopIndex(0)
    setShowRoute(true)
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

  function handleStartQueryChange(value) {
    setStartQuery(value)
    setStartSearching(Boolean(value.trim()))
    if (!value.trim()) setStartResults([])
  }

  function handleSelectStartPlace(result) {
    const lat = Number(result.lat)
    const lng = Number(result.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    setCustomStart({ name: result.name, lat, lng })
    setStartQuery('')
    setStartResults([])
    setStartSearching(false)
    setShowRoute(true)
  }

  function handleClearStartSearch() {
    setStartQuery('')
    setStartResults([])
    setStartSearching(false)
  }

  function handleUseMyLocation() {
    setCustomStart(null)
    handleClearStartSearch()
  }

  function handleSelectItinerary(value) {
    const nextId = value || null
    setSelectedItineraryId(nextId)
    setCustomStopIds(null)
    setStopIndex(0)
    setCustomStart(null)
    if (nextId) setFocusDestinationId(null)
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
    setFocusDestinationId(null)
    setShowRoute(true)
    setTravelMode(DEFAULT_TRAVEL_MODE)
    setShowServices(false)
    setShowVisited(false)
    setSearchedPlace(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setCustomStart(null)
    setStartQuery('')
    setStartResults([])
    setStartSearching(false)
    setRoute(null)
    setRouteIsFallback(false)
    setRouteSummary(null)
    setNearbyPlaces(EMPTY_PLACES)
    setStopIndex(0)
    setRouteOrigin(null)
    setUserServicesCenter(null)
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
    if (customStart) set.add('start')
    visibleNearbyPlaces.forEach(place => set.add(place.category))
    return [...set]
  }, [destinationMarkers, searchedPlace, customStart, visibleNearbyPlaces])

  const servicesAreRemote = showServices && !userServicesCenter && Boolean(extraStopServicesCenter)
  const routeNeedsLocation =
    showRoute && !canRoute && pendingStops.length > 0 && !routeOrigin && !customStart

  const visitedCount = itineraryStops.filter(stop => stop.visited).length
  const nextStop = remainingStops[0]
  const hasMultipleStops = pendingStops.length > 1
  const allStopsVisited = isItineraryMode && pendingStops.length === 0

  const itineraryParamMissing =
    Boolean(itineraryParam) && !loading && !itineraries.some(itinerary => itinerary.id === itineraryParam)

  const statusMessage = loading
    ? t('map.loading')
    : error
      ? error
      : itineraryParamMissing
        ? t('map.itineraryUnavailable')
        : destinationParam && focusMarkers.length === 0
          ? t('map.destinationNoLocation')
          : routeNeedsLocation
            ? t('map.waitingForLocation')
            : servicesAreRemote
              ? t('map.servicesAreRemote')
              : ''

  const locationMessage = !locationErrorCode
    ? ''
    : locationErrorCode === 'browser'
      ? locationErrorMessage
      : t(`geolocation.${locationErrorCode}`)

  return (
    <div className="map-page">
      <MapView
        ref={mapViewRef}
        destinations={destinationMarkers}
        nearbyPlaces={visibleNearbyPlaces}
        searchedPlace={searchedPlace}
        startPlace={customStart}
        route={routeEnabled ? route : null}
        routeIsFallback={routeIsFallback}
        userLocation={userLocation}
        onDestinationClick={handleDestinationMarkerClick}
      />

      {loading ? (
        <div className="map-page__status map-page__status--loading">
          <PlanetLoader size="small" />
          <span>{statusMessage}</span>
        </div>
      ) : (
        statusMessage && (
          <p className={`map-page__status${error ? ' map-page__status--error' : ''}`}>{statusMessage}</p>
        )
      )}

      <button
        type="button"
        className="map-page__menu-trigger"
        aria-label={t('map.options')}
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
            {t('map.myLocation')}
          </button>

          <button type="button" onClick={handleMenuOptionDestination} disabled={destinationMarkers.length === 0}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {t('map.destination')}
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
            {showRoute ? t('map.hidePath') : t('map.showPath')}
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
              {showVisited ? t('map.hideVisited') : t('map.showVisited')}
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
            {showServices ? t('map.hideServices') : t('map.showServices')}
          </button>

          <button type="button" onClick={handleReset}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            {t('map.reset')}
          </button>

          <div className="map-page__menu-field">
            <span className="map-page__menu-label">{t('map.startingPoint')}</span>

            <div
              className={`map-page__start-current${
                customStart ? ' map-page__start-current--custom' : ''
              }`}
            >
              {customStart ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 21V4" />
                  <path d="M6 4.5h11l-2.2 3.6L17 11.7H6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" />
                </svg>
              )}
              <span className="map-page__start-current-name">
                {customStart ? customStart.name : t('map.myLocation')}
              </span>
              {customStart && (
                <button
                  type="button"
                  className="map-page__start-reset"
                  onClick={handleUseMyLocation}
                  aria-label={t('map.useMyLocation')}
                  title={t('map.useMyLocation')}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="map-page__start-search">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="map-page__start-input"
                placeholder={t('map.startingPointPlaceholder')}
                value={startQuery}
                onChange={event => handleStartQueryChange(event.target.value)}
                aria-label={t('map.startingPointPlaceholder')}
              />
              {startQuery && (
                <button
                  type="button"
                  className="map-page__start-clear"
                  onClick={handleClearStartSearch}
                  aria-label={t('common.clearSearch')}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {itineraries.length > 0 && (
            <label className="map-page__menu-field">
              <span className="map-page__menu-label">{t('map.itineraryOnMap')}</span>
              <select
                className="map-page__menu-select"
                value={selectedItineraryId || ''}
                onChange={event => handleSelectItinerary(event.target.value)}
              >
                <option value="">{t('map.noItinerary')}</option>
                {itineraries.map(itinerary => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!userLocation && locationMessage && <p className="map-page__menu-hint">{locationMessage}</p>}
        </div>
      )}

      {menuOpen && startQuery.trim() !== '' && (
        <div className="map-page__start-panel">
          <span className="map-page__start-panel-title">{t('map.startingPoint')}</span>

          {startSearching && <p className="map-page__start-empty">{t('map.searchingPlaces')}</p>}

          {!startSearching && visibleStartResults.length === 0 && (
            <p className="map-page__start-empty">{t('map.noStartResults')}</p>
          )}

          {!startSearching && visibleStartResults.length > 0 && (
            <ul className="map-page__start-results">
              {visibleStartResults.map(result => (
                <li key={`${result.lat}-${result.lng}-${result.name}`}>
                  <button type="button" onClick={() => handleSelectStartPlace(result)}>
                    {result.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!searchOpen && (
        <button
          type="button"
          className="map-page__search-trigger"
          aria-label={t('map.searchTrigger')}
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
              placeholder={t('map.searchPlaceholder')}
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              aria-label={t('map.searchPlaceholder')}
              autoFocus
            />
            {(searchQuery || searchedPlace) && (
              <button type="button" className="map-page__search-clear" onClick={handleClearSearch} aria-label={t('common.clearSearch')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
            <button type="button" className="map-page__search-close" onClick={handleCloseSearch} aria-label={t('map.closeSearch')}>
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
            {t('map.progress', { visited: visitedCount, total: itineraryStops.length })}
          </span>
        </div>
      )}

      {allStopsVisited && (
        <div className="map-page__banner">
          {t('map.allVisited')}
        </div>
      )}

      {routeEnabled && nextStop && (routeLoading || routeSummaryReady) && (
        <div
          className={`map-page__distance-panel${distancePanelSunk ? ' map-page__distance-panel--sunk' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={t('map.bringDistanceForward')}
          onClick={() => setDistancePanelSunk(false)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setDistancePanelSunk(false)
            }
          }}
        >
          <div className="map-page__travel-modes" role="group" aria-label={t('map.travelMode')}>
            <button
              type="button"
              className={travelMode === 'walk' ? 'is-active' : ''}
              disabled={routeLoading}
              aria-pressed={travelMode === 'walk'}
              aria-label={t('map.onFoot')}
              title={t('map.onFoot')}
              onClick={event => {
                event.stopPropagation()
                setTravelMode('walk')
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="4" r="1.6" />
                <path d="M13 8l-3 2 1 4 3 2 1 4" />
                <path d="M11 14l-2 6" />
                <path d="M13 8l3 1 1 3" />
              </svg>
            </button>
            <button
              type="button"
              className={travelMode === 'bicycle' ? 'is-active' : ''}
              disabled={routeLoading}
              aria-pressed={travelMode === 'bicycle'}
              aria-label={t('map.byBike')}
              title={t('map.byBike')}
              onClick={event => {
                event.stopPropagation()
                setTravelMode('bicycle')
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="17" r="3.2" />
                <circle cx="18.5" cy="17" r="3.2" />
                <path d="M5.5 17l4-8h5" />
                <path d="M9.5 9l4.5 8" />
                <path d="M14.5 9l1.5-3h2" />
              </svg>
            </button>
            <button
              type="button"
              className={travelMode === 'motorcycle' ? 'is-active' : ''}
              disabled={routeLoading}
              aria-pressed={travelMode === 'motorcycle'}
              aria-label={t('map.byMotorbike')}
              title={t('map.byMotorbike')}
              onClick={event => {
                event.stopPropagation()
                setTravelMode('motorcycle')
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="17" r="3" />
                <circle cx="19" cy="17" r="3" />
                <path d="M5 17h4l4-6h3" />
                <path d="M13 11l3 6" />
                <path d="M15 8h3l1 2" />
                <path d="M9 8h3" />
              </svg>
            </button>
            <button
              type="button"
              className={travelMode === 'drive' ? 'is-active' : ''}
              disabled={routeLoading}
              aria-pressed={travelMode === 'drive'}
              aria-label={t('map.byCar')}
              title={t('map.byCar')}
              onClick={event => {
                event.stopPropagation()
                setTravelMode('drive')
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16h16" />
                <path d="M5.5 16V10l1.8-3.4h9.4L18.5 10v6" />
                <circle cx="8" cy="18" r="1.4" />
                <circle cx="16" cy="18" r="1.4" />
              </svg>
            </button>
          </div>

          <span className="map-page__distance-label">
            {t('map.nextStop', { index: stopIndex + 1, total: pendingStops.length, name: nextStop.name })}
          </span>

          {routeLoading ? (
            <>
              <span className="map-page__distance-value map-page__distance-value--loading">
                <span className="map-page__dot" />
                <span className="map-page__dot" />
                <span className="map-page__dot" />
              </span>
              <span className="map-page__distance-total">{t('map.calculating')}</span>
            </>
          ) : (
            <>
              <span className="map-page__distance-value">
                {routeSummary.source === 'straight-line' ? '≈ ' : ''}
                {formatDuration(routeSummary.timeToNext) || formatDistance(routeSummary.toNext)}
              </span>

              <span className="map-page__distance-total">
                {formatDistance(routeSummary.toNext)}
                {hasMultipleStops
                  ? ` · ${t('map.totalLeft', { distance: formatDistance(routeSummary.total) })}`
                  : ''}
                {hasMultipleStops && formatDuration(routeSummary.timeTotal)
                  ? ` (${formatDuration(routeSummary.timeTotal)})`
                  : ''}
              </span>
            </>
          )}
        </div>
      )}

      {presentCategories.length > 0 && (
        <div
          className="map-page__legend"
          onClick={() => setDistancePanelSunk(true)}
        >
          {presentCategories.map(category => (
            <span key={category} className="map-page__legend-item">
              <span
                className="map-page__legend-dot"
                style={{ background: CATEGORY_META[category]?.color || CATEGORY_META.other.color }}
              />
              {t(CATEGORY_META[category]?.labelKey || CATEGORY_META.other.labelKey)}
            </span>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default MapPage