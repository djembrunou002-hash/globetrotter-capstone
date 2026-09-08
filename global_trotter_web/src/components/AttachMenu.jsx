import { useEffect, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/AttachMenu.css'

function AttachMenu({ onDocument, onMedia, onDestination, onItinerary, onClose }) {
  const { t } = useTranslation()
  const wrapRef = useRef(null)

  useEffect(() => {
    function handlePointer(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) onClose()
    }

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const options = [
    {
      id: 'document',
      label: t('chat.attachDocument'),
      tone: 'blue',
      action: onDocument,
      icon: (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </>
      )
    },
    {
      id: 'media',
      label: t('chat.attachMedia'),
      tone: 'violet',
      action: onMedia,
      icon: (
        <>
          <rect x="3" y="4" width="18" height="15" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M21 16l-5-5-6 6" />
        </>
      )
    },
    {
      id: 'destination',
      label: t('chat.attachDestination'),
      tone: 'green',
      action: onDestination,
      icon: (
        <>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </>
      )
    },
    {
      id: 'itinerary',
      label: t('chat.attachItinerary'),
      tone: 'gold',
      action: onItinerary,
      icon: (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
          <path d="M8 15h5" />
        </>
      )
    }
  ]

  return (
    <div className="attach-menu" ref={wrapRef} role="menu">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          role="menuitem"
          className="attach-menu__item"
          onClick={() => {
            onClose()
            option.action()
          }}
        >
          <span className={`attach-menu__icon attach-menu__icon--${option.tone}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {option.icon}
            </svg>
          </span>
          <span className="attach-menu__label">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export default AttachMenu