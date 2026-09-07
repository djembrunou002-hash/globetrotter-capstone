import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/NewGroupModal.css'

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

function NewGroupModal({ friends, loading = false, submitting = false, error = '', onCreate, onClose }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !submitting) onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return friends

    return friends.filter(friend => {
      const email = (friend.email || '').toLowerCase()
      const label = (friend.name || '').toLowerCase()
      const number = friend.number || ''
      return email.includes(term) || label.includes(term) || number.includes(term)
    })
  }, [friends, query])

  function toggle(friendId) {
    setSelected(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    )
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || submitting) return
    onCreate(trimmed, selected)
  }

  return (
    <div className="new-group__backdrop" onClick={submitting ? undefined : onClose}>
      <div
        className="new-group"
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.newGroupTitle')}
        onClick={event => event.stopPropagation()}
      >
        <div className="new-group__head">
          <h3 className="new-group__title">{t('chat.newGroupTitle')}</h3>
          <button
            type="button"
            className="new-group__close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <label className="new-group__label" htmlFor="group-name">
          {t('chat.groupNameLabel')}
        </label>
        <input
          id="group-name"
          className="new-group__name"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={t('chat.groupNamePlaceholder')}
          maxLength={60}
          autoComplete="off"
          autoFocus
        />

        <p className="new-group__hint">{t('chat.groupMembersHint')}</p>

        <div className="new-group__search">
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
          />
        </div>

        {loading && <p className="new-group__empty">{t('common.loading')}</p>}

        {!loading && friends.length === 0 && (
          <p className="new-group__empty">{t('chat.noFriends')}</p>
        )}

        {!loading && friends.length > 0 && matches.length === 0 && (
          <p className="new-group__empty">{t('chat.noFriendMatches')}</p>
        )}

        {!loading && matches.length > 0 && (
          <ul className="new-group__list">
            {matches.map(friend => {
              const checked = selected.includes(friend.id)
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    className={`new-group__option ${checked ? 'is-checked' : ''}`}
                    onClick={() => toggle(friend.id)}
                    aria-pressed={checked}
                  >
                    <span className="new-group__avatar" aria-hidden="true">
                      {initials(friend.name)}
                    </span>

                    <span className="new-group__info">
                      <span className="new-group__name-text">{friend.name}</span>
                      <span className="new-group__contact">{friend.email || friend.number}</span>
                    </span>

                    <span className="new-group__check" aria-hidden="true">
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

        {error && <p className="new-group__error">{error}</p>}

        <div className="new-group__actions">
          <span className="new-group__count">
            {t('chat.groupSelected', { count: selected.length })}
          </span>
          <button
            type="button"
            className="new-group__create"
            onClick={handleCreate}
            disabled={submitting || !name.trim()}
          >
            {submitting ? t('chat.creatingGroup') : t('chat.createGroup')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewGroupModal