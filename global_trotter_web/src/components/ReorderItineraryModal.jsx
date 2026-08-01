import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/ReorderItineraryModal.css'

function ReorderItineraryModal({ itinerary, destinations, onClose }) {
  const navigate = useNavigate()
  const [orderedIds, setOrderedIds] = useState([])

  const orderedSet = new Set(orderedIds)
  const hasSelection = orderedIds.length > 0

  function handleToggle(destinationId) {
    setOrderedIds(prev => {
      if (prev.includes(destinationId)) {
        return prev.filter(id => id !== destinationId)
      }
      return [...prev, destinationId]
    })
  }

  function handleReset() {
    setOrderedIds([])
  }

  function handleConfirm() {
    navigate(`/map?itinerary=${itinerary.id}&stops=${orderedIds.join(',')}`)
  }

  function handleUseCurrentOrder() {
    navigate(`/map?itinerary=${itinerary.id}`)
  }

  return (
    <div className="reorder-modal__backdrop" onClick={onClose}>
      <div
        className="reorder-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Choose the order of visit"
        onClick={e => e.stopPropagation()}
      >
        <div className="reorder-modal__handle" />

        <div className="reorder-modal__header">
          <p className="reorder-modal__title">Choose the order of visit</p>
          <button type="button" className="reorder-modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="reorder-modal__hint">
          Tap the destinations in the order you'd like to visit them. You don't need to pick all of them —
          choose just the ones for today.
        </p>

        <div className="reorder-modal__body">
          <ul className="reorder-modal__list">
            {destinations.map(destination => {
              const position = orderedIds.indexOf(destination.id)
              const isSelected = orderedSet.has(destination.id)
              return (
                <li key={destination.id}>
                  <button
                    type="button"
                    className={`reorder-modal__item ${isSelected ? 'reorder-modal__item--selected' : ''}`}
                    onClick={() => handleToggle(destination.id)}
                  >
                    <span
                      className={`reorder-modal__badge ${isSelected ? 'reorder-modal__badge--selected' : ''}`}
                    >
                      {isSelected ? position + 1 : ''}
                    </span>
                    <span className="reorder-modal__item-info">
                      <span className="reorder-modal__item-title">{destination.name}</span>
                      {destination.area && (
                        <span className="reorder-modal__item-meta">{destination.area}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="reorder-modal__footer">
          <button
            type="button"
            className="reorder-modal__secondary"
            onClick={handleReset}
            disabled={orderedIds.length === 0}
          >
            Reset
          </button>
          <button
            type="button"
            className="reorder-modal__secondary"
            onClick={handleUseCurrentOrder}
          >
            Use current order
          </button>
          <button
            type="button"
            className="reorder-modal__primary"
            onClick={handleConfirm}
            disabled={!hasSelection}
          >
            View route
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReorderItineraryModal