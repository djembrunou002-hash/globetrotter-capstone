import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import StarRating from '../components/Starrating.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import CommentSection from '../components/CommentSection.jsx'
import AddToItineraryButton from '../components/AddToItineraryButton.jsx'
import { getBudgetDisplay, getHoursDisplay, getContactDisplay } from '../utils/destinationDisplay.js'
import '../styles/DestinationDetails.css'

function ExtraPhoto({ src, alt }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="destination-details__extra-photo destination-details__extra-photo--placeholder" aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={alt}
      className="destination-details__extra-photo"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function DestinationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, language } = useTranslation()
  const isAuthenticated = Boolean(getToken())
  const focusComments = Boolean(location.state?.focusComments)

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
      setDestination(prev => (prev ? { ...prev, rating: response.rating, your_rating: response.your_rating } : prev))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleBack() {
    navigate(-1)
  }

  const image = destination?.images && destination.images[0]
  const extraPhotos = destination?.images ? destination.images.slice(1, 4) : []
  const budgetDisplay = destination ? getBudgetDisplay(destination.budget, destination.budget_level, t) : null
  const hoursDisplay = destination ? getHoursDisplay(destination.hours, t, language) : null
  const nearbyServices = destination?.nearby_services || []
  const contactDisplay = destination ? getContactDisplay(destination.contact) : null
  const advice = destination?.advice && destination.advice.trim()
    ? destination.advice
    : t('destinationDetails.noAdvice')

  return (
    <div className="destination-details">
      <header className="destination-details__header">
        <button
          type="button"
          className="destination-details__back"
          aria-label={t('common.goBack')}
          onClick={handleBack}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
      </header>

      <main className="destination-details__content destination-details__content--with-bottom-nav">
        {loading && <p className="destination-details__status">{t('destinationDetails.loading')}</p>}
        {error && <p className="destination-details__status destination-details__status--error">{error}</p>}

        {!loading && !error && !destination && (
          <p className="destination-details__status">{t('destinationDetails.notFound')}</p>
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
                {budgetDisplay.label}
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
                    <li key={tag}>
                      <button
                        type="button"
                        className="destination-details__tag"
                        onClick={() => navigate(`/destinations?tag=${encodeURIComponent(tag)}`)}
                        title={t('destinationDetails.showTagged', { tag })}
                      >
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <StarRating
                average={destination.rating?.average || 0}
                count={destination.rating?.count || 0}
                yourRating={destination.your_rating || null}
                isAuthenticated={isAuthenticated}
                onRate={handleRate}
              />

              <div className="destination-details__actions">
                <button
                  type="button"
                  className="destination-details__location"
                  onClick={() => navigate(`/map?destination=${id}`)}
                  title={t('common.viewOnMap')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {t('common.location')}
                </button>

                <button
                  type="button"
                  className={`destination-details__favorite ${
                    isFavorite ? 'destination-details__favorite--active' : ''
                  }`}
                  onClick={handleToggleFavorite}
                  aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
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
                  {isFavorite ? t('destinationDetails.savedToFavorites') : t('common.addToFavorites')}
                </button>

                <AddToItineraryButton
                  destinationId={id}
                  isAuthenticated={isAuthenticated}
                  variant="pill"
                />
              </div>

              <div className="destination-details__info-grid">
                <div className="destination-details__info-card">
                  <span className="destination-details__info-label">{t('destinationDetails.budgetToVisit')}</span>
                  <span className="destination-details__info-value">{budgetDisplay.label}</span>
                  {budgetDisplay.note && (
                    <p className="destination-details__info-note">{budgetDisplay.note}</p>
                  )}
                </div>

                <div className="destination-details__info-card">
                  <span className="destination-details__info-label">{t('destinationDetails.openingHours')}</span>
                  <span className="destination-details__info-value">{hoursDisplay.label}</span>
                  {hoursDisplay.note && (
                    <p className="destination-details__info-note">{hoursDisplay.note}</p>
                  )}
                </div>
              </div>

              {destination.description && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.about')}</h2>
                  <p className="destination-details__description">{destination.description}</p>
                </div>
              )}

              {extraPhotos.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.morePhotos')}</h2>
                  <div className="destination-details__photo-grid">
                    {extraPhotos.map((src, index) => (
                      <ExtraPhoto
                        key={src}
                        src={src}
                        alt={t('destinationDetails.photoAlt', { name: destination.name, number: index + 2 })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {contactDisplay && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.contact')}</h2>
                  <div className="destination-details__contact">
                    {contactDisplay.phone && (
                      <a
                        className="destination-details__contact-item"
                        href={`tel:${contactDisplay.phone.replace(/\s+/g, '')}`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {contactDisplay.phone}
                      </a>
                    )}
                    {contactDisplay.email && (
                      <a className="destination-details__contact-item" href={`mailto:${contactDisplay.email}`}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 6l-10 7L2 6" />
                        </svg>
                        {contactDisplay.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {nearbyServices.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.nearby')}</h2>
                  <ul className="destination-details__services">
                    {nearbyServices.map(service => (
                      <li key={service.name} className="destination-details__service">
                        <span className="destination-details__service-type">{service.type}</span>
                        <span className="destination-details__service-name">{service.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="destination-details__section">
                <h2 className="destination-details__section-title">{t('destinationDetails.advice')}</h2>
                <p className="destination-details__advice">{advice}</p>
              </div>

              <CommentSection
                destinationId={id}
                ownerId={destination.owner_id}
                isAuthenticated={isAuthenticated}
                focusOnMount={focusComments}
              />
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default DestinationDetails