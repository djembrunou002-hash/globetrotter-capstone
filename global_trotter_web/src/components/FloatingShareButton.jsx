import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/FloatingBackButton.css'
import '../styles/FloatingShareButton.css'

const ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </svg>
)

function FloatingShareButton({ visible, onClick, label }) {
  const { t } = useTranslation()

  if (!visible) return null

  const ariaLabel = label || t('share.title')

  return (
    <button
      type="button"
      className="floating-back floating-back--share"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
    >
      {ICON}
    </button>
  )
}

export default FloatingShareButton