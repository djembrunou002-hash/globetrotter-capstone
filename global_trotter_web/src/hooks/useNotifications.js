import { useContext, useEffect, useRef } from 'react'
import NotificationsContext from '../context/NotificationsContext.js'

export function useNotifications() {
  return useContext(NotificationsContext)
}

export function useClearNotificationsOnLeave() {
  const { unseenItems, markSeen } = useNotifications()
  const pendingRef = useRef([])

  useEffect(() => {
    pendingRef.current = unseenItems.map(item => item.key)
  }, [unseenItems])

  useEffect(() => {
    return () => {
      if (pendingRef.current.length > 0) {
        markSeen(pendingRef.current)
      }
    }
  }, [markSeen])
}