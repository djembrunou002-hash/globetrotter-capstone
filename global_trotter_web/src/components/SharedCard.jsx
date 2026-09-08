import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation.js'
import { joinItinerary } from '../services/itineraryService.js'
import { invalidateItinerary, loadDestination, loadItinerary } from '../utils/shareCache.js'
import '../styles/SharedCard.css'

function SharedCard({ kind, id, url }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [failed, setFailed] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    let active = true
    const request = kind === 'destination' ? loadDestination(id) : loadItinerary(id)

    request
      .then(result => {
        if (!active) return
        if (!result) {
          setFailed(true)
          return
        }
        setItem(result)
        setJoined(Boolean(result.joined))
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [kind, id])

  function open() {
    navigate(kind === 'destination' ? `/destinations/${id}` : `/itineraries/${id}`)
  }

  function handleJoin(event) {
    event.stopPropagation()
    if (joining || joined) return

    setJoining(true)
    joinItinerary(id)
      .then(() => {
        setJoined(true)
        invalidateItinerary(id)
      })
      .catch(() => setFailed(false))
      .finally(() => setJoining(false))
  }

  if (failed) {
    return (
      <a className="shared-card shared-card--raw" href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    )
  }

  if (!item) {
    return (
      <div className="shared-card shared-card--loading" aria-busy="true">
        <span className="shared-card__thumb" />
        <span className="shared-card__lines">
          <span />
          <span />
        </span>
      </div>
    )
  }

  if (kind === 'destination') {
    const image = item.images && item.images.length > 0 ? item.images[0] : null
    const place = [item.area, item.region].filter(Boolean).join(', ')

    return (
      <div
        className="shared-card"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') open()
        }}
      >
        <span className="shared-card__thumb">
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          )}
        </span>

        <span className="shared-card__body">
          <span className="shared-card__kind">{t('share.destinationLabel')}</span>
          <span className="shared-card__name">{item.name}</span>
          {place && <span className="shared-card__meta">{place}</span>}
        </span>
      </div>
    )
  }

  const dates = [item.start_date, item.end_date].filter(Boolean).join(' - ')

  return (
    <div
      className="shared-card shared-card--itinerary"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') open()
      }}
    >
      <span className="shared-card__thumb shared-card__thumb--itinerary">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      </span>

      <span className="shared-card__body">
        <span className="shared-card__kind">{t('share.itineraryLabel')}</span>
        <span className="shared-card__name">{item.title}</span>
        <span className="shared-card__meta">
          {t('chat.itineraryStops', { count: item.destination_count || 0 })}
          {dates ? ` - ${dates}` : ''}
        </span>
      </span>

      <button
        type="button"
        className={`shared-card__join ${joined ? 'is-joined' : ''}`}
        onClick={handleJoin}
        disabled={joining || joined}
      >
        {joined ? t('share.joined') : joining ? t('share.joining') : t('share.join')}
      </button>
    </div>
  )
}

export default SharedCard