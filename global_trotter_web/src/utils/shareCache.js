import { getDestinations } from '../services/destinationService.js'
import { getItinerary } from '../services/itineraryService.js'

let destinationsPromise = null
const itineraryPromises = new Map()

function loadAllDestinations() {
  if (!destinationsPromise) {
    destinationsPromise = getDestinations()
      .then(response => response.destinations || [])
      .catch(error => {
        destinationsPromise = null
        throw error
      })
  }

  return destinationsPromise
}

export function loadDestination(id) {
  return loadAllDestinations().then(list => list.find(item => item.id === id) || null)
}

export function loadItinerary(id) {
  if (!itineraryPromises.has(id)) {
    const request = getItinerary(id)
      .then(response => response.itinerary)
      .catch(error => {
        itineraryPromises.delete(id)
        throw error
      })

    itineraryPromises.set(id, request)
  }

  return itineraryPromises.get(id)
}

export function invalidateItinerary(id) {
  itineraryPromises.delete(id)
}

export function resetShareCache() {
  destinationsPromise = null
  itineraryPromises.clear()
}