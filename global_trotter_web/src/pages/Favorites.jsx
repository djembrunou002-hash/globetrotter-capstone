import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites, removeFavorite, rateDestination } from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import PlanetLoader from '../components/PlanetLoader.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import '../styles/Favorites.css'

function Favorites() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const headerRef = useRef(null)
  const headerPassed = useHeaderPassed(headerRef)

  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadFavorites() {
      setLoading(true)
      setError('')
      try {
        const response = await getFavorites()
        setFavorites(response.favorites)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [navigate])

  function handleBack() {
    navigate(-1)
  }

  async function handleRemoveFavorite(destinationId) {
    try {
      await removeFavorite(destinationId)
      setFavorites(prev => prev.filter(destination => destination.id !== destinationId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRate(destinationId, stars) {
    try {
      const response = await rateDestination(destinationId, stars)
      setFavorites(prev =>
        prev.map(destination =>
          destination.id === destinationId
            ? { ...destination, rating: response.rating, your_rating: response.your_rating }
            : destination
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="favorites">
      <header ref={headerRef} className="favorites__header page-header">
        <button
          type="button"
          className="favorites__back"
          aria-label={t('common.goBack')}
          onClick={handleBack}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="page-header__accessory">
          <Logo theme="dark" />
        </span>
        <h1 className="favorites__title page-header__accessory">{t('favorites.title')}</h1>
      </header>

      <main className="favorites__content favorites__content--with-bottom-nav">
        {loading && <PlanetLoader label={t('favorites.loading')} />}
        {error && <p className="favorites__status favorites__status--error">{error}</p>}

        {!loading && !error && favorites.length === 0 && (
          <p className="favorites__status">
            {t('favorites.empty')}
          </p>
        )}

        {!loading && favorites.length > 0 && (
          <div className="favorites__grid">
            {favorites.map(destination => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isFavorite
                isAuthenticated
                onToggleFavorite={handleRemoveFavorite}
                onRate={handleRate}
              />
            ))}
          </div>
        )}
      </main>

      <FloatingBackButton visible={headerPassed} onClick={handleBack} />

      <BottomNav />
    </div>
  )
}

export default Favorites