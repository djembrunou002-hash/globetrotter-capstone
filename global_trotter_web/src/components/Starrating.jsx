import { useState } from 'react'

function StarRating({ average, count, isAuthenticated, onRate }) {
  const [hovered, setHovered] = useState(0)
  const rounded = Math.round(average)

  function handleClick(stars) {
    if (!isAuthenticated) {
      onRate(null)
      return
    }
    onRate(stars)
  }

  return (
    <div className="destination-card__rating">
      <div
        className="destination-card__stars"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className="destination-card__star"
            onMouseEnter={() => setHovered(star)}
            onClick={() => handleClick(star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill={(hovered || rounded) >= star ? '#F2B705' : 'none'}
              stroke="#F2B705"
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <span className="destination-card__rating-count">
        {average.toFixed(1)} ({count})
      </span>
    </div>
  )
}

export default StarRating