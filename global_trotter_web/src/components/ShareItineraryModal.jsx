import { useEffect, useState } from 'react'
import { shareItinerary, unshareItinerary, getSharedUsers } from '../services/itineraryService.js'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/ShareItineraryModal.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatPhoneNumber(number) {
  if (!number) return ''
  const match = number.match(/^(\+237)(\d{9})$/)
  if (!match) return number
  return `${match[1]} ${match[2]}`
}

function ShareItineraryModal({ itinerary, onClose }) {
  const { t } = useTranslation()
  const [contact, setContact] = useState('')
  const [sharedUsers, setSharedUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    let active = true

    async function loadSharedUsers() {
      setLoadingUsers(true)
      try {
        const response = await getSharedUsers(itinerary.id)
        if (active) setSharedUsers(response.shared_users || [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoadingUsers(false)
      }
    }

    loadSharedUsers()

    return () => {
      active = false
    }
  }, [itinerary.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = contact.trim()
    if (!trimmed) {
      setError(t('share.contactRequired'))
      return
    }

    let payload
    if (trimmed.includes('@')) {
      if (!EMAIL_REGEX.test(trimmed)) {
        setError(t('validation.invalidEmail'))
        return
      }
      payload = { email: trimmed }
    } else {
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length !== 9) {
        setError(t('share.invalidContact'))
        return
      }
      payload = { number: `+237${digits}` }
    }

    setSubmitting(true)
    try {
      const response = await shareItinerary(itinerary.id, payload)
      setSharedUsers(prev => [...prev, response.shared_user])
      setContact('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(userId) {
    setError('')
    setRemovingId(userId)
    try {
      await unshareItinerary(itinerary.id, userId)
      setSharedUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="itinerary-modal__backdrop" onClick={onClose}>
      <div
        className="itinerary-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('share.aria')}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="itinerary-modal__close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="itinerary-modal__heading">
          {t('share.heading', { title: itinerary.title })}
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="itinerary-modal__error">{error}</p>}

          <label htmlFor="share-contact">{t('share.contactLabel')}</label>
          <input
            id="share-contact"
            type="text"
            placeholder={t('share.contactPlaceholder')}
            value={contact}
            onChange={e => setContact(e.target.value)}
          />

          <button type="submit" className="itinerary-modal__submit" disabled={submitting}>
            {submitting ? t('share.submitting') : t('share.submit')}
          </button>
        </form>

        <div className="share-modal__list">
          <p className="share-modal__list-heading">{t('share.listHeading')}</p>

          {loadingUsers && <p className="share-modal__list-status">{t('common.loading')}</p>}

          {!loadingUsers && sharedUsers.length === 0 && (
            <p className="share-modal__list-status">{t('share.none')}</p>
          )}

          {!loadingUsers && sharedUsers.length > 0 && (
            <ul className="share-modal__users">
              {sharedUsers.map(user => (
                <li key={user.id} className="share-modal__user">
                  <div className="share-modal__user-avatar">
                    {(user.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="share-modal__user-info">
                    <span className="share-modal__user-name">{user.name}</span>
                    <span className="share-modal__user-contact">
                      {user.email || formatPhoneNumber(user.number)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="share-modal__user-remove"
                    onClick={() => handleRemove(user.id)}
                    disabled={removingId === user.id}
                    aria-label={t('share.removeAria', { name: user.name })}
                  >
                    {removingId === user.id ? '...' : t('common.remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareItineraryModal