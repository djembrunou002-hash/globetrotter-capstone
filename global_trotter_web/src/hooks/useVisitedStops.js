import { useCallback, useEffect, useState } from 'react'

const KEY_PREFIX = 'itinerary-visited:'
const listeners = new Set()

function storageKey(itineraryId) {
  return `${KEY_PREFIX}${itineraryId}`
}

export function loadVisitedIds(itineraryId) {
  if (!itineraryId) return new Set()
  try {
    const stored = localStorage.getItem(storageKey(itineraryId))
    const parsed = stored ? JSON.parse(stored) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function saveVisitedIds(itineraryId, ids) {
  if (!itineraryId) return
  try {
    localStorage.setItem(storageKey(itineraryId), JSON.stringify([...ids]))
  } catch {
    return
  } finally {
    listeners.forEach(listener => listener(itineraryId))
  }
}

export function toggleVisitedId(itineraryId, destinationId) {
  const next = loadVisitedIds(itineraryId)
  if (next.has(destinationId)) {
    next.delete(destinationId)
  } else {
    next.add(destinationId)
  }
  saveVisitedIds(itineraryId, next)
  return next
}

export function subscribeVisited(listener) {
  listeners.add(listener)

  function handleStorage(event) {
    if (!event.key || !event.key.startsWith(KEY_PREFIX)) return
    listener(event.key.slice(KEY_PREFIX.length))
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useVisitedStops(itineraryId) {
  const [visitedIds, setVisitedIds] = useState(() => loadVisitedIds(itineraryId))
  const [loadedFor, setLoadedFor] = useState(itineraryId)

  if (itineraryId !== loadedFor) {
    setLoadedFor(itineraryId)
    setVisitedIds(loadVisitedIds(itineraryId))
  }

  useEffect(() => {
    function refresh(changedId) {
      if (changedId != null && changedId !== itineraryId) return
      setVisitedIds(loadVisitedIds(itineraryId))
    }

    function handleVisibility() {
      if (document.hidden) return
      refresh()
    }

    const unsubscribe = subscribeVisited(refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', handleVisibility)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', handleVisibility)
    }
  }, [itineraryId])

  const toggleVisited = useCallback(
    destinationId => {
      if (!itineraryId) return
      setVisitedIds(toggleVisitedId(itineraryId, destinationId))
    },
    [itineraryId]
  )

  return { visitedIds, toggleVisited }
}