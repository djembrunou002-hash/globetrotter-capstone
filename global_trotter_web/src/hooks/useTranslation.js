import { useContext } from 'react'
import { LanguageContext } from '../context/LanguageContext.js'
import { DEFAULT_LANGUAGE, LOCALES, translate } from '../i18n/translations.js'

const FALLBACK = {
  language: DEFAULT_LANGUAGE,
  locale: LOCALES[DEFAULT_LANGUAGE],
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, vars) => translate(DEFAULT_LANGUAGE, key, vars)
}

export function useTranslation() {
  return useContext(LanguageContext) || FALLBACK
}