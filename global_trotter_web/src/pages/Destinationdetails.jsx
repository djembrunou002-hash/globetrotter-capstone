import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import StarRating from '../components/Starrating.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/DestinationDetails.css'

const BUDGET_LABELS = {
  low: 'Low budget',
  medium: 'Medium budget',
  high: 'High budget'
}

function DestinationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())

  const [destination, setDestination] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [destinationsResponse, favoritesResponse] = await Promise.all([
          getDestinations(),
          isAuthenticated ? getFavorites() : Promise.resolve({ favorites: [] })
        ])

        const found = destinationsResponse.destinations.find(d => d.id === id)
        setDestination(found || null)
        setIsFavorite(favoritesResponse.favorites.some(d => d.id === id))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, isAuthenticated])

  async function handleToggleFavorite() {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      if (isFavorite) {
        await removeFavorite(id)
        setIsFavorite(false)
      } else {
        await addFavorite(id)
        setIsFavorite(true)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRate(stars) {
    if (stars === null) {
      navigate('/login')
      return
    }

    try {
      const response = await rateDestination(id, stars)
      setDestination(prev => (prev ? { ...prev, rating: response.rating } : prev))
    } catch (err) {
      setError(err.message)
    }
  }

  const image = destination?.images && destination.images[0]

  return (
    <div className="destination-details">
      <header className="destination-details__header">
        <Link to="/destinations" className="destination-details__back" aria-label="Back to destinations">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <Logo theme="dark" />
      </header>

      <main className="destination-details__content destination-details__content--with-bottom-nav">
        {loading && <p className="destination-details__status">Loading destination...</p>}
        {error && <p className="destination-details__status destination-details__status--error">{error}</p>}

        {!loading && !error && !destination && (
          <p className="destination-details__status">Destination not found.</p>
        )}

        {!loading && !error && destination && (
          <>
            <div className="destination-details__image-wrap">
              {image && !imageFailed ? (
                <img
                  src={image}
                  alt={destination.name}
                  className="destination-details__image"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  className="destination-details__image destination-details__image--placeholder"
                  aria-hidden="true"
                />
              )}
              <span
                className={`destination-details__budget destination-details__budget--${destination.budget_level}`}
              >
                {BUDGET_LABELS[destination.budget_level] || destination.budget_level}
              </span>
            </div>

            <div className="destination-details__body">
              <h1 className="destination-details__name">{destination.name}</h1>
              <p className="destination-details__meta">
                {destination.area} · {destination.type}
              </p>

              {destination.tags && destination.tags.length > 0 && (
                <ul className="destination-details__tags">
                  {destination.tags.map(tag => (
                    <li key={tag} className="destination-details__tag">{tag}</li>
                  ))}
                </ul>
              )}

              <StarRating
                average={destination.rating?.average || 0}
                count={destination.rating?.count || 0}
                isAuthenticated={isAuthenticated}
                onRate={handleRate}
              />

              <div className="destination-details__actions">
                <button
                  type="button"
                  className="destination-details__location"
                  disabled
                  title="Map view coming soon"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  Location
                </button>

                <button
                  type="button"
                  className={`destination-details__favorite ${
                    isFavorite ? 'destination-details__favorite--active' : ''
                  }`}
                  onClick={handleToggleFavorite}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill={isFavorite ? '#C8102E' : 'none'}
                    stroke="#C8102E"
                    strokeWidth="2"
                  >
                    <path d="M12 21s-7.5-4.6-10-9.3C.6 8.1 2.5 4.5 6 4c2-.3 3.8.8 6 3.2C14.2 4.8 16 3.7 18 4c3.5.5 5.4 4.1 4 7.7C19.5 16.4 12 21 12 21z" />
                  </svg>
                  {isFavorite ? 'Saved to favorites' : 'Add to favorites'}
                </button>
              </div>

              {destination.description && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">About this place</h2>
                  <p className="destination-details__description">{destination.description}</p>
                </div>
              )}

              <div className="destination-details__coming-soon">
                More details -- photos, reviews, and nearby suggestions -- are coming soon.
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default DestinationDetails