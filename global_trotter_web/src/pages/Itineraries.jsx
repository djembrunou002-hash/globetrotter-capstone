import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItineraries, createItinerary } from '../services/itineraryService.js'
import { getDestinations } from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/BottomNav.jsx'
import ItineraryCard from '../components/ItineraryCard.jsx'
import AddItineraryModal from '../components/AddItineraryModal.jsx'
import '../styles/Itineraries.css'

function Itineraries() {
  const navigate = useNavigate()
  const { formOpen, openForm, closeForm } = useItineraryDraft()

  const [itineraries, setItineraries] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
      const response = await createItinerary(payload)
      setItineraries(prev => [response.itinerary, ...prev])
      closeForm()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="itineraries">
      <header className="itineraries__header">
        <Logo theme="dark" />
        <h1 className="itineraries__title">Itineraries</h1>
        {itineraries.length > 0 && (
          <button type="button" className="itineraries__add-button" onClick={openForm}>
            + Add itinerary
          </button>
        )}
      </header>

      <main className="itineraries__content">
        {loading && <p className="itineraries__status">Loading itineraries...</p>}
        {error && <p className="itineraries__status itineraries__status--error">{error}</p>}

        {!loading && !error && itineraries.length === 0 && (
          <div className="itineraries__empty">
            <p className="itineraries__empty-text">No itinerary</p>
            <button type="button" className="itineraries__empty-button" onClick={openForm}>
              Add itinerary
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
              />
            ))}
          </div>
        )}
      </main>

      {formOpen && (
        <AddItineraryModal
          destinations={destinations}
          onClose={closeForm}
          onSubmit={handleCreate}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default Itineraries