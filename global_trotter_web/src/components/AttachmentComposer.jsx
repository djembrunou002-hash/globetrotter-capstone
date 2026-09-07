import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { ACCEPTED_TYPES } from '../services/chatUpload.js'
import { formatBytes } from '../utils/chatFormat.js'
import '../styles/AttachmentComposer.css'

const MAX_ITEMS = 10

function kindOf(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

function toItem(file) {
  const kind = kindOf(file)
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind,
    caption: '',
    url: kind === 'file' ? null : URL.createObjectURL(file)
  }
}

function AttachmentComposer({
  files,
  uploading = false,
  progress = 0,
  sentCount = 0,
  error = '',
  onSend,
  onCancel
}) {
  const { t } = useTranslation()
  const moreRef = useRef(null)

  const [items, setItems] = useState(() => files.map(toItem))
  const [active, setActive] = useState(0)

  const itemsRef = useRef(items)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url)
      })
    }
  }, [])

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !uploading) onCancel()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel, uploading])

  const current = items[active] || null

  function addFiles(event) {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (picked.length === 0) return

    setItems(prev => {
      const room = MAX_ITEMS - prev.length
      return room <= 0 ? prev : [...prev, ...picked.slice(0, room).map(toItem)]
    })
  }

  function removeAt(index) {
    setItems(prev => {
      const target = prev[index]
      if (target && target.url) URL.revokeObjectURL(target.url)

      const next = prev.filter((item, position) => position !== index)
      if (next.length === 0) onCancel()
      return next
    })

    setActive(position => (position > 0 && position >= index ? position - 1 : position))
  }

  function setCaption(value) {
    setItems(prev =>
      prev.map((item, index) => (index === active ? { ...item, caption: value } : item))
    )
  }

  function handleSend() {
    if (uploading || items.length === 0) return
    onSend(items.map(({ file, caption }) => ({ file, caption })))
  }

  if (!current) return null

  return (
    <div className="attach">
      <header className="attach__head">
        <button
          type="button"
          className="attach__close"
          onClick={onCancel}
          disabled={uploading}
          aria-label={t('common.cancel')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <span className="attach__name">{current.file.name}</span>

        <button
          type="button"
          className="attach__close"
          onClick={() => removeAt(active)}
          disabled={uploading}
          aria-label={t('chat.removeAttachment')}
          title={t('chat.removeAttachment')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          </svg>
        </button>
      </header>

      <div className="attach__stage">
        {current.kind === 'image' && <img src={current.url} alt={current.file.name} />}

        {current.kind === 'video' && <video src={current.url} controls preload="metadata" />}

        {current.kind === 'audio' && <audio src={current.url} controls />}

        {current.kind === 'file' && (
          <div className="attach__file">
            <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span className="attach__file-name">{current.file.name}</span>
            <span className="attach__file-size">{formatBytes(current.file.size)}</span>
          </div>
        )}
      </div>

      {error && <p className="attach__error">{error}</p>}

      {uploading && (
        <div className="attach__progress">
          <span className="attach__progress-label">
            {t('chat.uploadingCount', { current: sentCount + 1, total: items.length })}
          </span>
          <span className="attach__progress-track">
            <span className="attach__progress-fill" style={{ width: `${progress}%` }} />
          </span>
          <span className="attach__progress-pct">{progress}%</span>
        </div>
      )}

      <div className="attach__strip">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`attach__thumb ${index === active ? 'is-active' : ''}`}
            onClick={() => setActive(index)}
            aria-label={item.file.name}
          >
            {item.kind === 'image' ? (
              <img src={item.url} alt="" />
            ) : (
              <span className="attach__thumb-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {item.kind === 'video' ? (
                    <>
                      <rect x="3" y="6" width="13" height="12" rx="2" />
                      <path d="M16 10l5-3v10l-5-3z" />
                    </>
                  ) : (
                    <>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </>
                  )}
                </svg>
              </span>
            )}
          </button>
        ))}

        {items.length < MAX_ITEMS && (
          <button
            type="button"
            className="attach__thumb attach__thumb--add"
            onClick={() => moreRef.current?.click()}
            disabled={uploading}
            aria-label={t('chat.addAnother')}
            title={t('chat.addAnother')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        <input
          ref={moreRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={addFiles}
          style={{ display: 'none' }}
        />
      </div>

      <div className="attach__footer">
        <input
          type="text"
          className="attach__caption"
          value={current.caption}
          onChange={event => setCaption(event.target.value)}
          placeholder={t('chat.captionPlaceholder')}
          aria-label={t('chat.captionPlaceholder')}
          maxLength={1000}
          disabled={uploading}
        />

        <button
          type="button"
          className="attach__send"
          onClick={handleSend}
          disabled={uploading}
          aria-label={t('chat.send')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          {items.length > 1 && <span className="attach__send-count">{items.length}</span>}
        </button>
      </div>
    </div>
  )
}

export default AttachmentComposer