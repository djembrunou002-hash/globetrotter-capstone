import { useState } from 'react'
import '../styles/DestinationManageCard.css'

const STATUS_LABELS = {
  published: { label: 'Published', tone: 'success' },
  pending_review: { label: 'Pending review', tone: 'pending' },
  rejected: { label: 'Rejected', tone: 'danger' },
  pending_edit: { label: 'Edit pending review', tone: 'pending' },
  pending_delete: { label: 'Deletion pending review', tone: 'pending' },
  deleted: { label: 'Deleted', tone: 'danger' },
  edited: { label: 'Edited by admin', tone: 'info' }
}

function DestinationManageCard({
  destination,
  onEdit,
  onDelete,
  onAcknowledge,
  deleteLabel = 'Delete',
  editDisabled = false,
  deleteDisabled = false
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = destination.images && destination.images[0]
  const status = STATUS_LABELS[destination.status] || null

  return (
    <article className="manage-card">
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
        {status && destination.status !== 'edited' && (
          <span className={`manage-card__status manage-card__status--${status.tone}`}>{status.label}</span>
        )}
        {destination.status === 'edited' && (
          <div className="manage-card__notice">
            An admin edited this spot's details.
            {onAcknowledge && (
              <button type="button" className="manage-card__notice-dismiss" onClick={() => onAcknowledge(destination)}>
                Got it
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

        <div className="manage-card__actions">
          {onEdit && (
            <button type="button" className="manage-card__edit" onClick={() => onEdit(destination)} disabled={editDisabled}>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="manage-card__delete"
              onClick={() => onDelete(destination)}
              disabled={deleteDisabled}
            >
              {deleteLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default DestinationManageCard