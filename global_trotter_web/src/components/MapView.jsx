import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CATEGORY_META } from '../utils/mapCategories.js'
import '../styles/MapView.css'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const DEFAULT_CENTER = [11.5021, 3.848]
const DEFAULT_ZOOM = 12

const ROUTE_SOURCE_ID = 'itinerary-route'
const ROUTE_CASING_LAYER_ID = 'itinerary-route-casing'
const ROUTE_LINE_LAYER_ID = 'itinerary-route-line'

const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] }

const MARKER_Z = {
  nearby: '3',
  nearbyLinked: '5',
  destination: '6',
  searched: '7',
  start: '8',
  user: '10'
}

function createMarkerElement(category, { label, visited, linked } = {}) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  const el = document.createElement('div')
  el.className = `map-marker map-marker--${category === 'destination' ? 'large' : 'small'}`
  if (visited) el.classList.add('map-marker--visited')
  if (linked) el.classList.add('map-marker--linked')
  el.style.setProperty('--marker-color', visited ? CATEGORY_META.visited.color : meta.color)
  if (label != null) {
    const badge = document.createElement('span')
    badge.className = 'map-marker__badge'
    badge.textContent = String(label)
    el.appendChild(badge)
  }
  return el
}

function createStartMarkerElement() {
  const el = document.createElement('div')
  el.className = 'map-marker map-marker--large map-marker--start'
  el.style.setProperty('--marker-color', CATEGORY_META.start.color)

  const icon = document.createElement('span')
  icon.className = 'map-marker__icon'
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4" /><path d="M6 4.5h11l-2.2 3.6L17 11.7H6" /></svg>'
  el.appendChild(icon)

  return el
}

function createPlacePopupContent(place, actionLabel, onSelect) {
  const wrapper = document.createElement('div')
  wrapper.className = 'map-popup'

  const title = document.createElement('span')
  title.className = 'map-popup__title'
  title.textContent = place.name
  wrapper.appendChild(title)

  if (place.address) {
    const address = document.createElement('span')
    address.className = 'map-popup__address'
    address.textContent = place.address
    wrapper.appendChild(address)
  }

  if (place.destinationId && onSelect && actionLabel) {
    const action = document.createElement('button')
    action.type = 'button'
    action.className = 'map-popup__action'
    action.textContent = actionLabel
    action.addEventListener('click', event => {
      event.stopPropagation()
      onSelect(place)
    })
    wrapper.appendChild(action)
  }

  return wrapper
}

function createUserMarkerElement() {
  const el = document.createElement('div')
  el.className = 'map-marker-user'

  const accuracy = document.createElement('span')
  accuracy.className = 'map-marker-user__accuracy'

  const heading = document.createElement('span')
  heading.className = 'map-marker-user__heading'
  const beam = document.createElement('span')
  beam.className = 'map-marker-user__beam'
  heading.appendChild(beam)

  const pulse = document.createElement('span')
  pulse.className = 'map-marker-user__pulse'

  const dot = document.createElement('span')
  dot.className = 'map-marker-user__dot'

  el.appendChild(accuracy)
  el.appendChild(heading)
  el.appendChild(pulse)
  el.appendChild(dot)
  return el
}

function metersPerPixel(latitude, zoom) {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom)
}

function ensureRouteLayers(map) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: EMPTY_COLLECTION })
  }
  if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_CASING_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#F7F2E4', 'line-width': 7 }
    })
  }
  if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LINE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#0B3D24', 'line-width': 4 }
    })
  }
}

function applyRoute(map, route, isFallback) {
  ensureRouteLayers(map)

  const source = map.getSource(ROUTE_SOURCE_ID)
  if (source) source.setData(route || EMPTY_COLLECTION)

  map.setPaintProperty(ROUTE_LINE_LAYER_ID, 'line-color', isFallback ? '#8A8372' : '#0B3D24')
  map.setPaintProperty(ROUTE_LINE_LAYER_ID, 'line-dasharray', isFallback ? [2, 2] : [1, 0])

  const visibility = route ? 'visible' : 'none'
  map.setLayoutProperty(ROUTE_CASING_LAYER_ID, 'visibility', visibility)
  map.setLayoutProperty(ROUTE_LINE_LAYER_ID, 'visibility', visibility)
}

const MapView = forwardRef(function MapView(
  {
    destinations = [],
    nearbyPlaces = [],
    searchedPlace = null,
    startPlace = null,
    route = null,
    routeIsFallback = false,
    userLocation = null,
    onDestinationClick,
    onNearbyClick,
    nearbyActionLabel = '',
    center,
    zoom = DEFAULT_ZOOM
  },
  ref
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const destinationMarkersRef = useRef([])
  const nearbyMarkersRef = useRef([])
  const searchedMarkerRef = useRef(null)
  const startMarkerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const userLocationRef = useRef(userLocation)
  const routeRef = useRef({ route, routeIsFallback })
  const hasCenteredOnUserRef = useRef(false)
  const lastFitSignatureRef = useRef('')

  const [ready, setReady] = useState(false)

  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    routeRef.current = { route, routeIsFallback }
  }, [route, routeIsFallback])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: center || DEFAULT_CENTER,
      zoom
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    mapRef.current = map

    function handleLoad() {
      if (mapRef.current !== map) return
      applyRoute(map, routeRef.current.route, routeRef.current.routeIsFallback)
      setReady(true)
    }

    function handleStyleData() {
      if (mapRef.current !== map || !map.isStyleLoaded()) return
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) return
      applyRoute(map, routeRef.current.route, routeRef.current.routeIsFallback)
    }

    map.on('load', handleLoad)
    map.on('styledata', handleStyleData)

    return () => {
      map.off('load', handleLoad)
      map.off('styledata', handleStyleData)
      destinationMarkersRef.current.forEach(marker => marker.remove())
      destinationMarkersRef.current = []
      nearbyMarkersRef.current.forEach(marker => marker.remove())
      nearbyMarkersRef.current = []
      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
        searchedMarkerRef.current = null
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
      lastFitSignatureRef.current = ''
      hasCenteredOnUserRef.current = false
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateUserMarker = useCallback(() => {
    const map = mapRef.current
    const marker = userMarkerRef.current
    const location = userLocationRef.current
    if (!map || !marker) return

    const el = marker.getElement()

    if (!location) {
      el.style.display = 'none'
      return
    }

    el.style.display = ''
    marker.setLngLat([location.lng, location.lat])

    const headingEl = el.querySelector('.map-marker-user__heading')
    if (headingEl) {
      if (location.heading != null && !Number.isNaN(location.heading)) {
        headingEl.style.opacity = '1'
        headingEl.style.transform = `rotate(${location.heading - map.getBearing()}deg)`
      } else {
        headingEl.style.opacity = '0'
      }
    }

    const accuracyEl = el.querySelector('.map-marker-user__accuracy')
    if (accuracyEl) {
      const size =
        location.accuracy != null && location.accuracy > 0
          ? Math.min(240, (location.accuracy * 2) / metersPerPixel(location.lat, map.getZoom()))
          : 0
      if (size > 28) {
        accuracyEl.style.display = ''
        accuracyEl.style.width = `${Math.round(size)}px`
        accuracyEl.style.height = `${Math.round(size)}px`
      } else {
        accuracyEl.style.display = 'none'
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return undefined

    if (!userMarkerRef.current) {
      const element = createUserMarkerElement()
      element.style.zIndex = MARKER_Z.user
      const marker = new maplibregl.Marker({ element, anchor: 'center' })
      marker.setLngLat(
        userLocationRef.current
          ? [userLocationRef.current.lng, userLocationRef.current.lat]
          : center || DEFAULT_CENTER
      )
      marker.addTo(map)
      userMarkerRef.current = marker
    }

    updateUserMarker()

    map.on('rotate', updateUserMarker)
    map.on('zoomend', updateUserMarker)

    return () => {
      map.off('rotate', updateUserMarker)
      map.off('zoomend', updateUserMarker)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, updateUserMarker])

  useEffect(() => {
    updateUserMarker()
  }, [userLocation, ready, updateUserMarker])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return undefined

    const created = destinations.map((destination, index) => {
      const label = destinations.length > 1 ? destination.position ?? index + 1 : null
      const el = createMarkerElement('destination', { label, visited: destination.visited })
      el.style.zIndex = MARKER_Z.destination

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new maplibregl.Popup({ offset: 28 }).setText(destination.name))
        .addTo(map)

      if (onDestinationClick) {
        el.addEventListener('click', () => onDestinationClick(destination))
      }

      return marker
    })

    destinationMarkersRef.current = created

    return () => {
      created.forEach(marker => marker.remove())
      destinationMarkersRef.current = []
    }
  }, [destinations, onDestinationClick, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return undefined

    const created = nearbyPlaces.map(place => {
      const linked = Boolean(place.destinationId)
      const el = createMarkerElement(place.category, { linked })
      el.style.zIndex = linked ? MARKER_Z.nearbyLinked : MARKER_Z.nearby

      const popup = new maplibregl.Popup({ offset: 20, maxWidth: '260px' }).setDOMContent(
        createPlacePopupContent(place, nearbyActionLabel, onNearbyClick)
      )

      return new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(map)
    })

    nearbyMarkersRef.current = created

    return () => {
      created.forEach(marker => marker.remove())
      nearbyMarkersRef.current = []
    }
  }, [nearbyPlaces, ready, onNearbyClick, nearbyActionLabel])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !searchedPlace) return undefined

    const el = createMarkerElement('searched')
    el.style.zIndex = MARKER_Z.searched

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([searchedPlace.lng, searchedPlace.lat])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setText(searchedPlace.name))
      .addTo(map)

    searchedMarkerRef.current = marker

    return () => {
      marker.remove()
      searchedMarkerRef.current = null
    }
  }, [searchedPlace, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !startPlace) return undefined

    const el = createStartMarkerElement()
    el.style.zIndex = MARKER_Z.start

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([startPlace.lng, startPlace.lat])
      .setPopup(new maplibregl.Popup({ offset: 28 }).setText(startPlace.name))
      .addTo(map)

    startMarkerRef.current = marker

    return () => {
      marker.remove()
      startMarkerRef.current = null
    }
  }, [startPlace, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    applyRoute(map, route, routeIsFallback)
  }, [route, routeIsFallback, ready])

  const fitSignature = useMemo(() => {
    const parts = destinations.map(destination => `${destination.id}@${destination.lng},${destination.lat}`)
    if (searchedPlace) parts.push(`search@${searchedPlace.lng},${searchedPlace.lat}`)
    if (startPlace) parts.push(`start@${startPlace.lng},${startPlace.lat}`)
    return parts.join('|')
  }, [destinations, searchedPlace, startPlace])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (!fitSignature) {
      lastFitSignatureRef.current = ''
      if (!hasCenteredOnUserRef.current && userLocationRef.current) {
        hasCenteredOnUserRef.current = true
        map.easeTo({
          center: [userLocationRef.current.lng, userLocationRef.current.lat],
          zoom: Math.max(map.getZoom(), 14),
          duration: 600
        })
      }
      return
    }

    if (fitSignature === lastFitSignatureRef.current) return
    lastFitSignatureRef.current = fitSignature
    hasCenteredOnUserRef.current = true

    const bounds = new maplibregl.LngLatBounds()
    destinations.forEach(destination => bounds.extend([destination.lng, destination.lat]))
    if (searchedPlace) bounds.extend([searchedPlace.lng, searchedPlace.lat])
    if (startPlace) bounds.extend([startPlace.lng, startPlace.lat])
    if (userLocationRef.current) bounds.extend([userLocationRef.current.lng, userLocationRef.current.lat])

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 })
    }
  }, [fitSignature, destinations, searchedPlace, startPlace, ready])

  useImperativeHandle(
    ref,
    () => ({
      flyToUser() {
        const map = mapRef.current
        const location = userLocationRef.current
        if (!map || !location) return
        hasCenteredOnUserRef.current = true
        map.flyTo({ center: [location.lng, location.lat], zoom: 16, duration: 800 })
      },
      flyToDestinations() {
        const map = mapRef.current
        if (!map) return

        const bounds = new maplibregl.LngLatBounds()
        destinations.forEach(destination => bounds.extend([destination.lng, destination.lat]))
        if (searchedPlace) bounds.extend([searchedPlace.lng, searchedPlace.lat])
        if (startPlace) bounds.extend([startPlace.lng, startPlace.lat])

        if (bounds.isEmpty()) return
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 })
      },
      resetView() {
        const map = mapRef.current
        if (!map) return
        lastFitSignatureRef.current = ''
        hasCenteredOnUserRef.current = false
        const location = userLocationRef.current
        map.easeTo({
          center: location ? [location.lng, location.lat] : center || DEFAULT_CENTER,
          zoom: location ? 14 : DEFAULT_ZOOM,
          bearing: 0,
          pitch: 0,
          duration: 600
        })
      }
    }),
    [destinations, searchedPlace, startPlace, center]
  )

  return <div ref={containerRef} className="map-view" />
})

export default MapView