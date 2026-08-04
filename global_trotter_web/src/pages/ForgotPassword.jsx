import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword } from '../services/authService.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'
import EmailField from '../components/Emailfield.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPassword() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setEmail(e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(t('validation.contactRequired'))
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setError(t('validation.invalidEmail'))
      return
    }

    setLoading(true)
    try {
      const response = await forgotPassword({ email })
      navigate('/reset-password', {
        state: { email, devOtp: response.dev_otp },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout tagline={t('forgotPassword.tagline')} onBack={() => navigate(-1)} forceLogoLink>
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">{t('forgotPassword.eyebrow')}</span>
        <h1>{t('forgotPassword.title')}</h1>
        <p className="auth__hint">{t('forgotPassword.hint')}</p>

        {error && <p className="auth__error">{error}</p>}

        <EmailField value={email} onChange={handleChange} />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </button>

        <p className="auth__switch">
          {t('forgotPassword.rememberedPassword')} <Link to="/login">{t('forgotPassword.backToLogin')}</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword