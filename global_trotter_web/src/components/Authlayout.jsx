import Logo from './Logo.jsx'
import '../styles/AuthForm.css'

import landingImage from '../assets/Cameroon-landing.jpg'


function AuthLayout({ tagline, children, onBack, forceLogoLink = false }) {

  return (

    <div className="auth">

      {onBack && (
        <button type="button" className="auth__back" aria-label="Go back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="auth__logo">

        <Logo theme="light" forceLink={forceLogoLink}/>

      </div>



      <aside className="auth__visual">


        <div className="auth__visual-inner">


          <img

            src={landingImage}

            alt="A scenic view representing Cameroon"

            className="auth__image"

          />


          <p className="auth__tagline">

            {tagline}

          </p>


        </div>


      </aside>




      <main className="auth__form-panel">

        {children}

      </main>


    </div>

  )

}


export default AuthLayout