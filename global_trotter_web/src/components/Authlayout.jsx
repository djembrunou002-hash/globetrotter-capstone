import Logo from './Logo.jsx'
import '../styles/AuthForm.css'

function AuthLayout({ tagline, children }) {
  return (
    <div className="auth">
      <div className="auth__logo">
        <Logo theme="light" />
      </div>

      <aside className="auth__visual">
        <div className="auth__visual-inner">
          <img
            src="/src/assets/cameroon-landing.jpg"
            alt="A scenic view representing Cameroon"
            className="auth__image"
          />
          <p className="auth__tagline">{tagline}</p>
        </div>
      </aside>

      <main className="auth__form-panel">
        {children}
      </main>
    </div>
  )
}

export default AuthLayout