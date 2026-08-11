import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NotificationsContext from './NotificationsContext.js'
import { getNotifications } from '../services/notificationService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import {
  addSeenKeys,
  loadSeenKeys,
  pruneSeenKeys,
  subscribeSeenKeys
} from '../utils/notificationStorage.js'

const POLL_INTERVAL = 60000
const MIN_FETCH_INTERVAL = 5000

function currentUserId() {
  return getUser()?.id || null
}

function NotificationsProvider({ children }) {
  const location = useLocation()
  const [userId, setUserId] = useState(currentUserId)
  const [items, setItems] = useState([])
  const [seenKeys, setSeenKeys] = useState(() => loadSeenKeys(currentUserId()))
  const lastFetchRef = useRef(0)

  const refresh = useCallback(
    async (force = false) => {
      const activeUserId = currentUserId()

      if (activeUserId !== userId) {
        setUserId(activeUserId)
        setSeenKeys(loadSeenKeys(activeUserId))
      }

      if (!getToken() || !activeUserId) {
        setItems([])
        return
      }

      const now = Date.now()
      if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return
      lastFetchRef.current = now

      try {
        const response = await getNotifications()
        const next = Array.isArray(response?.notifications) ? response.notifications : []
        setItems(next)
        pruneSeenKeys(
          activeUserId,
          next.map(item => item.key)
        )
      } catch {
        return
      }
    },
    [userId]
  )

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) refresh()
    })
    return () => {
      cancelled = true
    }
  }, [refresh, location.pathname])

  useEffect(() => {
    function handleVisible() {
      if (document.hidden) return
      refresh(true)
    }

    const interval = setInterval(handleVisible, POLL_INTERVAL)
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('pageshow', handleVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('pageshow', handleVisible)
    }
  }, [refresh])

  useEffect(() => {
    return subscribeSeenKeys(changedUserId => {
      if (changedUserId && userId && changedUserId !== userId) return
      setSeenKeys(loadSeenKeys(userId))
    })
  }, [userId])

  const markSeen = useCallback(keys => {
    if (!keys || keys.length === 0) return
    setSeenKeys(addSeenKeys(currentUserId(), keys))
  }, [])

  const unseenItems = useMemo(
    () => items.filter(item => !seenKeys.has(item.key)),
    [items, seenKeys]
  )

  const value = useMemo(
    () => ({
      items,
      unseenItems,
      unseenCount: unseenItems.length,
      seenKeys,
      markSeen,
      refresh
    }),
    [items, unseenItems, seenKeys, markSeen, refresh]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export default NotificationsProvider