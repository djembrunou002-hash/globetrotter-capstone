export function formatTime(time) {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let hour = parseInt(hStr, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${mStr} ${period}`
}

export function getHoursDisplay(hours) {
  if (!hours) {
    return { label: 'Hours not available', note: null }
  }
  if (hours.always_open) {
    return { label: 'Open anytime', note: hours.note || null }
  }
  if (hours.open && hours.close) {
    return { label: `${formatTime(hours.open)} - ${formatTime(hours.close)}`, note: hours.note || null }
  }
  return { label: 'Event-based hours', note: hours.note || null }
}

export function getBudgetDisplay(budget, budgetLevel) {
  if (budget && budget.amount_label) {
    return { label: budget.amount_label, note: budget.note || null, isFree: Boolean(budget.is_free) }
  }
  const fallback = { low: 'Low budget', medium: 'Medium budget', high: 'High budget' }
  return { label: fallback[budgetLevel] || budgetLevel || 'Budget unknown', note: null, isFree: false }
}