import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/authService.js'
import { setToken } from '../services/tokenStorage.js'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordField from '../components/PasswordField.jsx'
import PhoneInput from '../components/PhoneInput.jsx'
import EmailField from '../components/EmailField.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const navigate = useNavigate()
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
      setError('Password is required')
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

    const payload = {
      email: formData.email,
      number: formData.number ? `+237${formData.number}` : '',
      password: formData.password
    }

    setLoading(true)
    try {
      const response = await loginUser(payload)
      setToken(response.token)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout tagline="Pick up where you left off.">
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <span className="auth__eyebrow">Welcome back</span>
        <h1>Log in to GlobalTrotter</h1>
        <p className="auth__hint">Use the email or phone number you registered with.</p>

        {error && <p className="auth__error">{error}</p>}

        <EmailField value={formData.email} onChange={handleChange} />

        <PhoneInput value={formData.number} onChange={handleNumberChange} />

        <PasswordField value={formData.password} onChange={handleChange} />

        <button type="submit" className="auth__submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="auth__switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login