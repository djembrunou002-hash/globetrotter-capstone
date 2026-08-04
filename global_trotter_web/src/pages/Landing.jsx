import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ShowcaseImage from '../components/Showcaseimage.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/Landing.css'

import landingImage from '../assets/Cameroon-landing.jpg'
import showcase1 from '../assets/cameroon-showcase-1.jpg'
import showcase2 from '../assets/cameroon-showcase-2.jpg'
import showcase3 from '../assets/cameroon-showcase-3.jpg'
import showcase4 from '../assets/cameroon-showcase-4.jpg'
import showcase5 from '../assets/cameroon-showcase-5.jpg'

const SHOWCASE_IMAGES = [showcase1, showcase2, showcase3, showcase4, showcase5]

function Landing() {
  const { t } = useTranslation()

  return (
    <div className="landing">

      <div className="landing__pattern" aria-hidden="true"></div>

      <nav className="landing__nav">

        <Logo theme="light" />

        <div className="landing__nav-links">

          <Link
            to="/login"
            className="landing__nav-login"
          >
            {t('landing.logIn')}
          </Link>

          <Link
            to="/register"
            className="landing__nav-cta"
          >
            {t('landing.signUp')}
          </Link>

        </div>

      </nav>

      <main className="landing__hero">

        <div className="landing__copy">

          <span className="landing__eyebrow">
            {t('landing.eyebrow')}
          </span>

          <h1 className="landing__headline">
            {t('landing.headlineBefore')}
            <em>{t('landing.headlineEmphasis')}</em>
            {t('landing.headlineAfter')}
          </h1>

          <p className="landing__subcopy">
            {t('landing.subcopy')}
          </p>

          <Link
            to="/register"
            className="landing__cta"
          >
            {t('landing.cta')}
          </Link>

        </div>

        <div className="landing__frame-wrap">

          <div className="landing__frame">

            <span className="landing__stamp">
              {t('landing.stamp')}
            </span>

            <img
              src={landingImage}
              alt={t('landing.heroAlt')}
              className="landing__image"
            />

          </div>

        </div>

      </main>

      <section className="landing__showcase">

        <h2 className="landing__showcase-title">
          {t('landing.showcaseTitle')}
        </h2>

        <div className="landing__showcase-grid">

          {
            SHOWCASE_IMAGES.map((src, index) => (
              <ShowcaseImage
                key={index}
                src={src}
                alt={t('landing.showcaseAlt')}
              />
            ))
          }

        </div>

      </section>

      <footer
        className="landing__flagbar"
        aria-hidden="true"
      />

    </div>
  )
}

export default Landing