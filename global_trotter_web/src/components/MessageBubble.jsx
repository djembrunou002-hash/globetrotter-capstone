import { useRef, useState } from 'react'
import VoiceMessage from './VoiceMessage.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import { formatBytes, formatTime, initials, isStickerText } from '../utils/chatFormat.js'
import '../styles/MessageBubble.css'

const LONG_PRESS_MS = 420

function MessageBubble({
  message,
  mine,
  showAuthor = false,
  grouped = false,
  selected = false,
  selectionMode = false,
  menuOpen = false,
  canReply = true,
  onLongPress,
  onToggleSelect,
  onToggleMenu,
  onReply,
  onEdit,
  onDelete
}) {
  const { t } = useTranslation()
  const timerRef = useRef(null)
  const firedRef = useRef(false)
  const [pressing, setPressing] = useState(false)

  const withAvatar = showAuthor && !mine
  const sticker = message.kind === 'text' && isStickerText(message.text)

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPressing(false)
  }

  function handlePointerDown() {
    firedRef.current = false
    setPressing(true)

    timerRef.current = setTimeout(() => {
      firedRef.current = true
      setPressing(false)
      onLongPress(message)
    }, LONG_PRESS_MS)
  }

  function handlePointerUp() {
    clearTimer()

    if (firedRef.current) {
      firedRef.current = false
      return
    }

    if (selectionMode) onToggleSelect(message)
  }

  function handleContextMenu(event) {
    if (window.matchMedia('(pointer: coarse)').matches) event.preventDefault()
  }

  return (
    <div
      className={`msg ${mine ? 'msg--mine' : ''} ${selected ? 'is-selected' : ''} ${grouped ? 'is-grouped' : ''}`}
    >
      {withAvatar && (
        <span className="msg__avatar" aria-hidden="true">
          {!grouped && initials(message.author_name)}
        </span>
      )}

      <div
        className={`msg__bubble ${sticker ? 'msg__bubble--sticker' : ''} ${pressing ? 'is-pressing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={handleContextMenu}
      >
        {showAuthor && !mine && !grouped && (
          <span className="msg__author">{message.author_name}</span>
        )}

        {message.reply_preview && (
          <div className="msg__quote">
            <span className="msg__quote-author">{message.reply_preview.author_name}</span>
            <span className="msg__quote-text">
              {message.reply_preview.deleted
                ? t('chat.deletedMessage')
                : message.reply_preview.kind === 'voice'
                  ? t('chat.voiceNote')
                  : message.reply_preview.text || t(`chat.${message.reply_preview.kind}Note`)}
            </span>
          </div>
        )}

        {message.kind === 'voice' && message.audio ? (
          <VoiceMessage
            src={message.audio.url}
            duration={message.audio.duration}
            seed={message.id}
          />
        ) : message.media ? (
          <div className="msg__media">
            {message.kind === 'image' && (
              <a href={message.media.url} target="_blank" rel="noreferrer">
                <img src={message.media.url} alt={message.media.name} loading="lazy" />
              </a>
            )}

            {message.kind === 'video' && (
              <video src={message.media.url} controls preload="metadata" />
            )}

            {message.kind === 'file' && (
              <a className="msg__file" href={message.media.url} download>
                <span className="msg__file-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
                <span className="msg__file-info">
                  <span className="msg__file-name">{message.media.name}</span>
                  <span className="msg__file-size">{formatBytes(message.media.size)}</span>
                </span>
              </a>
            )}

            {message.text && <p className="msg__text">{message.text}</p>}
          </div>
        ) : (
          <p className="msg__text">{message.text}</p>
        )}

        <div className="msg__meta">
          <span>{formatTime(message.created_at)}</span>
          {message.edited_at && <span>{t('chat.edited')}</span>}
        </div>
      </div>

      <div className="msg__actions">
        <button
          type="button"
          className="msg__more"
          onClick={() => onToggleMenu(menuOpen ? null : message.id)}
          aria-label={t('chat.messageOptions')}
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="msg__menu-backdrop" onClick={() => onToggleMenu(null)} />
            <div className="msg__menu">
              {canReply && (
                <button type="button" onClick={() => onReply(message)}>
                  {t('chat.reply')}
                </button>
              )}
              {mine && message.kind === 'text' && (
                <button type="button" onClick={() => onEdit(message)}>
                  {t('common.edit')}
                </button>
              )}
              {mine && (
                <button
                  type="button"
                  className="msg__menu-item--danger"
                  onClick={() => onDelete(message)}
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
}

export default MessageBubble