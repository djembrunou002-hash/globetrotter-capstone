import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyDestinations,
  requestDestinationDelete,
  discardSubmission
} from '../services/myDestinationService.js'
import { getToken } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import DestinationManageCard from '../components/DestinationManageCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import '../styles/MyDestinations.css'

const EDITABLE_STATUSES = ['published', 'edited', 'pending_edit', 'pending_review']
const DISCARDABLE_STATUSES = ['rejected', 'deleted']
const CANCELABLE_STATUSES = ['pending_review', 'pending_edit', 'pending_delete']

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

function MyDestinations() {
  const navigate = useNavigate()

  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadDestinations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getMyDestinations()
      setDestinations(response.destinations)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        loadDestinations()
      }
    })
    return () => {
      cancelled = true
    }
  }, [navigate, loadDestinations])

  function handleBack() {
    navigate(-1)
  }

  function handleView(destination) {
    navigate(`/my-destinations/${destination.id}`, { state: { destination } })
  }

  function handleEdit(destination) {
    navigate(`/my-destinations/${destination.id}/edit`)
  }

  function handleDeleteClick(destination) {
    setDialogError('')
    let type = 'delete'
    if (DISCARDABLE_STATUSES.includes(destination.status)) type = 'discard'
    else if (CANCELABLE_STATUSES.includes(destination.status)) type = 'cancel'
    setPendingAction({ type, destination })
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    setSubmitting(true)
    setDialogError('')
    try {
      if (pendingAction.type === 'discard' || pendingAction.type === 'cancel') {
        await discardSubmission(pendingAction.destination.request_id)
      } else {
        await requestDestinationDelete(pendingAction.destination.id)
      }
      setPendingAction(null)
      await loadDestinations()
    } catch (err) {
      setDialogError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAcknowledgeEdit(destination) {
    try {
      await discardSubmission(destination.request_id)
      await loadDestinations()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="my-destinations">
      <header className="my-destinations__header">
        <button type="button" className="my-destinations__back" aria-label="Go back" onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
        <h1 className="my-destinations__title">My destinations</h1>
      </header>

      <main className="my-destinations__content my-destinations__content--with-bottom-nav">
        <button type="button" className="my-destinations__add" onClick={() => navigate('/my-destinations/new')}>
          + Add a destination
        </button>

        {loading && <p className="my-destinations__status">Loading your destinations...</p>}
        {error && <p className="my-destinations__status my-destinations__status--error">{error}</p>}

        {!loading && !error && destinations.length === 0 && (
          <p className="my-destinations__status">
            You haven't added any destinations yet. Share a spot you know well and it'll appear here once you submit it.
          </p>
        )}

        {!loading && destinations.length > 0 && (
          <div className="my-destinations__grid">
            {destinations.map(destination => {
              const editDisabled = !EDITABLE_STATUSES.includes(destination.status)
              const canDelete =
                EDITABLE_STATUSES.includes(destination.status) ||
                DISCARDABLE_STATUSES.includes(destination.status) ||
                CANCELABLE_STATUSES.includes(destination.status)
              const deleteLabel = CANCELABLE_STATUSES.includes(destination.status)
                ? CANCEL_LABELS[destination.status]
                : DISCARDABLE_STATUSES.includes(destination.status)
                  ? 'Discard'
                  : 'Delete'
              return (
                <DestinationManageCard
                  key={destination.id}
                  destination={destination}
                  onView={handleView}
                  onEdit={editDisabled ? null : handleEdit}
                  onDelete={canDelete ? handleDeleteClick : null}
                  onAcknowledge={destination.status === 'edited' ? handleAcknowledgeEdit : null}
                  deleteLabel={deleteLabel}
                />
              )
            })}
          </div>
        )}
      </main>

      {pendingAction && (
        <ConfirmDialog
          title={
            pendingAction.type === 'discard'
              ? 'Remove this card?'
              : pendingAction.type === 'cancel'
                ? 'Cancel this request?'
                : 'Delete this destination?'
          }
          message={
            pendingAction.type === 'discard'
              ? pendingAction.destination.status === 'deleted'
                ? 'This destination was deleted by an admin. Removing the card will clear it from your page for good.'
                : 'This will remove the rejected submission for good.'
              : pendingAction.type === 'cancel'
                ? CANCEL_MESSAGES[pendingAction.destination.status]
                : "This will send a deletion request to an admin. Your destination stays published until it's approved."
          }
          confirmLabel={
            pendingAction.type === 'discard' ? 'Remove' : pendingAction.type === 'cancel' ? 'Cancel request' : 'Send request'
          }
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

export default MyDestinations