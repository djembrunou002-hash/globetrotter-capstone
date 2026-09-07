export function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatStamp(iso, locale) {
  if (!iso) return ''

  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (sameDay) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u

export function isStickerText(text) {
  const trimmed = (text || '').trim()
  if (!trimmed || trimmed.length > 12) return false
  if (!EMOJI_ONLY.test(trimmed)) return false
  return [...trimmed].filter(char => /\p{Extended_Pictographic}/u.test(char)).length <= 3
}