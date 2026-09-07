const READ_PREFIX = 'globaltrotter:chat:read:'
const PINNED_PREFIX = 'globaltrotter:chat:pinned:'
const STARTED_PREFIX = 'globaltrotter:chat:started:'

const listeners = new Set()

function keyFor(prefix, userId) {
  return `${prefix}${userId || 'anonymous'}`
}

function notify() {
  listeners.forEach(listener => listener())
}

function read(prefix, userId, fallback) {
  try {
    const stored = localStorage.getItem(keyFor(prefix, userId))
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(prefix, userId, value) {
  try {
    localStorage.setItem(keyFor(prefix, userId), JSON.stringify(value))
  } catch {
    return value
  } finally {
    notify()
  }
  return value
}

export function loadReadCounts(userId) {
  return read(READ_PREFIX, userId, {})
}

export function setReadCount(userId, room, count) {
  const current = loadReadCounts(userId)
  if (current[room] === count) return current
  return write(READ_PREFIX, userId, { ...current, [room]: count })
}

export function pruneReadCounts(userId, validRooms) {
  const valid = new Set(validRooms)
  const current = loadReadCounts(userId)
  const next = {}

  Object.keys(current).forEach(room => {
    if (valid.has(room)) next[room] = current[room]
  })

  if (Object.keys(next).length === Object.keys(current).length) return current
  return write(READ_PREFIX, userId, next)
}

export function loadPinned(userId) {
  return read(PINNED_PREFIX, userId, [])
}

export function togglePinned(userId, room) {
  const current = loadPinned(userId)
  const next = current.includes(room) ? current.filter(item => item !== room) : [room, ...current]
  return write(PINNED_PREFIX, userId, next)
}

export function unpin(userId, room) {
  const current = loadPinned(userId)
  if (!current.includes(room)) return current
  return write(PINNED_PREFIX, userId, current.filter(item => item !== room))
}

export function loadStarted(userId) {
  return read(STARTED_PREFIX, userId, [])
}

export function addStarted(userId, peerId) {
  const current = loadStarted(userId)
  if (current.includes(peerId)) return current
  return write(STARTED_PREFIX, userId, [...current, peerId])
}

export function removeStarted(userId, peerId) {
  const current = loadStarted(userId)
  if (!current.includes(peerId)) return current
  return write(STARTED_PREFIX, userId, current.filter(item => item !== peerId))
}

export function subscribeChatStorage(listener) {
  listeners.add(listener)

  function handleStorage(event) {
    if (!event.key) return
    if (
      event.key.startsWith(READ_PREFIX) ||
      event.key.startsWith(PINNED_PREFIX) ||
      event.key.startsWith(STARTED_PREFIX)
    ) {
      listener()
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}