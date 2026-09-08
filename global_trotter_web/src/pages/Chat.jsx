import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import NewChatModal from '../components/NewChatModal.jsx'
import NewGroupModal from '../components/NewGroupModal.jsx'
import GroupPanel from '../components/GroupPanel.jsx'
import NotificationDot from '../components/NotificationDot.jsx'
import MessageBubble from '../components/MessageBubble.jsx'
import AttachmentComposer from '../components/AttachmentComposer.jsx'
import EmojiPicker from '../components/EmojiPicker.jsx'
import VoiceRecorder from '../components/VoiceRecorder.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import CallPanel from '../components/CallPanel.jsx'
import AttachMenu from '../components/AttachMenu.jsx'
import SharePicker from '../components/SharePicker.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useChatUnread } from '../hooks/useChatUnread.js'
import {
  GENERAL_ROOM,
  connectChat,
  deleteConversation,
  directRoom,
  disconnectChat,
  getPresence,
  peerIdOf
} from '../services/chatService.js'
import {
  addGroupMember,
  createGroup,
  getGroup,
  joinGroup,
  removeGroupMember,
  renameGroup,
  rotateGroupInvite,
  setGroupAdmin,
  updateGroupSettings
} from '../services/groupService.js'
import { getFriends } from '../services/friendService.js'
import {
  DOCUMENT_TYPES,
  MEDIA_TYPES,
  compressImage,
  uploadAttachment
} from '../services/chatUpload.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import { formatStamp, initials } from '../utils/chatFormat.js'
import { destinationLink, itineraryLink } from '../utils/shareLinks.js'
import '../styles/Chat.css'

const JOIN_KEY = 'globaltrotter_chat_joined'





function joinKeyFor(user) {
  return user && user.id ? `${JOIN_KEY}_${user.id}` : JOIN_KEY
}

function hasJoinedBefore(user) {
  try {
    return localStorage.getItem(joinKeyFor(user)) === 'true'
  } catch {
    return false
  }
}

function rememberJoin(user, value) {
  try {
    if (value) localStorage.setItem(joinKeyFor(user), 'true')
    else localStorage.removeItem(joinKeyFor(user))
  } catch {
    return
  }
}

function isGeneralRoom(room) {
  return room === GENERAL_ROOM
}

function titleOf(entry, t) {
  if (entry.kind === 'general') return t('chat.title')
  if (entry.kind === 'group') return entry.group ? entry.group.name : t('chat.groupFallback')
  return entry.peer ? entry.peer.name : ''
}

function GroupGlyph({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.8" />
      <path d="M16 3.2A4 4 0 0 1 16 11" />
    </svg>
  )
}

function Chat() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const [currentUser] = useState(getUser)

  const {
    conversations,
    loaded,
    error,
    pinned,
    started,
    unreadFor,
    markRead,
    applyMessage,
    dropConversation,
    togglePin,
    startWith,
    forgetStarted,
    refresh
  } = useChatUnread()

  const [friends, setFriends] = useState([])
  const [friendsLoaded, setFriendsLoaded] = useState(false)

  const [filter, setFilter] = useState('all')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [panelGroup, setPanelGroup] = useState(null)
  const [panelBusy, setPanelBusy] = useState(false)
  const [panelError, setPanelError] = useState('')

  const [activeRoom, setActiveRoom] = useState(null)
  const [cardMenu, setCardMenu] = useState(null)
  const [pendingClear, setPendingClear] = useState(null)
  const [generalJoined, setGeneralJoined] = useState(() => hasJoinedBefore(getUser()))

  const [status, setStatus] = useState('')
  const [thread, setThread] = useState({ room: null, messages: [] })
  const [presence, setPresence] = useState({})
  const [typing, setTyping] = useState({})
  const [calls, setCalls] = useState({})
  const [joinedCall, setJoinedCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [menuFor, setMenuFor] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [recorderOpen, setRecorderOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pickerKind, setPickerKind] = useState(null)
  const [pendingFiles, setPendingFiles] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const activeRoomRef = useRef(null)
  const applyMessageRef = useRef(applyMessage)
  const dropConversationRef = useRef(dropConversation)
  const refreshRef = useRef(refresh)
  const panelRoomRef = useRef(null)
  const inviteHandledRef = useRef(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingActiveRef = useRef(false)
  const typingCooldownRef = useRef(null)
  const typingStopRef = useRef(null)
  const cardTimerRef = useRef(null)
  const cardFiredRef = useRef(false)
  const documentRef = useRef(null)
  const mediaRef = useRef(null)
  const threadHeaderRef = useRef(null)

  const headerPassed = useHeaderPassed(threadHeaderRef)

  useEffect(() => {
    activeRoomRef.current = activeRoom
    applyMessageRef.current = applyMessage
    dropConversationRef.current = dropConversation
    refreshRef.current = refresh
    panelRoomRef.current = panelGroup ? panelGroup.id : null
  })

  useEffect(() => {
    if (!getToken()) navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let active = true

    getFriends()
      .then(response => {
        if (!active) return
        setFriends(response.friends || [])
        setFriendsLoaded(true)
      })
      .catch(() => {
        if (active) setFriendsLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const ids = []
    conversations.forEach(item => {
      if (item.peer) ids.push(item.peer.id)
      if (item.group && item.group.member_ids) ids.push(...item.group.member_ids)
    })

    const unique = [...new Set(ids)]
    if (unique.length === 0) return

    let active = true
    getPresence(unique)
      .then(response => {
        if (!active) return
        setPresence(prev => ({ ...(response.presence || {}), ...prev }))
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [conversations])

  useEffect(() => {
    if (inviteHandledRef.current) return

    const token = new URLSearchParams(window.location.search).get('join')
    if (!token) return

    inviteHandledRef.current = true

    joinGroup(token)
      .then(response => {
        navigate('/chat', { replace: true })
        refreshRef.current(true)
        setActiveRoom(response.group.id)
        setThread({ room: null, messages: [] })
      })
      .catch(err => {
        navigate('/chat', { replace: true })
        setStatus(err.message)
      })
  }, [navigate])

  useEffect(() => {
    const socket = connectChat()

    if (!socket) {
      const id = setTimeout(() => setStatus(t('chat.notSignedIn')), 0)
      return () => clearTimeout(id)
    }

    socketRef.current = socket

    socket.on('connect', () => setStatus(''))

    socket.on('connect_error', () => setStatus(t('chat.connectionFailed')))

    socket.on('disconnect', () => setStatus(t('chat.reconnecting')))

    socket.on('chat:history', payload => {
      setThread({ room: payload.room, messages: payload.messages || [] })
      setStatus('')
      socket.emit('chat:read', { room: payload.room })
    })

    socket.on('chat:message', payload => {
      const message = payload.message
      const isActive = activeRoomRef.current === message.room

      setThread(prev =>
        prev.room === message.room ? { ...prev, messages: [...prev.messages, message] } : prev
      )

      applyMessageRef.current(message, { active: isActive })

      if (isActive) socketRef.current?.emit('chat:read', { room: message.room })

      setTyping(prev => {
        const room = { ...(prev[message.room] || {}) }
        delete room[message.user_id]
        return { ...prev, [message.room]: room }
      })
    })

    socket.on('chat:updated', payload => {
      const message = payload.message
      setThread(prev =>
        prev.room === message.room
          ? { ...prev, messages: prev.messages.map(m => (m.id === message.id ? message : m)) }
          : prev
      )
    })

    socket.on('chat:deleted', payload => {
      setThread(prev =>
        prev.room === payload.room
          ? { ...prev, messages: prev.messages.filter(m => m.id !== payload.id) }
          : prev
      )
    })

    socket.on('chat:cleared', payload => {
      setThread(prev => (prev.room === payload.room ? { ...prev, messages: [] } : prev))
      dropConversationRef.current(payload.room)
    })

    socket.on('chat:groups', () => {
      refreshRef.current(true)

      const room = panelRoomRef.current
      if (!room) return

      getGroup(room)
        .then(response => setPanelGroup(response.group))
        .catch(() => setPanelGroup(null))
    })

    socket.on('chat:online', payload => {
      const ids = payload.ids || []
      setPresence(prev => {
        const next = { ...prev }
        ids.forEach(id => {
          next[id] = { online: true, last_seen: null }
        })
        return next
      })
    })

    socket.on('chat:presence', payload => {
      setPresence(prev => ({
        ...prev,
        [payload.user_id]: { online: payload.online, last_seen: payload.last_seen }
      }))
    })

    socket.on('chat:typing', payload => {
      const at = Date.now()

      setTyping(prev => {
        const room = { ...(prev[payload.room] || {}) }

        if (payload.mode === 'stop') delete room[payload.user_id]
        else room[payload.user_id] = { mode: payload.mode, name: payload.name, at }

        return { ...prev, [payload.room]: room }
      })
    })

    socket.on('chat:receipt', payload => {
      const ids = new Set(payload.ids || [])

      setThread(prev => {
        if (prev.room !== payload.room) return prev

        return {
          ...prev,
          messages: prev.messages.map(item => {
            if (!ids.has(item.id)) return item

            const delivered = new Set(item.delivered_to || [])
            delivered.add(payload.user_id)

            const read = new Set(item.read_by || [])
            if (payload.state === 'read') read.add(payload.user_id)

            return {
              ...item,
              delivered_to: [...delivered],
              read_by: [...read]
            }
          })
        }
      })
    })

    socket.on('call:active', payload => {
      const map = {}
      ;(payload.calls || []).forEach(item => {
        map[item.room] = item
      })
      setCalls(map)
    })

    socket.on('call:state', payload => {
      setCalls(prev => {
        const next = { ...prev }
        if (payload.call) next[payload.room] = payload.call
        else delete next[payload.room]
        return next
      })

      if (!payload.call) {
        setJoinedCall(current => (current === payload.room ? null : current))
        setIncomingCall(current => (current && current.room === payload.room ? null : current))
      }
    })

    socket.on('call:incoming', payload => {
      setIncomingCall(payload.call)
    })

    socket.on('chat:error', payload => {
      setStatus(payload.error)
    })

    return () => {
      socket.off()
      disconnectChat()
      socketRef.current = null
    }
  }, [t])

  useEffect(() => {
    if (!activeRoom) return
    if (activeRoom === GENERAL_ROOM && !generalJoined) return

    const socket = socketRef.current
    if (!socket) return

    const join = () => socket.emit('chat:join', { room: activeRoom })

    if (socket.connected) join()
    socket.on('connect', join)

    return () => socket.off('connect', join)
  }, [activeRoom, generalJoined])

  useEffect(() => {
    if (!activeRoom) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, activeRoom])

  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - 7000

      setTyping(prev => {
        let changed = false
        const next = {}

        Object.entries(prev).forEach(([room, entries]) => {
          const kept = {}
          Object.entries(entries).forEach(([userId, entry]) => {
            if (entry.at >= cutoff) kept[userId] = entry
            else changed = true
          })
          next[room] = kept
        })

        return changed ? next : prev
      })
    }, 2500)

    return () => clearInterval(timer)
  }, [])

  const directEntries = conversations.filter(item => item.kind === 'direct')
  const groupEntries = conversations.filter(item => item.kind === 'group')

  const pendingEntries = (currentUser ? started : [])
    .filter(id => !directEntries.some(item => item.peer && item.peer.id === id))
    .map(id => friends.find(friend => friend.id === id))
    .filter(Boolean)
    .map(friend => ({
      room: directRoom(currentUser.id, friend.id),
      kind: 'direct',
      peer: friend,
      group: null,
      updated_at: null,
      incoming_count: 0,
      last_message: null
    }))

  const generalEntry = conversations.find(item => item.room === GENERAL_ROOM) || {
    room: GENERAL_ROOM,
    kind: 'general',
    peer: null,
    group: null,
    updated_at: null,
    incoming_count: 0,
    last_message: null
  }

  const all = [generalEntry, ...groupEntries, ...directEntries, ...pendingEntries]

  const visible = all.filter(item => {
    if (filter === 'groups') return item.kind === 'group'
    if (filter === 'direct') return item.kind === 'direct'
    return true
  })

  const pinnedCards = pinned.map(room => visible.find(item => item.room === room)).filter(Boolean)

  const restCards = visible
    .filter(item => !pinned.includes(item.room))
    .sort((a, b) => {
      if (a.room === GENERAL_ROOM) return -1
      if (b.room === GENERAL_ROOM) return 1
      return (b.updated_at || '').localeCompare(a.updated_at || '')
    })

  const cards = [...pinnedCards, ...restCards]

  const activeEntry = all.find(item => item.room === activeRoom) || null
  const activeGroup = activeEntry && activeEntry.kind === 'group' ? activeEntry.group : null
  const canPost = !activeGroup || activeGroup.can_post

  const roomCall = activeRoom ? calls[activeRoom] || null : null
  const inCall = Boolean(joinedCall && roomCall && joinedCall === activeRoom)
  const canCall = Boolean(activeRoom) && !isGeneralRoom(activeRoom)

  const recipients = (() => {
    if (!activeRoom || !currentUser) return []
    if (activeGroup) return (activeGroup.member_ids || []).filter(id => id !== currentUser.id)

    const peer = peerIdOf(activeRoom, currentUser.id)
    return peer ? [peer] : []
  })()

  const groupOnline = activeGroup
    ? (activeGroup.member_ids || []).filter(id => presence[id] && presence[id].online).length
    : 0

  const activePeerId =
    activeRoom && currentUser && !activeGroup ? peerIdOf(activeRoom, currentUser.id) : null
  const peerPresence = activePeerId ? presence[activePeerId] : null

  function presenceLabel() {
    if (activeGroup) {
      return t('chat.groupOnlineCount', {
        online: groupOnline,
        total: activeGroup.member_count
      })
    }

    if (!peerPresence) return ''
    if (peerPresence.online) return t('chat.online')
    if (!peerPresence.last_seen) return t('chat.offline')
    return t('chat.lastSeen', { when: formatStamp(peerPresence.last_seen, locale) })
  }

  function typingEntries(room) {
    const entries = typing[room]
    if (!entries) return []

    return Object.entries(entries).map(([userId, entry]) => ({
      user_id: userId,
      name: entry.name,
      mode: entry.mode
    }))
  }

  function typingPreview(room) {
    const entries = typingEntries(room)
    if (entries.length === 0) return null

    const voice = entries.some(entry => entry.mode === 'voice')
    const label = voice ? t('chat.recordingIndicator') : t('chat.typingIndicator')

    if (entries.length === 1 && entries[0].name) return `${entries[0].name} ${label}`
    return label
  }

  function previewOf(entry) {
    if (!entry.last_message) return t('chat.noMessagesYet')

    const last = entry.last_message
    const body =
      last.kind === 'voice'
        ? t('chat.voiceNote')
        : last.kind === 'text'
          ? last.text
          : last.text || t(`chat.${last.kind}Note`)

    if (last.mine) return `${t('chat.you')}: ${body}`
    if (entry.kind !== 'direct') return `${last.author_name}: ${body}`
    return body
  }

  function startCardPress(entry) {
    cardFiredRef.current = false
    cardTimerRef.current = setTimeout(() => {
      cardFiredRef.current = true
      setSelectedCard(entry)
    }, 420)
  }

  function cancelCardPress() {
    if (cardTimerRef.current) {
      clearTimeout(cardTimerRef.current)
      cardTimerRef.current = null
    }
  }

  function releaseCardPress(entry) {
    cancelCardPress()

    if (cardFiredRef.current) {
      cardFiredRef.current = false
      return
    }

    if (selectedCard) {
      setSelectedCard(current => (current && current.room === entry.room ? null : entry))
      return
    }

    openRoom(entry)
  }

  function emitTyping(mode) {
    if (!socketRef.current || !activeRoom) return

    socketRef.current.emit('chat:typing', {
      room: activeRoom,
      mode,
      name: currentUser ? currentUser.name : ''
    })
  }

  function stopTyping() {
    if (typingStopRef.current) {
      clearTimeout(typingStopRef.current)
      typingStopRef.current = null
    }

    if (typingCooldownRef.current) {
      clearTimeout(typingCooldownRef.current)
      typingCooldownRef.current = null
    }

    if (!typingActiveRef.current) return

    typingActiveRef.current = false
    emitTyping('stop')
  }

  function handleDraftChange(value) {
    setDraft(value)

    if (!value.trim()) {
      stopTyping()
      return
    }

    if (!typingCooldownRef.current) {
      typingActiveRef.current = true
      emitTyping('text')

      typingCooldownRef.current = setTimeout(() => {
        typingCooldownRef.current = null
      }, 2500)
    }

    if (typingStopRef.current) clearTimeout(typingStopRef.current)
    typingStopRef.current = setTimeout(stopTyping, 3200)
  }

  function startCall(kind) {
    if (!activeRoom || !socketRef.current) return

    socketRef.current.emit('call:start', { room: activeRoom, kind })
    setJoinedCall(activeRoom)
    setIncomingCall(null)
  }

  function joinCall(room) {
    if (!socketRef.current) return

    socketRef.current.emit('call:join', { room })
    setJoinedCall(room)
    setIncomingCall(null)
  }

  function leaveCall() {
    const room = joinedCall
    setJoinedCall(null)
    if (room) socketRef.current?.emit('call:leave', { room })
  }

  function resetComposer() {
    stopTyping()
    setDraft('')
    setReplyTo(null)
    setEditing(null)
    setMenuFor(null)
    setStatus('')
  }

  function openRoom(entry) {
    setCardMenu(null)
    setSelectedCard(null)
    setSelectedMessage(null)
    resetComposer()
    setThread({ room: null, messages: [] })
    setActiveRoom(entry.room)
    markRead(entry.room)
    socketRef.current?.emit('chat:read', { room: entry.room })
    window.scrollTo({ top: 0 })
  }

  function closeRoom() {
    if (activeRoom === GENERAL_ROOM) socketRef.current?.emit('chat:leave', { room: GENERAL_ROOM })
    if (activeRoom) markRead(activeRoom)
    resetComposer()
    setSelectedMessage(null)
    setThread({ room: null, messages: [] })
    setActiveRoom(null)
    setPanelGroup(null)
    refresh(true)
  }

  function handleStartChat(friend) {
    startWith(friend.id)
    setShowNewChat(false)
    openRoom({ room: directRoom(currentUser.id, friend.id), kind: 'direct', peer: friend })
  }

  async function handleCreateGroup(name, memberIds) {
    setCreatingGroup(true)
    setGroupError('')

    try {
      const response = await createGroup(name, memberIds)
      setShowNewGroup(false)
      await refresh(true)
      openRoom({ room: response.group.id, kind: 'group', group: response.group })
    } catch (err) {
      setGroupError(err.message)
    } finally {
      setCreatingGroup(false)
    }
  }

  function handleTogglePin(entry) {
    setCardMenu(null)
    togglePin(entry.room)
  }

  async function openPanel() {
    if (!activeGroup) return

    setPanelError('')
    try {
      const response = await getGroup(activeRoom)
      setPanelGroup(response.group)
    } catch (err) {
      setStatus(err.message)
    }
  }

  async function runPanelAction(action) {
    setPanelBusy(true)
    setPanelError('')

    try {
      const response = await action()
      if (response && response.group) setPanelGroup(response.group)
      await refresh(true)
      return response
    } catch (err) {
      setPanelError(err.message)
      return null
    } finally {
      setPanelBusy(false)
    }
  }

  async function handleLeaveGroup() {
    const groupId = panelGroup ? panelGroup.id : activeRoom
    if (!groupId) return

    setPanelBusy(true)
    setPanelError('')

    try {
      await removeGroupMember(groupId, currentUser.id)
      setPanelGroup(null)
      dropConversation(groupId)
      setThread({ room: null, messages: [] })
      setActiveRoom(null)
      await refresh(true)
    } catch (err) {
      setPanelError(err.message)
    } finally {
      setPanelBusy(false)
    }
  }

  async function confirmClear() {
    const target = pendingClear
    setPendingClear(null)
    if (!target) return

    try {
      await deleteConversation(target.room)
      dropConversation(target.room)
      if (target.peer) forgetStarted(target.peer.id)
      if (activeRoomRef.current === target.room) {
        setThread({ room: null, messages: [] })
        setActiveRoom(null)
      }
    } catch (err) {
      setStatus(err.message)
    }
  }

  function handleJoinGeneral() {
    rememberJoin(currentUser, true)
    setGeneralJoined(true)
    setStatus('')
  }

  function handleLeaveGeneral() {
    socketRef.current?.emit('chat:leave', { room: GENERAL_ROOM })
    rememberJoin(currentUser, false)
    setGeneralJoined(false)
    setThread({ room: null, messages: [] })
    resetComposer()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !socketRef.current) return

    if (editing) {
      socketRef.current.emit('chat:edit', { id: editing.id, text })
      setEditing(null)
    } else {
      socketRef.current.emit('chat:send', {
        room: activeRoom,
        text,
        reply_to: replyTo ? replyTo.id : null
      })
      setReplyTo(null)
    }

    setDraft('')
  }



  function handleFilesChosen(event) {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (picked.length === 0) return

    setUploadError('')
    setPendingFiles(picked)
  }

  async function handleSendAttachments(entries) {
    setUploading(true)
    setUploadError('')
    setSentCount(0)
    setProgress(0)

    const room = activeRoom
    const parent = replyTo ? replyTo.id : null

    try {
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]
        setSentCount(index)
        setProgress(0)

        const prepared = await compressImage(entry.file)
        await uploadAttachment(prepared, {
          room,
          caption: entry.caption,
          replyTo: index === 0 ? parent : null,
          onProgress: setProgress
        })
      }

      setPendingFiles(null)
      setReplyTo(null)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      setProgress(0)
      setSentCount(0)
    }
  }

  function handleVoiceReady({ blob, mime, duration }) {
    setRecorderOpen(false)
    emitTyping('stop')

    const room = activeRoom
    const parent = replyTo ? replyTo.id : null

    blob.arrayBuffer().then(buffer => {
      socketRef.current?.emit('chat:voice', {
        room,
        blob: buffer,
        mime,
        duration,
        reply_to: parent
      })
      setReplyTo(null)
    })
  }

  function sendShare(kind, ids) {
    setPickerKind(null)
    if (!socketRef.current || ids.length === 0) return

    ids.forEach(id => {
      socketRef.current.emit('chat:send', {
        room: activeRoom,
        text: kind === 'destination' ? destinationLink(id) : itineraryLink(id),
        reply_to: null
      })
    })

    setReplyTo(null)
  }

  function handleSticker(emoji) {
    setEmojiOpen(false)
    if (!socketRef.current) return

    socketRef.current.emit('chat:send', {
      room: activeRoom,
      text: emoji,
      reply_to: replyTo ? replyTo.id : null
    })
    setReplyTo(null)
  }


  function startReply(message) {
    setMenuFor(null)
    setEditing(null)
    setReplyTo(message)
    setDraft('')
    inputRef.current?.focus()
  }

  function startEdit(message) {
    setMenuFor(null)
    setReplyTo(null)
    setEditing(message)
    setDraft(message.text)
    inputRef.current?.focus()
  }

  function cancelComposerState() {
    setEditing(null)
    setReplyTo(null)
    setDraft('')
  }

  function confirmDelete() {
    if (pendingDelete && socketRef.current) {
      socketRef.current.emit('chat:delete', { id: pendingDelete.id })
    }
    setPendingDelete(null)
  }

  const isGeneral = activeRoom === GENERAL_ROOM
  const heading = activeEntry ? titleOf(activeEntry, t) : ''
  const gated = isGeneral && !generalJoined
  const loadingThread = Boolean(activeRoom) && !gated && thread.room !== activeRoom
  const showAuthor = isGeneral || Boolean(activeGroup)

  const filters = [
    { id: 'all', label: t('chat.filterAll') },
    { id: 'groups', label: t('chat.filterGroups') },
    { id: 'direct', label: t('chat.filterDirect') }
  ]

  return (
    <div
      className={`chat ${activeRoom ? 'chat--open' : ''} ${
        selectedCard || selectedMessage ? 'chat--selecting' : ''
      }`}
    >
      <div className="chat__panes">
        <aside className="chat__sidebar">
          <header className="page-header chat__header">
            {selectedCard ? (
              <div className="chat__selection">
                <button
                  type="button"
                  className="chat__selection-action"
                  onClick={() => setSelectedCard(null)}
                  aria-label={t('common.cancel')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>

                <span className="chat__selection-title">{titleOf(selectedCard, t)}</span>

                <button
                  type="button"
                  className="chat__selection-action"
                  onClick={() => {
                    togglePin(selectedCard.room)
                    setSelectedCard(null)
                  }}
                  aria-label={pinned.includes(selectedCard.room) ? t('chat.unpin') : t('chat.pin')}
                  title={pinned.includes(selectedCard.room) ? t('chat.unpin') : t('chat.pin')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M14 2l8 8-3 1-1 4-4-2-5 5-1-1 5-5-2-4 4-1z" />
                  </svg>
                </button>

                {(selectedCard.kind === 'direct' ||
                  (selectedCard.kind === 'group' && selectedCard.group && selectedCard.group.is_admin)) && (
                  <button
                    type="button"
                    className="chat__selection-action chat__selection-action--danger"
                    onClick={() => {
                      setPendingClear(selectedCard)
                      setSelectedCard(null)
                    }}
                    aria-label={t('chat.deleteChat')}
                    title={t('chat.deleteChat')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <h1 className="chat__title">{t('chat.pageTitle')}</h1>
            )}
          </header>

          <div className="chat__filters" role="tablist">
            {filters.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`chat__filter ${filter === item.id ? 'is-active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && <p className="chat__status">{error}</p>}

          {!loaded && <PlanetLoader label={t('chat.loadingConversations')} size="small" />}

          {loaded && cards.length === 0 && (
            <p className="chat__empty">{t('chat.noConversations')}</p>
          )}

          {loaded && cards.length > 0 && (
            <ul className="chat__list">
              {cards.map(entry => {
                const unread = unreadFor(entry.room)
                const isPinned = pinned.includes(entry.room)

                return (
                  <li
                    key={entry.room}
                    className={`chat-card ${entry.room === activeRoom ? 'is-active' : ''} ${
                      selectedCard && selectedCard.room === entry.room ? 'is-selected' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="chat-card__open"
                      onClick={() => {
                        if (cardTimerRef.current || selectedCard) return
                        openRoom(entry)
                      }}
                      onPointerDown={() => startCardPress(entry)}
                      onPointerUp={() => releaseCardPress(entry)}
                      onPointerLeave={cancelCardPress}
                      onPointerCancel={cancelCardPress}
                      onContextMenu={event => {
                        if (window.matchMedia('(pointer: coarse)').matches) event.preventDefault()
                      }}
                    >
                      <span
                        className={`chat-card__avatar ${entry.kind !== 'direct' ? 'chat-card__avatar--general' : ''}`}
                        aria-hidden="true"
                      >
                        {entry.kind === 'general' ? (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M3 12h18" />
                            <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
                          </svg>
                        ) : entry.kind === 'group' ? (
                          <GroupGlyph />
                        ) : (
                          initials(entry.peer && entry.peer.name)
                        )}
                      </span>

                      <span className="chat-card__body">
                        <span className="chat-card__top">
                          <span className="chat-card__name">
                            {titleOf(entry, t)}
                            {isPinned && (
                              <svg className="chat-card__pin" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                                <path d="M14 2l8 8-3 1-1 4-4-2-5 5-1-1 5-5-2-4 4-1z" />
                              </svg>
                            )}
                          </span>
                          <span className="chat-card__time">{formatStamp(entry.updated_at, locale)}</span>
                        </span>

                        <span className="chat-card__bottom">
                          <span
                            className={`chat-card__preview ${
                              typingPreview(entry.room) ? 'chat-card__preview--typing' : ''
                            }`}
                          >
                            {typingPreview(entry.room) || previewOf(entry)}
                          </span>
                          {unread > 0 && (
                            <NotificationDot
                              className="notif-dot--chat"
                              count={unread}
                              label={t('chat.unreadBadge')}
                            />
                          )}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="chat-card__more"
                      onClick={() => setCardMenu(cardMenu === entry.room ? null : entry.room)}
                      aria-label={t('chat.chatOptions')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="5" r="1.7" />
                        <circle cx="12" cy="12" r="1.7" />
                        <circle cx="12" cy="19" r="1.7" />
                      </svg>
                    </button>

                    {cardMenu === entry.room && (
                      <>
                        <div className="chat__menu-backdrop" onClick={() => setCardMenu(null)} />
                        <div className="chat-card__menu">
                          <button type="button" onClick={() => handleTogglePin(entry)}>
                            {isPinned ? t('chat.unpin') : t('chat.pin')}
                          </button>
                          {(entry.kind === 'direct' ||
                            (entry.kind === 'group' && entry.group && entry.group.is_admin)) && (
                            <button
                              type="button"
                              className="chat__menu-item--danger"
                              onClick={() => {
                                setCardMenu(null)
                                setPendingClear(entry)
                              }}
                            >
                              {t('chat.deleteChat')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            className="chat__fab"
            onClick={() => setShowNewChat(true)}
            aria-label={t('chat.newChatTitle')}
            title={t('chat.newChatTitle')}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </aside>

        <section className="chat__thread">
          {!activeRoom ? (
            <div className="chat__placeholder">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.6A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
              </svg>
              <p>{t('chat.pickConversation')}</p>
            </div>
          ) : (
            <>
              <header ref={threadHeaderRef} className="page-header chat__header chat__header--thread">
                {selectedMessage ? (
                  <div className="chat__selection">
                    <button
                      type="button"
                      className="chat__selection-action"
                      onClick={() => setSelectedMessage(null)}
                      aria-label={t('common.cancel')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>

                    <span className="chat__selection-title">{t('chat.oneSelected')}</span>

                    {canPost && (
                      <button
                        type="button"
                        className="chat__selection-action"
                        onClick={() => {
                          startReply(selectedMessage)
                          setSelectedMessage(null)
                        }}
                        aria-label={t('chat.reply')}
                        title={t('chat.reply')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 17l-6-6 6-6" />
                          <path d="M3 11h9a8 8 0 0 1 8 8v2" />
                        </svg>
                      </button>
                    )}

                    {currentUser &&
                      selectedMessage.user_id === currentUser.id &&
                      selectedMessage.kind === 'text' && (
                        <button
                          type="button"
                          className="chat__selection-action"
                          onClick={() => {
                            startEdit(selectedMessage)
                            setSelectedMessage(null)
                          }}
                          aria-label={t('common.edit')}
                          title={t('common.edit')}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                      )}

                    {currentUser && selectedMessage.user_id === currentUser.id && (
                      <button
                        type="button"
                        className="chat__selection-action chat__selection-action--danger"
                        onClick={() => {
                          setPendingDelete(selectedMessage)
                          setSelectedMessage(null)
                        }}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                <button
                  type="button"
                  className="chat__back"
                  onClick={closeRoom}
                  aria-label={t('common.back')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <span
                  className={`chat__peer ${activeGroup || isGeneral ? 'chat__peer--group' : ''}`}
                  aria-hidden="true"
                >
                  {isGeneral ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18" />
                      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
                    </svg>
                  ) : activeGroup ? (
                    <GroupGlyph size={18} />
                  ) : (
                    initials(heading)
                  )}
                </span>

                <span className="chat__heading">
                  <h1 className="chat__title">{heading}</h1>
                  {!isGeneral && presenceLabel() && (
                    <span
                      className={`chat__subtitle ${
                        peerPresence && peerPresence.online ? 'chat__subtitle--online' : ''
                      }`}
                    >
                      {presenceLabel()}
                    </span>
                  )}
                </span>

                {canCall && (
                  <button
                    type="button"
                    className="chat__call-button"
                    onClick={() => startCall('audio')}
                    aria-label={t('chat.audioCall')}
                    title={t('chat.audioCall')}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                    </svg>
                  </button>
                )}

                {canCall && (
                  <button
                    type="button"
                    className="chat__call-button"
                    onClick={() => startCall('video')}
                    aria-label={t('chat.videoCall')}
                    title={t('chat.videoCall')}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                      <path d="M16 10l6-3v10l-6-3z" />
                    </svg>
                  </button>
                )}

                {activeGroup && (
                  <button
                    type="button"
                    className="chat__gear"
                    onClick={openPanel}
                    aria-label={t('chat.groupSettings')}
                    title={t('chat.groupSettings')}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 0 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 0 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 0 1 4 0a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 0 1 0 4z" />
                    </svg>
                  </button>
                )}

                {activeGroup && (
                  <button type="button" className="chat__leave" onClick={handleLeaveGroup}>
                    {t('chat.leave')}
                  </button>
                )}

                {isGeneral && generalJoined && (
                  <button type="button" className="chat__leave" onClick={handleLeaveGeneral}>
                    {t('chat.leave')}
                  </button>
                )}
                  </>
                )}
              </header>

              {status && <p className="chat__status">{status}</p>}

              {gated && (
                <div className="chat__gate">
                  <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.6A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
                  </svg>

                  <h2 className="chat__gate-title">{t('chat.gateTitle')}</h2>
                  <p className="chat__gate-text">{t('chat.gateText')}</p>

                  <button type="button" className="chat__join" onClick={handleJoinGeneral}>
                    {t('chat.join')}
                  </button>
                </div>
              )}

              {roomCall && !inCall && (
                <div className="chat__call-banner">
                  <span className="chat__call-banner-dot" aria-hidden="true" />
                  <span className="chat__call-banner-text">
                    {t('chat.callOngoing', { count: roomCall.participants.length })}
                  </span>
                  <button type="button" onClick={() => joinCall(activeRoom)}>
                    {t('chat.joinCall')}
                  </button>
                </div>
              )}

              {loadingThread && <PlanetLoader label={t('chat.connecting')} size="small" />}

              {!gated && !loadingThread && (
                <div className="chat__messages">
                  {thread.messages.length === 0 && <p className="chat__empty">{t('chat.empty')}</p>}

                  {thread.messages.map((message, index) => {
                    const mine = currentUser && message.user_id === currentUser.id
                    const previous = thread.messages[index - 1]
                    const grouped =
                      Boolean(previous) &&
                      previous.user_id === message.user_id &&
                      new Date(message.created_at) - new Date(previous.created_at) < 300000

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        mine={mine}
                        showAuthor={showAuthor}
                        grouped={grouped}
                        selected={Boolean(selectedMessage) && selectedMessage.id === message.id}
                        selectionMode={Boolean(selectedMessage)}
                        menuOpen={menuFor === message.id}
                        canReply={canPost}
                        recipients={recipients}
                        onLongPress={setSelectedMessage}
                        onToggleSelect={target =>
                          setSelectedMessage(current =>
                            current && current.id === target.id ? null : target
                          )
                        }
                        onToggleMenu={setMenuFor}
                        onReply={target => {
                          setMenuFor(null)
                          startReply(target)
                        }}
                        onEdit={target => {
                          setMenuFor(null)
                          startEdit(target)
                        }}
                        onDelete={target => {
                          setMenuFor(null)
                          setPendingDelete(target)
                        }}
                      />
                    )
                  })}

                  <TypingIndicator
                    entries={typingEntries(activeRoom)}
                    showAvatar={Boolean(activeGroup) || isGeneral}
                  />

                  <div ref={bottomRef} />
                </div>
              )}

              {!gated && !canPost && (
                <p className="chat__muted">{t('chat.mutedNotice')}</p>
              )}

              {!gated && canPost && (
                <form className="chat__composer" onSubmit={handleSubmit}>
                  {(replyTo || editing) && (
                    <div className="chat__composer-context">
                      <span className="chat__composer-label">
                        {editing ? t('chat.editing') : t('chat.replyingTo', { name: replyTo.author_name })}
                      </span>
                      <button type="button" onClick={cancelComposerState} aria-label={t('common.cancel')}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {recorderOpen ? (
                    <VoiceRecorder
                      onSend={handleVoiceReady}
                      onCancel={() => {
                        setRecorderOpen(false)
                        emitTyping('stop')
                      }}
                      onError={setStatus}
                    />
                  ) : (
                    <div className="chat__composer-row">
                      <button
                        type="button"
                        className="chat__emoji"
                        onClick={() => setEmojiOpen(open => !open)}
                        aria-label={t('chat.emojiPicker')}
                        title={t('chat.emojiPicker')}
                        aria-expanded={emojiOpen}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
                          <path d="M9 9.5h.01M15 9.5h.01" />
                        </svg>
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={draft}
                        onChange={e => handleDraftChange(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        maxLength={1000}
                        aria-label={t('chat.placeholder')}
                      />

                      <input
                        ref={documentRef}
                        type="file"
                        accept={DOCUMENT_TYPES}
                        multiple
                        onChange={handleFilesChosen}
                        style={{ display: 'none' }}
                      />

                      <input
                        ref={mediaRef}
                        type="file"
                        accept={MEDIA_TYPES}
                        multiple
                        onChange={handleFilesChosen}
                        style={{ display: 'none' }}
                      />

                      <button
                        type="button"
                        className="chat__attach"
                        onClick={() => setAttachMenuOpen(open => !open)}
                        aria-label={t('chat.attach')}
                        title={t('chat.attach')}
                        aria-expanded={attachMenuOpen}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.4 11.1 12.3 20.2a5.5 5.5 0 0 1-7.8-7.8l9.2-9.1a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.1a1.8 1.8 0 0 1-2.6-2.6l8.5-8.4" />
                        </svg>
                      </button>

                      {draft.trim() || editing ? (
                        <button type="submit" aria-label={t('chat.send')}>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2 11 13" />
                            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="chat__mic"
                          onClick={() => {
                            setRecorderOpen(true)
                            typingActiveRef.current = true
                            emitTyping('voice')
                          }}
                          aria-label={t('chat.recordVoice')}
                          title={t('chat.recordVoice')}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="2" width="6" height="11" rx="3" />
                            <path d="M5 10a7 7 0 0 0 14 0" />
                            <path d="M12 17v4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {attachMenuOpen && (
                    <AttachMenu
                      onDocument={() => documentRef.current?.click()}
                      onMedia={() => mediaRef.current?.click()}
                      onDestination={() => setPickerKind('destination')}
                      onItinerary={() => setPickerKind('itinerary')}
                      onClose={() => setAttachMenuOpen(false)}
                    />
                  )}

                  {emojiOpen && (
                    <EmojiPicker
                      onPick={emoji => setDraft(value => `${value}${emoji}`)}
                      onSticker={handleSticker}
                      onClose={() => setEmojiOpen(false)}
                    />
                  )}

                </form>
              )}
              {pendingFiles && (
                <AttachmentComposer
                  files={pendingFiles}
                  uploading={uploading}
                  progress={progress}
                  sentCount={sentCount}
                  error={uploadError}
                  onSend={handleSendAttachments}
                  onCancel={() => {
                    if (uploading) return
                    setPendingFiles(null)
                    setUploadError('')
                  }}
                />
              )}

              {pickerKind && (
                <SharePicker
                  kind={pickerKind}
                  onConfirm={ids => sendShare(pickerKind, ids)}
                  onClose={() => setPickerKind(null)}
                />
              )}

              {inCall && (
                <CallPanel
                  room={activeRoom}
                  call={roomCall}
                  currentUser={currentUser}
                  onLeave={leaveCall}
                  onError={setStatus}
                />
              )}
            </>
          )}
        </section>
      </div>

      {showNewChat && (
        <NewChatModal
          friends={friends}
          loading={!friendsLoaded}
          onSelect={handleStartChat}
          onNewGroup={() => {
            setShowNewChat(false)
            setGroupError('')
            setShowNewGroup(true)
          }}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          friends={friends}
          loading={!friendsLoaded}
          submitting={creatingGroup}
          error={groupError}
          onCreate={handleCreateGroup}
          onClose={() => setShowNewGroup(false)}
        />
      )}

      {panelGroup && (
        <GroupPanel
          group={panelGroup}
          friends={friends}
          busy={panelBusy}
          error={panelError}
          onAddMember={memberId => runPanelAction(() => addGroupMember(panelGroup.id, memberId))}
          onRemoveMember={memberId =>
            runPanelAction(() => removeGroupMember(panelGroup.id, memberId))
          }
          onToggleAdmin={(memberId, value) =>
            runPanelAction(() => setGroupAdmin(panelGroup.id, memberId, value))
          }
          onUpdateSettings={patch =>
            runPanelAction(() => updateGroupSettings(panelGroup.id, patch))
          }
          onRotateInvite={() => runPanelAction(() => rotateGroupInvite(panelGroup.id))}
          onRename={name => runPanelAction(() => renameGroup(panelGroup.id, name))}
          onLeave={handleLeaveGroup}
          onClose={() => setPanelGroup(null)}
        />
      )}

      {pendingClear && (
        <ConfirmDialog
          title={t('chat.clearTitle')}
          message={
            pendingClear.kind === 'group'
              ? t('chat.clearGroupMessage')
              : t('chat.clearMessage', { name: pendingClear.peer ? pendingClear.peer.name : '' })
          }
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmClear}
          onCancel={() => setPendingClear(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t('chat.deleteTitle')}
          message={t('chat.deleteMessage')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {incomingCall && joinedCall !== incomingCall.room && (
        <div className="call-toast" role="alert">
          <span className="call-toast__ring" aria-hidden="true" />
          <span className="call-toast__text">
            {t('chat.incomingCall', {
              kind:
                incomingCall.kind === 'video' ? t('chat.videoCall') : t('chat.audioCall')
            })}
          </span>
          <button
            type="button"
            className="call-toast__accept"
            onClick={() => {
              const entry = all.find(item => item.room === incomingCall.room)
              if (entry) openRoom(entry)
              joinCall(incomingCall.room)
            }}
          >
            {t('chat.joinCall')}
          </button>
          <button
            type="button"
            className="call-toast__dismiss"
            onClick={() => setIncomingCall(null)}
            aria-label={t('common.cancel')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <FloatingBackButton
        visible={Boolean(activeRoom) && headerPassed}
        onClick={closeRoom}
        label={t('common.back')}
      />

      <BottomNav />
    </div>
  )
}

export default Chat