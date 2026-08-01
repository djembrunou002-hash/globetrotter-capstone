import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getToken } from '../services/tokenStorage.js'
import { destinationMatchesBudgetRange } from '../utils/budgetRanges.js'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/Destinations.css'

const BUDGET_LEVELS = ['low', 'medium', 'high']

function Destinations() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(getToken())
  const {
    selectionMode,
    draft,
    toggleDestination,
    confirmSelection,
    cancelSelection
  } = useItineraryDraft()

  const [destinations, setDestinations] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState(new Set())
  const [budgetFilters, setBudgetFilters] = useState(new Set())
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [destinationsResponse, favoritesResponse] = await Promise.all([
          getDestinations(),
          isAuthenticated ? getFavorites() : Promise.resolve({ favorites: [] })
        ])
        setDestinations(destinationsResponse.destinations)
        setFavoriteIds(new Set(favoritesResponse.favorites.map(d => d.id)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated])

  async function handleToggleFavorite(destinationId) {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const isCurrentlyFavorite = favoriteIds.has(destinationId)

    try {
      if (isCurrentlyFavorite) {
        await removeFavorite(destinationId)
        setFavoriteIds(prev => {
          const next = new Set(prev)
          next.delete(destinationId)
          return next
        })
      } else {
        await addFavorite(destinationId)
        setFavoriteIds(prev => new Set(prev).add(destinationId))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRate(destinationId, stars) {
    if (stars === null) {
      navigate('/login')
      return
    }

    try {
      const response = await rateDestination(destinationId, stars)
      setDestinations(prev =>
        prev.map(destination =>
          destination.id === destinationId
            ? { ...destination, rating: response.rating }
            : destination
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  function handleConfirmSelection() {
    confirmSelection()
    navigate('/itineraries')
  }

  function handleCancelSelection() {
    cancelSelection()
    navigate('/itineraries')
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const availableTypes = [...new Set(destinations.map(destination => destination.type).filter(Boolean))]

  const filteredDestinations = destinations.filter(destination => {
    const name = (destination.name || '').toLowerCase()
    const area = (destination.area || '').toLowerCase()
    const matchesSearch = !normalizedQuery || name.startsWith(normalizedQuery) || area.startsWith(normalizedQuery)
    const matchesType = typeFilters.size === 0 || typeFilters.has(destination.type)
    const matchesBudgetLevel = budgetFilters.size === 0 || budgetFilters.has(destination.budget_level)
    const matchesBudgetRange = destinationMatchesBudgetRange(destination, minBudget, maxBudget)
    return matchesSearch && matchesType && matchesBudgetLevel && matchesBudgetRange
  })

  function toggleTypeFilter(type) {
    setTypeFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function toggleBudgetFilter(level) {
    setBudgetFilters(prev => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  return (
    <div className="destinations">
      <header className="destinations__header">
        <Logo theme="dark" />
        <h1 className="destinations__title">Destinations</h1>
      </header>

      <div className="destinations__search-bar">
        <svg
          className="destinations__search-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="destinations__search-input"
          placeholder="Search by name or area"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search destinations by name or area"
        />
        {searchQuery && (
          <button
            type="button"
            className="destinations__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {availableTypes.length > 0 && (
        <div className="destinations__filters" role="group" aria-label="Filter destinations">
          <div className="destinations__filter-row">
            {availableTypes.map(type => (
              <button
                key={type}
                type="button"
                className={`destinations__filter-pill ${typeFilters.has(type) ? 'destinations__filter-pill--active' : ''}`}
                onClick={() => toggleTypeFilter(type)}
                aria-pressed={typeFilters.has(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="destinations__filter-row">
            {BUDGET_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                className={`destinations__filter-pill ${budgetFilters.has(level) ? 'destinations__filter-pill--active' : ''}`}
                onClick={() => toggleBudgetFilter(level)}
                aria-pressed={budgetFilters.has(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)} budget
              </button>
            ))}
          </div>

          <div className="destinations__budget-range">
            <label className="destinations__budget-range-field">
              <span>Min (FCFA)</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={minBudget}
                onChange={e => setMinBudget(e.target.value)}
              />
            </label>
            <span className="destinations__budget-range-separator">-</span>
            <label className="destinations__budget-range-field">
              <span>Max (FCFA)</span>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {selectionMode && (
        <div className="destinations__selection-bar">
          <button
            type="button"
            className="destinations__selection-cancel"
            onClick={handleCancelSelection}
            aria-label="Cancel destination selection"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12H19" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <main className="destinations__content destinations__content--with-bottom-nav">
        {loading && <p className="destinations__status">Loading destinations...</p>}
        {error && <p className="destinations__status destinations__status--error">{error}</p>}

        {!loading && !error && filteredDestinations.length === 0 && (
          <p className="destinations__status">
            {searchQuery
              ? `No destinations match "${searchQuery}".`
              : 'No destinations match this filter.'}
          </p>
        )}

        {!loading && !error && filteredDestinations.length > 0 && (
          <div className="destinations__grid">
            {filteredDestinations.map(destination => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isFavorite={favoriteIds.has(destination.id)}
                isAuthenticated={isAuthenticated}
                onToggleFavorite={handleToggleFavorite}
                onRate={handleRate}
                selectable={selectionMode}
                selected={draft.selectedDestinationIds.includes(destination.id)}
                onToggleSelect={toggleDestination}
              />
            ))}
          </div>
        )}
      </main>

      {selectionMode && draft.selectedDestinationIds.length > 0 && (
        <button type="button" className="destinations__confirm-selection" onClick={handleConfirmSelection}>
          Confirm selected ({draft.selectedDestinationIds.length})
        </button>
      )}

      <BottomNav />
    </div>
  )
}

export default Destinations