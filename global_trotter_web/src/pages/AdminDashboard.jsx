import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  saveRequestNote,
  deleteRequest,
  getAllDestinations,
  adminDeleteDestination
} from '../services/adminService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import PendingRequestCard from '../components/PendingRequestCard.jsx'
import DestinationManageCard from '../components/DestinationManageCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import RequestDetailModal from '../components/RequestDetailModal.jsx'
import '../styles/AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState('pending')
  const [requests, setRequests] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rowSubmitting, setRowSubmitting] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [dialogSubmitting, setDialogSubmitting] = useState(false)
  const [viewingRequest, setViewingRequest] = useState(null)

  const loadTab = useCallback(async tab => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'pending') {
        const response = await getPendingRequests()
        setRequests(response.requests)
      } else {
        const response = await getAllDestinations()
        setDestinations(response.destinations)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const user = getUser()
    if (!getToken() || user?.role !== 'admin') {
      navigate('/home')
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        loadTab(activeTab)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  function handleTabChange(tab) {
    setActiveTab(tab)
    loadTab(tab)
  }

  async function handleApprove(request) {
    setRowSubmitting(request.id)
    setError('')
    try {
      await approveRequest(request.id)
      setRequests(prev => prev.filter(r => r.id !== request.id))
      setViewingRequest(prev => (prev && prev.id === request.id ? null : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
  }

  async function handleReject(request, note) {
    setRowSubmitting(request.id)
    setError('')
    try {
      const response = await rejectRequest(request.id, note)
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, ...response.request } : r)))
      setViewingRequest(prev => (prev && prev.id === request.id ? { ...prev, ...response.request } : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
  }

  async function handleSaveNote(request, note) {
    setRowSubmitting(request.id)
    setError('')
    try {
      const response = await saveRequestNote(request.id, note)
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, ...response.request } : r)))
      setViewingRequest(prev => (prev && prev.id === request.id ? { ...prev, ...response.request } : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
  }

  async function handleDeleteRequest(request) {
    setRowSubmitting(request.id)
    setError('')
    try {
      await deleteRequest(request.id)
      setRequests(prev => prev.filter(r => r.id !== request.id))
      setViewingRequest(prev => (prev && prev.id === request.id ? null : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
  }

  function handleViewRequest(request) {
    setViewingRequest(request)
  }

  function handleEditDestination(destination) {
    navigate(`/admin/destinations/${destination.id}/edit`)
  }

  function handleDeleteDestinationClick(destination) {
    setDialogError('')
    setPendingDelete(destination)
  }

  async function handleConfirmDeleteDestination() {
    if (!pendingDelete) return
    setDialogSubmitting(true)
    setDialogError('')
    try {
      await adminDeleteDestination(pendingDelete.id)
      setDestinations(prev => prev.filter(d => d.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setDialogError(err.message)
    } finally {
      setDialogSubmitting(false)
    }
  }

  function handleBack() {
    navigate(-1)
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <button type="button" className="admin-dashboard__back" aria-label={t('common.goBack')} onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
        <h1 className="admin-dashboard__title">{t('admin.title')}</h1>
      </header>

      <div className="admin-dashboard__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`admin-dashboard__tab ${activeTab === 'pending' ? 'admin-dashboard__tab--active' : ''}`}
          onClick={() => handleTabChange('pending')}
        >
          {t('admin.tabPending')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'actual'}
          className={`admin-dashboard__tab ${activeTab === 'actual' ? 'admin-dashboard__tab--active' : ''}`}
          onClick={() => handleTabChange('actual')}
        >
          {t('admin.tabActual')}
        </button>
      </div>

      <main className="admin-dashboard__content admin-dashboard__content--with-bottom-nav">
        {loading && <p className="admin-dashboard__status">{t('common.loading')}</p>}
        {error && <p className="admin-dashboard__status admin-dashboard__status--error">{error}</p>}

        {!loading && !error && activeTab === 'pending' && requests.length === 0 && (
          <p className="admin-dashboard__status">{t('admin.noPending')}</p>
        )}

        {!loading && activeTab === 'pending' && requests.length > 0 && (
          <div className="admin-dashboard__grid">
            {requests.map(request => (
              <PendingRequestCard
                key={request.id}
                request={request}
                onView={handleViewRequest}
                onApprove={handleApprove}
                onReject={handleViewRequest}
                onDelete={handleDeleteRequest}
                submitting={rowSubmitting === request.id}
              />
            ))}
          </div>
        )}

        {!loading && !error && activeTab === 'actual' && destinations.length === 0 && (
          <p className="admin-dashboard__status">{t('admin.noDestinations')}</p>
        )}

        {!loading && activeTab === 'actual' && destinations.length > 0 && (
          <div className="admin-dashboard__grid">
            {destinations.map(destination => (
              <DestinationManageCard
                key={destination.id}
                destination={destination}
                onEdit={handleEditDestination}
                onDelete={handleDeleteDestinationClick}
              />
            ))}
          </div>
        )}
      </main>

      {viewingRequest && (
        <RequestDetailModal
          key={viewingRequest.id}
          request={viewingRequest}
          onClose={() => setViewingRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onSaveNote={handleSaveNote}
          onDelete={handleDeleteRequest}
          submitting={rowSubmitting === viewingRequest.id}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t('manage.deleteDestinationTitle')}
          message={t('admin.deleteMessage', { name: pendingDelete.name })}
          confirmLabel={t('common.delete')}
          submitting={dialogSubmitting}
          error={dialogError}
          onConfirm={handleConfirmDeleteDestination}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default AdminDashboard