import { useEffect, useRef, useState } from 'react'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

let scriptPromise = null

function loadGoogleScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Renders Google's own "Sign in with Google" button and forwards the
// resulting ID token (credential) to onCredential. Silently hides itself
// if VITE_GOOGLE_CLIENT_ID hasn't been configured yet, so the rest of the
// auth form still works without Google set up.
function GoogleButton({ onCredential, onError }) {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return

    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential)
            } else {
              onError?.('Google sign-in did not return a credential')
            }
          },
        })

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        })

        setReady(true)
      })
      .catch(() => onError?.('Could not load Google sign-in'))

    return () => {
      cancelled = true
    }
  }, [onCredential, onError])

  if (!CLIENT_ID) return null

  return (
    <div className="auth__google">
      <div className="auth__divider"><span>or</span></div>
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
      {!ready && <p className="auth__hint">Loading Google sign-in…</p>}
    </div>
  )
}

export default GoogleButton