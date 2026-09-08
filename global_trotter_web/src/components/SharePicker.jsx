import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { getDestinations } from '../services/destinationService.js'
import { getItineraries } from '../services/itineraryService.js'
import '../styles/SharePicker.css'

function SharePicker({ kind, onConfirm, onClose }) {
  const { t } = useTranslation()

  const multiple = kind === 'destination'

  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    let active = true
    const request = kind === 'destination' ? getDestinations() : getItineraries()

    request
      .then(response => {
        if (!active) return

        const list =
          kind === 'destination' ? response.destinations || [] : response.itineraries || []

        setItems(list)
        setLoaded(true)
      })
      .catch(err => {
        if (!active) return
        setError(err.message)
        setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [kind])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items

    return items.filter(item => {
      const label = (kind === 'destination' ? item.name : item.title) || ''
      const extra = (kind === 'destination' ? item.area || item.region || '' : '') || ''
      return label.toLowerCase().includes(term) || extra.toLowerCase().includes(term)
    })
  }, [items, kind, query])

  function toggle(id) {
    if (!multiple) {
      setSelected([id])
      return
    }

    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  function handleConfirm() {
    if (selected.length === 0) return
    onConfirm(selected)
  }

  return (
    <div className="picker__backdrop" onClick={onClose}>
      <div
        className="picker"
        role="dialog"
        aria-modal="true"
        aria-label={kind === 'destination' ? t('chat.pickDestination') : t('chat.pickItinerary')}
        onClick={event => event.stopPropagation()}
      >
        <div className="picker__head">
          <h3 className="picker__title">
            {kind === 'destination' ? t('chat.pickDestination') : t('chat.pickItinerary')}
          </h3>
          <button
            type="button"
            className="picker__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="picker__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            autoComplete="off"
            autoFocus
          />
        </div>

        {error && <p className="picker__error">{error}</p>}

        {!loaded && <p className="picker__empty">{t('common.loading')}</p>}

        {loaded && matches.length === 0 && (
          <p className="picker__empty">
            {kind === 'destination' ? t('chat.noDestinations') : t('chat.noItineraries')}
          </p>
        )}

        {loaded && matches.length > 0 && (
          <ul className="picker__list">
            {matches.map(item => {
              const id = item.id
              const checked = selected.includes(id)
              const label = kind === 'destination' ? item.name : item.title
              const image =
                kind === 'destination' && item.images && item.images.length > 0
                  ? item.images[0]
                  : null

              const meta =
                kind === 'destination'
                  ? [item.area, item.region].filter(Boolean).join(', ')
                  : t('chat.itineraryStops', {
                      count: (item.destinations || []).length
                    })

              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`picker__option ${checked ? 'is-checked' : ''}`}
                    onClick={() => toggle(id)}
                    aria-pressed={checked}
                  >
                    <span className="picker__thumb" aria-hidden="true">
                      {image ? (
                        <img src={image} alt="" loading="lazy" />
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          {kind === 'destination' ? (
                            <>
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </>
                          ) : (
                            <>
                              <rect x="3" y="5" width="18" height="16" rx="2" />
                              <path d="M8 3v4M16 3v4M3 11h18" />
                            </>
                          )}
                        </svg>
                      )}
                    </span>

                    <span className="picker__info">
                      <span className="picker__name">{label}</span>
                      <span className="picker__meta">{meta}</span>
                    </span>

                    <span className="picker__check" aria-hidden="true">
                      {checked && (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="picker__actions">
          <span className="picker__count">
            {t('chat.pickerSelected', { count: selected.length })}
          </span>
          <button
            type="button"
            className="picker__confirm"
            onClick={handleConfirm}
            disabled={selected.length === 0}
          >
            {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SharePicker