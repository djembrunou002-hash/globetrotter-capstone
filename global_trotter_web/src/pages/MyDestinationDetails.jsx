import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getMyDestinations, requestDestinationDelete, discardSubmission } from '../services/myDestinationService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import StarRating from '../components/Starrating.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CommentSection from '../components/CommentSection.jsx'
import { getBudgetDisplay, getHoursDisplay, getContactDisplay } from '../utils/destinationDisplay.js'
import '../styles/DestinationDetails.css'
import '../styles/MyDestinationDetails.css'

const STATUS_TONES = {
  published: 'success',
  pending_review: 'pending',
  rejected: 'danger',
  pending_edit: 'pending',
  pending_delete: 'pending',
  deleted: 'danger',
  edited: 'info'
}

const EDITABLE_STATUSES = ['published', 'edited', 'pending_edit']
const DISCARDABLE_STATUSES = ['rejected', 'deleted']
const CANCELABLE_STATUSES = ['pending_review', 'pending_edit', 'pending_delete']
const MAP_ELIGIBLE_STATUSES = ['published', 'edited', 'pending_edit', 'pending_delete']

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
  const { t, language } = useTranslation()
  const headerRef = useRef(null)
  const headerPassed = useHeaderPassed(headerRef)

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

  const statusTone = destination ? STATUS_TONES[destination.status] : null
  const editDisabled = destination ? !EDITABLE_STATUSES.includes(destination.status) : true
  const canDelete = destination
    ? EDITABLE_STATUSES.includes(destination.status) ||
      DISCARDABLE_STATUSES.includes(destination.status) ||
      CANCELABLE_STATUSES.includes(destination.status)
    : false
  const deleteLabel = destination
    ? CANCELABLE_STATUSES.includes(destination.status)
      ? t(CANCEL_LABEL_KEYS[destination.status])
      : DISCARDABLE_STATUSES.includes(destination.status)
        ? t('manage.discard')
        : t('common.delete')
    : t('common.delete')
  const canViewOnMap = destination ? MAP_ELIGIBLE_STATUSES.includes(destination.status) : false

  const image = destination?.images && destination.images[0]
  const extraPhotos = destination?.images ? destination.images.slice(1, 4) : []
  const budgetDisplay = destination ? getBudgetDisplay(destination.budget, destination.budget_level, t) : null
  const hoursDisplay = destination ? getHoursDisplay(destination.hours, t, language) : null
  const nearbyServices = destination?.nearby_services || []
  const contactDisplay = destination ? getContactDisplay(destination.contact) : null
  const advice = destination?.advice && destination.advice.trim()
    ? destination.advice
    : t('destinationDetails.noAdvice')

  function dialogTitle() {
    if (pendingAction === 'discard') return t('manage.removeCardTitle')
    if (pendingAction === 'cancel') return t('manage.cancelRequestTitle')
    return t('manage.deleteDestinationTitle')
  }

  function dialogMessage() {
    if (pendingAction === 'discard') {
      return destination.status === 'deleted'
        ? t('manage.discardDeletedMessage')
        : t('manage.discardRejectedMessage')
    }
    if (pendingAction === 'cancel') {
      return t(CANCEL_MESSAGE_KEYS[destination.status])
    }
    return t('manage.deleteRequestMessage')
  }

  function dialogConfirmLabel() {
    if (pendingAction === 'discard') return t('manage.confirmRemove')
    if (pendingAction === 'cancel') return t('manage.confirmCancelRequest')
    return t('manage.confirmSendRequest')
  }

  return (
    <div className="destination-details">
      <header ref={headerRef} className="destination-details__header page-header">
        <button
          type="button"
          className="destination-details__back"
          aria-label={t('common.goBack')}
          onClick={handleBack}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="page-header__accessory">
          <Logo theme="dark" />
        </span>
      </header>

      <main className="destination-details__content destination-details__content--with-bottom-nav">
        {loading && <p className="destination-details__status">{t('destinationDetails.loading')}</p>}
        {error && <p className="destination-details__status destination-details__status--error">{error}</p>}

        {!loading && !error && !destination && (
          <p className="destination-details__status">{t('destinationDetails.notFound')}</p>
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
              {statusTone && (
                <span className={`my-destination-details__status-badge my-destination-details__status-badge--${statusTone}`}>
                  {t(`status.${destination.status}`)}
                </span>
              )}
            </div>

            <div className="destination-details__body">
              {destination.status === 'edited' && (
                <div className="my-destination-details__notice">
                  {t('manage.adminEdited')}
                  <button type="button" className="my-destination-details__notice-dismiss" onClick={handleAcknowledgeEdit}>
                    {t('manage.gotIt')}
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
                    <strong>{destination.status === 'rejected' ? t('manage.whyRejected') : t('manage.adminNote')}</strong>
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
                    title={t('common.viewOnMap')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {t('common.location')}
                  </button>
                )}

                {!editDisabled && (
                  <button type="button" className="my-destination-details__edit" onClick={handleEdit}>
                    {t('common.edit')}
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
                  <span className="destination-details__info-label">{t('destinationDetails.budgetToVisit')}</span>
                  <span className="destination-details__info-value">{budgetDisplay.label}</span>
                  {budgetDisplay.note && (
                    <p className="destination-details__info-note">{budgetDisplay.note}</p>
                  )}
                </div>

                <div className="destination-details__info-card">
                  <span className="destination-details__info-label">{t('destinationDetails.openingHours')}</span>
                  <span className="destination-details__info-value">{hoursDisplay.label}</span>
                  {hoursDisplay.note && (
                    <p className="destination-details__info-note">{hoursDisplay.note}</p>
                  )}
                </div>
              </div>

              {destination.description && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.about')}</h2>
                  <p className="destination-details__description">{destination.description}</p>
                </div>
              )}

              {extraPhotos.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.morePhotos')}</h2>
                  <div className="destination-details__photo-grid">
                    {extraPhotos.map((src, index) => (
                      <ExtraPhoto
                        key={src}
                        src={src}
                        alt={t('destinationDetails.photoAlt', { name: destination.name, number: index + 2 })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {contactDisplay && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.contact')}</h2>
                  <div className="destination-details__contact">
                    {contactDisplay.phone && (
                      <a
                        className="destination-details__contact-item"
                        href={`tel:${contactDisplay.phone.replace(/\s+/g, '')}`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {contactDisplay.phone}
                      </a>
                    )}
                    {contactDisplay.email && (
                      <a className="destination-details__contact-item" href={`mailto:${contactDisplay.email}`}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 6l-10 7L2 6" />
                        </svg>
                        {contactDisplay.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {nearbyServices.length > 0 && (
                <div className="destination-details__section">
                  <h2 className="destination-details__section-title">{t('destinationDetails.nearby')}</h2>
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
                <h2 className="destination-details__section-title">{t('destinationDetails.advice')}</h2>
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

export default MyDestinationDetails