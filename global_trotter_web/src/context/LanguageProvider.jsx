import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext, LANGUAGE_STORAGE_KEY } from './LanguageContext.js'
import { LANGUAGES, DEFAULT_LANGUAGE, LOCALES, translate } from '../i18n/translations.js'

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && LANGUAGES.includes(stored)) return stored
  } catch {
    return DEFAULT_LANGUAGE
  }

  const navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : ''
  const short = (navigatorLanguage || '').slice(0, 2).toLowerCase()
  return LANGUAGES.includes(short) ? short : DEFAULT_LANGUAGE
}

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      return
    }
  }, [language])

  const setLanguage = useCallback(next => {
    if (!LANGUAGES.includes(next)) return
    setLanguageState(next)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => (prev === 'fr' ? 'en' : 'fr'))
  }, [])

  const value = useMemo(
    () => ({
      language,
      locale: LOCALES[language],
      setLanguage,
      toggleLanguage,
      t: (key, vars) => translate(language, key, vars)
    }),
    [language, setLanguage, toggleLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export default LanguageProvider