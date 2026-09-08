import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../hooks/useTranslation.js'
import { copyText, whatsappLink } from '../utils/shareLinks.js'
import '../styles/ShareMenu.css'

function ShareMenu({ url, title, onClose }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const message = title ? `${title} - ${url}` : url

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(timer)
  }, [copied])

  function handleCopy() {
    setFailed(false)
    copyText(url)
      .then(() => setCopied(true))
      .catch(() => setFailed(true))
  }

  function handleNative() {
    navigator
      .share({ title: title || undefined, url })
      .then(onClose)
      .catch(() => {})
  }

  return createPortal(
    <div className="share__backdrop" onClick={onClose}>
      <div
        className="share"
        role="dialog"
        aria-modal="true"
        aria-label={t('share.title')}
        onClick={event => event.stopPropagation()}
      >
        <div className="share__head">
          <h3 className="share__title">{t('share.title')}</h3>
          <button
            type="button"
            className="share__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <a
          className="share__option share__option--whatsapp"
          href={whatsappLink(message)}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
        >
          <span className="share__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5 0a6.6 6.6 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.5 11 11 0 0 0 4.2 3.7 8.6 8.6 0 0 0 1.4.5 3.4 3.4 0 0 0 1.6.1 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2z" />
            </svg>
          </span>
          <span className="share__label">{t('share.whatsapp')}</span>
        </a>

        <button type="button" className="share__option" onClick={handleCopy}>
          <span className="share__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </span>
          <span className="share__label">{copied ? t('share.copied') : t('share.copyLink')}</span>
        </button>

        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" className="share__option" onClick={handleNative}>
            <span className="share__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
            </span>
            <span className="share__label">{t('share.more')}</span>
          </button>
        )}

        <p className={`share__link ${failed ? 'is-visible' : ''}`}>{url}</p>
      </div>
    </div>,
    document.body
  )
}

export default ShareMenu