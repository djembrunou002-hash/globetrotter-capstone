import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { inviteLink } from '../services/groupService.js'
import '../styles/GroupPanel.css'

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }

  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()

    try {
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      if (ok) resolve()
      else reject(new Error('copy failed'))
    } catch (err) {
      document.body.removeChild(area)
      reject(err)
    }
  })
}

function GroupPanel({
  group,
  friends,
  busy = false,
  error = '',
  onAddMember,
  onRemoveMember,
  onToggleAdmin,
  onUpdateSettings,
  onRotateInvite,
  onRename,
  onLeave,
  onClose
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [name, setName] = useState(group.name)
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(timer)
  }, [copied])

  const memberIds = useMemo(() => group.members.map(member => member.id), [group.members])

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase()
    const available = friends.filter(friend => !memberIds.includes(friend.id))
    if (!term) return available

    return available.filter(friend => {
      const email = (friend.email || '').toLowerCase()
      const label = (friend.name || '').toLowerCase()
      const number = friend.number || ''
      return email.includes(term) || label.includes(term) || number.includes(term)
    })
  }, [friends, memberIds, query])

  function handleCopy() {
    const link = inviteLink(group.invite_token)
    if (!link) return

    setCopyError('')
    copyText(link)
      .then(() => setCopied(true))
      .catch(() => setCopyError(link))
  }

  function handleRename() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === group.name) {
      setEditingName(false)
      setName(group.name)
      return
    }

    onRename(trimmed)
    setEditingName(false)
  }

  return (
    <div className="group-panel__backdrop" onClick={onClose}>
      <aside
        className="group-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.groupSettings')}
        onClick={event => event.stopPropagation()}
      >
        <header className="group-panel__head">
          <h3 className="group-panel__title">{t('chat.groupSettings')}</h3>
          <button
            type="button"
            className="group-panel__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="group-panel__body">
          <section className="group-panel__identity">
            <span className="group-panel__avatar" aria-hidden="true">
              {initials(group.name)}
            </span>

            {editingName ? (
              <div className="group-panel__rename">
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  maxLength={60}
                  aria-label={t('chat.groupNameLabel')}
                  autoFocus
                />
                <button type="button" onClick={handleRename} disabled={busy}>
                  {t('common.save')}
                </button>
              </div>
            ) : (
              <div className="group-panel__identity-text">
                <span className="group-panel__name">{group.name}</span>
                <span className="group-panel__count">
                  {t('chat.groupMemberCount', { count: group.member_count })}
                </span>
              </div>
            )}

            {group.is_admin && !editingName && (
              <button
                type="button"
                className="group-panel__icon-button"
                onClick={() => setEditingName(true)}
                aria-label={t('chat.renameGroup')}
                title={t('chat.renameGroup')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            )}
          </section>

          {error && <p className="group-panel__error">{error}</p>}

          {group.can_invite && (
            <section className="group-panel__section">
              <h4 className="group-panel__section-title">{t('chat.inviteLinkTitle')}</h4>

              <div className="group-panel__invite">
                <button type="button" className="group-panel__link" onClick={handleCopy}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
                    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
                  </svg>
                  {copied ? t('chat.linkCopied') : t('chat.copyLink')}
                </button>

                {group.is_owner && (
                  <button
                    type="button"
                    className="group-panel__reset"
                    onClick={onRotateInvite}
                    disabled={busy}
                  >
                    {t('chat.resetLink')}
                  </button>
                )}
              </div>

              {copyError && <p className="group-panel__fallback">{copyError}</p>}
            </section>
          )}

          {group.can_invite && (
            <section className="group-panel__section">
              <h4 className="group-panel__section-title">{t('chat.addFromApp')}</h4>

              <div className="group-panel__search">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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

              {candidates.length === 0 ? (
                <p className="group-panel__empty">{t('chat.noOneToAdd')}</p>
              ) : (
                <ul className="group-panel__list">
                  {candidates.map(friend => (
                    <li key={friend.id} className="group-panel__row">
                      <span className="group-panel__row-avatar" aria-hidden="true">
                        {initials(friend.name)}
                      </span>
                      <span className="group-panel__row-info">
                        <span className="group-panel__row-name">{friend.name}</span>
                        <span className="group-panel__row-meta">{friend.email || friend.number}</span>
                      </span>
                      <button
                        type="button"
                        className="group-panel__add"
                        onClick={() => onAddMember(friend.id)}
                        disabled={busy}
                      >
                        {t('chat.addMember')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {group.is_admin && (
            <section className="group-panel__section">
              <h4 className="group-panel__section-title">{t('chat.restrictionsTitle')}</h4>

              <label className="group-panel__toggle">
                <input
                  type="checkbox"
                  checked={group.settings.restrict_invites}
                  onChange={event => onUpdateSettings({ restrict_invites: event.target.checked })}
                  disabled={busy}
                />
                <span className="group-panel__toggle-text">
                  <span className="group-panel__toggle-label">{t('chat.restrictInvites')}</span>
                  <span className="group-panel__toggle-hint">{t('chat.restrictInvitesHint')}</span>
                </span>
              </label>

              <label className="group-panel__toggle">
                <input
                  type="checkbox"
                  checked={group.settings.admins_only_messages}
                  onChange={event =>
                    onUpdateSettings({ admins_only_messages: event.target.checked })
                  }
                  disabled={busy}
                />
                <span className="group-panel__toggle-text">
                  <span className="group-panel__toggle-label">{t('chat.adminsOnly')}</span>
                  <span className="group-panel__toggle-hint">{t('chat.adminsOnlyHint')}</span>
                </span>
              </label>
            </section>
          )}

          <section className="group-panel__section">
            <h4 className="group-panel__section-title">
              {t('chat.membersTitle')}
              <span className="group-panel__badge">{group.member_count}</span>
            </h4>

            <ul className="group-panel__list">
              {group.members.map(member => (
                <li key={member.id} className="group-panel__row">
                  <span className="group-panel__row-avatar" aria-hidden="true">
                    {initials(member.name)}
                  </span>

                  <span className="group-panel__row-info">
                    <span className="group-panel__row-name">
                      {member.name}
                      {member.is_owner && (
                        <span className="group-panel__role">{t('chat.roleOwner')}</span>
                      )}
                      {!member.is_owner && member.is_admin && (
                        <span className="group-panel__role">{t('chat.roleAdmin')}</span>
                      )}
                    </span>
                    <span className="group-panel__row-meta">{member.email || member.number}</span>
                  </span>

                  <span className="group-panel__row-actions">
                    {group.is_owner && !member.is_owner && (
                      <button
                        type="button"
                        className="group-panel__ghost"
                        onClick={() => onToggleAdmin(member.id, !member.is_admin)}
                        disabled={busy}
                      >
                        {member.is_admin ? t('chat.revokeAdmin') : t('chat.makeAdmin')}
                      </button>
                    )}

                    {group.is_admin && !member.is_owner && (
                      <button
                        type="button"
                        className="group-panel__ghost group-panel__ghost--danger"
                        onClick={() => onRemoveMember(member.id)}
                        disabled={busy}
                        aria-label={t('chat.removeMember')}
                        title={t('chat.removeMember')}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <button type="button" className="group-panel__leave" onClick={onLeave} disabled={busy}>
            {t('chat.leaveGroup')}
          </button>
        </div>
      </aside>
    </div>
  )
}

export default GroupPanel