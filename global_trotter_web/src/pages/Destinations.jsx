import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/DestinationCard.jsx'
import BottomNav from '../components/BottomNav.jsx'
import '../styles/Destinations.css'

function Destinations() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())
  const {
    selectionMode,
    draft,
    toggleDestination,
    confirmSelection,
    cancelSelection
  } = useItineraryDraft()

  const [destinations, setDestinations] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [destinationsResponse, favoritesResponse] = await Promise.all([
          getDestinations(),
          isAuthenticated ? getFavorites() : Promise.resolve({ favorites: [] })
        ])
        setDestinations(destinationsResponse.destinations)
        setFavoriteIds(new Set(favoritesResponse.favorites.map(d => d.id)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated])

  async function handleToggleFavorite(destinationId) {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

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
    if (stars === null) {
      navigate('/login')
      return
    }

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

  function handleConfirmSelection() {
    confirmSelection()
    navigate('/itineraries')
  }

  function handleCancelSelection() {
    cancelSelection()
    navigate('/itineraries')
  }

  return (
    <div className="destinations">
      <header className="destinations__header">
        <Logo theme="dark" />
        <h1 className="destinations__title">Destinations</h1>
      </header>

      {selectionMode && (
        <div className="destinations__selection-bar">
          <button
            type="button"
            className="destinations__selection-cancel"
            onClick={handleCancelSelection}
            aria-label="Cancel destination selection"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12H19" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <main className="destinations__content destinations__content--with-bottom-nav">
        {loading && <p className="destinations__status">Loading destinations...</p>}
        {error && <p className="destinations__status destinations__status--error">{error}</p>}

        {!loading && !error && (
          <div className="destinations__grid">
            {destinations.map(destination => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isFavorite={favoriteIds.has(destination.id)}
                isAuthenticated={isAuthenticated}
                onToggleFavorite={handleToggleFavorite}
                onRate={handleRate}
                selectable={selectionMode}
                selected={draft.selectedDestinationIds.includes(destination.id)}
                onToggleSelect={toggleDestination}
              />
            ))}
          </div>
        )}
      </main>

      {selectionMode && draft.selectedDestinationIds.length > 0 && (
        <button type="button" className="destinations__confirm-selection" onClick={handleConfirmSelection}>
          Confirm selected ({draft.selectedDestinationIds.length})
        </button>
      )}

      <BottomNav />
    </div>
  )
}

export default Destinations