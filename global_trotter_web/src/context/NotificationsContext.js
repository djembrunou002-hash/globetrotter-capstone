import { createContext } from 'react'

export const EMPTY_NOTIFICATIONS = {
  items: [],
  unseenItems: [],
  unseenCount: 0,
  seenKeys: new Set(),
  markSeen: () => {},
  refresh: () => {}
}

const NotificationsContext = createContext(EMPTY_NOTIFICATIONS)

export default NotificationsContext