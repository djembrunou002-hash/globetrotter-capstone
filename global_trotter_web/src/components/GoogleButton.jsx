import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'

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

function GoogleButton({ onCredential, onError }) {
  const containerRef = useRef(null)
  const { t, language } = useTranslation()
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
              onError?.(t('google.noCredential'))
            }
          },
        })

        containerRef.current.innerHTML = ''

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          locale: language,
        })

        setReady(true)
      })
      .catch(() => onError?.(t('google.loadFailed')))

    return () => {
      cancelled = true
    }
  }, [onCredential, onError, t, language])

  if (!CLIENT_ID) return null

  return (
    <div className="auth__google">
      <div className="auth__divider"><span>{t('common.or')}</span></div>
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
      {!ready && <p className="auth__hint">{t('google.loading')}</p>}
    </div>
  )
}

export default GoogleButton