import { Link } from 'react-router-dom'
import { getToken } from '../services/tokenStorage.js'
import '../styles/Logo.css'

function Logo({ theme = 'light', forceLink = false }) {
  const isAuthenticated = Boolean(getToken())

  if (isAuthenticated && !forceLink) {
    return <span className={`logo logo--${theme}`}>GlobalTrotter</span>
  }

  return (
    <Link to="/" className={`logo logo--${theme}`}>
      GlobalTrotter
    </Link>
  )
}

export default Logo