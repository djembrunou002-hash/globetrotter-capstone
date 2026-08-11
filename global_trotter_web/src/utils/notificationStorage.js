const PREFIX = 'globaltrotter:notifications:'
const listeners = new Set()

function storageKey(userId) {
  return `${PREFIX}${userId || 'anonymous'}`
}

function notify(userId) {
  listeners.forEach(listener => listener(userId || null))
}

export function loadSeenKeys(userId) {
  try {
    const stored = localStorage.getItem(storageKey(userId))
    const parsed = stored ? JSON.parse(stored) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function persist(userId, keys) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...keys]))
  } catch {
    return
  } finally {
    notify(userId)
  }
}

export function addSeenKeys(userId, keys) {
  const next = loadSeenKeys(userId)
  const before = next.size
  keys.forEach(key => next.add(key))
  if (next.size === before) return next
  persist(userId, next)
  return next
}

export function pruneSeenKeys(userId, validKeys) {
  const valid = new Set(validKeys)
  const current = loadSeenKeys(userId)
  const next = new Set([...current].filter(key => valid.has(key)))
  if (next.size === current.size) return current
  persist(userId, next)
  return next
}

export function clearSeenKeys(userId) {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    return
  } finally {
    notify(userId)
  }
}

export function subscribeSeenKeys(listener) {
  listeners.add(listener)

  function handleStorage(event) {
    if (!event.key || !event.key.startsWith(PREFIX)) return
    listener(event.key.slice(PREFIX.length))
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}