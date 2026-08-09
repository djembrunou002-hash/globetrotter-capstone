import { DEFAULT_LANGUAGE, translate } from '../i18n/translations.js'

const defaultT = (key, vars) => translate(DEFAULT_LANGUAGE, key, vars)

export function formatTime(time, language = DEFAULT_LANGUAGE) {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let hour = parseInt(hStr, 10)

  if (language === 'fr') {
    return `${hour}h${mStr}`
  }

  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${mStr} ${period}`
}

export function getHoursDisplay(hours, t = defaultT, language = DEFAULT_LANGUAGE) {
  if (!hours) {
    return { label: t('hours.unavailable'), note: null }
  }
  if (hours.always_open) {
    return { label: t('hours.alwaysOpen'), note: hours.note || null }
  }
  if (hours.open && hours.close) {
    return {
      label: `${formatTime(hours.open, language)} - ${formatTime(hours.close, language)}`,
      note: hours.note || null
    }
  }
  return { label: t('hours.eventBased'), note: hours.note || null }
}

export function getContactDisplay(contact) {
  const phone = contact?.phone && contact.phone.trim() ? contact.phone.trim() : null
  const email = contact?.email && contact.email.trim() ? contact.email.trim() : null
  if (!phone && !email) return null
  return { phone, email }
}

export function getBudgetDisplay(budget, budgetLevel, t = defaultT) {
  if (budget && budget.amount_label) {
    return { label: budget.amount_label, note: budget.note || null, isFree: Boolean(budget.is_free) }
  }
  const fallbackKeys = { low: 'budgetLevels.low', medium: 'budgetLevels.medium', high: 'budgetLevels.high' }
  const key = fallbackKeys[budgetLevel]
  return {
    label: key ? t(key) : budgetLevel || t('budgetLevels.unknown'),
    note: null,
    isFree: false
  }
}