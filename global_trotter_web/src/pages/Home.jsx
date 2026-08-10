import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../services/destinationService.js'
import { getRecommendations } from '../services/recommendationService.js'
import { getToken } from '../services/tokenStorage.js'
import { destinationMatchesBudgetRange } from '../utils/budgetRanges.js'
import { readFilterState, writeFilterState } from '../utils/filterStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import DestinationCard from '../components/Destinationcard.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import AiAssistant from '../components/AiAssistant.jsx'
import '../styles/Home.css'

const BUDGET_LEVELS = ['low', 'medium', 'high']

const FILTER_KEY = 'home'

const DEFAULT_FILTERS = {
  typeFilters: [],
  budgetFilters: [],
  minBudget: '',
  maxBudget: ''
}

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isAuthenticated = Boolean(getToken())

  const [recommendedDestinations, setRecommendedDestinations] = useState([])
  const [allDestinations, setAllDestinations] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [restored] = useState(() => readFilterState(FILTER_KEY, DEFAULT_FILTERS))

  const [typeFilters, setTypeFilters] = useState(() => new Set(restored.typeFilters))
  const [budgetFilters, setBudgetFilters] = useState(() => new Set(restored.budgetFilters))
  const [minBudget, setMinBudget] = useState(restored.minBudget)
  const [maxBudget, setMaxBudget] = useState(restored.maxBudget)

  const [aiResult, setAiResult] = useState(null)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [recommendationsResponse, destinationsResponse, favoritesResponse] = await Promise.all([
          getRecommendations(),
          getDestinations(),
          getFavorites()
        ])

        const destinationsById = new Map(destinationsResponse.destinations.map(d => [d.id, d]))
        const recommended = recommendationsResponse.recommendations
          .map(r => destinationsById.get(r.destination_id))
          .filter(Boolean)

        setRecommendedDestinations(recommended)
        setAllDestinations(destinationsResponse.destinations)
        setFavoriteIds(new Set(favoritesResponse.favorites.map(d => d.id)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

  async function handleToggleFavorite(destinationId) {
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
    try {
      const response = await rateDestination(destinationId, stars)
      const applyRating = list =>
        list.map(destination =>
          destination.id === destinationId
            ? { ...destination, rating: response.rating, your_rating: response.your_rating }
            : destination
        )
      setRecommendedDestinations(applyRating)
      setAllDestinations(applyRating)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    writeFilterState(FILTER_KEY, {
      typeFilters: [...typeFilters],
      budgetFilters: [...budgetFilters],
      minBudget,
      maxBudget
    })
  }, [typeFilters, budgetFilters, minBudget, maxBudget])

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

  function handleAiResult(query, response) {
    setAiResult({
      query,
      inScope: response.in_scope,
      message: response.message,
      destinationIds: response.destination_ids || []
    })
  }

  function handleClearAiResult() {
    setAiResult(null)
  }

  const availableTypes = [...new Set(allDestinations.map(destination => destination.type).filter(Boolean))]

  const filteredRecommended = recommendedDestinations.filter(destination => {
    const matchesType = typeFilters.size === 0 || typeFilters.has(destination.type)
    const matchesBudgetLevel = budgetFilters.size === 0 || budgetFilters.has(destination.budget_level)
    const matchesBudgetRange = destinationMatchesBudgetRange(destination, minBudget, maxBudget)
    return matchesType && matchesBudgetLevel && matchesBudgetRange
  })

  const hasActiveFilters = typeFilters.size > 0 || budgetFilters.size > 0 || minBudget !== '' || maxBudget !== ''

  const allDestinationsById = new Map(allDestinations.map(destination => [destination.id, destination]))
  const aiDestinations = aiResult
    ? aiResult.destinationIds.map(id => allDestinationsById.get(id)).filter(Boolean)
    : []

  return (
    <div className="home">
      <header className="home__header">
        <Logo theme="dark" />
        <h1 className="home__title">{t('home.title')}</h1>
      </header>

      {availableTypes.length > 0 && (
        <div className="home__filters" role="group" aria-label={t('home.filtersLabel')}>
          <div className="home__filter-row">
            {availableTypes.map(type => (
              <button
                key={type}
                type="button"
                className={`home__filter-pill ${typeFilters.has(type) ? 'home__filter-pill--active' : ''}`}
                onClick={() => toggleTypeFilter(type)}
                aria-pressed={typeFilters.has(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="home__filter-row">
            {BUDGET_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                className={`home__filter-pill ${budgetFilters.has(level) ? 'home__filter-pill--active' : ''}`}
                onClick={() => toggleBudgetFilter(level)}
                aria-pressed={budgetFilters.has(level)}
              >
                {t(`budgetLevels.${level}`)}
              </button>
            ))}
          </div>

          <div className="home__budget-range">
            <label className="home__budget-range-field">
              <span>{t('common.minFcfa')}</span>
              <input
                type="number"
                min="0"
                placeholder={t('common.zero')}
                value={minBudget}
                onChange={e => setMinBudget(e.target.value)}
              />
            </label>
            <span className="home__budget-range-separator">-</span>
            <label className="home__budget-range-field">
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

      <main className="home__content home__content--with-bottom-nav">
        {aiResult ? (
          <div className="home__ai-results">
            <div className="home__ai-results-header">
              <p className="home__ai-results-query">{t('home.aiResultsFor', { query: aiResult.query })}</p>
              <button type="button" className="home__ai-results-clear" onClick={handleClearAiResult}>
                {t('home.backToRecommendations')}
              </button>
            </div>

            {aiResult.message && <p className="home__status">{aiResult.message}</p>}

            {!aiResult.inScope && (
              <p className="home__status home__status--ai-off-topic">
                {t('home.aiOffTopic')}
              </p>
            )}

            {aiResult.inScope && aiDestinations.length === 0 && (
              <p className="home__status">
                {t('home.aiNoMatches')}
              </p>
            )}

            {aiResult.inScope && aiDestinations.length > 0 && (
              <div className="home__grid">
                {aiDestinations.map(destination => (
                  <DestinationCard
                    key={destination.id}
                    destination={destination}
                    isFavorite={favoriteIds.has(destination.id)}
                    isAuthenticated={isAuthenticated}
                    onToggleFavorite={handleToggleFavorite}
                    onRate={handleRate}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {loading && <p className="home__status">{t('home.loading')}</p>}
            {error && <p className="home__status home__status--error">{error}</p>}

            {!loading && !error && filteredRecommended.length === 0 && (
              <p className="home__status">
                {hasActiveFilters ? t('home.noneForFilters') : t('home.noneYet')}
              </p>
            )}

            {!loading && !error && filteredRecommended.length > 0 && (
              <div className="home__grid">
                {filteredRecommended.map(destination => (
                  <DestinationCard
                    key={destination.id}
                    destination={destination}
                    isFavorite={favoriteIds.has(destination.id)}
                    isAuthenticated={isAuthenticated}
                    onToggleFavorite={handleToggleFavorite}
                    onRate={handleRate}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <AiAssistant onResult={handleAiResult} />

      <BottomNav />
    </div>
  )
}

export default Home