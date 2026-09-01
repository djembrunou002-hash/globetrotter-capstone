import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/Bottomnav.jsx'
import PlanetLoader from '../components/PlanetLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import { connectChat, disconnectChat } from '../services/chatService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import '../styles/Chat.css'

function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Chat() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = getUser()

  const [joined, setJoined] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [menuFor, setMenuFor] = useState(null)

  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!getToken()) navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!joined) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, joined])

  const teardown = useCallback(() => {
    const socket = socketRef.current
    if (socket) {
      socket.off()
      socket.emit('chat:leave')
    }
    disconnectChat()
    socketRef.current = null
  }, [])

  useEffect(() => teardown, [teardown])

  function handleJoin() {
    setConnecting(true)
    setStatus('')

    const socket = connectChat()
    if (!socket) {
      setConnecting(false)
      setStatus(t('chat.notSignedIn'))
      return
    }

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

    socket.on('chat:error', payload => setStatus(payload.error))

    if (socket.connected) socket.emit('chat:join')
  }

  function handleLeave() {
    teardown()
    setJoined(false)
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
                      {message.reply_preview.deleted ? t('chat.deletedMessage') : message.reply_preview.text}
                    </span>
                  </div>
                )}

                <p className="chat__text">{message.text}</p>

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
                      {mine && (
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
          <button type="submit" disabled={!draft.trim()} aria-label={t('chat.send')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
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