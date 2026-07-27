import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites } from '../services/destinationService.js'
import { getToken, getUser, clearToken, clearUser } from '../services/tokenStorage.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/Profile.css'

function formatMemberSince(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatPhoneNumber(number) {
  if (!number) return ''
  // Stored as "+237XXXXXXXXX" -- show it with a small gap after the country code
  const match = number.match(/^(\+237)(\d{9})$/)
  if (!match) return number
  return `${match[1]} ${match[2]}`
}

function Profile() {
  const navigate = useNavigate()
  const [favoriteCount, setFavoriteCount] = useState(null)
  const [error, setError] = useState('')

  const user = getUser()

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    async function loadFavorites() {
      try {
        const response = await getFavorites()
        setFavoriteCount(response.favorites.length)
      } catch (err) {
        setError(err.message)
      }
    }

    loadFavorites()
  }, [navigate])

  function handleLogout() {
    clearToken()
    clearUser()
    navigate('/login')
  }

  return (
    <div className="profile">
      <header className="profile__header">
        <Logo theme="dark" />
        <h1 className="profile__title">Profile</h1>
      </header>

      <main className="profile__content profile__content--with-bottom-nav">
        {!user && <p className="profile__status">Profile information isn't available for this session.</p>}
        {error && <p className="profile__status profile__status--error">{error}</p>}

        {user && (
          <>
            <div className="profile__avatar">{(user.name || '?').charAt(0).toUpperCase()}</div>
            <h2 className="profile__name">{user.name}</h2>

            <dl className="profile__info">
              {user.email && (
                <div className="profile__info-row">
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
              )}

              {user.number && (
                <div className="profile__info-row">
                  <dt>Phone</dt>
                  <dd>{formatPhoneNumber(user.number)}</dd>
                </div>
              )}

              {user.created_at && (
                <div className="profile__info-row">
                  <dt>Member since</dt>
                  <dd>{formatMemberSince(user.created_at)}</dd>
                </div>
              )}

              {favoriteCount !== null && (
                <div className="profile__info-row">
                  <dt>Favorite destinations</dt>
                  <dd>{favoriteCount}</dd>
                </div>
              )}
            </dl>

            <button type="button" className="profile__logout" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default Profile