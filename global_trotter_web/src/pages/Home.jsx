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
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/DestinationCard.jsx'
import '../styles/Home.css'

function Home() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())

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

  return (
    <div className="home">
      <header className="home__header">
        <Logo theme="dark" />
        <h1 className="home__title">Destinations</h1>
      </header>

      <main className="home__content">
        {loading && <p className="home__status">Loading destinations...</p>}
        {error && <p className="home__status home__status--error">{error}</p>}

        {!loading && !error && (
          <div className="home__grid">
            {destinations.map(destination => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isFavorite={favoriteIds.has(destination.id)}
                isAuthenticated={isAuthenticated}
                onToggleFavorite={handleToggleFavorite}
                onRate={handleRate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home