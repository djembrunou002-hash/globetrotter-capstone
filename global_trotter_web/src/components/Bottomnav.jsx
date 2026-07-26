import { Link, useLocation } from 'react-router-dom'
import '../styles/BottomNav.css'

function BottomNav() {
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      <Link
        to="/destinations"
        className={`bottom-nav__item ${location.pathname === '/destinations' ? 'bottom-nav__item--active' : ''}`}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span>Destinations</span>
      </Link>

      <Link
        to="/home"
        className={`bottom-nav__item ${location.pathname === '/home' ? 'bottom-nav__item--active' : ''}`}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
        <span>Home</span>
      </Link>

      <Link
        to="/itineraries"
        className={`bottom-nav__item ${location.pathname === '/itineraries' ? 'bottom-nav__item--active' : ''}`}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Itineraries</span>
      </Link>
    </nav>
  )
}

export default BottomNav