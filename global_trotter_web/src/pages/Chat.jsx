import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import { connectChat, disconnectChat } from '../services/chatService.js'
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

function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Chat() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentUser] = useState(getUser)
  const [autoJoin] = useState(() => hasJoinedBefore(currentUser))

  const [joined, setJoined] = useState(false)
  const [connecting, setConnecting] = useState(autoJoin)
  const [status, setStatus] = useState('')
  const [messages, setMessages] = useState([])
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

  useEffect(() => {
    if (!getToken()) navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!joined) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, joined])

  const subscribe = useCallback(() => {
    const socket = connectChat()
    if (!socket) return null

    socketRef.current = socket

    socket.on('connect', () => socket.emit('chat:join'))

    socket.on('connect_error', () => {
      setConnecting(false)
      setStatus(t('chat.connectionFailed'))
    })

    socket.on('disconnect', () => setStatus(t('chat.reconnecting')))

    socket.on('chat:history', payload => {
      setMessages(payload.messages || [])
      setConnecting(false)
      setJoined(true)
      setStatus('')
      rememberJoin(currentUser, true)
    })

    socket.on('chat:message', payload => {
      setMessages(prev => [...prev, payload.message])
    })

    socket.on('chat:updated', payload => {
      setMessages(prev => prev.map(m => (m.id === payload.message.id ? payload.message : m)))
    })

    socket.on('chat:deleted', payload => {
      setMessages(prev => prev.filter(m => m.id !== payload.id))
    })

    socket.on('chat:error', payload => {
      console.error('CHAT ERROR:', payload.error)
      setStatus(payload.error)
    })

    if (socket.connected) socket.emit('chat:join')

    return socket
  }, [t, currentUser])

  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      cancelledRef.current = true
      recorder.stop()
    }
    const socket = socketRef.current
    if (socket) {
      socket.off()
      socket.emit('chat:leave')
    }
    disconnectChat()
    socketRef.current = null
  }, [])

  useEffect(() => {
    if (!autoJoin) return teardown

    const socket = subscribe()
    if (!socket) {
      const id = setTimeout(() => {
        setConnecting(false)
        setStatus(t('chat.notSignedIn'))
      }, 0)
      return () => {
        clearTimeout(id)
        teardown()
      }
    }

    return teardown
  }, [autoJoin, subscribe, teardown, t])

  function handleJoin() {
    setConnecting(true)
    setStatus('')

    if (!subscribe()) {
      setConnecting(false)
      setStatus(t('chat.notSignedIn'))
    }
  }

  function handleLeave() {
    teardown()
    rememberJoin(currentUser, false)
    setJoined(false)
    setConnecting(false)
    setMessages([])
    setDraft('')
    setReplyTo(null)
    setEditing(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !socketRef.current) return

    if (editing) {
      socketRef.current.emit('chat:edit', { id: editing.id, text })
      setEditing(null)
    } else {
      socketRef.current.emit('chat:send', { text, reply_to: replyTo ? replyTo.id : null })
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
      console.log('voice:', recorder.mimeType, buffer.byteLength, 'bytes,', seconds.toFixed(1), 's')
      socketRef.current.emit('chat:voice', {
        blob: buffer,
        mime: recorder.mimeType,
        duration: seconds,
        reply_to: replyTo ? replyTo.id : null
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

  if (!joined) {
    return (
      <div className="chat">
        <header className="page-header chat__header">
          <h1 className="chat__title">{t('chat.title')}</h1>
        </header>

        <div className="chat__gate">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.6A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
          </svg>

          <h2 className="chat__gate-title">{t('chat.gateTitle')}</h2>
          <p className="chat__gate-text">{t('chat.gateText')}</p>

          {status && <p className="chat__gate-error">{status}</p>}

          {connecting ? (
            <PlanetLoader label={t('chat.connecting')} size="small" />
          ) : (
            <button type="button" className="chat__join" onClick={handleJoin}>
              {t('chat.join')}
            </button>
          )}
        </div>

        <BottomNav />
      </div>
    )
  }

  return (
    <div className="chat">
      <header className="page-header chat__header">
        <h1 className="chat__title">{t('chat.title')}</h1>
        <button type="button" className="chat__leave" onClick={handleLeave}>
          {t('chat.leave')}
        </button>
      </header>

      {status && <p className="chat__status">{status}</p>}

      <div className="chat__messages">
        {messages.length === 0 && <p className="chat__empty">{t('chat.empty')}</p>}

        {messages.map(message => {
          const mine = currentUser && message.user_id === currentUser.id
          return (
            <div key={message.id} className={`chat__row ${mine ? 'chat__row--mine' : ''}`}>
              <div className="chat__bubble">
                {!mine && <span className="chat__author">{message.author_name}</span>}

                {message.reply_preview && (
                  <div className="chat__quote">
                    <span className="chat__quote-author">{message.reply_preview.author_name}</span>
                    <span className="chat__quote-text">
                      {message.reply_preview.deleted
                        ? t('chat.deletedMessage')
                        : message.reply_preview.kind === 'voice'
                          ? t('chat.voiceNote')
                          : message.reply_preview.text || t(`chat.${message.reply_preview.kind}Note`)}
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

                    <span className="chat__voice-time">{formatDuration(message.audio.duration)}</span>

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
                      <button type="button" onClick={() => startReply(message)}>
                        {t('chat.reply')}
                      </button>
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

      <BottomNav />
    </div>
  )
}

export default Chat