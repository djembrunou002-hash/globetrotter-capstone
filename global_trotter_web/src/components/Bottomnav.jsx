import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation.js'
import { useItineraryDraft } from '../hooks/useItineraryDraft.js'
import '../styles/Bottomnav.css'

function BottomNav() {
  const location = useLocation()
  const { t } = useTranslation()
  const { selectionMode } = useItineraryDraft()

  const items = [
    {
      to: '/map',
      label: t('nav.map'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      )
    },
    {
      to: '/destinations',
      label: t('nav.destinations'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )
    },
    {
      to: '/home',
      label: t('nav.home'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
      )
    },
    {
      to: '/itineraries',
      label: t('nav.itineraries'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
    {
      to: '/profile',
      label: t('nav.profile'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
      )
    }
  ]

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const isActive = location.pathname === item.to

        if (selectionMode) {
          return (
            <span
              key={item.to}
              className="bottom-nav__item bottom-nav__item--disabled"
              aria-disabled="true"
              title={t('nav.finishSelectionFirst')}
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          )
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav