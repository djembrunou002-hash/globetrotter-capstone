import { useEffect, useState } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ShowcaseImage from '../components/Showcaseimage.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import { getDestinations, getDestinationStats } from '../services/destinationService.js'
import { getUserStats } from '../services/userService.js'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/Landing.css'

import landingImage from '../assets/Cameroon-landing.jpg'
import showcase1 from '../assets/cameroon-showcase-1.jpg'
import showcase2 from '../assets/cameroon-showcase-2.jpg'
import showcase3 from '../assets/cameroon-showcase-3.jpg'
import showcase4 from '../assets/cameroon-showcase-4.jpg'
import showcase5 from '../assets/cameroon-showcase-5.jpg'

const SHOWCASE_IMAGES = [showcase1, showcase2, showcase3, showcase4, showcase5]
const FEATURED_DESTINATION_COUNT = 10

let cachedLandingData = null

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()

  const [userCount, setUserCount] = useState(cachedLandingData?.userCount ?? null)
  const [destinationCount, setDestinationCount] = useState(cachedLandingData?.destinationCount ?? null)
  const [featuredDestinations, setFeaturedDestinations] = useState(cachedLandingData?.featuredDestinations ?? [])
  const [loadingDestinations, setLoadingDestinations] = useState(!cachedLandingData)

  useEffect(() => {
    if (navigationType === 'POP' && cachedLandingData) {
      return
    }

    let cancelled = false

    getUserStats()
      .then(response => {
        if (!cancelled) {
          setUserCount(response.user_count)
          cachedLandingData = { ...cachedLandingData, userCount: response.user_count }
        }
      })
      .catch(() => {})

    getDestinationStats()
      .then(response => {
        if (!cancelled) {
          setDestinationCount(response.destination_count)
          cachedLandingData = { ...cachedLandingData, destinationCount: response.destination_count }
        }
      })
      .catch(() => {})

    getDestinations()
      .then(response => {
        if (!cancelled) {
          const picked = shuffled(response.destinations).slice(0, FEATURED_DESTINATION_COUNT)
          setFeaturedDestinations(picked)
          cachedLandingData = { ...cachedLandingData, featuredDestinations: picked }
        }
      })
      .catch(() => {
        if (!cancelled) setFeaturedDestinations([])
      })
      .finally(() => {
        if (!cancelled) setLoadingDestinations(false)
      })

    return () => {
      cancelled = true
    }
  }, [navigationType])

  function requireAuth() {
    navigate('/login')
  }

  return (
    <div className="landing">

      <div className="landing__pattern" aria-hidden="true"></div>

      <nav className="landing__nav">

        <Logo theme="light" />

        <div className="landing__nav-links">

          <Link
            to="/login"
            className="landing__nav-login"
          >
            {t('landing.logIn')}
          </Link>

          <Link
            to="/register"
            className="landing__nav-cta"
          >
            {t('landing.signUp')}
          </Link>

        </div>

      </nav>

      <main className="landing__hero">

        <div className="landing__copy">

          <span className="landing__eyebrow">
            {t('landing.eyebrow')}
          </span>

          <h1 className="landing__headline">
            {t('landing.headlineBefore')}
            <em>{t('landing.headlineEmphasis')}</em>
            {t('landing.headlineAfter')}
          </h1>

          <p className="landing__subcopy">
            {t('landing.subcopy')}
          </p>

          <Link
            to="/register"
            className="landing__cta"
          >
            {t('landing.cta')}
          </Link>

        </div>

        <div className="landing__frame-wrap">

          <div className="landing__frame">

            <span className="landing__stamp">
              {t('landing.stamp')}
            </span>

            <img
              src={landingImage}
              alt={t('landing.heroAlt')}
              className="landing__image"
            />

          </div>

        </div>

      </main>

      <section className="landing__stats" aria-label="GlobalTrotter stats">

        <div className="landing__stat">
          <span className="landing__stat-value">
            {userCount !== null ? `${userCount}+` : '\u2014'}
          </span>
          <span className="landing__stat-label">{t('landing.statsTravelers')}</span>
        </div>

        <div className="landing__stat-divider" aria-hidden="true" />

        <div className="landing__stat">
          <span className="landing__stat-value">
            {destinationCount !== null ? destinationCount : '\u2014'}
          </span>
          <span className="landing__stat-label">{t('landing.statsDestinations')}</span>
        </div>

      </section>

      <section className="landing__explore">

        <h2 className="landing__explore-title">
          {t('landing.exploreTitle')}
        </h2>

        <p className="landing__explore-subtitle">
          {t('landing.exploreSubtitle')}
        </p>

        {loadingDestinations && (
          <p className="landing__explore-status">{t('landing.loadingDestinations')}</p>
        )}

        {!loadingDestinations && featuredDestinations.length > 0 && (
          <>
            <div className="landing__explore-grid">
              {featuredDestinations.map(destination => (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                  isFavorite={false}
                  isAuthenticated={false}
                  onToggleFavorite={requireAuth}
                  onRate={requireAuth}
                  linkState={{ fromLanding: true }}
                />
              ))}
            </div>

            <Link to="/register" className="landing__see-more">
              {t('landing.seeMore')}
            </Link>
          </>
        )}

      </section>

      <section className="landing__showcase">

        <h2 className="landing__showcase-title">
          {t('landing.showcaseTitle')}
        </h2>

        <div className="landing__showcase-grid">

          {
            SHOWCASE_IMAGES.map((src, index) => (
              <ShowcaseImage
                key={index}
                src={src}
                alt={t('landing.showcaseAlt')}
              />
            ))
          }

        </div>

      </section>

      <footer
        className="landing__flagbar"
        aria-hidden="true"
      />

    </div>
  )
}

export default Landing