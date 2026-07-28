import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getRecommendations } from '../services/recommendationService.js'
import { getToken } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/Home.css'

function Home() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())

  const [recommendedDestinations, setRecommendedDestinations] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [recommendationsResponse, destinationsResponse, favoritesResponse] = await Promise.all([
          getRecommendations(),
          getDestinations(),
          getFavorites()
        ])

        const destinationsById = new Map(destinationsResponse.destinations.map(d => [d.id, d]))
        const recommended = recommendationsResponse.recommendations
          .map(r => destinationsById.get(r.destination_id))
          .filter(Boolean)

        setRecommendedDestinations(recommended)
        setFavoriteIds(new Set(favoritesResponse.favorites.map(d => d.id)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

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
      setRecommendedDestinations(prev =>
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
        <h1 className="home__title">Recommended for you</h1>
      </header>

      <main className="home__content home__content--with-bottom-nav">
        {loading && <p className="home__status">Loading recommendations...</p>}
        {error && <p className="home__status home__status--error">{error}</p>}

        {!loading && !error && recommendedDestinations.length === 0 && (
          <p className="home__status">
            No recommendations yet -- rate or favorite a few destinations to get personalized picks.
          </p>
        )}

        {!loading && !error && recommendedDestinations.length > 0 && (
          <div className="home__grid">
            {recommendedDestinations.map(destination => (
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

      <BottomNav />
    </div>
  )
}

export default Home