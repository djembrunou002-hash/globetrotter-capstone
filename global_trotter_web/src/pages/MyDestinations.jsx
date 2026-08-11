import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyDestinations,
  requestDestinationDelete,
  discardSubmission
} from '../services/myDestinationService.js'
import { getToken } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import { useNotifications, useClearNotificationsOnLeave } from '../hooks/useNotifications.js'
import { unseenKeysForDestinationCard } from '../utils/notificationMatch.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import DestinationManageCard from '../components/DestinationManageCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import '../styles/MyDestinations.css'

const EDITABLE_STATUSES = ['published', 'edited', 'pending_edit', 'pending_review']
const DISCARDABLE_STATUSES = ['rejected', 'deleted']
const CANCELABLE_STATUSES = ['pending_review', 'pending_edit', 'pending_delete']

const CANCEL_LABEL_KEYS = {
  pending_review: 'manage.cancelSubmission',
  pending_edit: 'manage.cancelEdit',
  pending_delete: 'manage.cancelDeletion'
}

const CANCEL_MESSAGE_KEYS = {
  pending_review: 'manage.cancelMessagePendingReview',
  pending_edit: 'manage.cancelMessagePendingEdit',
  pending_delete: 'manage.cancelMessagePendingDelete'
}

function MyDestinations() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const headerRef = useRef(null)
  const headerPassed = useHeaderPassed(headerRef)
  const { unseenItems } = useNotifications()

  useClearNotificationsOnLeave()

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

  function dialogTitle() {
    if (pendingAction.type === 'discard') return t('manage.removeCardTitle')
    if (pendingAction.type === 'cancel') return t('manage.cancelRequestTitle')
    return t('manage.deleteDestinationTitle')
  }

  function dialogMessage() {
    if (pendingAction.type === 'discard') {
      return pendingAction.destination.status === 'deleted'
        ? t('manage.discardDeletedMessage')
        : t('manage.discardRejectedMessage')
    }
    if (pendingAction.type === 'cancel') {
      return t(CANCEL_MESSAGE_KEYS[pendingAction.destination.status])
    }
    return t('manage.deleteRequestMessage')
  }

  function dialogConfirmLabel() {
    if (pendingAction.type === 'discard') return t('manage.confirmRemove')
    if (pendingAction.type === 'cancel') return t('manage.confirmCancelRequest')
    return t('manage.confirmSendRequest')
  }

  return (
    <div className="my-destinations">
      <header ref={headerRef} className="my-destinations__header page-header">
        <button type="button" className="my-destinations__back" aria-label={t('common.goBack')} onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="page-header__accessory">
          <Logo theme="dark" />
        </span>
        <h1 className="my-destinations__title page-header__accessory">{t('manage.title')}</h1>
      </header>

      <main className="my-destinations__content my-destinations__content--with-bottom-nav">
        <button type="button" className="my-destinations__add" onClick={() => navigate('/my-destinations/new')}>
          {t('manage.add')}
        </button>

        {loading && <p className="my-destinations__status">{t('manage.loading')}</p>}
        {error && <p className="my-destinations__status my-destinations__status--error">{error}</p>}

        {!loading && !error && destinations.length === 0 && (
          <p className="my-destinations__status">
            {t('manage.empty')}
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
                ? t(CANCEL_LABEL_KEYS[destination.status])
                : DISCARDABLE_STATUSES.includes(destination.status)
                  ? t('manage.discard')
                  : t('common.delete')
              return (
                <DestinationManageCard
                  key={destination.id}
                  destination={destination}
                  onView={handleView}
                  onEdit={editDisabled ? null : handleEdit}
                  onDelete={canDelete ? handleDeleteClick : null}
                  onAcknowledge={destination.status === 'edited' ? handleAcknowledgeEdit : null}
                  deleteLabel={deleteLabel}
                  unseen={unseenKeysForDestinationCard(unseenItems, destination).length > 0}
                />
              )
            })}
          </div>
        )}
      </main>

      {pendingAction && (
        <ConfirmDialog
          title={dialogTitle()}
          message={dialogMessage()}
          confirmLabel={dialogConfirmLabel()}
          submitting={submitting}
          error={dialogError}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <FloatingBackButton visible={headerPassed} onClick={handleBack} />

      <BottomNav />
    </div>
  )
}

export default MyDestinations