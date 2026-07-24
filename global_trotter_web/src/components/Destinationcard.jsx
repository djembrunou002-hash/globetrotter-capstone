import { useState } from 'react'
import StarRating from './StarRating.jsx'

const BUDGET_LABELS = {
  low: 'Low budget',
  medium: 'Medium budget',
  high: 'High budget'
}

function DestinationCard({ destination, isFavorite, isAuthenticated, onToggleFavorite, onRate }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = destination.images && destination.images[0]

  return (
    <article className="destination-card">
      <div className="destination-card__image-wrap">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={destination.name}
            className="destination-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="destination-card__image destination-card__image--placeholder" aria-hidden="true" />
        )}
        <span className={`destination-card__budget destination-card__budget--${destination.budget_level}`}>
          {BUDGET_LABELS[destination.budget_level] || destination.budget_level}
        </span>
      </div>

      <div className="destination-card__body">
        <h3 className="destination-card__name">{destination.name}</h3>
        <p className="destination-card__meta">
          {destination.area} · {destination.type}
        </p>

        {destination.tags && destination.tags.length > 0 && (
          <ul className="destination-card__tags">
            {destination.tags.map(tag => (
              <li key={tag} className="destination-card__tag">{tag}</li>
            ))}
          </ul>
        )}

        <StarRating
          average={destination.rating?.average || 0}
          count={destination.rating?.count || 0}
          isAuthenticated={isAuthenticated}
          onRate={stars => onRate(destination.id, stars)}
        />

        <div className="destination-card__actions">
          <button type="button" className="destination-card__location" disabled title="Map view coming soon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Location
          </button>

          <button
            type="button"
            className={`destination-card__favorite ${isFavorite ? 'destination-card__favorite--active' : ''}`}
            onClick={() => onToggleFavorite(destination.id)}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={isFavorite ? '#C8102E' : 'none'} stroke="#C8102E" strokeWidth="2">
              <path d="M12 21s-7.5-4.6-10-9.3C.6 8.1 2.5 4.5 6 4c2-.3 3.8.8 6 3.2C14.2 4.8 16 3.7 18 4c3.5.5 5.4 4.1 4 7.7C19.5 16.4 12 21 12 21z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}

export default DestinationCard