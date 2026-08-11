import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getFavorites } from '../services/destinationService.js'
import { updatePreferences } from '../services/userService.js'
import { getToken, getUser, setUser, clearToken, clearUser } from '../services/tokenStorage.js'
import { TRAVEL_STYLES } from '../constants/travelStyles.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useNotifications } from '../hooks/useNotifications.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import PreferencesModal from '../components/PreferencesModal.jsx'
import LanguageToggle from '../components/LanguageToggle.jsx'
import NotificationDot from '../components/NotificationDot.jsx'
import '../styles/Profile.css'

const STYLE_BY_VALUE = TRAVEL_STYLES.reduce((map, style) => {
  map[style.value] = style
  return map
}, {})

function formatMemberSince(dateString, locale) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function formatPhoneNumber(number) {
  if (!number) return ''
  const match = number.match(/^(\+237)(\d{9})$/)
  if (!match) return number
  return `${match[1]} ${match[2]}`
}

function Profile() {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { unseenCount } = useNotifications()
  const [favoriteCount, setFavoriteCount] = useState(null)
  const [favoritesLoading, setFavoritesLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUserState] = useState(getUser())
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    if (!user) {
      return
    }

    async function loadFavorites() {
      setFavoritesLoading(true)
      try {
        const response = await getFavorites()
        setFavoriteCount(response.favorites.length)
      } catch (err) {
        setError(err.message)
      } finally {
        setFavoritesLoading(false)
      }
    }

    loadFavorites()
  }, [navigate, user])

  function handleLogout() {
    clearToken()
    clearUser()
    navigate('/login')
  }

  async function handleSavePreferences(selectedStyles) {
    const response = await updatePreferences(selectedStyles)
    setUser(response.user)
    setUserState(response.user)
    setShowPreferences(false)
  }

  const travelStyles = user?.preferences?.travel_style || []

  return (
    <div className="profile">
      <header className="profile__header">
        <Logo theme="dark" />
        <h1 className="profile__title">{t('profile.title')}</h1>
      </header>

      <main className="profile__content profile__content--with-bottom-nav">
        {!user && <p className="profile__status">{t('profile.unavailable')}</p>}
        {error && <p className="profile__status profile__status--error">{error}</p>}

        {user && (
          <>
            <div className="profile__avatar">{(user.name || '?').charAt(0).toUpperCase()}</div>
            <h2 className="profile__name">{user.name}</h2>

            <div className="profile__bio">
              {travelStyles.length > 0 ? (
                <div className="profile__bio-chips">
                  {travelStyles.map(styleValue => {
                    const style = STYLE_BY_VALUE[styleValue]
                    return (
                      <span key={styleValue} className="profile__bio-chip">
                        {style ? `${style.emoji} ${t(`travelStyles.${style.value}`)}` : styleValue}
                      </span>
                    )
                  })}
                  <button
                    type="button"
                    className="profile__bio-edit"
                    onClick={() => setShowPreferences(true)}
                  >
                    {t('common.edit')}
                  </button>
                </div>
              ) : (
                <button type="button" className="profile__bio-empty" onClick={() => setShowPreferences(true)}>
                  {t('profile.addTravelStyle')}
                </button>
              )}
            </div>

            <dl className="profile__info">
              {user.email && (
                <div className="profile__info-row">
                  <dt>{t('profile.email')}</dt>
                  <dd>{user.email}</dd>
                </div>
              )}

              {user.number && (
                <div className="profile__info-row">
                  <dt>{t('profile.phone')}</dt>
                  <dd>{formatPhoneNumber(user.number)}</dd>
                </div>
              )}

              {user.created_at && (
                <div className="profile__info-row">
                  <dt>{t('profile.memberSince')}</dt>
                  <dd>{formatMemberSince(user.created_at, locale)}</dd>
                </div>
              )}

              <div className="profile__info-row profile__info-row--language">
                <dt>{t('profile.language')}</dt>
                <dd>
                  <LanguageToggle />
                </dd>
              </div>

              <Link to="/favorites" className="profile__info-row profile__info-row--link">
                <dt>{t('profile.favoriteDestinations')}</dt>
                <dd className="profile__favorites-value">
                  {favoritesLoading && favoriteCount === null ? '···' : (favoriteCount ?? 0)}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </dd>
              </Link>

              {user.role === 'admin' ? (
                <Link to="/admin" className="profile__info-row profile__info-row--link">
                  <dt>
                    {t('profile.adminDashboard')}
                    {unseenCount > 0 && (
                      <NotificationDot className="notif-dot--inline" label={t('notifications.new')} />
                    )}
                  </dt>
                  <dd className="profile__favorites-value">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </dd>
                </Link>
              ) : (
                <Link to="/my-destinations" className="profile__info-row profile__info-row--link">
                  <dt>
                    {t('profile.manageDestinations')}
                    {unseenCount > 0 && (
                      <NotificationDot className="notif-dot--inline" label={t('notifications.new')} />
                    )}
                  </dt>
                  <dd className="profile__favorites-value">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </dd>
                </Link>
              )}
            </dl>

            <button type="button" className="profile__logout" onClick={handleLogout}>
              {t('profile.logout')}
            </button>
          </>
        )}
      </main>

      {showPreferences && (
        <PreferencesModal
          initialSelected={travelStyles}
          onSave={handleSavePreferences}
          onCancel={() => setShowPreferences(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default Profile