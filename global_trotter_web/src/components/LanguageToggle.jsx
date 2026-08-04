import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/LanguageToggle.css'

const OPTIONS = [
  { value: 'fr', short: 'FR' },
  { value: 'en', short: 'EN' }
]

function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation()

  return (
    <div className="language-toggle" role="group" aria-label={t('languageToggle.label')}>
      {OPTIONS.map(option => {
        const isActive = language === option.value
        return (
          <button
            key={option.value}
            type="button"
            className={`language-toggle__option${isActive ? ' language-toggle__option--active' : ''}`}
            onClick={() => setLanguage(option.value)}
            aria-pressed={isActive}
            aria-label={t('languageToggle.switchTo', { language: t(`languageToggle.${option.value}`) })}
          >
            {option.short}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageToggle