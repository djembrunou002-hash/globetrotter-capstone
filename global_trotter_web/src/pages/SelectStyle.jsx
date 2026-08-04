import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePreferences } from '../services/userService.js'
import { getToken, setUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'
import StyleSelector from '../components/StyleSelector.jsx'

function SelectStyle() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
    }
  }, [navigate])

  function toggleStyle(value) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  async function handleContinue() {
    setError('')
    setLoading(true)
    try {
      const response = await updatePreferences(selected)
      setUser(response.user)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    navigate('/home')
  }

  return (
    <AuthLayout tagline={t('selectStyle.tagline')}>
      <div className="auth__form">
        <span className="auth__eyebrow">{t('selectStyle.eyebrow')}</span>
        <h1>{t('selectStyle.title')}</h1>
        <p className="auth__hint">
          {t('selectStyle.hint')}
        </p>

        {error && <p className="auth__error">{error}</p>}

        <StyleSelector selected={selected} onToggle={toggleStyle} />

        <button type="button" className="auth__submit" onClick={handleContinue} disabled={loading}>
          {loading ? t('common.saving') : t('common.continue')}
        </button>

        <button type="button" className="auth__skip" onClick={handleSkip} disabled={loading}>
          {t('selectStyle.skip')}
        </button>
      </div>
    </AuthLayout>
  )
}

export default SelectStyle