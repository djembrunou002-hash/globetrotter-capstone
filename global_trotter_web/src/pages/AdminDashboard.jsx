import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  deleteRequest,
  getAllDestinations,
  adminDeleteDestination
} from '../services/adminService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import PendingRequestCard from '../components/PendingRequestCard.jsx'
import DestinationManageCard from '../components/DestinationManageCard.jsx'
import ConfirmDialog from '../components/Confirmdialog.jsx'
import '../styles/AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('pending')
  const [requests, setRequests] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rowSubmitting, setRowSubmitting] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [dialogSubmitting, setDialogSubmitting] = useState(false)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
  }

  async function handleReject(request) {
    setRowSubmitting(request.id)
    setError('')
    try {
      const response = await rejectRequest(request.id)
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, status: response.request.status } : r)))
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
    } catch (err) {
      setError(err.message)
    } finally {
      setRowSubmitting(null)
    }
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
        <button type="button" className="admin-dashboard__back" aria-label="Go back" onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
        <h1 className="admin-dashboard__title">Admin dashboard</h1>
      </header>

      <div className="admin-dashboard__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`admin-dashboard__tab ${activeTab === 'pending' ? 'admin-dashboard__tab--active' : ''}`}
          onClick={() => handleTabChange('pending')}
        >
          Pending destinations
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'actual'}
          className={`admin-dashboard__tab ${activeTab === 'actual' ? 'admin-dashboard__tab--active' : ''}`}
          onClick={() => handleTabChange('actual')}
        >
          Actual destinations
        </button>
      </div>

      <main className="admin-dashboard__content admin-dashboard__content--with-bottom-nav">
        {loading && <p className="admin-dashboard__status">Loading...</p>}
        {error && <p className="admin-dashboard__status admin-dashboard__status--error">{error}</p>}

        {!loading && !error && activeTab === 'pending' && requests.length === 0 && (
          <p className="admin-dashboard__status">No pending requests right now.</p>
        )}

        {!loading && activeTab === 'pending' && requests.length > 0 && (
          <div className="admin-dashboard__grid">
            {requests.map(request => (
              <PendingRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDeleteRequest}
                submitting={rowSubmitting === request.id}
              />
            ))}
          </div>
        )}

        {!loading && !error && activeTab === 'actual' && destinations.length === 0 && (
          <p className="admin-dashboard__status">No destinations found.</p>
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

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this destination?"
          message={`"${pendingDelete.name}" will be removed immediately for all users.`}
          confirmLabel="Delete"
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