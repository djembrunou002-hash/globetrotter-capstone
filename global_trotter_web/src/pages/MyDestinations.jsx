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
import ConfirmDialog from '../components/Confirmdialog.jsx'
import '../styles/MyDestinations.css'

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

  const DISCARDABLE_STATUSES = ['rejected', 'deleted']

  function handleDeleteClick(destination) {
    setDialogError('')
    setPendingAction({
      type: DISCARDABLE_STATUSES.includes(destination.status) ? 'discard' : 'delete',
      destination
    })
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    setSubmitting(true)
    setDialogError('')
    try {
      if (pendingAction.type === 'discard') {
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
              const editableStatuses = ['published', 'edited']
              const editDisabled = !editableStatuses.includes(destination.status)
              const canDelete = editableStatuses.includes(destination.status) || DISCARDABLE_STATUSES.includes(destination.status)
              return (
                <DestinationManageCard
                  key={destination.id}
                  destination={destination}
                  onView={handleView}
                  onEdit={editDisabled ? null : handleEdit}
                  onDelete={canDelete ? handleDeleteClick : null}
                  onAcknowledge={destination.status === 'edited' ? handleAcknowledgeEdit : null}
                  deleteLabel={DISCARDABLE_STATUSES.includes(destination.status) ? 'Discard' : 'Delete'}
                />
              )
            })}
          </div>
        )}
      </main>

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.type === 'discard' ? 'Remove this card?' : 'Delete this destination?'}
          message={
            pendingAction.type === 'discard'
              ? pendingAction.destination.status === 'deleted'
                ? 'This destination was deleted by an admin. Removing the card will clear it from your page for good.'
                : 'This will remove the rejected submission for good.'
              : "This will send a deletion request to an admin. Your destination stays published until it's approved."
          }
          confirmLabel={pendingAction.type === 'discard' ? 'Remove' : 'Send request'}
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