import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getMyDestinations, requestDestinationDelete, discardSubmission } from '../services/myDestinationService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import StarRating from '../components/Starrating.jsx'
import ConfirmDialog from '../components/Confirmdialog.jsx'
import CommentSection from '../components/CommentSection.jsx'
import { getBudgetDisplay, getHoursDisplay } from '../utils/destinationDisplay.js'
import '../styles/DestinationDetails.css'
import '../styles/MyDestinationDetails.css'

const STATUS_LABELS = {
  published: { label: 'Published', tone: 'success' },
  pending_review: { label: 'Pending review', tone: 'pending' },
  rejected: { label: 'Rejected', tone: 'danger' },
  pending_edit: { label: 'Edit pending review', tone: 'pending' },
  pending_delete: { label: 'Deletion pending review', tone: 'pending' },
  deleted: { label: 'Deleted', tone: 'danger' },
  edited: { label: 'Edited by admin', tone: 'info' }
}

const EDITABLE_STATUSES = ['published', 'edited', 'pending_edit']
const DISCARDABLE_STATUSES = ['rejected', 'deleted']
const CANCELABLE_STATUSES = ['pending_review', 'pending_edit', 'pending_delete']
const MAP_ELIGIBLE_STATUSES = ['published', 'edited', 'pending_edit', 'pending_delete']

const CANCEL_LABELS = {
  pending_review: 'Cancel submission',
  pending_edit: 'Cancel edit',
  pending_delete: 'Cancel deletion'
}

const CANCEL_MESSAGES = {
  pending_review: 'This will withdraw your submission. You can add it again anytime.',
  pending_edit: 'This will cancel your pending edit. The destination stays as it is now published.',
  pending_delete: 'This will cancel your pending deletion request. The destination stays published.'
}

function ExtraPhoto({ src, alt }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="destination-details__extra-photo destination-details__extra-photo--placeholder" aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={alt}
      className="destination-details__extra-photo"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function MyDestinationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [destination, setDestination] = useState(location.state?.destination || null)
  const [loading, setLoading] = useState(!location.state?.destination)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }
    if (destination) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await getMyDestinations()
        const found = response.destinations.find(d => d.id === id)
        if (!cancelled) setDestination(found || null)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleBack() {
    navigate(-1)
  }

  function handleEdit() {
    navigate(`/my-destinations/${destination.id}/edit`)
  }

  function handleDeleteClick() {
    setDialogError('')
    if (DISCARDABLE_STATUSES.includes(destination.status)) {
      setPendingAction('discard')
    } else if (CANCELABLE_STATUSES.includes(destination.status)) {
      setPendingAction('cancel')
    } else {
      setPendingAction('delete')
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    setSubmitting(true)
    setDialogError('')
    try {
      if (pendingAction === 'discard' || pendingAction === 'cancel') {
        await discardSubmission(destination.request_id)
      } else {
        await requestDestinationDelete(destination.id)
      }
      setPendingAction(null)
      navigate('/my-destinations')
    } catch (err) {
      setDialogError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAcknowledgeEdit() {
    try {
      await discardSubmission(destination.request_id)
      navigate('/my-destinations')
    } catch (err) {
      setError(err.message)
    }
  }

  const status = destination ? STATUS_LABELS[destination.status] : null
  const editDisabled = destination ? !EDITABLE_STATUSES.includes(destination.status) : true
  const canDelete = destination
    ? EDITABLE_STATUSES.includes(destination.status) ||
      DISCARDABLE_STATUSES.includes(destination.status) ||
      CANCELABLE_STATUSES.includes(destination.status)
    : false
  const deleteLabel = destination
    ? CANCELABLE_STATUSES.includes(destination.status)
      ? CANCEL_LABELS[destination.status]
      : DISCARDABLE_STATUSES.includes(destination.status)
        ? 'Discard'
        : 'Delete'
    : 'Delete'
  const canViewOnMap = destination ? MAP_ELIGIBLE_STATUSES.includes(destination.status) : false

  const image = destination?.images && destination.images[0]
  const extraPhotos = destination?.images ? destination.images.slice(1, 4) : []
  const budgetDisplay = destination ? getBudgetDisplay(destination.budget, destination.budget_level) : null
  const hoursDisplay = destination ? getHoursDisplay(destination.hours) : null
  const nearbyServices = destination?.nearby_services || []
  const advice = destination?.advice && destination.advice.trim() ? destination.advice : 'No advice.'

  return (
    <div className="destination-details">
      <header className="destination-details__header">
        <button
          type="button"
          className="destination-details__back"
          aria-label="Go back"
          onClick={handleBack}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
      </header>

      <main className="destination-details__content destination-details__content--with-bottom-nav">
        {loading && <p className="destination-details__status">Loading destination...</p>}
        {error && <p className="destination-details__status destination-details__status--error">{error}</p>}

        {!loading && !error && !destination && (
          <p className="destination-details__status">Destination not found.</p>
        )}

        {!loading && !error && destination && (
          <>
            <div className="destination-details__image-wrap">
              {image && !imageFailed ? (
                <img
                  src={image}
                  alt={destination.name}
                  className="destination-details__image"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  className="destination-details__image destination-details__image--placeholder"
                  aria-hidden="true"
                />
              )}
              <span
                className={`destination-details__budget destination-details__budget--${destination.budget_level}`}
              >
                {budgetDisplay.label}
              </span>
              {status && (
                <span className={`my-destination-details__status-badge my-destination-details__status-badge--${status.tone}`}>
                  {status.label}
                </span>
              )}
            </div>

            <div className="destination-details__body">
              {destination.status === 'edited' && (
                <div className="my-destination-details__notice">
                  An admin edited this spot's details.
                  <button type="button" className="my-destination-details__notice-dismiss" onClick={handleAcknowledgeEdit}>
                    Got it
                  </button>
                </div>
              )}

              {destination.admin_note && (
                <div
                  className={`my-destination-details__notice ${
                    destination.status === 'rejected' ? 'my-destination-details__notice--danger' : ''
                  }`}
                >
                  <span>
                    <strong>{destination.status === 'rejected' ? 'Why it was rejected: ' : 'Admin note: '}</strong>
                    {destination.admin_note}
                  </span>
                </div>
              )}

              <h1 className="destination-details__name">{destination.name}</h1>
              <p className="destination-details__meta">
                {destination.area} · {destination.type}
              </p>

              {destination.tags && destination.tags.length > 0 && (
                <ul className="destination-details__tags">
                  {destination.tags.map(tag => (
                    <li key={tag} className="destination-details__tag">{tag}</li>
                  ))}
                </ul>
              )}

              <StarRating
                average={destination.rating?.average || 0}
                count={destination.rating?.count || 0}
                readOnly
              />

              <div className="destination-details__actions">
                {canViewOnMap && (
                  <button
                    type="button"
                    className="destination-details__location"
                    onClick={() => navigate(`/map?destination=${destination.id}`)}
                    title="View on map"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    Location
                  </button>
                )}

                {!editDisabled && (
                  <button type="button" className="my-destination-details__edit" onClick={handleEdit}>
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button type="button" className="my-destination-details__delete" onClick={handleDeleteClick}>
                    {deleteLabel}
                  </button>
                )}
              </div>

              <div className="destination-details__info-grid">
                <div className="destination-details__info-card">
                  <span className="destination-details__info-label">Budget to visit</span>
                  <span className="destination-details__info-value">{budgetDisplay.label}</span>
                  {budgetDisplay.note && (
                    <p className="destination-details__info-note">{budgetDisplay.note}</p>
                  )}
                </div>

                <div className="destination-details__info-card">
                  <span className="destination-details__info-label">Opening hours</span>
                  <span className="destination-details__info-value">{hoursDisplay.label}</span>
                  {hoursDisplay.note && (
                    <p className="destination-details__info-note">{hoursDisplay.note}</p>
                  )}
                </div>
              </div>

              {destination.description && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">About this place</h2>
                  <p className="destination-details__description">{destination.description}</p>
                </div>
              )}

              {extraPhotos.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">More photos</h2>
                  <div className="destination-details__photo-grid">
                    {extraPhotos.map((src, index) => (
                      <ExtraPhoto key={src} src={src} alt={`${destination.name} photo ${index + 2}`} />
                    ))}
                  </div>
                </div>
              )}

              {nearbyServices.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">Good to know nearby</h2>
                  <ul className="destination-details__services">
                    {nearbyServices.map(service => (
                      <li key={service.name} className="destination-details__service">
                        <span className="destination-details__service-type">{service.type}</span>
                        <span className="destination-details__service-name">{service.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="destination-details__section">
                <h2 className="destination-details__section-title">Advice</h2>
                <p className="destination-details__advice">{advice}</p>
              </div>

              {canViewOnMap && (
                <CommentSection
                  destinationId={destination.id}
                  ownerId={destination.owner_id || getUser()?.id}
                  isAuthenticated
                />
              )}
            </div>
          </>
        )}
      </main>

      {pendingAction && (
        <ConfirmDialog
          title={
            pendingAction === 'discard'
              ? 'Remove this card?'
              : pendingAction === 'cancel'
                ? 'Cancel this request?'
                : 'Delete this destination?'
          }
          message={
            pendingAction === 'discard'
              ? destination.status === 'deleted'
                ? 'This destination was deleted by an admin. Removing the card will clear it from your page for good.'
                : 'This will remove the rejected submission for good.'
              : pendingAction === 'cancel'
                ? CANCEL_MESSAGES[destination.status]
                : "This will send a deletion request to an admin. Your destination stays published until it's approved."
          }
          confirmLabel={pendingAction === 'discard' ? 'Remove' : pendingAction === 'cancel' ? 'Cancel request' : 'Send request'}
          submitting={submitting}
          error={dialogError}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default MyDestinationDetails