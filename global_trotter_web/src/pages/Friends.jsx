import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import UserSearchField from '../components/UserSearchField.jsx'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import { useTranslation } from '../hooks/useTranslation.js'
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend
} from '../services/friendService.js'
import { searchUsers } from '../services/userService.js'
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
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [tab, setTab] = useState('friends')

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }

    let active = true

    Promise.all([getFriends(), getFriendRequests()])
      .then(([friendsResponse, requestsResponse]) => {
        if (!active) return
        setFriends(friendsResponse.friends || [])
        setIncoming(requestsResponse.incoming || [])
        setOutgoing(requestsResponse.outgoing || [])
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

  function handleBack() {
    navigate('/profile')
  }

  function lookup(query) {
    return searchUsers(query)
      .then(response => response.results || [])
      .catch(() => [])
  }

  function relationLabel(user) {
    if (user.relation === 'friend') return t('friends.relationFriend')
    if (user.relation === 'incoming') return t('friends.relationIncoming')
    if (user.relation === 'outgoing') return t('friends.relationOutgoing')
    return null
  }

  function handlePick(user) {
    setError('')
    setNotice('')
    setContact(user.email || user.number || '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

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
      const response = await sendFriendRequest(payload)

      if (response.friend) {
        setFriends(prev => [...prev, response.friend])
        setIncoming(prev => prev.filter(r => r.user.id !== response.friend.id))
        setNotice(t('friends.acceptedNotice', { name: response.friend.name }))
      } else if (response.request) {
        setOutgoing(prev => [...prev, response.request])
        setNotice(t('friends.requestSent', { name: response.request.user.name }))
        setTab('requests')
      }

      setContact('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAccept(entry) {
    setError('')
    setBusyId(entry.id)
    try {
      const response = await acceptFriendRequest(entry.id)
      setFriends(prev => [...prev, response.friend])
      setIncoming(prev => prev.filter(r => r.id !== entry.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(entry) {
    setError('')
    setBusyId(entry.id)
    try {
      await declineFriendRequest(entry.id)
      setIncoming(prev => prev.filter(r => r.id !== entry.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
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
            <UserSearchField
              id="friend-contact"
              value={contact}
              onChange={setContact}
              onSelect={handlePick}
              search={lookup}
              placeholder={t('friends.addPlaceholder')}
              renderMeta={relationLabel}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? t('friends.sending') : t('friends.sendRequest')}
            </button>
          </div>
        </form>

        {error && <p className="friends__error">{error}</p>}
        {notice && <p className="friends__notice">{notice}</p>}

        <div className="friends__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'friends'}
            className={`friends__tab ${tab === 'friends' ? 'is-active' : ''}`}
            onClick={() => setTab('friends')}
          >
            {t('friends.tabFriends')}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'requests'}
            className={`friends__tab ${tab === 'requests' ? 'is-active' : ''}`}
            onClick={() => setTab('requests')}
          >
            {t('friends.tabRequests')}
            {incoming.length > 0 && <span className="friends__dot" aria-hidden="true" />}
          </button>
        </div>

        {loading && <PlanetLoader label={t('friends.loading')} size="small" />}

        {!loading && tab === 'requests' && incoming.length > 0 && (
          <section className="friends__section">
            <h2 className="friends__section-title">
              {t('friends.incomingHeading')}
              <span className="friends__count">{incoming.length}</span>
            </h2>

            <ul className="friends__grid">
              {incoming.map(entry => (
                <li key={entry.id} className="friend-card friend-card--request">
                  <span className="friend-card__avatar" aria-hidden="true">
                    {initials(entry.user.name)}
                  </span>

                  <span className="friend-card__info">
                    <span className="friend-card__name">{entry.user.name}</span>
                    <span className="friend-card__contact">
                      {entry.user.email || entry.user.number}
                    </span>
                  </span>

                  <span className="friend-card__actions">
                    <button
                      type="button"
                      className="friend-card__accept"
                      onClick={() => handleAccept(entry)}
                      disabled={busyId === entry.id}
                    >
                      {t('friends.accept')}
                    </button>
                    <button
                      type="button"
                      className="friend-card__action"
                      onClick={() => handleDecline(entry)}
                      disabled={busyId === entry.id}
                    >
                      {t('friends.decline')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && tab === 'friends' && (
          <section className="friends__section">
            <h2 className="friends__section-title">
              {t('friends.listHeading')}
              {friends.length > 0 && <span className="friends__count">{friends.length}</span>}
            </h2>

            {friends.length === 0 ? (
              <p className="friends__empty">{t('friends.empty')}</p>
            ) : (
              <ul className="friends__grid">
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

                    <span className="friend-card__actions">
                      <button
                        type="button"
                        className="friend-card__action friend-card__action--danger"
                        onClick={() => setPendingRemove(friend)}
                      >
                        {t('common.remove')}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!loading && tab === 'requests' && incoming.length === 0 && outgoing.length === 0 && (
          <p className="friends__empty">{t('friends.noRequests')}</p>
        )}

        {!loading && tab === 'requests' && outgoing.length > 0 && (
          <section className="friends__section">
            <h2 className="friends__section-title">{t('friends.outgoingHeading')}</h2>
            <ul className="friends__grid">
              {outgoing.map(entry => (
                <li key={entry.id} className="friend-card friend-card--muted">
                  <span className="friend-card__avatar" aria-hidden="true">
                    {initials(entry.user.name)}
                  </span>
                  <span className="friend-card__info">
                    <span className="friend-card__name">{entry.user.name}</span>
                    <span className="friend-card__contact">{t('friends.awaiting')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
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