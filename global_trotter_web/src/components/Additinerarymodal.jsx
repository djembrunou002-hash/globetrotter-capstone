import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import { useTranslation } from '../hooks/useTranslation.js'

function AddItineraryModal({ destinations, onClose, onSubmit, submitting, submitError }) {
  const navigate = useNavigate()
  const { draft, updateDraft, startSelection } = useItineraryDraft()
  const { t } = useTranslation()
  const [validationError, setValidationError] = useState('')

  function handleChooseDestinations() {
    startSelection()
    navigate('/destinations')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setValidationError('')

    if (!draft.title) {
      setValidationError(t('addItinerary.titleRequired'))
      return
    }

    if (draft.selectedDestinationIds.length === 0) {
      setValidationError(t('addItinerary.destinationRequired'))
      return
    }

    if (!draft.startDate || !draft.endDate) {
      setValidationError(t('addItinerary.datesRequired'))
      return
    }

    onSubmit({
      title: draft.title,
      destinations: draft.selectedDestinationIds,
      start_date: draft.startDate,
      end_date: draft.endDate
    })
  }

  const selectedCount = draft.selectedDestinationIds.length
  const selectedDestinations = draft.selectedDestinationIds
    .map(id => destinations.find(d => d.id === id))
    .filter(Boolean)

  return (
    <div className="itinerary-modal__backdrop">
      <div className="itinerary-modal" role="dialog" aria-modal="true" aria-label={t('addItinerary.heading')}>
        <button type="button" className="itinerary-modal__close" onClick={onClose} aria-label={t('common.close')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="itinerary-modal__heading">{t('addItinerary.heading')}</h2>

        <form onSubmit={handleSubmit} noValidate>
          {(validationError || submitError) && (
            <p className="itinerary-modal__error">{validationError || submitError}</p>
          )}

          <label htmlFor="itinerary-title">{t('addItinerary.titleLabel')}</label>
          <input
            id="itinerary-title"
            type="text"
            value={draft.title}
            onChange={e => updateDraft({ title: e.target.value })}
          />

          <label>{t('addItinerary.destinationsLabel')}</label>
          <button
            type="button"
            className="itinerary-modal__choose-destinations"
            onClick={handleChooseDestinations}
          >
            {selectedCount === 0
              ? t('addItinerary.chooseDestinations')
              : selectedCount === 1
                ? t('addItinerary.selectedOne', { count: selectedCount })
                : t('addItinerary.selectedMany', { count: selectedCount })}
          </button>

          {selectedDestinations.length > 0 && (
            <ul className="itinerary-modal__selected-list">
              {selectedDestinations.map(destination => (
                <li key={destination.id}>{destination.name}</li>
              ))}
            </ul>
          )}

          <label htmlFor="itinerary-tags">{t('addItinerary.tagsLabel')}</label>
          <input
            id="itinerary-tags"
            type="text"
            placeholder={t('addItinerary.tagsPlaceholder')}
            value={draft.tags}
            onChange={e => updateDraft({ tags: e.target.value })}
          />

          <div className="itinerary-modal__date-row">
            <div>
              <label htmlFor="itinerary-start">{t('addItinerary.startDate')}</label>
              <input
                id="itinerary-start"
                type="date"
                value={draft.startDate}
                onChange={e => updateDraft({ startDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="itinerary-end">{t('addItinerary.endDate')}</label>
              <input
                id="itinerary-end"
                type="date"
                value={draft.endDate}
                onChange={e => updateDraft({ endDate: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="itinerary-modal__submit" disabled={submitting}>
            {submitting ? t('addItinerary.submitting') : t('addItinerary.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddItineraryModal