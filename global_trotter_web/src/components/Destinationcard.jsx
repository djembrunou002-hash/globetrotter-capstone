import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarRating from './Starrating.jsx'
import AddToItineraryButton from './AddToItineraryButton.jsx'
import { getBudgetDisplay, getHoursDisplay } from '../utils/destinationDisplay.js'
import '../styles/DestinationCard.css'

function DestinationCard({
  destination,
  isFavorite,
  isAuthenticated,
  onToggleFavorite,
  onRate,
  selectable = false,
  selected = false,
  onToggleSelect,
  visitable = false,
  visited = false,
  onToggleVisited
}) {
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const image = destination.images && destination.images[0]
  const commentCount = destination.comment_count || 0
  const budgetDisplay = getBudgetDisplay(destination.budget, destination.budget_level)
  const hoursDisplay = getHoursDisplay(destination.hours)

  function handleOpenDetails() {
    navigate(`/destinations/${destination.id}`)
  }

  function handleOpenComments(e) {
    e.stopPropagation()
    navigate(`/destinations/${destination.id}`, { state: { focusComments: true } })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpenDetails()
    }
  }

  return (
    <article
      className={`destination-card ${selectable ? 'destination-card--selectable' : ''} ${
        visited ? 'destination-card--visited' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={handleOpenDetails}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${destination.name}`}
    >
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
          {budgetDisplay.label}
        </span>

        {selectable && (
          <button
            type="button"
            className={`destination-card__checkbox ${selected ? 'destination-card__checkbox--checked' : ''}`}
            onClick={e => {
              e.stopPropagation()
              onToggleSelect(destination.id)
            }}
            aria-label={selected ? `Deselect ${destination.name}` : `Select ${destination.name}`}
            aria-pressed={selected}
          >
            {selected && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5 9-9" />
              </svg>
            )}
          </button>
        )}

        {visitable && (
          <button
            type="button"
            className={`destination-card__visited-checkbox ${
              visited ? 'destination-card__visited-checkbox--checked' : ''
            }`}
            onClick={e => {
              e.stopPropagation()
              onToggleVisited(destination.id)
            }}
            aria-label={visited ? `Mark ${destination.name} as not visited` : `Mark ${destination.name} as visited`}
            aria-pressed={visited}
          >
            {visited && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5 9-9" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="destination-card__body">
        <h3 className="destination-card__name">{destination.name}</h3>
        <p className="destination-card__meta">
          {destination.area} · {destination.type}
        </p>

        <p className="destination-card__hours">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
          {hoursDisplay.label}
        </p>

        {destination.tags && destination.tags.length > 0 && (
          <ul className="destination-card__tags">
            {destination.tags.map(tag => (
              <li key={tag} className="destination-card__tag">{tag}</li>
            ))}
          </ul>
        )}

        <div onClick={e => e.stopPropagation()}>
          <StarRating
            average={destination.rating?.average || 0}
            count={destination.rating?.count || 0}
            isAuthenticated={isAuthenticated}
            onRate={stars => onRate(destination.id, stars)}
          />
        </div>

        <div className="destination-card__actions" onClick={e => e.stopPropagation()}>
          <button type="button" className="destination-card__location" disabled title="Map view coming soon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Location
          </button>

          <button
            type="button"
            className="destination-card__comments"
            onClick={handleOpenComments}
            aria-label={`View ${commentCount} comment${commentCount === 1 ? '' : 's'} for ${destination.name}`}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 21l1.5-5.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5z" />
            </svg>
            {commentCount}
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

          {!selectable && (
            <AddToItineraryButton
              destinationId={destination.id}
              isAuthenticated={isAuthenticated}
              variant="icon"
            />
          )}
        </div>
      </div>
    </article>
  )
}

export default DestinationCard