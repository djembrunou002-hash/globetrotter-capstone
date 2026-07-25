import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ItineraryCard({ itinerary, coverImage }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  function handleOpen() {
    navigate(`/itineraries/${itinerary.id}`)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  return (
    <article
      className="itinerary-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${itinerary.title}`}
    >
      <div className="itinerary-card__image-wrap">
        {coverImage && !imageFailed ? (
          <img
            src={coverImage}
            alt={itinerary.title}
            className="itinerary-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="itinerary-card__image itinerary-card__image--placeholder" aria-hidden="true" />
        )}

        <button
          type="button"
          className="itinerary-card__menu-trigger"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(prev => !prev)
          }}
          aria-label="Itinerary options"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="itinerary-card__menu-backdrop"
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(false)
              }}
            />
            <div className="itinerary-card__menu" onClick={e => e.stopPropagation()}>
              <button type="button" className="itinerary-card__menu-item" disabled title="Coming soon">
                Delete itinerary
              </button>
            </div>
          </>
        )}

        <div className="itinerary-card__overlay">
          <h3 className="itinerary-card__title">{itinerary.title}</h3>
        </div>
      </div>
    </article>
  )
}

export default ItineraryCard