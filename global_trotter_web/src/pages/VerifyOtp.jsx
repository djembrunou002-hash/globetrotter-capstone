import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { verifyOtp, resendOtp } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'

function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const { email, number, devOtp } = location.state || {}

  const [code, setCode] = useState(devOtp || '')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  if (!email && !number) {
    navigate('/register', { replace: true })
    return null
  }

  const destination = email || (number.startsWith('+') ? number : `+237${number}`)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!code.trim()) {
      setError(t('validation.codeRequired'))
      return
    }

    setLoading(true)
    try {
      const response = await verifyOtp({ email, number, code: code.trim() })
      setToken(response.token)
      setUser(response.user)
      navigate('/select-style')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    setResending(true)
    try {
      const response = await resendOtp({ email, number })
      setInfo(response.message || t('verifyOtp.newCodeSent'))
      if (response.dev_otp) setCode(response.dev_otp)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout tagline={t('verifyOtp.tagline')} onBack={() => navigate(-1)} forceLogoLink>
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">{t('verifyOtp.eyebrow')}</span>
        <h1>{t('verifyOtp.title')}</h1>
        <p className="auth__hint">{t('verifyOtp.hint', { destination })}</p>

        {error && <p className="auth__error">{error}</p>}
        {info && <p className="auth__hint">{info}</p>}

        {devOtp && (
          <p className="auth__dev-otp">
            {t('verifyOtp.devNotice')}
          </p>
        )}

        <label htmlFor="code">{t('verifyOtp.codeLabel')}</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="auth__otp-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? t('verifyOtp.submitting') : t('verifyOtp.submit')}
        </button>

        <p className="auth__switch">
          {t('verifyOtp.noCode')}{' '}
          <button type="button" className="auth__resend" onClick={handleResend} disabled={resending}>
            {resending ? t('verifyOtp.resending') : t('verifyOtp.resend')}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

export default VerifyOtp