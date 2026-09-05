import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { getFriends, addFriend, removeFriend } from '../services/friendService.js'
import { getToken } from '../services/tokenStorage.js'
import '../styles/Friends.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

function Friends() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const headerPassed = useHeaderPassed(headerRef)

  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(null)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }

    let active = true

    getFriends()
      .then(response => {
        if (active) setFriends(response.friends || [])
      })
      .catch(err => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = contact.trim()
    if (!trimmed) {
      setError(t('friends.contactRequired'))
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
        setError(t('friends.invalidContact'))
        return
      }
      payload = { number: `+237${digits}` }
    }

    setSubmitting(true)
    try {
      const response = await addFriend(payload)
      setFriends(prev => [...prev, response.friend])
      setContact('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    navigate('/profile')
  }

  async function confirmRemove() {
    const target = pendingRemove
    setPendingRemove(null)
    if (!target) return

    try {
      await removeFriend(target.id)
      setFriends(prev => prev.filter(f => f.id !== target.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="friends">
      <header ref={headerRef} className="page-header friends__header">
        <button
          type="button"
          className="friends__back"
          onClick={handleBack}
          aria-label={t('common.back')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div>
          <h1 className="friends__title">{t('friends.title')}</h1>
          <p className="friends__subtitle">{t('friends.subtitle')}</p>
        </div>
      </header>

      <main className="friends__content">
        <form className="friends__add" onSubmit={handleSubmit}>
          <label htmlFor="friend-contact">{t('friends.addLabel')}</label>
          <div className="friends__add-row">
            <input
              id="friend-contact"
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder={t('friends.addPlaceholder')}
              autoComplete="off"
            />
            <button type="submit" disabled={submitting}>
              {submitting ? t('friends.adding') : t('friends.add')}
            </button>
          </div>
        </form>

        {error && <p className="friends__error">{error}</p>}

        {loading && <PlanetLoader label={t('friends.loading')} size="small" />}

        {!loading && friends.length === 0 && (
          <p className="friends__empty">{t('friends.empty')}</p>
        )}

        {!loading && friends.length > 0 && (
          <ul className="friends__list">
            {friends.map(friend => (
              <li key={friend.id} className="friend-card">
                <span className="friend-card__avatar" aria-hidden="true">
                  {initials(friend.name)}
                </span>

                <span className="friend-card__info">
                  <span className="friend-card__name">{friend.name}</span>
                  <span className="friend-card__contact">
                    {friend.email || friend.number}
                  </span>
                </span>

                <button
                  type="button"
                  className="friend-card__remove"
                  onClick={() => setPendingRemove(friend)}
                  aria-label={t('friends.removeAria', { name: friend.name })}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {pendingRemove && (
        <ConfirmDialog
          title={t('friends.removeTitle')}
          message={t('friends.removeMessage', { name: pendingRemove.name })}
          confirmLabel={t('common.remove')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      <FloatingBackButton visible={headerPassed} onClick={handleBack} />

      <BottomNav />
    </div>
  )
}

export default Friends