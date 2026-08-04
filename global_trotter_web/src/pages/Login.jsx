import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, loginWithGoogle } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'
import PasswordField from '../components/Passwordfield.jsx'
import PhoneInput from '../components/Phoneinput.jsx'
import EmailField from '../components/Emailfield.jsx'
import GoogleButton from '../components/GoogleButton.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    email: '',
    number: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function handleNumberChange(digits) {
    setFormData(prev => ({ ...prev, number: digits }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.password) {
      setError(t('validation.passwordRequired'))
      return
    }

    if (!formData.email && !formData.number) {
      setError(t('validation.contactRequired'))
      return
    }

    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      setError(t('validation.invalidEmail'))
      return
    }

    if (formData.number && formData.number.length !== 9) {
      setError(t('validation.phoneLength'))
      return
    }

    const payload = {
      email: formData.email,
      number: formData.number ? `+237${formData.number}` : '',
      password: formData.password
    }

    setLoading(true)
    try {
      const response = await loginUser(payload)
      setToken(response.token)
      setUser(response.user)
      navigate(response.user.role === 'admin' ? '/admin' : '/home')
    } catch (err) {
      if (err.message === 'Please verify your account first') {
        navigate('/verify-otp', {
          state: { email: formData.email || undefined, number: formData.number || undefined },
        })
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (credential) => {
    setError('')
    setLoading(true)
    try {
      const response = await loginWithGoogle(credential)
      setToken(response.token)
      setUser(response.user)
      navigate(response.user.role === 'admin' ? '/admin' : '/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  return (
    <AuthLayout tagline={t('login.tagline')} forceLogoLink>
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">{t('login.eyebrow')}</span>
        <h1>{t('login.title')}</h1>
        <p className="auth__hint">{t('login.hint')}</p>

        {error && <p className="auth__error">{error}</p>}

        <EmailField value={formData.email} onChange={handleChange} />

        <PhoneInput value={formData.number} onChange={handleNumberChange} />

        <PasswordField value={formData.password} onChange={handleChange} />

        <p className="auth__forgot">
          <Link to="/forgot-password">{t('login.forgotPasswordLink')}</Link>
        </p>

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </button>

        <GoogleButton onCredential={handleGoogleCredential} onError={setError} />

        <p className="auth__switch">
          {t('login.noAccount')} <Link to="/register">{t('login.signUpLink')}</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login