import { useState } from 'react'
import { getBudgetDisplay, getHoursDisplay } from '../utils/destinationDisplay.js'
import '../styles/RequestDetailModal.css'

const TYPE_LABELS = {
  create: 'New destination',
  edit: 'Edit request',
  delete: 'Deletion request'
}

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildChanges(payload, current) {
  if (!current) return []
  const changes = []
  const add = (label, before, after) => {
    const beforeText = before || 'Not set'
    const afterText = after || 'Not set'
    if (beforeText !== afterText) {
      changes.push({ label, before: beforeText, after: afterText })
    }
  }

  add('Name', current.name, payload.name)
  add('Country', current.country, payload.country)
  add('Region', current.region, payload.region)
  add('Area', current.area, payload.area)
  add('Type', current.type, payload.type)
  add('Tags', (current.tags || []).join(', '), (payload.tags || []).join(', '))
  add('Budget level', current.budget_level, payload.budget_level)
  add('Budget', getBudgetDisplay(current.budget, current.budget_level).label, getBudgetDisplay(payload.budget, payload.budget_level).label)
  add('Hours', getHoursDisplay(current.hours).label, getHoursDisplay(payload.hours).label)
  add('Address', current.location?.address, payload.location?.address)
  add('Description', current.description, payload.description)
  add('Advice', current.advice, payload.advice)

  return changes
}

function RequestDetailModal({ request, onClose, onApprove, onReject, onSaveNote, onDelete, submitting = false }) {
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
      setNoteError('Add a note explaining why this request is being rejected.')
      return
    }
    onReject(request, trimmed)
  }

  const display = request.display || {}
  const current = display.current || null
  const images = display.images || []
  const name = display.name || current?.name || 'Untitled destination'
  const area = display.area || current?.area || ''
  const type = display.type || current?.type || ''
  const tags = display.tags || current?.tags || []
  const budgetDisplay = getBudgetDisplay(display.budget, display.budget_level)
  const hoursDisplay = getHoursDisplay(display.hours)
  const address = display.location?.address || ''
  const nearbyServices = display.nearby_services || []
  const description = display.description || ''
  const advice = display.advice || ''
  const changes = request.type === 'edit' ? buildChanges(display, current) : []
  const mainImage = images[activeImage]

  return (
    <div className="request-modal__backdrop" onClick={submitting ? undefined : onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-label={name} onClick={e => e.stopPropagation()}>
        <div className="request-modal__header">
          <span className={`request-modal__type request-modal__type--${request.type}`}>
            {TYPE_LABELS[request.type] || request.type}
          </span>
          <button type="button" className="request-modal__close" aria-label="Close" onClick={onClose} disabled={submitting}>
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
                    <img src={src} alt={`${name} photo ${index + 1}`} />
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
            Submitted by {request.submitted_by_name} on {formatDate(request.created_at)}
          </p>

          {request.type === 'delete' && (
            <p className="request-modal__note">This user is requesting to delete this published destination.</p>
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
              <span className="request-modal__info-label">Budget to visit</span>
              <span className="request-modal__info-value">{budgetDisplay.label}</span>
              {budgetDisplay.note && <p className="request-modal__info-note">{budgetDisplay.note}</p>}
            </div>
            <div className="request-modal__info-card">
              <span className="request-modal__info-label">Opening hours</span>
              <span className="request-modal__info-value">{hoursDisplay.label}</span>
              {hoursDisplay.note && <p className="request-modal__info-note">{hoursDisplay.note}</p>}
            </div>
          </div>

          {address && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">Location</h3>
              <p className="request-modal__text">{address}</p>
            </div>
          )}

          {description && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">Description</h3>
              <p className="request-modal__text">{description}</p>
            </div>
          )}

          {nearbyServices.length > 0 && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">Nearby services</h3>
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
              <h3 className="request-modal__section-title">Advice</h3>
              <p className="request-modal__text">{advice}</p>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">Note to submitter</h3>
              <p className="request-modal__text request-modal__text--muted">
                Let the user know what to fix or confirm to get this published. Required if you reject.
              </p>
              <textarea
                className="request-modal__note-input"
                rows={3}
                value={note}
                onChange={handleNoteChange}
                placeholder="e.g. Please add a clearer main photo and double-check the opening hours."
                disabled={submitting}
              />
              {noteError && <p className="request-modal__note-error">{noteError}</p>}
              {noteSaved && !noteError && <p className="request-modal__note-saved">Note saved.</p>}
              <button
                type="button"
                className="request-modal__note-save"
                onClick={handleSaveNote}
                disabled={submitting || !note.trim()}
              >
                Save note
              </button>
            </div>
          )}

          {request.status === 'rejected' && request.admin_note && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">Rejection note</h3>
              <p className="request-modal__text">{request.admin_note}</p>
            </div>
          )}

          {changes.length > 0 && (
            <div className="request-modal__section">
              <h3 className="request-modal__section-title">What's changing</h3>
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
                Reject
              </button>
              <button type="button" className="request-modal__approve" onClick={() => onApprove(request)} disabled={submitting}>
                Accept
              </button>
            </>
          )}
          {request.status === 'rejected' && (
            <button type="button" className="request-modal__delete" onClick={() => onDelete(request)} disabled={submitting}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestDetailModal