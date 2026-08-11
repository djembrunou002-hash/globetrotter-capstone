import { Link } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/FloatingBackButton.css'

const ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
)

function FloatingBackButton({ visible, to, onClick, label }) {
  const { t } = useTranslation()

  if (!visible) return null

  const ariaLabel = label || t('common.goBack')

  if (to) {
    return (
      <Link to={to} className="floating-back" aria-label={ariaLabel} title={ariaLabel}>
        {ICON}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="floating-back"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
    >
      {ICON}
    </button>
  )
}

export default FloatingBackButton