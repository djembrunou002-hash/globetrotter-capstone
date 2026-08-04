import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { verifyResetCode, resetPassword, forgotPassword } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'
import PasswordField from '../components/Passwordfield.jsx'

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const { email, devOtp } = location.state || {}

  const [step, setStep] = useState('code') // 'code' | 'password'
  const [code, setCode] = useState(devOtp || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  if (!email) {
    navigate('/forgot-password', { replace: true })
    return null
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!code.trim()) {
      setError(t('validation.codeRequired'))
      return
    }

    setLoading(true)
    try {
      await verifyResetCode({ email, code: code.trim() })
      setStep('password')
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
      const response = await forgotPassword({ email })
      setInfo(response.message || t('resetPassword.newCodeSent'))
      if (response.dev_otp) setCode(response.dev_otp)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError(t('validation.passwordRequired'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('validation.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await resetPassword({ email, code: code.trim(), new_password: password })
      setToken(response.token)
      setUser(response.user)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'code') {
    return (
      <AuthLayout tagline={t('resetPassword.tagline')} onBack={() => navigate('/forgot-password')} forceLogoLink>
        <form className="auth__form" onSubmit={handleVerifyCode} noValidate>
          <span className="auth__eyebrow">{t('resetPassword.codeEyebrow')}</span>
          <h1>{t('resetPassword.codeTitle')}</h1>
          <p className="auth__hint">{t('resetPassword.codeHint', { destination: email })}</p>

          {error && <p className="auth__error">{error}</p>}
          {info && <p className="auth__hint">{info}</p>}

          {devOtp && (
            <p className="auth__dev-otp">
              {t('resetPassword.devNotice')}
            </p>
          )}

          <label htmlFor="code">{t('resetPassword.codeLabel')}</label>
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
            {loading ? t('resetPassword.verifying') : t('resetPassword.verifyCode')}
          </button>

          <p className="auth__switch">
            {t('resetPassword.noCode')}{' '}
            <button type="button" className="auth__resend" onClick={handleResend} disabled={resending}>
              {resending ? t('resetPassword.resending') : t('resetPassword.resend')}
            </button>
          </p>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tagline={t('resetPassword.tagline')} onBack={() => setStep('code')} forceLogoLink>
      <form className="auth__form" onSubmit={handleResetPassword} noValidate>
        <span className="auth__eyebrow">{t('resetPassword.passwordEyebrow')}</span>
        <h1>{t('resetPassword.passwordTitle')}</h1>
        <p className="auth__hint">{t('resetPassword.passwordHint')}</p>

        {error && <p className="auth__error">{error}</p>}

        <PasswordField
          id="new-password"
          name="password"
          label={t('resetPassword.newPasswordLabel')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          withStrengthMeter
        />

        <PasswordField
          id="confirm-password"
          name="confirmPassword"
          label={t('resetPassword.confirmPasswordLabel')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </button>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword