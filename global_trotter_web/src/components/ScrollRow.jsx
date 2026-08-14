import { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/ScrollRow.css'

function ScrollRow({ className = '', children, ...rest }) {
  const trackRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanLeft(el.scrollLeft > 1)
    setCanRight(max > 1 && el.scrollLeft < max - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(el)
      for (const child of el.children) observer.observe(child)
    }

    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (observer) observer.disconnect()
    }
  }, [update, children])

  function nudge(direction) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.7, 120), behavior: 'smooth' })
  }

  return (
    <div className={`scroll-row ${canLeft ? 'scroll-row--fade-left' : ''} ${canRight ? 'scroll-row--fade-right' : ''}`}>
      <button
        type="button"
        className="scroll-row__arrow scroll-row__arrow--left"
        onClick={() => nudge(-1)}
        tabIndex={-1}
        aria-hidden="true"
        hidden={!canLeft}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className={`scroll-row__track ${className}`} ref={trackRef} {...rest}>
        {children}
      </div>

      <button
        type="button"
        className="scroll-row__arrow scroll-row__arrow--right"
        onClick={() => nudge(1)}
        tabIndex={-1}
        aria-hidden="true"
        hidden={!canRight}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

export default ScrollRow