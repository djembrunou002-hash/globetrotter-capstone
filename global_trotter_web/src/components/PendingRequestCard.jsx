import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/PendingRequestCard.css'

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

function PendingRequestCard({ request, onView, onApprove, onReject, onDelete, submitting = false }) {
  const { t, locale } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const display = request.display || {}
  const name = display.name || display.current?.name || t('request.untitled')
  const area = display.area || display.current?.area || ''
  const type = display.type || display.current?.type || ''
  const image = (display.images && display.images[0]) || (display.current?.images && display.current.images[0])
  const typeKey = TYPE_KEYS[request.type]

  function handleCardClick() {
    if (onView) onView(request)
  }

  function handleCardKeyDown(e) {
    if (!onView) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView(request)
    }
  }

  return (
    <article
      className={`pending-card ${onView ? 'pending-card--clickable' : ''}`}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView ? handleCardClick : undefined}
      onKeyDown={onView ? handleCardKeyDown : undefined}
    >
      <div className="pending-card__image-wrap">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={name}
            className="pending-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="pending-card__image pending-card__image--placeholder" aria-hidden="true" />
        )}
        <span className={`pending-card__type pending-card__type--${request.type}`}>
          {typeKey ? t(typeKey) : request.type}
        </span>
        {request.status === 'rejected' && <span className="pending-card__rejected">{t('status.rejected')}</span>}
      </div>

      <div className="pending-card__body">
        <h3 className="pending-card__name">{name}</h3>
        <p className="pending-card__meta">
          {area}{area && type ? ' · ' : ''}{type}
        </p>
        <p className="pending-card__submitter">
          {t('request.submittedBy', {
            name: request.submitted_by_name,
            date: formatDate(request.created_at, locale)
          })}
        </p>

        {request.type === 'delete' && (
          <p className="pending-card__note">{t('request.deleteNote')}</p>
        )}

        <div className="pending-card__actions" onClick={e => e.stopPropagation()}>
          {request.status === 'pending' && (
            <>
              <button
                type="button"
                className="pending-card__reject"
                onClick={() => onReject(request)}
                disabled={submitting}
              >
                {t('request.reviewAndReject')}
              </button>
              <button
                type="button"
                className="pending-card__approve"
                onClick={() => onApprove(request)}
                disabled={submitting}
              >
                {t('request.accept')}
              </button>
            </>
          )}
          {request.status === 'rejected' && (
            <button
              type="button"
              className="pending-card__delete"
              onClick={() => onDelete(request)}
              disabled={submitting}
            >
              {t('common.remove')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default PendingRequestCard