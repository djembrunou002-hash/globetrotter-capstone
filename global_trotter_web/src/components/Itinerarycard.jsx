import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ShareMenu from './ShareMenu.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import { itineraryLink } from '../utils/shareLinks.js'
import { leaveItinerary } from '../services/itineraryService.js'

function ItineraryCard({
  itinerary,
  coverImage,
  selectable = false,
  selected = false,
  onToggleSelect,
  onRequestDelete,
  onRequestShare,
  onRequestEdit,
  onLeave
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [sharingLink, setSharingLink] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const isOwner = itinerary.is_owner !== false

  function handleOpen() {
    navigate(`/itineraries/${itinerary.id}`)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  function handleRequestDelete() {
    setMenuOpen(false)
    onRequestDelete(itinerary.id)
  }

  async function handleLeave(e) {
    e.stopPropagation()
    setMenuOpen(false)

    if (leaving) return
    setLeaving(true)

    try {
      await leaveItinerary(itinerary.id)
      if (onLeave) onLeave(itinerary)
    } finally {
      setLeaving(false)
    }
  }

  function handleRequestShare() {
    setMenuOpen(false)
    onRequestShare(itinerary)
  }

  function handleRequestEdit() {
    setMenuOpen(false)
    onRequestEdit(itinerary)
  }

  return (
    <article
      className="itinerary-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={t('itineraryCard.open', { title: itinerary.title })}
    >
      <div className="itinerary-card__image-wrap">
        {coverImage && !imageFailed ? (
          <img
            src={coverImage}
            alt={itinerary.title}
            className="itinerary-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="itinerary-card__image itinerary-card__image--placeholder" aria-hidden="true" />
        )}

        {selectable && isOwner && (
          <button
            type="button"
            className={`itinerary-card__checkbox ${selected ? 'itinerary-card__checkbox--checked' : ''}`}
            onClick={e => {
              e.stopPropagation()
              onToggleSelect(itinerary.id)
            }}
            aria-label={
              selected
                ? t('itineraryCard.deselect', { title: itinerary.title })
                : t('itineraryCard.select', { title: itinerary.title })
            }
            aria-pressed={selected}
          >
            {selected && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5 9-9" />
              </svg>
            )}
          </button>
        )}

        {!selectable && (
          <>
            <button
              type="button"
              className="itinerary-card__menu-trigger"
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(prev => !prev)
              }}
              aria-label={t('itineraryCard.options')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="itinerary-card__menu-backdrop"
                  onClick={e => {
                    e.stopPropagation()
                    setMenuOpen(false)
                  }}
                />
                <div className="itinerary-card__menu" onClick={e => e.stopPropagation()}>
                  {isOwner && (
                    <button
                      type="button"
                      className="itinerary-card__menu-item"
                      onClick={handleRequestEdit}
                    >
                      {t('itineraryCard.edit')}
                    </button>
                  )}

                  {isOwner && (
                    <button
                      type="button"
                      className="itinerary-card__menu-item"
                      onClick={handleRequestShare}
                    >
                      {t('itineraryCard.share')}
                    </button>
                  )}

                  <button
                    type="button"
                    className="itinerary-card__menu-item"
                    onClick={e => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      setSharingLink(true)
                    }}
                  >
                    {t('itineraryCard.shareLink')}
                  </button>

                  {isOwner ? (
                    <button
                      type="button"
                      className="itinerary-card__menu-item itinerary-card__menu-item--danger"
                      onClick={handleRequestDelete}
                    >
                      {t('itineraryCard.delete')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="itinerary-card__menu-item itinerary-card__menu-item--danger"
                      onClick={handleLeave}
                      disabled={leaving}
                    >
                      {t('itineraryCard.leave')}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {!isOwner && (
          <span className="itinerary-card__shared-badge">
            {t('itineraryCard.sharedBy', { name: itinerary.owner_name })}
          </span>
        )}

        <div className="itinerary-card__overlay">
          <h3 className="itinerary-card__title">{itinerary.title}</h3>
        </div>
      </div>

      {sharingLink && (
        <ShareMenu
          url={itineraryLink(itinerary.id)}
          title={itinerary.title}
          onClose={() => setSharingLink(false)}
        />
      )}
    </article>
  )
}

export default ItineraryCard