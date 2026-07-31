import { useState } from 'react'
import '../styles/PendingRequestCard.css'

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

function PendingRequestCard({ request, onApprove, onReject, onDelete, submitting = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  const display = request.display || {}
  const name = display.name || display.current?.name || 'Untitled destination'
  const area = display.area || display.current?.area || ''
  const type = display.type || display.current?.type || ''
  const image = (display.images && display.images[0]) || (display.current?.images && display.current.images[0])

  return (
    <article className="pending-card">
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
          {TYPE_LABELS[request.type] || request.type}
        </span>
        {request.status === 'rejected' && <span className="pending-card__rejected">Rejected</span>}
      </div>

      <div className="pending-card__body">
        <h3 className="pending-card__name">{name}</h3>
        <p className="pending-card__meta">
          {area}{area && type ? ' · ' : ''}{type}
        </p>
        <p className="pending-card__submitter">
          Submitted by {request.submitted_by_name} on {formatDate(request.created_at)}
        </p>

        {request.type === 'delete' && (
          <p className="pending-card__note">This user is requesting to delete this published destination.</p>
        )}

        <div className="pending-card__actions">
          {request.status === 'pending' && (
            <>
              <button
                type="button"
                className="pending-card__reject"
                onClick={() => onReject(request)}
                disabled={submitting}
              >
                Reject
              </button>
              <button
                type="button"
                className="pending-card__approve"
                onClick={() => onApprove(request)}
                disabled={submitting}
              >
                Accept
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
              Remove
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default PendingRequestCard