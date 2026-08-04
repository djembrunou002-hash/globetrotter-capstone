import { useState } from 'react'
import { getAiDestinationSuggestions } from '../services/aiService.js'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/AiAssistant.css'

function AiAssistant({ onResult }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setOpen(false)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')
    try {
      const response = await getAiDestinationSuggestions(trimmed)
      onResult(trimmed, response)
      setOpen(false)
      setQuery('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="ai-assistant__trigger"
        onClick={() => setOpen(true)}
        aria-label={t('ai.trigger')}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
        </svg>
      </button>

      {open && (
        <div className="ai-assistant__overlay" role="dialog" aria-modal="true" aria-label={t('ai.dialogLabel')}>
          <div className="ai-assistant__panel">
            <div className="ai-assistant__panel-header">
              <h2 className="ai-assistant__panel-title">{t('ai.title')}</h2>
              <button
                type="button"
                className="ai-assistant__close"
                onClick={handleClose}
                aria-label={t('ai.close')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <p className="ai-assistant__panel-subtitle">
              {t('ai.subtitle')}
            </p>

            <form className="ai-assistant__form" onSubmit={handleSubmit}>
              <textarea
                className="ai-assistant__textarea"
                placeholder={t('ai.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                rows={4}
                autoFocus
              />
              {error && <p className="ai-assistant__error">{error}</p>}
              <button type="submit" className="ai-assistant__submit" disabled={loading || !query.trim()}>
                {loading ? t('ai.submitting') : t('ai.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default AiAssistant