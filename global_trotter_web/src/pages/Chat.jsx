import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import NewChatModal from '../components/NewChatModal.jsx'
import NewGroupModal from '../components/NewGroupModal.jsx'
import GroupPanel from '../components/GroupPanel.jsx'
import NotificationDot from '../components/NotificationDot.jsx'
import FloatingBackButton from '../components/FloatingBackButton.jsx'
import useHeaderPassed from '../hooks/useHeaderPassed.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useChatUnread } from '../hooks/useChatUnread.js'
import {
  GENERAL_ROOM,
  connectChat,
  deleteConversation,
  directRoom,
  disconnectChat
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
import { ACCEPTED_TYPES, compressImage, uploadAttachment } from '../services/chatUpload.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import '../styles/Chat.css'

const JOIN_KEY = 'globaltrotter_chat_joined'
const MAX_VOICE_SECONDS = 60

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4'
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatStamp(iso, locale) {
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

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

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

  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [menuFor, setMenuFor] = useState(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [playingId, setPlayingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const activeRoomRef = useRef(null)
  const applyMessageRef = useRef(applyMessage)
  const dropConversationRef = useRef(dropConversation)
  const refreshRef = useRef(refresh)
  const panelRoomRef = useRef(null)
  const inviteHandledRef = useRef(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const cancelledRef = useRef(false)
  const audioRefs = useRef({})
  const startedAtRef = useRef(0)
  const fileRef = useRef(null)
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
    })

    socket.on('chat:message', payload => {
      const message = payload.message
      const isActive = activeRoomRef.current === message.room

      setThread(prev =>
        prev.room === message.room ? { ...prev, messages: [...prev.messages, message] } : prev
      )

      applyMessageRef.current(message, { active: isActive })
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

    socket.on('chat:error', payload => {
      setStatus(payload.error)
    })

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        cancelledRef.current = true
        recorder.stop()
      }

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

  function resetComposer() {
    setDraft('')
    setReplyTo(null)
    setEditing(null)
    setMenuFor(null)
    setStatus('')
  }

  function openRoom(entry) {
    setCardMenu(null)
    resetComposer()
    setThread({ room: null, messages: [] })
    setActiveRoom(entry.room)
    markRead(entry.room)
    window.scrollTo({ top: 0 })
  }

  function closeRoom() {
    if (activeRoom === GENERAL_ROOM) socketRef.current?.emit('chat:leave', { room: GENERAL_ROOM })
    if (activeRoom) markRead(activeRoom)
    resetComposer()
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

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function startRecording() {
    if (recording) return

    const mimeType = pickMimeType()
    if (mimeType === null) {
      setStatus(t('chat.recordingUnsupported'))
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(t('chat.micUnavailable'))
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus(t('chat.micDenied'))
      return
    }

    const room = activeRoom
    const parent = replyTo ? replyTo.id : null

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    chunksRef.current = []
    cancelledRef.current = false

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop())
      stopTimer()

      const seconds = (Date.now() - startedAtRef.current) / 1000
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      chunksRef.current = []

      setRecording(false)
      setElapsed(0)

      if (cancelledRef.current || seconds < 1 || !socketRef.current) return

      const buffer = await blob.arrayBuffer()
      socketRef.current.emit('chat:voice', {
        room,
        blob: buffer,
        mime: recorder.mimeType,
        duration: seconds,
        reply_to: parent
      })
      setReplyTo(null)
    }

    startedAtRef.current = Date.now()
    recorder.start()
    setRecording(true)
    setElapsed(0)
    setStatus('')

    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000
      setElapsed(seconds)
      if (seconds >= MAX_VOICE_SECONDS) stopRecording()
    }, 200)
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  function cancelRecording() {
    cancelledRef.current = true
    stopRecording()
  }

  async function handleFileChosen(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return

    setStatus('')
    setUploading(true)
    setProgress(0)

    try {
      const prepared = await compressImage(file)
      await uploadAttachment(prepared, {
        room: activeRoom,
        caption: draft.trim(),
        replyTo: replyTo ? replyTo.id : null,
        onProgress: setProgress
      })
      setDraft('')
      setReplyTo(null)
    } catch (err) {
      setStatus(err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function togglePlay(messageId) {
    const audio = audioRefs.current[messageId]
    if (!audio) return

    Object.entries(audioRefs.current).forEach(([id, el]) => {
      if (id !== messageId && el) el.pause()
    })

    if (audio.paused) audio.play()
    else audio.pause()
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
    <div className={`chat ${activeRoom ? 'chat--open' : ''}`}>
      <div className="chat__panes">
        <aside className="chat__sidebar">
          <header className="page-header chat__header">
            <h1 className="chat__title">{t('chat.pageTitle')}</h1>
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
                    className={`chat-card ${entry.room === activeRoom ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="chat-card__open"
                      onClick={() => openRoom(entry)}
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
                          <span className="chat-card__preview">{previewOf(entry)}</span>
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
                  {activeGroup && (
                    <span className="chat__subtitle">
                      {t('chat.groupMemberCount', { count: activeGroup.member_count })}
                    </span>
                  )}
                </span>

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

              {loadingThread && <PlanetLoader label={t('chat.connecting')} size="small" />}

              {!gated && !loadingThread && (
                <div className="chat__messages">
                  {thread.messages.length === 0 && <p className="chat__empty">{t('chat.empty')}</p>}

                  {thread.messages.map(message => {
                    const mine = currentUser && message.user_id === currentUser.id
                    return (
                      <div key={message.id} className={`chat__row ${mine ? 'chat__row--mine' : ''}`}>
                        <div className="chat__bubble">
                          {!mine && showAuthor && (
                            <span className="chat__author">{message.author_name}</span>
                          )}

                          {message.reply_preview && (
                            <div className="chat__quote">
                              <span className="chat__quote-author">
                                {message.reply_preview.author_name}
                              </span>
                              <span className="chat__quote-text">
                                {message.reply_preview.deleted
                                  ? t('chat.deletedMessage')
                                  : message.reply_preview.kind === 'voice'
                                    ? t('chat.voiceNote')
                                    : message.reply_preview.text ||
                                      t(`chat.${message.reply_preview.kind}Note`)}
                              </span>
                            </div>
                          )}

                          {message.kind === 'voice' && message.audio ? (
                            <div className="chat__voice">
                              <button
                                type="button"
                                className="chat__voice-play"
                                onClick={() => togglePlay(message.id)}
                                aria-label={playingId === message.id ? t('chat.pause') : t('chat.play')}
                              >
                                {playingId === message.id ? (
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                                    <rect x="6" y="5" width="4" height="14" rx="1" />
                                    <rect x="14" y="5" width="4" height="14" rx="1" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                                    <path d="M8 5l11 7-11 7z" />
                                  </svg>
                                )}
                              </button>

                              <span className="chat__voice-bars" aria-hidden="true">
                                {[9, 15, 7, 18, 11, 20, 8, 14, 10, 16, 6, 12].map((height, index) => (
                                  <i key={index} style={{ height: `${height}px` }} />
                                ))}
                              </span>

                              <span className="chat__voice-time">
                                {formatDuration(message.audio.duration)}
                              </span>

                              <audio
                                ref={el => {
                                  audioRefs.current[message.id] = el
                                }}
                                src={message.audio.url}
                                preload="none"
                                onPlay={() => setPlayingId(message.id)}
                                onPause={() => setPlayingId(id => (id === message.id ? null : id))}
                                onEnded={() => setPlayingId(id => (id === message.id ? null : id))}
                              />
                            </div>
                          ) : message.media ? (
                            <div className="chat__media">
                              {message.kind === 'image' && (
                                <a href={message.media.url} target="_blank" rel="noreferrer">
                                  <img src={message.media.url} alt={message.media.name} loading="lazy" />
                                </a>
                              )}

                              {message.kind === 'video' && (
                                <video src={message.media.url} controls preload="metadata" />
                              )}

                              {message.kind === 'file' && (
                                <a className="chat__file" href={message.media.url} download>
                                  <span className="chat__file-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <path d="M14 2v6h6" />
                                    </svg>
                                  </span>
                                  <span className="chat__file-info">
                                    <span className="chat__file-name">{message.media.name}</span>
                                    <span className="chat__file-size">{formatBytes(message.media.size)}</span>
                                  </span>
                                </a>
                              )}

                              {message.text && <p className="chat__text">{message.text}</p>}
                            </div>
                          ) : (
                            <p className="chat__text">{message.text}</p>
                          )}

                          <div className="chat__meta">
                            <span>{formatTime(message.created_at)}</span>
                            {message.edited_at && <span>{t('chat.edited')}</span>}
                          </div>

                          <button
                            type="button"
                            className="chat__more"
                            onClick={() => setMenuFor(menuFor === message.id ? null : message.id)}
                            aria-label={t('chat.messageOptions')}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                              <circle cx="5" cy="12" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="19" cy="12" r="1.6" />
                            </svg>
                          </button>

                          {menuFor === message.id && (
                            <>
                              <div className="chat__menu-backdrop" onClick={() => setMenuFor(null)} />
                              <div className="chat__menu">
                                {canPost && (
                                  <button type="button" onClick={() => startReply(message)}>
                                    {t('chat.reply')}
                                  </button>
                                )}
                                {mine && message.kind !== 'voice' && (
                                  <button type="button" onClick={() => startEdit(message)}>
                                    {t('common.edit')}
                                  </button>
                                )}
                                {mine && (
                                  <button
                                    type="button"
                                    className="chat__menu-item--danger"
                                    onClick={() => {
                                      setMenuFor(null)
                                      setPendingDelete(message)
                                    }}
                                  >
                                    {t('common.delete')}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

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

                  {uploading && (
                    <div className="chat__upload">
                      <span className="chat__upload-label">{t('chat.uploading')}</span>
                      <span className="chat__upload-track">
                        <span className="chat__upload-fill" style={{ width: `${progress}%` }} />
                      </span>
                      <span className="chat__upload-pct">{progress}%</span>
                    </div>
                  )}

                  {recording ? (
                    <div className="chat__recording">
                      <span className="chat__recording-dot" aria-hidden="true" />
                      <span className="chat__recording-time">{formatDuration(elapsed)}</span>
                      <span className="chat__recording-hint">{t('chat.recordingHint')}</span>
                      <button type="button" className="chat__recording-cancel" onClick={cancelRecording}>
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="chat__recording-send"
                        onClick={stopRecording}
                        aria-label={t('chat.send')}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 2 11 13" />
                          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="chat__composer-row">
                      <input
                        ref={inputRef}
                        type="text"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        maxLength={1000}
                        aria-label={t('chat.placeholder')}
                      />

                      <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        onChange={handleFileChosen}
                        style={{ display: 'none' }}
                      />

                      <button
                        type="button"
                        className="chat__attach"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        aria-label={t('chat.attach')}
                        title={t('chat.attach')}
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
                          onClick={startRecording}
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
                </form>
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