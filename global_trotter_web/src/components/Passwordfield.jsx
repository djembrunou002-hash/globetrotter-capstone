import { useState } from 'react'
import '../styles/AuthForm.css'

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

function PasswordField({
  id = 'password',
  name = 'password',
  label = 'Password',
  value,
  onChange,
  withStrengthMeter = false,
  hint
}) {
  const [showPassword, setShowPassword] = useState(false)
  const score = getPasswordStrength(value)
  const strengthClass = score <= 2 ? 'weak' : score <= 4 ? 'fair' : 'strong'
  const strengthLabel = score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : 'Strong'

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="auth__password-row">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="auth__toggle-visibility"
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

      {withStrengthMeter && value && (
        <div className="auth__strength-meter">
          <div className="auth__strength-track">
            <div
              className={`auth__strength-fill auth__strength-fill--${strengthClass}`}
              style={{ width: `${(score / 5) * 100}%` }}
            />
          </div>
          <span className="auth__strength-label">{strengthLabel}</span>
        </div>
      )}

      {hint && <p className="auth__requirement">{hint}</p>}
    </>
  )
}

export default PasswordField