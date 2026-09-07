import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/NewChatModal.css'

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

function NewChatModal({ friends, loading = false, onSelect, onClose }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return friends

    return friends.filter(friend => {
      const email = (friend.email || '').toLowerCase()
      const name = (friend.name || '').toLowerCase()
      const number = friend.number || ''
      return email.includes(term) || name.includes(term) || number.includes(term)
    })
  }, [friends, query])

  return (
    <div className="new-chat__backdrop" onClick={onClose}>
      <div
        className="new-chat"
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.newChatTitle')}
        onClick={event => event.stopPropagation()}
      >
        <div className="new-chat__head">
          <h3 className="new-chat__title">{t('chat.newChatTitle')}</h3>
          <button type="button" className="new-chat__close" onClick={onClose} aria-label={t('common.close')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="new-chat__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('chat.searchFriends')}
            aria-label={t('chat.searchFriends')}
            autoComplete="off"
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="new-chat__clear"
              onClick={() => setQuery('')}
              aria-label={t('common.clearSearch')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        {loading && <p className="new-chat__empty">{t('common.loading')}</p>}

        {!loading && friends.length === 0 && (
          <p className="new-chat__empty">{t('chat.noFriends')}</p>
        )}

        {!loading && friends.length > 0 && matches.length === 0 && (
          <p className="new-chat__empty">{t('chat.noFriendMatches')}</p>
        )}

        {!loading && matches.length > 0 && (
          <ul className="new-chat__list">
            {matches.map(friend => (
              <li key={friend.id}>
                <button type="button" className="new-chat__option" onClick={() => onSelect(friend)}>
                  <span className="new-chat__avatar" aria-hidden="true">
                    {initials(friend.name)}
                  </span>

                  <span className="new-chat__info">
                    <span className="new-chat__name">{friend.name}</span>
                    <span className="new-chat__contact">{friend.email || friend.number}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default NewChatModal