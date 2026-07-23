import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService.js'
import '../styles/Register.css'

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

    setLoading(true)
    try {
      await registerUser(formData)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register">
      <aside className="register__visual">
        <div className="register__visual-inner">
          <span className="register__brand">GlobeTrotter</span>
          <img
            src="/src/assets/cameroon-landing.jpg"
            alt="A scenic view representing Cameroon"
            className="register__image"
          />
          <p className="register__tagline">Your journey through Cameroon starts here.</p>
        </div>
      </aside>

      <main className="register__form-panel">
        <form className="register__form" onSubmit={handleSubmit}>
          <span className="register__eyebrow">Create account</span>
          <h1>Join GlobeTrotter</h1>
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
          <input
            id="number"
            name="number"
            type="tel"
            value={formData.number}
            onChange={handleChange}
          />

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
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

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