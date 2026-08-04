import { useState } from 'react'
import { getBudgetDisplay, getHoursDisplay } from '../utils/destinationDisplay.js'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/RequestDetailModal.css'

const TYPE_KEYS = {
  create: 'request.typeCreate',
  edit: 'request.typeEdit',
  delete: 'request.typeDelete'
}

function formatDate(iso, locale) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildChanges(payload, current, t, language) {
  if (!current) return []
  const changes = []
  const notSet = t('request.notSet')
  const add = (label, before, after) => {
    const beforeText = before || notSet
    const afterText = after || notSet
    if (beforeText !== afterText) {
      changes.push({ label, before: beforeText, after: afterText })
    }
  }

  add(t('changes.name'), current.name, payload.name)
  add(t('changes.country'), current.country, payload.country)
  add(t('changes.region'), current.region, payload.region)
  add(t('changes.area'), current.area, payload.area)
  add(t('changes.type'), current.type, payload.type)
  add(t('changes.tags'), (current.tags || []).join(', '), (payload.tags || []).join(', '))
  add(t('changes.budgetLevel'), current.budget_level, payload.budget_level)
  add(
    t('changes.budget'),
    getBudgetDisplay(current.budget, current.budget_level, t).label,
    getBudgetDisplay(payload.budget, payload.budget_level, t).label
  )
  add(
    t('changes.hours'),
    getHoursDisplay(current.hours, t, language).label,
    getHoursDisplay(payload.hours, t, language).label
  )
  add(t('changes.address'), current.location?.address, payload.location?.address)
  add(t('changes.description'), current.description, payload.description)
  add(t('changes.advice'), current.advice, payload.advice)

  return changes
}

function RequestDetailModal({ request, onClose, onApprove, onReject, onSaveNote, onDelete, submitting = false }) {
  const { t, locale, language } = useTranslation()
  const [activeImage, setActiveImage] = useState(0)
  const [note, setNote] = useState(request.admin_note || '')
  const [noteError, setNoteError] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  function handleNoteChange(e) {
    setNote(e.target.value)
    setNoteSaved(false)
    if (noteError) setNoteError('')
  }

  function handleSaveNote() {
    onSaveNote(request, note.trim())
    setNoteSaved(true)
  }

  function handleRejectClick() {
    const trimmed = note.trim()
    if (!trimmed) {
      setNoteError(t('request.noteRequired'))
      return
    }
    onReject(request, trimmed)
  }

  const display = request.display || {}
  const current = display.current || null
  const images = display.images || []
  const name = display.name || current?.name || t('request.untitled')
  const area = display.area || current?.area || ''
  const type = display.type || current?.type || ''
  const tags = display.tags || current?.tags || []
  const budgetDisplay = getBudgetDisplay(display.budget, display.budget_level, t)
  const hoursDisplay = getHoursDisplay(display.hours, t, language)
  const address = display.location?.address || ''
  const nearbyServices = display.nearby_services || []
  const description = display.description || ''
  const advice = display.advice || ''
  const changes = request.type === 'edit' ? buildChanges(display, current, t, language) : []
  const mainImage = images[activeImage]
  const typeKey = TYPE_KEYS[request.type]

  return (
    <div className="request-modal__backdrop" onClick={submitting ? undefined : onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-label={name} onClick={e => e.stopPropagation()}>
        <div className="request-modal__header">
          <span className={`request-modal__type request-modal__type--${request.type}`}>
            {typeKey ? t(typeKey) : request.type}
          </span>
          <button type="button" className="request-modal__close" aria-label={t('common.close')} onClick={onClose} disabled={submitting}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="request-modal__body">
          <div className="request-modal__gallery">
            {mainImage ? (
              <img src={mainImage} alt={name} className="request-modal__main-image" />
            ) : (
              <div className="request-modal__main-image request-modal__main-image--placeholder" aria-hidden="true" />
            )}
            {images.length > 1 && (
              <div className="request-modal__thumbs">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    className={`request-modal__thumb ${index === activeImage ? 'request-modal__thumb--active' : ''}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <img src={src} alt={t('destinationDetails.photoAlt', { name, number: index + 1 })} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <h2 className="request-modal__name">{name}</h2>
          <p className="request-modal__meta">
            {area}{area && type ? ' · ' : ''}{type}
          </p>
          <p className="request-modal__submitter">
            {t('request.submittedBy', {
              name: request.submitted_by_name,
              date: formatDate(request.created_at, locale)
            })}
          </p>

          {request.type === 'delete' && (
            <p className="request-modal__note">{t('request.deleteNote')}</p>
          )}

          {tags.length > 0 && (
            <ul className="request-modal__tags">
              {tags.map(tag => (
                <li key={tag} className="request-modal__tag">{tag}</li>
              ))}
            </ul>
          )}

          <div className="request-modal__info-grid">
            <div className="request-modal__info-card">
              <span className="request-modal__info-label">{t('destinationDetails.budgetToVisit')}</span>
              <span className="request-modal__info-value">{budgetDisplay.label}</span>
              {budgetDisplay.note && <p className="request-modal__info-note">{budgetDisplay.note}</p>}
            </div>
            <div className="request-modal__info-card">
              <span className="request-modal__info-label">{t('destinationDetails.openingHours')}</span>
              <span className="request-modal__info-value">{hoursDisplay.label}</span>
              {hoursDisplay.note && <p className="request-modal__info-note">{hoursDisplay.note}</p>}
            </div>
          </div>

          {address && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('common.location')}</h3>
              <p className="request-modal__text">{address}</p>
            </div>
          )}

          {description && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('changes.description')}</h3>
              <p className="request-modal__text">{description}</p>
            </div>
          )}

          {nearbyServices.length > 0 && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('form.sectionServices')}</h3>
              <ul className="request-modal__services">
                {nearbyServices.map(service => (
                  <li key={service.name} className="request-modal__service">
                    <span className="request-modal__service-type">{service.type}</span>
                    <span className="request-modal__service-name">{service.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advice && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('destinationDetails.advice')}</h3>
              <p className="request-modal__text">{advice}</p>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('request.noteHeading')}</h3>
              <p className="request-modal__text request-modal__text--muted">
                {t('request.noteHint')}
              </p>
              <textarea
                className="request-modal__note-input"
                rows={3}
                value={note}
                onChange={handleNoteChange}
                placeholder={t('request.notePlaceholder')}
                disabled={submitting}
              />
              {noteError && <p className="request-modal__note-error">{noteError}</p>}
              {noteSaved && !noteError && <p className="request-modal__note-saved">{t('request.noteSaved')}</p>}
              <button
                type="button"
                className="request-modal__note-save"
                onClick={handleSaveNote}
                disabled={submitting || !note.trim()}
              >
                {t('request.saveNote')}
              </button>
            </div>
          )}

          {request.status === 'rejected' && request.admin_note && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('request.rejectionNoteHeading')}</h3>
              <p className="request-modal__text">{request.admin_note}</p>
            </div>
          )}

          {changes.length > 0 && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">{t('request.whatsChanging')}</h3>
              <ul className="request-modal__changes">
                {changes.map(change => (
                  <li key={change.label} className="request-modal__change">
                    <span className="request-modal__change-label">{change.label}</span>
                    <span className="request-modal__change-before">{change.before}</span>
                    <span className="request-modal__change-arrow">→</span>
                    <span className="request-modal__change-after">{change.after}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="request-modal__footer">
          {request.status === 'pending' && (
            <>
              <button type="button" className="request-modal__reject" onClick={handleRejectClick} disabled={submitting}>
                {t('request.reject')}
              </button>
              <button type="button" className="request-modal__approve" onClick={() => onApprove(request)} disabled={submitting}>
                {t('request.accept')}
              </button>
            </>
          )}
          {request.status === 'rejected' && (
            <button type="button" className="request-modal__delete" onClick={() => onDelete(request)} disabled={submitting}>
              {t('common.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestDetailModal