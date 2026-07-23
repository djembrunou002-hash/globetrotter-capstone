import { Link } from 'react-router-dom'
import '../styles/Logo.css'

function Logo({ theme = 'light' }) {
  return (
    <Link to="/" className={`logo logo--${theme}`}>
      GlobalTrotter
    </Link>
  )
}

export default Logo