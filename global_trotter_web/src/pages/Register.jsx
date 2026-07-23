import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService.js'
import '../styles/Register.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    number: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function handleNumberChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
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
      await registerUser(payload)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const passwordScore = getPasswordStrength(formData.password)
  const strengthClass = passwordScore <= 2 ? 'weak' : passwordScore <= 4 ? 'fair' : 'strong'
  const strengthLabel = passwordScore <= 2 ? 'Weak' : passwordScore <= 4 ? 'Fair' : 'Strong'

  return (
    <div className="register">
      <aside className="register__visual">
        <div className="register__visual-inner">
          <span className="register__brand">GlobalTrotter</span>
          <img
            src="/src/assets/cameroon-landing.jpg"
            alt="A scenic view representing Cameroon"
            className="register__image"
          />
          <p className="register__tagline">Your journey through Yaounde starts here.</p>
        </div>
      </aside>

      <main className="register__form-panel">
        <form className="register__form" onSubmit={handleSubmit} noValidate>
          <span className="register__eyebrow">Create account</span>
          <h1>Join GlobalTrotter</h1>
          <p className="register__hint">Fill in your name, a way to reach you, and a password.</p>

          {error && <p className="register__error">{error}</p>}

          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />

          <label htmlFor="number">Phone number</label>
          <div className="register__phone-row">
            <span className="register__phone-prefix">+237</span>
            <input
              id="number"
              name="number"
              type="tel"
              inputMode="numeric"
              maxLength={9}
              placeholder="6xxxxxxxx"
              value={formData.number}
              onChange={handleNumberChange}
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="register__password-row">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="register__toggle-visibility"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {formData.password && (
            <div className="register__strength-meter">
              <div className="register__strength-track">
                <div
                  className={`register__strength-fill register__strength-fill--${strengthClass}`}
                  style={{ width: `${(passwordScore / 5) * 100}%` }}
                />
              </div>
              <span className="register__strength-label">{strengthLabel}</span>
            </div>
          )}

          <p className="register__requirement">
            At least 8 characters, with uppercase, lowercase, a number, and a special character.
          </p>

          <button type="submit" className="register__submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <p className="register__switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </main>
    </div>
  )
}

export default Register