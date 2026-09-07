import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ChatUnreadContext from './ChatUnreadContext.js'
import { getConversations } from '../services/chatService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import {
  addStarted,
  loadPinned,
  loadReadCounts,
  loadStarted,
  pruneReadCounts,
  removeStarted,
  setReadCount,
  subscribeChatStorage,
  togglePinned,
  unpin
} from '../utils/chatStorage.js'

const POLL_INTERVAL = 60000
const MIN_FETCH_INTERVAL = 5000

function currentUserId() {
  return getUser()?.id || null
}

function ChatUnreadProvider({ children }) {
  const location = useLocation()

  const [userId, setUserId] = useState(currentUserId)
  const [conversations, setConversations] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [readCounts, setReadCounts] = useState(() => loadReadCounts(currentUserId()))
  const [pinned, setPinned] = useState(() => loadPinned(currentUserId()))
  const [started, setStarted] = useState(() => loadStarted(currentUserId()))

  const lastFetchRef = useRef(0)
  const conversationsRef = useRef([])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const refresh = useCallback(
    async (force = false) => {
      const activeUserId = currentUserId()

      if (activeUserId !== userId) {
        setUserId(activeUserId)
        setReadCounts(loadReadCounts(activeUserId))
        setPinned(loadPinned(activeUserId))
        setStarted(loadStarted(activeUserId))
      }

      if (!getToken() || !activeUserId) {
        setConversations([])
        setLoaded(true)
        return
      }

      const now = Date.now()
      if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return
      lastFetchRef.current = now

      try {
        const response = await getConversations()
        const next = Array.isArray(response?.conversations) ? response.conversations : []
        setConversations(next)
        setError('')
        setLoaded(true)
        pruneReadCounts(
          activeUserId,
          next.map(item => item.room)
        )
      } catch (err) {
        setError(err.message)
        setLoaded(true)
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
    return subscribeChatStorage(() => {
      const activeUserId = currentUserId()
      setReadCounts(loadReadCounts(activeUserId))
      setPinned(loadPinned(activeUserId))
      setStarted(loadStarted(activeUserId))
    })
  }, [])

  const markRead = useCallback(room => {
    if (!room) return
    const entry = conversationsRef.current.find(item => item.room === room)
    setReadCounts(setReadCount(currentUserId(), room, entry ? entry.incoming_count || 0 : 0))
  }, [])

  const applyMessage = useCallback(
    (message, options = {}) => {
      const known = conversationsRef.current.some(item => item.room === message.room)

      if (!known) {
        refresh(true)
        return
      }

      const mine = currentUserId() === message.user_id

      setConversations(prev =>
        prev.map(item =>
          item.room === message.room
            ? {
                ...item,
                updated_at: message.created_at,
                incoming_count: (item.incoming_count || 0) + (mine ? 0 : 1),
                last_message: {
                  author_name: message.author_name,
                  kind: message.kind,
                  text: message.text || '',
                  created_at: message.created_at,
                  mine
                }
              }
            : item
        )
      )

      if (options.active && !mine) {
        const entry = conversationsRef.current.find(item => item.room === message.room)
        const seen = (entry ? entry.incoming_count || 0 : 0) + 1
        setReadCounts(setReadCount(currentUserId(), message.room, seen))
      }
    },
    [refresh]
  )

  const dropConversation = useCallback(room => {
    setConversations(prev => prev.filter(item => item.room !== room))
    setPinned(unpin(currentUserId(), room))
  }, [])

  const togglePin = useCallback(room => {
    setPinned(togglePinned(currentUserId(), room))
  }, [])

  const startWith = useCallback(peerId => {
    setStarted(addStarted(currentUserId(), peerId))
  }, [])

  const forgetStarted = useCallback(peerId => {
    setStarted(removeStarted(currentUserId(), peerId))
  }, [])

  const unreadByRoom = useMemo(() => {
    const map = {}
    conversations.forEach(item => {
      const total = item.incoming_count || 0
      const seen = readCounts[item.room] || 0
      map[item.room] = Math.max(0, total - seen)
    })
    return map
  }, [conversations, readCounts])

  const totalUnread = useMemo(
    () => Object.values(unreadByRoom).reduce((sum, count) => sum + count, 0),
    [unreadByRoom]
  )

  const unreadFor = useCallback(room => unreadByRoom[room] || 0, [unreadByRoom])

  const value = useMemo(
    () => ({
      conversations,
      loaded,
      error,
      pinned,
      started,
      totalUnread,
      unreadFor,
      markRead,
      applyMessage,
      dropConversation,
      togglePin,
      startWith,
      forgetStarted,
      refresh
    }),
    [
      conversations,
      loaded,
      error,
      pinned,
      started,
      totalUnread,
      unreadFor,
      markRead,
      applyMessage,
      dropConversation,
      togglePin,
      startWith,
      forgetStarted,
      refresh
    ]
  )

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>
}

export default ChatUnreadProvider