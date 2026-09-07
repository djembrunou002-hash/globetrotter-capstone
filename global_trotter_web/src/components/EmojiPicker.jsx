import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/EmojiPicker.css'

const RECENT_KEY = 'globaltrotter:chat:emoji-recent'
const RECENT_MAX = 24

const STICKERS = [
  '🎉', '👍', '❤️', '😂', '🔥', '🙏', '😍', '😎',
  '🥳', '✈️', '🌍', '🏝️', '📍', '👏', '🤝', '💯',
  '🫶', '😴', '🤔', '😭', '🚀', '☀️', '🌙', '🍾'
]

const CATEGORIES = [
  {
    id: 'smileys',
    icon: '🙂',
    emoji: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😯', '😴',
      '😪', '😵', '🥴', '😷', '🤒', '😢', '😭', '😤', '😠', '😡',
      '🥺', '😳', '🤯', '😱', '😨', '😰', '🥵', '🥶', '😈', '💀'
    ]
  },
  {
    id: 'gestures',
    icon: '👍',
    emoji: [
      '👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '👈', '👉',
      '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪',
      '🙏', '🤝', '👏', '🙌', '👐', '🤲', '🫶', '✍️', '💅', '🫵',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💖'
    ]
  },
  {
    id: 'nature',
    icon: '🐾',
    emoji: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐢', '🐍', '🐙',
      '🐳', '🐬', '🐠', '🦈', '🌵', '🌴', '🌳', '🌸', '🌺', '🌻',
      '🌞', '🌝', '🌚', '⭐', '🌟', '⚡', '🔥', '🌈', '☁️', '❄️'
    ]
  },
  {
    id: 'food',
    icon: '🍽️',
    emoji: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥭',
      '🍍', '🥥', '🥑', '🍅', '🌽', '🥕', '🥔', '🍞', '🥐', '🥖',
      '🧀', '🥚', '🍳', '🥞', '🥓', '🍔', '🍟', '🍕', '🌭', '🌮',
      '🌯', '🥗', '🍜', '🍲', '🍛', '🍣', '🍤', '🍚', '🍰', '🍫',
      '🍬', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🍺', '🍷', '🥂'
    ]
  },
  {
    id: 'travel',
    icon: '✈️',
    emoji: [
      '✈️', '🚗', '🚕', '🚌', '🚎', '🏍️', '🛵', '🚲', '🛺', '🚂',
      '🚢', '⛵', '🛶', '🚁', '🚀', '🗺️', '🧭', '📍', '🏕️', '🏖️',
      '🏝️', '🏜️', '⛰️', '🏔️', '🌋', '🏞️', '🌅', '🌄', '🌇', '🌆',
      '🏙️', '🏰', '🗼', '🗽', '⛩️', '🕌', '⛪', '🏨', '🏠', '🌍',
      '🌎', '🌏', '🧳', '🎒', '🛎️', '🎫', '🎟️', '📸', '🔦', '⛺'
    ]
  },
  {
    id: 'objects',
    icon: '💡',
    emoji: [
      '📱', '💻', '⌨️', '🖥️', '🖨️', '🕹️', '💾', '💿', '📀', '📷',
      '🎥', '📞', '📟', '📺', '📻', '🎙️', '⏰', '⌛', '💡', '🔦',
      '🔋', '🔌', '💰', '💳', '💎', '⚖️', '🔧', '🔨', '🧰', '🧲',
      '🔑', '🚪', '🛏️', '🚿', '🧴', '🧼', '🎁', '🎈', '🎀', '🎊',
      '✅', '❌', '❓', '❗', '💬', '💭', '🔔', '🔕', '➕', '➖'
    ]
  }
]

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    return
  }
}

function EmojiPicker({ onPick, onSticker, onClose }) {
  const { t } = useTranslation()
  const wrapRef = useRef(null)

  const [tab, setTab] = useState('stickers')
  const [recent, setRecent] = useState(loadRecent)

  useEffect(() => {
    function handlePointer(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) onClose()
    }

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  function remember(emoji) {
    const next = [emoji, ...recent.filter(item => item !== emoji)].slice(0, RECENT_MAX)
    setRecent(next)
    saveRecent(next)
  }

  function handleEmoji(emoji) {
    remember(emoji)
    onPick(emoji)
  }

  function handleSticker(emoji) {
    remember(emoji)
    onSticker(emoji)
  }

  const activeCategory = CATEGORIES.find(category => category.id === tab)

  return (
    <div className="emoji" ref={wrapRef}>
      <div className="emoji__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stickers'}
          className={`emoji__tab ${tab === 'stickers' ? 'is-active' : ''}`}
          onClick={() => setTab('stickers')}
          title={t('chat.stickers')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 0-9 9c0-5 4-4 9-9z" />
            <path d="M12 21c5-5 4-9 9-9" />
          </svg>
        </button>

        {recent.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'recent'}
            className={`emoji__tab ${tab === 'recent' ? 'is-active' : ''}`}
            onClick={() => setTab('recent')}
            title={t('chat.recentEmoji')}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        )}

        {CATEGORIES.map(category => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={tab === category.id}
            className={`emoji__tab ${tab === category.id ? 'is-active' : ''}`}
            onClick={() => setTab(category.id)}
            title={t(`chat.emoji_${category.id}`)}
          >
            <span aria-hidden="true">{category.icon}</span>
          </button>
        ))}
      </div>

      <div className="emoji__body">
        {tab === 'stickers' && (
          <>
            <p className="emoji__hint">{t('chat.stickerHint')}</p>
            <div className="emoji__grid emoji__grid--stickers">
              {STICKERS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji__sticker"
                  onClick={() => handleSticker(emoji)}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'recent' && (
          <div className="emoji__grid">
            {recent.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji__cell"
                onClick={() => handleEmoji(emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activeCategory && (
          <div className="emoji__grid">
            {activeCategory.emoji.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji__cell"
                onClick={() => handleEmoji(emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default EmojiPicker