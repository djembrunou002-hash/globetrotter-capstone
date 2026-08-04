import { useState } from 'react'
import StyleSelector from './StyleSelector.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/PreferencesModal.css'

function PreferencesModal({ initialSelected, onSave, onCancel }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(initialSelected)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleStyle(value) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    setError('')
    setSubmitting(true)
    try {
      await onSave(selected)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="preferences-modal__backdrop" onClick={submitting ? undefined : onCancel}>
      <div
        className="preferences-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('preferences.title')}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="preferences-modal__title">{t('preferences.title')}</h3>
        <p className="preferences-modal__hint">{t('preferences.hint')}</p>

        {error && <p className="preferences-modal__error">{error}</p>}

        <StyleSelector selected={selected} onToggle={toggleStyle} />

        <div className="preferences-modal__actions">
          <button
            type="button"
            className="preferences-modal__cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="preferences-modal__save"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreferencesModal