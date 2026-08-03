const PREFIX = 'globaltrotter:filters:'

export function readFilterState(key, fallback) {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed ? { ...fallback, ...parsed } : { ...fallback }
  } catch {
    return { ...fallback }
  }
}

export function writeFilterState(key, state) {
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(state))
  } catch {
    return
  }
}

export function clearFilterState(key) {
  try {
    sessionStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    return
  }
}