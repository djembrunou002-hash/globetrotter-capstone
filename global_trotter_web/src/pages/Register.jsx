import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser, loginWithGoogle } from '../services/authService.js'
import { setToken, setUser } from '../services/tokenStorage.js'
import AuthLayout from '../components/Authlayout.jsx'
import PasswordField from '../components/Passwordfield.jsx'
import PhoneInput from '../components/Phoneinput.jsx'
import EmailField from '../components/Emailfield.jsx'
import GoogleButton from '../components/GoogleButton.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function Register() {
  const navigate = useNavigate()
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
      setError('Name and password are required')
      return
    }

    if (!formData.email && !formData.number) {
      setError('Provide an email or a phone number')
      return
    }

    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      setError('Enter a valid email address')
      return
    }

    if (formData.number && formData.number.length !== 9) {
      setError('Phone number must be exactly 9 digits')
      return
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character')
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

      // Phone-only sign-ups skip OTP and come back already logged in
      // (no SMS credits required); email sign-ups still need the code.
      if (response.token) {
        setToken(response.token)
        setUser(response.user)
        navigate('/select-style')
        return
      }

      navigate('/verify-otp', {
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
      navigate(response.user.role === 'admin' ? '/admin' : '/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  return (
    <AuthLayout tagline="Your journey through Cameroon starts here." forceLogoLink>
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">Create account</span>
        <h1>Join GlobalTrotter</h1>
        <p className="auth__hint">Fill in your name, a way to reach you, and a password.</p>

        {error && <p className="auth__error">{error}</p>}

        <label htmlFor="name">Full name</label>
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
          hint="At least 8 characters, with uppercase, lowercase, a number, and a special character."
        />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <GoogleButton onCredential={handleGoogleCredential} onError={setError} />

        <p className="auth__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register