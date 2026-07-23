import { Link } from 'react-router-dom'
import '../styles/Landing.css'

function Landing() {
  return (
    <div className="landing">
      <div className="landing__pattern" aria-hidden="true"></div>

      <nav className="landing__nav">
        <span className="landing__logo">GlobalTrotter</span>
        <Link to="/register" className="landing__nav-cta">Sign up</Link>
      </nav>

      <main className="landing__hero">
        <div className="landing__copy">
          <span className="landing__eyebrow">CMR · 237</span>
          <h1 className="landing__headline">Yaounde, in <em>every</em> direction.</h1>
          <p className="landing__subcopy">
            From shaded boulevards to panoramic hilltops, explore Yaoundé, the heart of Cameroon, 
            where every neighborhood tells a story and every journey begins.
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