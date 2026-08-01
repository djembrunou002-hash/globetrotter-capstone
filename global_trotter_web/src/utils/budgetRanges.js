export const BUDGET_LEVEL_RANGES = {
  low: [0, 5000],
  medium: [5000, 20000],
  high: [20000, 100000]
}

function extractNumbers(text) {
  if (!text) return []
  const matches = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map(match => Number(match.replace(/,/g, '')))
}

function priceRangeFor(destination) {
  const budget = destination.budget || {}
  const amountNumbers = extractNumbers(budget.amount_label)
  const noteNumbers = extractNumbers(budget.note)
  const numbers = amountNumbers.length > 0 ? amountNumbers : noteNumbers

  if (numbers.length === 0) {
    if (budget.is_free) return [0, 0]
    const fallback = BUDGET_LEVEL_RANGES[destination.budget_level]
    return fallback ? fallback : [0, 0]
  }

  const sorted = [...numbers].sort((a, b) => a - b)
  const priceMin = budget.is_free ? 0 : sorted[0]
  const priceMax = sorted[sorted.length - 1]
  return [priceMin, priceMax]
}

export function estimateDestinationBudgetFcfa(destination) {
  const [priceMin, priceMax] = priceRangeFor(destination)
  return (priceMin + priceMax) / 2
}

export function destinationMatchesBudgetRange(destination, min, max) {
  const rangeMin = min === '' || min === null || min === undefined ? -Infinity : Number(min)
  const rangeMax = max === '' || max === null || max === undefined ? Infinity : Number(max)

  if (Number.isNaN(rangeMin) || Number.isNaN(rangeMax)) return true

  const [priceMin, priceMax] = priceRangeFor(destination)
  return priceMin <= rangeMax && priceMax >= rangeMin
}