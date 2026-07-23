import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import '../styles/Landing.css'

function Landing() {
  return (
    <div className="landing">
      <div className="landing__pattern" aria-hidden="true"></div>

      <nav className="landing__nav">
        <Logo theme="light" />
        <div className="landing__nav-links">
          <Link to="/login" className="landing__nav-login">Log in</Link>
          <Link to="/register" className="landing__nav-cta">Sign up</Link>
        </div>
      </nav>

      <main className="landing__hero">
        <div className="landing__copy">
          <span className="landing__eyebrow">CMR · 237</span>
          <h1 className="landing__headline">Cameroon, in <em>every</em> direction.</h1>
          <p className="landing__subcopy">
            From the surf at Kribi to the peaks above Buea, plan a trip across
            a country that holds nearly every landscape in Africa within its borders.
          </p>
          <Link to="/register" className="landing__cta">Sign up to start planning</Link>
        </div>

        <div className="landing__frame-wrap">
          <div className="landing__frame">
            <span className="landing__stamp">CMR · TRAVEL</span>
            <img
              src="/src/assets/cameroon-landing.jpg"
              alt="A scenic view representing Cameroon"
              className="landing__image"
            />
          </div>
        </div>
      </main>

      <footer className="landing__flagbar" aria-hidden="true"></footer>
    </div>
  )
}

export default Landing