import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getItineraries, addDestinationToItinerary } from '../services/itineraryService.js'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/AddToItineraryButton.css'

function AddToItineraryButton({ destinationId, isAuthenticated, variant = 'icon' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleOpen(e) {
    e.stopPropagation()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setOpen(true)

    if (!loaded) {
      setLoading(true)
      setError('')
      try {
        const response = await getItineraries()
        setItineraries(response.itineraries)
        setLoaded(true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  function handleClose(e) {
    e?.stopPropagation()
    setOpen(false)
  }

  async function handleAdd(itinerary, e) {
    e.stopPropagation()
    if (itinerary.destinations.includes(destinationId)) return

    setAddingId(itinerary.id)
    setError('')
    try {
      const response = await addDestinationToItinerary(itinerary.id, destinationId)
      setItineraries(prev => prev.map(i => (i.id === itinerary.id ? response.itinerary : i)))
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingId(null)
    }
  }

  const plusIcon = (
    <svg viewBox="0 0 24 24" width={variant === 'icon' ? 16 : 15} height={variant === 'icon' ? 16 : 15} fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )

  return (
    <div className="add-to-itinerary" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className={variant === 'icon' ? 'add-to-itinerary__trigger' : 'add-to-itinerary__trigger add-to-itinerary__trigger--pill'}
        onClick={handleOpen}
        aria-label={t('addToItinerary.trigger')}
        aria-expanded={open}
      >
        {plusIcon}
        {variant === 'pill' && <span>{t('addToItinerary.pill')}</span>}
      </button>

      {createPortal(
        <div
          className={`add-to-itinerary__backdrop ${open ? 'add-to-itinerary__backdrop--open' : ''}`}
          onClick={handleClose}
          aria-hidden={!open}
        >
          <div
            className={`add-to-itinerary__sheet ${open ? 'add-to-itinerary__sheet--open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={t('addToItinerary.title')}
            onClick={e => e.stopPropagation()}
          >
            <div className="add-to-itinerary__handle" />

            <div className="add-to-itinerary__header">
              <p className="add-to-itinerary__title">{t('addToItinerary.title')}</p>
              <button type="button" className="add-to-itinerary__close" onClick={handleClose} aria-label={t('common.close')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="add-to-itinerary__body">
              {loading && <p className="add-to-itinerary__status">{t('addToItinerary.loading')}</p>}
              {error && <p className="add-to-itinerary__status add-to-itinerary__status--error">{error}</p>}

              {!loading && loaded && itineraries.length === 0 && !error && (
                <div className="add-to-itinerary__empty">
                  <p className="add-to-itinerary__status">{t('addToItinerary.empty')}</p>
                  <button
                    type="button"
                    className="add-to-itinerary__create"
                    onClick={() => navigate('/itineraries')}
                  >
                    {t('addToItinerary.createOne')}
                  </button>
                </div>
              )}

              {!loading && itineraries.length > 0 && (
                <ul className="add-to-itinerary__list">
                  {itineraries.map(itinerary => {
                    const isAdded = itinerary.destinations.includes(destinationId)
                    const isAdding = addingId === itinerary.id
                    const count = itinerary.destinations.length
                    return (
                      <li key={itinerary.id}>
                        <button
                          type="button"
                          className={`add-to-itinerary__item ${isAdded ? 'add-to-itinerary__item--added' : ''}`}
                          onClick={e => handleAdd(itinerary, e)}
                          disabled={isAdded || isAdding}
                        >
                          <span className="add-to-itinerary__item-info">
                            <span className="add-to-itinerary__item-title">{itinerary.title}</span>
                            <span className="add-to-itinerary__item-meta">
                              {count === 1
                                ? t('addToItinerary.destinationsOne', { count })
                                : t('addToItinerary.destinationsMany', { count })}
                            </span>
                          </span>
                          {isAdded && <span className="add-to-itinerary__badge">{t('addToItinerary.added')}</span>}
                          {!isAdded && isAdding && <span className="add-to-itinerary__badge">{t('addToItinerary.adding')}</span>}
                          {!isAdded && !isAdding && (
                            <span className="add-to-itinerary__badge add-to-itinerary__badge--plus">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AddToItineraryButton