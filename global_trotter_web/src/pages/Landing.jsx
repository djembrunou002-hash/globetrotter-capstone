import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ShowcaseImage from '../components/Showcaseimage.jsx'
import '../styles/Landing.css'

import landingImage from '../assets/cameroon-landing.jpg'
import showcase1 from '../assets/cameroon-showcase-1.jpg'
import showcase2 from '../assets/cameroon-showcase-2.jpg'
import showcase3 from '../assets/cameroon-showcase-3.jpg'
import showcase4 from '../assets/cameroon-showcase-4.jpg'
import showcase5 from '../assets/cameroon-showcase-5.jpg'


const SHOWCASE_IMAGES = [
  {
    src: showcase1,
    alt: 'A beautiful area to visit in Cameroon'
  },
  {
    src: showcase2,
    alt: 'A beautiful area to visit in Cameroon'
  },
  {
    src: showcase3,
    alt: 'A beautiful area to visit in Cameroon'
  },
  {
    src: showcase4,
    alt: 'A beautiful area to visit in Cameroon'
  },
  {
    src: showcase5,
    alt: 'A beautiful area to visit in Cameroon'
  }
]


function Landing() {

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
            Log in
          </Link>


          <Link 
            to="/register" 
            className="landing__nav-cta"
          >
            Sign up
          </Link>

        </div>

      </nav>



      <main className="landing__hero">


        <div className="landing__copy">

          <span className="landing__eyebrow">
            CMR · 237
          </span>


          <h1 className="landing__headline">
            Cameroon, in <em>every</em> direction.
          </h1>


          <p className="landing__subcopy">
            From the surf at Kribi to the peaks above Buea,
            plan a trip across a country that holds nearly
            every landscape in Africa within its borders.
          </p>


          <Link 
            to="/register" 
            className="landing__cta"
          >
            Sign up to start planning
          </Link>


        </div>



        <div className="landing__frame-wrap">

          <div className="landing__frame">

            <span className="landing__stamp">
              CMR · TRAVEL
            </span>


            <img
              src={landingImage}
              alt="A scenic view representing Cameroon"
              className="landing__image"
            />

          </div>

        </div>


      </main>




      <section className="landing__showcase">

        <h2 className="landing__showcase-title">
          Beautiful areas to visit
        </h2>


        <div className="landing__showcase-grid">

          {
            SHOWCASE_IMAGES.map((image,index)=>(
              <ShowcaseImage
                key={index}
                src={image.src}
                alt={image.alt}
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