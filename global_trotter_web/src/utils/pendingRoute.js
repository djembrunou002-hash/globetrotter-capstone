const KEY = 'globaltrotter:pending-route'

export function setPendingRoute(path) {
  try {
    if (path && path.startsWith('/')) sessionStorage.setItem(KEY, path)
  } catch {
    return
  }
}

export function takePendingRoute() {
  try {
    const path = sessionStorage.getItem(KEY)
    if (path) sessionStorage.removeItem(KEY)
    return path && path.startsWith('/') ? path : null
  } catch {
    return null
  }
}