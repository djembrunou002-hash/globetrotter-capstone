import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { readFilterState, writeFilterState } from '../utils/filterStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/Destinations.css'

const BUDGET_LEVELS = ['low', 'medium', 'high']

const FILTER_KEY = 'destinations'

const DEFAULT_FILTERS = {
  typeFilters: [],
  budgetFilters: [],
  tagFilters: [],
  minBudget: '',
  maxBudget: ''
}

function Destinations() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tagParam = searchParams.get('tag')
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
  const [restored] = useState(() => readFilterState(FILTER_KEY, DEFAULT_FILTERS))
  const [showFilterJump, setShowFilterJump] = useState(false)
  const searchBarRef = useRef(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState(() => new Set(tagParam ? [] : restored.typeFilters))
  const [budgetFilters, setBudgetFilters] = useState(() => new Set(tagParam ? [] : restored.budgetFilters))
  const [tagFilters, setTagFilters] = useState(
    () => new Set(tagParam ? [tagParam] : restored.tagFilters)
  )
  const [minBudget, setMinBudget] = useState(() => (tagParam ? '' : restored.minBudget))
  const [maxBudget, setMaxBudget] = useState(() => (tagParam ? '' : restored.maxBudget))

  const [appliedTagParam, setAppliedTagParam] = useState(tagParam)

  if (tagParam !== appliedTagParam) {
    setAppliedTagParam(tagParam)
    if (tagParam) {
      setTagFilters(new Set([tagParam]))
      setTypeFilters(new Set())
      setBudgetFilters(new Set())
      setSearchQuery('')
      setMinBudget('')
      setMaxBudget('')
    }
  }

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

  useEffect(() => {
    writeFilterState(FILTER_KEY, {
      typeFilters: [...typeFilters],
      budgetFilters: [...budgetFilters],
      tagFilters: [...tagFilters],
      minBudget,
      maxBudget
    })
  }, [typeFilters, budgetFilters, tagFilters, minBudget, maxBudget])

  useEffect(() => {
    const node = searchBarRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowFilterJump(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function handleJumpToFilters() {
    searchBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
            ? { ...destination, rating: response.rating, your_rating: response.your_rating }
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
  const availableTags = [...new Set(destinations.flatMap(destination => destination.tags || []).filter(Boolean))]

  const filteredDestinations = destinations.filter(destination => {
    const name = (destination.name || '').toLowerCase()
    const area = (destination.area || '').toLowerCase()
    const matchesSearch = !normalizedQuery || name.startsWith(normalizedQuery) || area.startsWith(normalizedQuery)
    const matchesType = typeFilters.size === 0 || typeFilters.has(destination.type)
    const matchesBudgetLevel = budgetFilters.size === 0 || budgetFilters.has(destination.budget_level)
    const matchesBudgetRange = destinationMatchesBudgetRange(destination, minBudget, maxBudget)
    const matchesTags =
      tagFilters.size === 0 || (destination.tags || []).some(tag => tagFilters.has(tag))
    return matchesSearch && matchesType && matchesBudgetLevel && matchesBudgetRange && matchesTags
  })

  const hasActiveFilters =
    typeFilters.size > 0 ||
    budgetFilters.size > 0 ||
    tagFilters.size > 0 ||
    minBudget !== '' ||
    maxBudget !== ''

  function clearTagParam() {
    if (!tagParam) return
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    setSearchParams(next, { replace: true })
  }

  function toggleTagFilter(tag) {
    clearTagParam()
    setTagFilters(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  function handleClearFilters() {
    clearTagParam()
    setTypeFilters(new Set())
    setBudgetFilters(new Set())
    setTagFilters(new Set())
    setMinBudget('')
    setMaxBudget('')
  }

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
        <h1 className="destinations__title">{t('destinations.title')}</h1>
      </header>

      <div className="destinations__search-bar" ref={searchBarRef}>
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
          placeholder={t('destinations.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label={t('destinations.searchLabel')}
        />
        {searchQuery && (
          <button
            type="button"
            className="destinations__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label={t('destinations.clearSearch')}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {(availableTypes.length > 0 || availableTags.length > 0) && (
        <div className="destinations__filters" role="group" aria-label={t('destinations.filtersLabel')}>
          {hasActiveFilters && (
            <div className="destinations__filter-row destinations__filter-row--actions">
              <button
                type="button"
                className="destinations__filter-clear"
                onClick={handleClearFilters}
              >
                {t('destinations.clearFilters')}
              </button>
            </div>
          )}

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
                {t(`budgetLevels.${level}`)}
              </button>
            ))}
          </div>

          {availableTags.length > 0 && (
            <div className="destinations__filter-row">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`destinations__filter-pill destinations__filter-pill--tag ${tagFilters.has(tag) ? 'destinations__filter-pill--active' : ''}`}
                  onClick={() => toggleTagFilter(tag)}
                  aria-pressed={tagFilters.has(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="destinations__budget-range">
            <label className="destinations__budget-range-field">
              <span>{t('common.minFcfa')}</span>
              <input
                type="number"
                min="0"
                placeholder={t('common.zero')}
                value={minBudget}
                onChange={e => setMinBudget(e.target.value)}
              />
            </label>
            <span className="destinations__budget-range-separator">-</span>
            <label className="destinations__budget-range-field">
              <span>{t('common.maxFcfa')}</span>
              <input
                type="number"
                min="0"
                placeholder={t('common.any')}
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
            aria-label={t('destinations.cancelSelection')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12H19" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <main className="destinations__content destinations__content--with-bottom-nav">
        {loading && <p className="destinations__status">{t('destinations.loading')}</p>}
        {error && <p className="destinations__status destinations__status--error">{error}</p>}

        {!loading && !error && filteredDestinations.length === 0 && (
          <p className="destinations__status">
            {searchQuery
              ? t('destinations.noSearchMatches', { query: searchQuery })
              : t('destinations.noFilterMatches')}
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
          {t('destinations.confirmSelected', { count: draft.selectedDestinationIds.length })}
        </button>
      )}

      {showFilterJump && (
        <button
          type="button"
          className="destinations__filter-jump"
          onClick={handleJumpToFilters}
          aria-label={t('destinations.jumpToSearch')}
          title={t('destinations.jumpToSearch')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      )}

      <BottomNav />
    </div>
  )
}

export default Destinations