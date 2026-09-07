import { useTranslation } from '../hooks/useTranslation.js'
import { initials } from '../utils/chatFormat.js'
import '../styles/TypingIndicator.css'

const MAX_SHOWN = 3

function TypingIndicator({ entries, showAvatar = false }) {
  const { t } = useTranslation()

  if (!entries || entries.length === 0) return null

  const shown = entries.slice(0, MAX_SHOWN)
  const extra = entries.length - shown.length

  return (
    <div className="typing">
      {showAvatar && (
        <span className="typing__avatars">
          {shown.map(entry => (
            <span key={entry.user_id} className="typing__avatar" aria-hidden="true">
              {initials(entry.name)}
            </span>
          ))}
          {extra > 0 && <span className="typing__avatar typing__avatar--more">+{extra}</span>}
        </span>
      )}

      <div className="typing__bubble">
        {showAvatar && (
          <span className="typing__names">
            {shown.map(entry => entry.name).join(', ')}
            {extra > 0 ? ` +${extra}` : ''}
          </span>
        )}

        {entries.some(entry => entry.mode === 'voice') ? (
          <span className="typing__wave" aria-label={t('chat.recordingIndicator')}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          <span className="typing__dots" aria-label={t('chat.typingIndicator')}>
            <i />
            <i />
            <i />
          </span>
        )}

        <span className="typing__label">
          {entries.some(entry => entry.mode === 'voice')
            ? t('chat.recordingIndicator')
            : t('chat.typingIndicator')}
        </span>
      </div>
    </div>
  )
}

export default TypingIndicator