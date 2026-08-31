import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItineraries, createItinerary, updateItinerary, deleteItinerary, deleteItineraries } from '../services/itineraryService.js'
import { getDestinations } from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import PlanetLoader from '../components/PlanetLoader.jsx'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import ItineraryCard from '../components/Itinerarycard.jsx'
import AddItineraryModal from '../components/Additinerarymodal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ShareItineraryModal from '../components/ShareItineraryModal.jsx'
import '../styles/Itineraries.css'

function Itineraries() {
  const navigate = useNavigate()
  const { formOpen, openForm, openFormForEdit, closeForm, editingId } = useItineraryDraft()
  const { t } = useTranslation()

  const [itineraries, setItineraries] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState([])
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [shareTarget, setShareTarget] = useState(null)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [itinerariesResponse, destinationsResponse] = await Promise.all([
          getItineraries(),
          getDestinations()
        ])
        setItineraries(itinerariesResponse.itineraries)
        setDestinations(destinationsResponse.destinations)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

  function findCoverImage(itinerary) {
    const firstId = itinerary.destinations[0]
    const destination = destinations.find(d => d.id === firstId)
    return destination?.images?.[0]
  }

  async function handleCreate(payload) {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (editingId) {
        const response = await updateItinerary(editingId, payload)
        setItineraries(prev =>
          prev.map(i => (i.id === editingId ? { ...i, ...response.itinerary } : i))
        )
      } else {
        const response = await createItinerary(payload)
        setItineraries(prev => [{ ...response.itinerary, is_owner: true }, ...prev])
      }
      closeForm()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleRequestEdit(itinerary) {
    setSubmitError('')
    openFormForEdit(itinerary)
  }

  function handleStartDeleteMode() {
    setDeleteMode(true)
    setSelectedForDeletion([])
  }

  function handleCancelDeleteMode() {
    setDeleteMode(false)
    setSelectedForDeletion([])
  }

  function toggleSelectForDeletion(itineraryId) {
    setSelectedForDeletion(prev =>
      prev.includes(itineraryId)
        ? prev.filter(id => id !== itineraryId)
        : [...prev, itineraryId]
    )
  }

  function handleRequestSingleDelete(itineraryId) {
    setDeleteError('')
    setConfirmTarget({ type: 'single', ids: [itineraryId] })
  }

  function handleRequestBulkDelete() {
    if (selectedForDeletion.length === 0) return
    setDeleteError('')
    setConfirmTarget({ type: 'bulk', ids: selectedForDeletion })
  }

  function handleCancelConfirm() {
    if (deleting) return
    setConfirmTarget(null)
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return

    setDeleting(true)
    setDeleteError('')
    try {
      if (confirmTarget.type === 'single') {
        await deleteItinerary(confirmTarget.ids[0])
        setItineraries(prev => prev.filter(i => i.id !== confirmTarget.ids[0]))
      } else {
        await deleteItineraries(confirmTarget.ids)
        const idsSet = new Set(confirmTarget.ids)
        setItineraries(prev => prev.filter(i => !idsSet.has(i.id)))
        setDeleteMode(false)
        setSelectedForDeletion([])
      }
      setConfirmTarget(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function handleRequestShare(itinerary) {
    setShareTarget(itinerary)
  }

  function handleCloseShare() {
    setShareTarget(null)
  }

  function confirmDialogMessage() {
    if (!confirmTarget) return ''
    if (confirmTarget.type === 'single') return t('itineraries.deleteSingleMessage')
    const count = confirmTarget.ids.length
    return count === 1
      ? t('itineraries.deleteBulkMessageOne', { count })
      : t('itineraries.deleteBulkMessageMany', { count })
  }

  return (
    <div className="itineraries">
      <header className="itineraries__header">
        <Logo theme="dark" />
        <h1 className="itineraries__title">{t('itineraries.title')}</h1>
        {itineraries.length > 0 && !deleteMode && (
          <div className="itineraries__header-actions">
            <button type="button" className="itineraries__add-button" onClick={openForm}>
              {t('itineraries.addButton')}
            </button>
            <button type="button" className="itineraries__delete-trigger" onClick={handleStartDeleteMode}>
              {t('itineraries.deleteTrigger')}
            </button>
          </div>
        )}
      </header>

      {deleteMode && (
        <div className="itineraries__selection-bar">
          <button
            type="button"
            className="itineraries__selection-cancel"
            onClick={handleCancelDeleteMode}
            aria-label={t('itineraries.cancelSelection')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12H19" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <main className="itineraries__content">
        {loading && <PlanetLoader label={t('itineraries.loading')} />}
        {error && <p className="itineraries__status itineraries__status--error">{error}</p>}

        {!loading && !error && itineraries.length === 0 && (
          <div className="itineraries__empty">
            <p className="itineraries__empty-text">{t('itineraries.empty')}</p>
            <button type="button" className="itineraries__empty-button" onClick={openForm}>
              {t('itineraries.addAction')}
            </button>
          </div>
        )}

        {!loading && !error && itineraries.length > 0 && (
          <div className="itineraries__grid">
            {itineraries.map(itinerary => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                coverImage={findCoverImage(itinerary)}
                selectable={deleteMode}
                selected={selectedForDeletion.includes(itinerary.id)}
                onToggleSelect={toggleSelectForDeletion}
                onRequestDelete={handleRequestSingleDelete}
                onRequestShare={handleRequestShare}
                onRequestEdit={handleRequestEdit}
              />
            ))}
          </div>
        )}
      </main>

      {deleteMode && selectedForDeletion.length > 0 && (
        <button type="button" className="itineraries__confirm-delete" onClick={handleRequestBulkDelete}>
          {t('itineraries.deleteSelected', { count: selectedForDeletion.length })}
        </button>
      )}

      {formOpen && (
        <AddItineraryModal
          destinations={destinations}
          onClose={closeForm}
          onSubmit={handleCreate}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={
            confirmTarget.type === 'bulk'
              ? t('itineraries.deleteManyTitle')
              : t('itineraries.deleteOneTitle')
          }
          message={confirmDialogMessage()}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelConfirm}
          submitting={deleting}
          error={deleteError}
        />
      )}

      {shareTarget && (
        <ShareItineraryModal itinerary={shareTarget} onClose={handleCloseShare} />
      )}

      <BottomNav />
    </div>
  )
}

export default Itineraries