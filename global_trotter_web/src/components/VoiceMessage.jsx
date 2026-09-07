import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/VoiceMessage.css'

const BAR_COUNT = 28
const MIN_BAR = 4
const MAX_BAR = 22

let activePlayer = null

function seedFrom(value) {
  let hash = 0
  const text = String(value || 'voice')

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash) || 1
}

function buildBars(seed) {
  const bars = []
  let state = seedFrom(seed)

  for (let index = 0; index < BAR_COUNT; index += 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    const ratio = state / 2147483648
    bars.push(Math.round(MIN_BAR + ratio * (MAX_BAR - MIN_BAR)))
  }

  return bars
}

function formatClock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function VoiceMessage({ src, duration = 0, seed, compact = false }) {
  const { t } = useTranslation()
  const audioRef = useRef(null)
  const trackRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [measured, setMeasured] = useState(0)

  const [bars] = useState(() => buildBars(seed || src))

  useEffect(() => {
    return () => {
      if (activePlayer === audioRef.current) activePlayer = null
    }
  }, [])

  const total = measured || duration || 0
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0
  const filled = Math.round(progress * BAR_COUNT)

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      if (activePlayer && activePlayer !== audio) activePlayer.pause()
      activePlayer = audio
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }

  function seek(event) {
    const audio = audioRef.current
    const track = trackRef.current
    if (!audio || !track || !total) return

    const bounds = track.getBoundingClientRect()
    const point = event.clientX - bounds.left
    const ratio = Math.min(1, Math.max(0, point / bounds.width))

    audio.currentTime = ratio * total
    setElapsed(ratio * total)
  }

  function handleLoaded() {
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration)) setMeasured(audio.duration)
  }

  return (
    <div className={`voice ${compact ? 'voice--compact' : ''} ${playing ? 'is-playing' : ''}`}>
      <button
        type="button"
        className="voice__play"
        onClick={toggle}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M8 5l11 7-11 7z" />
          </svg>
        )}
      </button>

      <div
        ref={trackRef}
        className="voice__track"
        onClick={seek}
        role="slider"
        tabIndex={0}
        aria-label={t('chat.voiceProgress')}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(elapsed)}
        onKeyDown={event => {
          const audio = audioRef.current
          if (!audio || !total) return
          if (event.key === 'ArrowRight') {
            audio.currentTime = Math.min(total, audio.currentTime + 5)
          } else if (event.key === 'ArrowLeft') {
            audio.currentTime = Math.max(0, audio.currentTime - 5)
          }
        }}
      >
        {bars.map((height, index) => (
          <i
            key={index}
            className={index < filled ? 'is-filled' : ''}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <span className="voice__time">{formatClock(playing || elapsed ? elapsed : total)}</span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoaded}
        onDurationChange={handleLoaded}
        onTimeUpdate={event => setElapsed(event.target.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setElapsed(0)
        }}
      />
    </div>
  )
}

export default VoiceMessage