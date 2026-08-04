import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/DestinationManageCard.css'

const STATUS_TONES = {
  published: 'success',
  pending_review: 'pending',
  rejected: 'danger',
  pending_edit: 'pending',
  pending_delete: 'pending',
  deleted: 'danger',
  edited: 'info'
}

function DestinationManageCard({
  destination,
  onEdit,
  onDelete,
  onAcknowledge,
  onView,
  deleteLabel,
  editDisabled = false,
  deleteDisabled = false
}) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const image = destination.images && destination.images[0]
  const tone = STATUS_TONES[destination.status] || null

  function handleCardClick() {
    if (onView) onView(destination)
  }

  function handleCardKeyDown(e) {
    if (!onView) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView(destination)
    }
  }

  return (
    <article
      className={`manage-card ${onView ? 'manage-card--clickable' : ''}`}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView ? handleCardClick : undefined}
      onKeyDown={onView ? handleCardKeyDown : undefined}
    >
      <div className="manage-card__image-wrap">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={destination.name}
            className="manage-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="manage-card__image manage-card__image--placeholder" aria-hidden="true" />
        )}
        {tone && destination.status !== 'edited' && (
          <span className={`manage-card__status manage-card__status--${tone}`}>
            {t(`status.${destination.status}`)}
          </span>
        )}
        {destination.status === 'edited' && (
          <div className="manage-card__notice">
            {t('manage.adminEdited')}
            {onAcknowledge && (
              <button
                type="button"
                className="manage-card__notice-dismiss"
                onClick={e => {
                  e.stopPropagation()
                  onAcknowledge(destination)
                }}
              >
                {t('manage.gotIt')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="manage-card__body">
        <h3 className="manage-card__name">{destination.name}</h3>
        <p className="manage-card__meta">
          {destination.area} · {destination.type}
        </p>

        {destination.admin_note && (
          <p className={`manage-card__admin-note ${destination.status === 'rejected' ? 'manage-card__admin-note--danger' : ''}`}>
            {destination.status === 'rejected' ? t('manage.rejectionNote') : t('manage.noteSent')}
          </p>
        )}

        <div className="manage-card__actions" onClick={e => e.stopPropagation()}>
          {onEdit && (
            <button type="button" className="manage-card__edit" onClick={() => onEdit(destination)} disabled={editDisabled}>
              {t('common.edit')}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="manage-card__delete"
              onClick={() => onDelete(destination)}
              disabled={deleteDisabled}
            >
              {deleteLabel || t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default DestinationManageCard