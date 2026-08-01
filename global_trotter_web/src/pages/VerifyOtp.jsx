import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { verifyOtp, resendOtp } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import AuthLayout from '../components/Authlayout.jsx'

function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()

  const { email, number, devOtp } = location.state || {}

  const [code, setCode] = useState(devOtp || '')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  if (!email && !number) {
    // Someone navigated here directly without registering first.
    navigate('/register', { replace: true })
    return null
  }

  const destination = email || (number.startsWith('+') ? number : `+237${number}`)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!code.trim()) {
      setError('Enter the code we sent you')
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
      setInfo(response.message || 'New code sent')
      if (response.dev_otp) setCode(response.dev_otp)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout tagline="Just one more step.">
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">Verify your account</span>
        <h1>Enter your code</h1>
        <p className="auth__hint">We sent a verification code to {destination}.</p>

        {error && <p className="auth__error">{error}</p>}
        {info && <p className="auth__hint">{info}</p>}

        {devOtp && (
          <p className="auth__dev-otp">
            Dev mode (no Brevo key set): your code is pre-filled below.
          </p>
        )}

        <label htmlFor="code">Verification code</label>
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
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <p className="auth__switch">
          Didn't get a code?{' '}
          <button type="button" className="auth__resend" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

export default VerifyOtp