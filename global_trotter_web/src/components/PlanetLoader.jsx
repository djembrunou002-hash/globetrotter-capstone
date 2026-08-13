import '../styles/PlanetLoader.css'

function PlanetLoader({ label, size = 'default' }) {
  const rootClassName = size === 'small' ? 'planet-loader planet-loader--small' : 'planet-loader'
  return (
    <div className={rootClassName} role="status" aria-live="polite">
      <div className="planet-loader__stage">
        <svg className="planet-loader__planet" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <clipPath id="planetLoaderClip">
              <circle cx="32" cy="32" r="30" />
            </clipPath>
          </defs>

          {/* océan */}
          <circle cx="32" cy="32" r="30" fill="var(--color-muted)" opacity="0.14" />

          {/* continents */}
          <g clipPath="url(#planetLoaderClip)" fill="var(--color-muted)" opacity="0.55">
            {/* Groenland */}
            <path d="M27 5.5 C30 4.5 32.5 6.5 31.5 9 C30.5 11.5 27 11.5 26 9.2 C25.2 7.2 25.8 6 27 5.5 Z" />
            {/* Amérique du Nord */}
            <path d="M6.5 13.5 C9 10 14 8.8 17.2 10.8 C20.2 8.8 25 9.8 26.2 12.8 C27.4 15 25.2 16.4 24 18.2 C23 20 24 22 22.2 23 C21 25 22 27.2 20 28.4 C18.6 26.4 17 24.4 15.8 22.4 C12.8 21.4 9.8 19.4 8.8 16.4 C7 15.4 5.6 14.6 6.5 13.5 Z" />
            {/* Amérique du Sud */}
            <path d="M20.8 29.8 C24 28.8 27 31 28.2 34 C29.2 37 27.2 40 26.2 43 C25 47 24 51.4 22 50.4 C20.8 46.4 22 43 21 40 C19 37 18.8 33 20.8 29.8 Z" />
            {/* Europe */}
            <path d="M33.8 11.8 C37 9.8 41 10.8 42.2 13 C43.2 15 40 16.2 38 17 C36 18 34 17 33.8 15 C33 14 33 12.6 33.8 11.8 Z" />
            {/* Afrique */}
            <path d="M35 19.8 C38 18.8 43 19.8 45 22 C46 25 44 28 43 31 C42 35 40 39 38 42 C36 44 34 42 34 39 C33 35 34 31 34 28 C33 25 33 21 35 19.8 Z" />
            {/* Asie */}
            <path d="M43.8 11.5 C48 9.5 54 10.5 57 13.8 C58.2 17 55 19 52 20 C49 21 46 20 45 18 C43.8 16 42.8 13.5 43.8 11.5 Z" />
            {/* Inde / Asie du Sud-Est */}
            <path d="M49.8 20.8 C52 21.8 53 24 51 25.2 C49 25.2 47.8 22.8 49.8 20.8 Z" />
            {/* Australie */}
            <path d="M53.8 33.8 C57 32.8 60 35 59 38 C57 40 54 39 52.8 37 C52 35.4 52.6 34.2 53.8 33.8 Z" />
            {/* Antarctique */}
            <path d="M14 53 C24 57.5 42 57.5 54 53.4 C50 60 18 60 14 53 Z" />
          </g>

          <circle cx="32" cy="32" r="30" fill="none" stroke="var(--color-muted)" strokeWidth="1.6" />
        </svg>

        <div className="planet-loader__orbit">
          <div className="planet-loader__vehicle-anchor">
            <div className="planet-loader__vehicle">
              <svg className="planet-loader__car" viewBox="0 0 48 22" aria-hidden="true">
                <circle cx="10" cy="17" r="2.6" fill="var(--color-muted)" opacity="0.15" />
                <circle cx="6" cy="15" r="2" fill="var(--color-muted)" opacity="0.28" />
                <circle cx="3" cy="17" r="1.4" fill="var(--color-muted)" opacity="0.42" />
                <rect x="16" y="8" width="26" height="8" rx="4" fill="var(--color-muted)" />
                <rect x="22" y="2" width="14" height="8" rx="4" fill="var(--color-muted)" />
                <rect x="25" y="4" width="8" height="5" rx="1.5" fill="var(--color-sand)" />
                <circle cx="22" cy="18" r="3.4" fill="var(--color-ink)" />
                <circle cx="36" cy="18" r="3.4" fill="var(--color-ink)" />
                <circle cx="22" cy="18" r="1.2" fill="var(--color-sand)" />
                <circle cx="36" cy="18" r="1.2" fill="var(--color-sand)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      {label && <p className="planet-loader__label">{label}</p>}
    </div>
  )
}

export default PlanetLoader