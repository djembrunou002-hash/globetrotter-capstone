import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser, loginWithGoogle } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import AuthLayout from '../components/Authlayout.jsx'
import PasswordField from '../components/Passwordfield.jsx'
import PhoneInput from '../components/Phoneinput.jsx'
import EmailField from '../components/Emailfield.jsx'
import GoogleButton from '../components/GoogleButton.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
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

    if (!formData.name || !formData.password) {
      setError(t('validation.nameAndPasswordRequired'))
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

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError(t('validation.passwordRules'))
      return
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      number: formData.number ? `+237${formData.number}` : '',
      password: formData.password
    }

    setLoading(true)
    try {
      const response = await registerUser(payload)

      if (response.token) {
        setToken(response.token)
        setUser(response.user)
        navigate('/select-style', { replace: true })
        return
      }

      navigate('/verify-otp', {
        replace: true,
        state: {
          email: payload.email || undefined,
          number: formData.number || undefined,
          devOtp: response.dev_otp,
        },
      })
    } catch (err) {
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
      navigate(response.user.role === 'admin' ? '/admin' : '/home', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  return (
    <AuthLayout tagline={t('register.tagline')} forceLogoLink>
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">{t('register.eyebrow')}</span>
        <h1>{t('register.title')}</h1>
        <p className="auth__hint">{t('register.hint')}</p>

        {error && <p className="auth__error">{error}</p>}

        <label htmlFor="name">{t('fields.fullName')}</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
        />

        <EmailField value={formData.email} onChange={handleChange} />

        <PhoneInput value={formData.number} onChange={handleNumberChange} />

        <PasswordField
          value={formData.password}
          onChange={handleChange}
          withStrengthMeter
          hint={t('register.passwordHint')}
        />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? t('register.submitting') : t('register.submit')}
        </button>

        <GoogleButton onCredential={handleGoogleCredential} onError={setError} />

        <p className="auth__switch">
          {t('register.haveAccount')} <Link to="/login">{t('register.logInLink')}</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register