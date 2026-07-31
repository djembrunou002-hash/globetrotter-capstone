import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getItineraries, getSharedUsers } from '../services/itineraryService.js'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import ShareItineraryModal from '../components/ShareItineraryModal.jsx'
import '../styles/ItineraryDetails.css'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function loadVisitedIds(itineraryId) {
  try {
    const stored = localStorage.getItem(`itinerary-visited:${itineraryId}`)
    return new Set(stored ? JSON.parse(stored) : [])
  } catch {
    return new Set()
  }
}

function ItineraryDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())

  const [itinerary, setItinerary] = useState(null)
  const [destinations, setDestinations] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [visitedIds, setVisitedIds] = useState(() => loadVisitedIds(id))
  const [visitedIdsLoadedFor, setVisitedIdsLoadedFor] = useState(id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState(null)
  const [sharedUsers, setSharedUsers] = useState([])
  const [shareModalOpen, setShareModalOpen] = useState(false)

  // Keep visitedIds in sync with the current itinerary id. This runs during
  // render (not in an effect) since it's just adjusting state to match a
  // changed prop, per https://react.dev/learn/you-might-not-need-an-effect
  if (id !== visitedIdsLoadedFor) {
    setVisitedIdsLoadedFor(id)
    setVisitedIds(loadVisitedIds(id))
  }

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [itinerariesResponse, destinationsResponse, favoritesResponse] = await Promise.all([
          getItineraries(),
          getDestinations(),
          getFavorites()
        ])

        const found = itinerariesResponse.itineraries.find(item => item.id === id)
        setItinerary(found || null)
        setDestinations(destinationsResponse.destinations)
        setFavoriteIds(new Set(favoritesResponse.favorites.map(d => d.id)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, navigate])

  useEffect(() => {
    let active = true

    async function loadSharedUsers() {
      if (!itinerary || itinerary.is_owner === false) {
        if (active) setSharedUsers([])
        return
      }

      try {
        const response = await getSharedUsers(itinerary.id)
        if (active) setSharedUsers(response.shared_users)
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    loadSharedUsers()

    return () => {
      active = false
    }
  }, [itinerary])

  function handleOpenShare() {
    setShareModalOpen(true)
  }

  async function handleCloseShare() {
    setShareModalOpen(false)
    try {
      const response = await getSharedUsers(itinerary.id)
      setSharedUsers(response.shared_users)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleFavorite(destinationId) {
    const isCurrentlyFavorite = favoriteIds.has(destinationId)

    try {
      if (isCurrentlyFavorite) {
        await removeFavorite(destinationId)
        setFavoriteIds(prev => {
          const next = new Set(prev)
          next.delete(destinationId)
          return next
        })
      } else {
        await addFavorite(destinationId)
        setFavoriteIds(prev => new Set(prev).add(destinationId))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRate(destinationId, stars) {
    try {
      const response = await rateDestination(destinationId, stars)
      setDestinations(prev =>
        prev.map(destination =>
          destination.id === destinationId
            ? { ...destination, rating: response.rating }
            : destination
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  // "Visited" is tracked locally (per browser) since there's no backend
  // endpoint for it yet. It's persisted to localStorage, keyed by itinerary,
  // so it survives navigating to a destination's detail page and back.
  function handleToggleVisited(destinationId) {
    setVisitedIds(prev => {
      const next = new Set(prev)
      if (next.has(destinationId)) {
        next.delete(destinationId)
      } else {
        next.add(destinationId)
      }
      try {
        localStorage.setItem(`itinerary-visited:${id}`, JSON.stringify([...next]))
      } catch {
        // ignore storage errors (e.g. private browsing / storage full)
      }
      return next
    })
  }

  function handleSelectType(type) {
    setActiveType(prev => (prev === type ? null : type))
  }

  const itineraryDestinations = itinerary
    ? itinerary.destinations.map(destId => destinations.find(d => d.id === destId)).filter(Boolean)
    : []

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const availableTypes = [...new Set(itineraryDestinations.map(destination => destination.type).filter(Boolean))]

  const filteredDestinations = itineraryDestinations.filter(destination => {
    const name = (destination.name || '').toLowerCase()
    const area = (destination.area || '').toLowerCase()
    const matchesSearch = !normalizedQuery || name.startsWith(normalizedQuery) || area.startsWith(normalizedQuery)
    const matchesType = !activeType || destination.type === activeType
    return matchesSearch && matchesType
  })

  return (
    <div className="itinerary-details">
      <header className="itinerary-details__header">
        <Link to="/itineraries" className="itinerary-details__back" aria-label="Back to itineraries">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <Logo theme="dark" />
      </header>

      <main className="itinerary-details__content itinerary-details__content--with-bottom-nav">
        {loading && <p className="itinerary-details__status">Loading itinerary...</p>}
        {error && <p className="itinerary-details__status itinerary-details__status--error">{error}</p>}

        {!loading && !error && !itinerary && (
          <p className="itinerary-details__status">Itinerary not found.</p>
        )}

        {!loading && !error && itinerary && (
          <>
            {itinerary.is_owner === false && (
              <p className="itinerary-details__shared-note">Shared by {itinerary.owner_name}</p>
            )}

            {itinerary.is_owner !== false && sharedUsers.length > 0 && (
              <p className="itinerary-details__shared-note">
                Shared with {sharedUsers.map(user => user.name).join(', ')}
              </p>
            )}

            <div className="itinerary-details__title-row">
              <h1 className="itinerary-details__title">{itinerary.title}</h1>
              <div className="itinerary-details__title-actions">
                <button
                  type="button"
                  className="itinerary-details__map-button"
                  onClick={() => navigate(`/map?itinerary=${itinerary.id}`)}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                    <path d="M9 4v14" />
                    <path d="M15 6v14" />
                  </svg>
                  Show itinerary
                </button>
                {itinerary.is_owner !== false && (
                  <button
                    type="button"
                    className="itinerary-details__share-button"
                    onClick={handleOpenShare}
                  >
                    Share
                  </button>
                )}
              </div>
            </div>

            <p className="itinerary-details__dates">
              {formatDate(itinerary.start_date)} – {formatDate(itinerary.end_date)}
            </p>

            <div className="itinerary-details__search-bar">
              <svg
                className="itinerary-details__search-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="itinerary-details__search-input"
                placeholder="Search this itinerary by name or area"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search this itinerary's destinations by name or area"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="itinerary-details__search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>

            {availableTypes.length > 0 && (
              <div className="itinerary-details__filters" role="group" aria-label="Filter this itinerary's destinations by type">
                <button
                  type="button"
                  className={`itinerary-details__filter-pill ${activeType === null ? 'itinerary-details__filter-pill--active' : ''}`}
                  onClick={() => setActiveType(null)}
                  aria-pressed={activeType === null}
                >
                  All
                </button>
                {availableTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`itinerary-details__filter-pill ${activeType === type ? 'itinerary-details__filter-pill--active' : ''}`}
                    onClick={() => handleSelectType(type)}
                    aria-pressed={activeType === type}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {filteredDestinations.length === 0 && (
              <p className="itinerary-details__status">
                {searchQuery
                  ? `No destinations in this itinerary match "${searchQuery}".`
                  : 'No destinations match this filter.'}
              </p>
            )}

            {filteredDestinations.length > 0 && (
              <div className="itinerary-details__grid">
                {filteredDestinations.map(destination => (
                  <DestinationCard
                    key={destination.id}
                    destination={destination}
                    isFavorite={favoriteIds.has(destination.id)}
                    isAuthenticated={isAuthenticated}
                    onToggleFavorite={handleToggleFavorite}
                    onRate={handleRate}
                    visitable
                    visited={visitedIds.has(destination.id)}
                    onToggleVisited={handleToggleVisited}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {shareModalOpen && itinerary && (
        <ShareItineraryModal itinerary={itinerary} onClose={handleCloseShare} />
      )}

      <BottomNav />
    </div>
  )
}

export default ItineraryDetails