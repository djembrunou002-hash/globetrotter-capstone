import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'

function StarRating({ average, count, isAuthenticated, onRate, readOnly = false, yourRating = null }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(0)
  const [userRating, setUserRating] = useState(yourRating)
  const [prevYourRating, setPrevYourRating] = useState(yourRating)
  const rounded = Math.round(average)
  const displayedStars = hovered || userRating || rounded

  // Keep in sync with the server-known rating for this user (e.g. once the
  // destination list/detail response loads, or after switching destinations).
  // Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (yourRating !== prevYourRating) {
    setPrevYourRating(yourRating)
    setUserRating(yourRating)
  }

  function handleClick(stars) {
    if (readOnly) return
    if (!isAuthenticated) {
      onRate(null)
      return
    }
    setUserRating(stars)
    onRate(stars)
  }

  return (
    <div className="destination-card__rating">
      <div
        className={`destination-card__stars ${readOnly ? 'destination-card__stars--readonly' : ''}`}
        onMouseLeave={() => !readOnly && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className="destination-card__star"
            onMouseEnter={() => !readOnly && setHovered(star)}
            onClick={() => handleClick(star)}
            aria-label={star === 1 ? t('rating.rateOne', { count: star }) : t('rating.rateMany', { count: star })}
            disabled={readOnly}
            tabIndex={readOnly ? -1 : 0}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill={displayedStars >= star ? '#F2B705' : 'none'}
              stroke="#F2B705"
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <span className="destination-card__rating-count">
        {userRating && (
          <span className="destination-card__your-rating">{t('rating.youRated', { stars: userRating })}</span>
        )}
        {average.toFixed(1)} ({count})
      </span>
    </div>
  )
}

export default StarRating