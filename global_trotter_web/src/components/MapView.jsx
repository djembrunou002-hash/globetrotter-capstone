import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CATEGORY_META } from '../utils/mapCategories.js'
import '../styles/MapView.css'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const DEFAULT_CENTER = [11.5021, 3.848]

function createMarkerElement(category, label) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  const el = document.createElement('div')
  el.className = `map-marker map-marker--${category === 'destination' ? 'large' : 'small'}`
  el.style.setProperty('--marker-color', meta.color)
  if (label) {
    const badge = document.createElement('span')
    badge.className = 'map-marker__badge'
    badge.textContent = label
    el.appendChild(badge)
  }
  return el
}

function MapView({
  destinations = [],
  nearbyPlaces = [],
  searchedPlace = null,
  route = null,
  onDestinationClick,
  center,
  zoom = 12
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const readyRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: center || DEFAULT_CENTER,
      zoom
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.on('load', () => {
      readyRef.current = true
      applyRoute(map, route)
    })

    mapRef.current = map

    return () => {
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const bounds = new maplibregl.LngLatBounds()
    let hasPoint = false

    destinations.forEach((destination, index) => {
      const el = createMarkerElement('destination', destinations.length > 1 ? index + 1 : null)
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new maplibregl.Popup({ offset: 28 }).setText(destination.name))
        .addTo(map)

      if (onDestinationClick) {
        el.addEventListener('click', () => onDestinationClick(destination))
      }

      markersRef.current.push(marker)
      bounds.extend([destination.lng, destination.lat])
      hasPoint = true
    })

    nearbyPlaces.forEach(place => {
      const el = createMarkerElement(place.category)
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setText(place.name))
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([place.lng, place.lat])
      hasPoint = true
    })

    if (searchedPlace) {
      const el = createMarkerElement('searched')
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([searchedPlace.lng, searchedPlace.lat])
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText(searchedPlace.name))
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([searchedPlace.lng, searchedPlace.lat])
      hasPoint = true
    }

    if (hasPoint) {
      map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 500 })
    }
  }, [destinations, nearbyPlaces, searchedPlace, onDestinationClick])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (readyRef.current) {
      applyRoute(map, route)
    } else {
      map.once('load', () => applyRoute(map, route))
    }
  }, [route])

  return <div ref={containerRef} className="map-view" />
}

function applyRoute(map, route) {
  if (map.getLayer('itinerary-route-casing')) map.removeLayer('itinerary-route-casing')
  if (map.getLayer('itinerary-route-line')) map.removeLayer('itinerary-route-line')
  if (map.getSource('itinerary-route')) map.removeSource('itinerary-route')

  if (!route) return

  map.addSource('itinerary-route', { type: 'geojson', data: route })

  map.addLayer({
    id: 'itinerary-route-casing',
    type: 'line',
    source: 'itinerary-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#F7F2E4', 'line-width': 7 }
  })

  map.addLayer({
    id: 'itinerary-route-line',
    type: 'line',
    source: 'itinerary-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0B3D24', 'line-width': 4 }
  })
}

export default MapView