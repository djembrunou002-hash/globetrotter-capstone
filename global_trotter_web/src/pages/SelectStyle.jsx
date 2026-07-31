import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePreferences } from '../services/userService.js'
import { getToken, setUser } from '../services/tokenStorage.js'
import AuthLayout from '../components/Authlayout.jsx'
import StyleSelector from '../components/StyleSelector.jsx'

function SelectStyle() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
    }
  }, [navigate])

  function toggleStyle(value) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  async function handleContinue() {
    setError('')
    setLoading(true)
    try {
      const response = await updatePreferences(selected)
      setUser(response.user)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    navigate('/home')
  }

  return (
    <AuthLayout tagline="Tell us what you love, and we'll tailor your trips.">
      <div className="auth__form">
        <span className="auth__eyebrow">One last step</span>
        <h1>What are you into?</h1>
        <p className="auth__hint">
          Pick as many styles as you like. You can always change this later from your profile.
        </p>

        {error && <p className="auth__error">{error}</p>}

        <StyleSelector selected={selected} onToggle={toggleStyle} />

        <button type="button" className="auth__submit" onClick={handleContinue} disabled={loading}>
          {loading ? 'Saving...' : 'Continue'}
        </button>

        <button type="button" className="auth__skip" onClick={handleSkip} disabled={loading}>
          Skip for now
        </button>
      </div>
    </AuthLayout>
  )
}

export default SelectStyle