import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const scrollPositions = new Map()

function ScrollToTop() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const currentKeyRef = useRef(location.key)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    function handleScroll() {
      scrollPositions.set(currentKeyRef.current, window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useLayoutEffect(() => {
    currentKeyRef.current = location.key

    if (navigationType === 'POP' && scrollPositions.has(location.key)) {
      window.scrollTo(0, scrollPositions.get(location.key))
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.key, navigationType])

  return null
}

export default ScrollToTop