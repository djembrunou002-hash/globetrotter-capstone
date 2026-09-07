import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import { useCall } from '../hooks/useCall.js'
import { formatDuration, initials } from '../utils/chatFormat.js'
import '../styles/CallPanel.css'

function MediaSurface({ stream, muted, mirrored }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (element && element.srcObject !== stream) element.srcObject = stream || null
  }, [stream])

  return (
    <video
      ref={ref}
      className={`call-tile__video ${mirrored ? 'is-mirrored' : ''}`}
      autoPlay
      playsInline
      muted={muted}
    />
  )
}

function RemoteAudio({ stream, muted }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (element && element.srcObject !== stream) element.srcObject = stream || null
  }, [stream])

  return <audio ref={ref} autoPlay playsInline muted={muted} />
}

function hasVideo(stream) {
  return Boolean(stream) && stream.getVideoTracks().some(track => track.enabled)
}

function CallPanel({ room, call, currentUser, onLeave, onError }) {
  const { t } = useTranslation()
  const [seconds, setSeconds] = useState(0)

  const {
    localStream,
    remoteStreams,
    ready,
    muted,
    cameraOn,
    mutedPeers,
    attachLevel,
    toggleMute,
    toggleCamera,
    togglePeerMute,
    muteEveryone
  } = useCall({
    room,
    kind: call.kind,
    currentUser,
    participants: call.participants,
    onError
  })

  useEffect(() => {
    const started = new Date(call.started_at).getTime()

    function tick() {
      setSeconds(Math.max(0, Math.round((Date.now() - started) / 1000)))
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [call.started_at])

  const others = useMemo(
    () => call.participants.filter(item => item.id !== currentUser.id),
    [call.participants, currentUser.id]
  )

  const tiles = useMemo(
    () => [
      {
        id: currentUser.id,
        name: t('chat.callYou'),
        stream: localStream,
        mine: true,
        muted,
        video: cameraOn
      },
      ...others.map(item => ({
        id: item.id,
        name: item.name,
        stream: remoteStreams[item.id] || null,
        mine: false,
        muted: item.muted,
        video: item.video
      }))
    ],
    [currentUser.id, localStream, muted, cameraOn, others, remoteStreams, t]
  )

  const density = tiles.length <= 1 ? 'solo' : tiles.length === 2 ? 'duo' : tiles.length <= 4 ? 'quad' : 'many'
  const allMuted = others.length > 0 && mutedPeers.length === others.length

  return (
    <section className="call" aria-label={t('chat.callPanel')}>
      <header className="call__head">
        <span className="call__kind">
          {call.kind === 'video' ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="14" height="12" rx="2" />
              <path d="M16 10l6-3v10l-6-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
            </svg>
          )}
          {call.kind === 'video' ? t('chat.videoCall') : t('chat.audioCall')}
        </span>

        <span className="call__timer">{formatDuration(seconds)}</span>
        <span className="call__count">{t('chat.callCount', { count: tiles.length })}</span>
      </header>

      {!ready && <p className="call__status">{t('chat.callConnecting')}</p>}

      <div className={`call__grid call__grid--${density}`}>
        {tiles.map(tile => {
          const isMutedForMe = mutedPeers.includes(tile.id)
          const showVideo = tile.video && hasVideo(tile.stream)

          return (
            <div key={tile.id} className="call-tile">
              <div
                className="call-tile__pulse"
                ref={element => attachLevel(tile.id, element)}
                aria-hidden="true"
              />

              {showVideo ? (
                <MediaSurface stream={tile.stream} muted mirrored={tile.mine} />
              ) : (
                <span className="call-tile__avatar" aria-hidden="true">
                  {initials(tile.name)}
                </span>
              )}

              <span className="call-tile__name">
                {tile.name}
                {tile.muted && (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M9 9v3a3 3 0 0 0 4.6 2.5" />
                    <path d="M15 10V5a3 3 0 0 0-5.7-1.3" />
                    <path d="M5 10a7 7 0 0 0 10.7 6" />
                  </svg>
                )}
              </span>

              {!tile.mine && (
                <>
                  <button
                    type="button"
                    className={`call-tile__mute ${isMutedForMe ? 'is-active' : ''}`}
                    onClick={() => togglePeerMute(tile.id)}
                    aria-label={isMutedForMe ? t('chat.unmuteFor') : t('chat.muteFor')}
                    title={isMutedForMe ? t('chat.unmuteFor') : t('chat.muteFor')}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isMutedForMe ? (
                        <>
                          <path d="M11 5 6 9H3v6h3l5 4z" />
                          <path d="M17 9l4 6M21 9l-4 6" />
                        </>
                      ) : (
                        <>
                          <path d="M11 5 6 9H3v6h3l5 4z" />
                          <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
                        </>
                      )}
                    </svg>
                  </button>

                  <RemoteAudio stream={tile.stream} muted={isMutedForMe} />
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="call__controls">
        <button
          type="button"
          className={`call__control ${muted ? 'is-active' : ''}`}
          onClick={toggleMute}
          aria-label={muted ? t('chat.unmuteSelf') : t('chat.muteSelf')}
          title={muted ? t('chat.unmuteSelf') : t('chat.muteSelf')}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <path d="M12 17v4" />
            {muted && <path d="M3 3l18 18" />}
          </svg>
        </button>

        <button
          type="button"
          className={`call__control ${cameraOn ? 'is-active' : ''}`}
          onClick={toggleCamera}
          aria-label={cameraOn ? t('chat.cameraOff') : t('chat.cameraOn')}
          title={cameraOn ? t('chat.cameraOff') : t('chat.cameraOn')}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="M16 10l6-3v10l-6-3z" />
            {!cameraOn && <path d="M3 3l18 18" />}
          </svg>
        </button>

        <button
          type="button"
          className={`call__control ${allMuted ? 'is-active' : ''}`}
          onClick={() => muteEveryone(others.map(item => item.id))}
          disabled={others.length === 0}
          aria-label={t('chat.muteOthers')}
          title={t('chat.muteOthersHint')}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <path d="M17 9l4 6M21 9l-4 6" />
          </svg>
        </button>

        <button
          type="button"
          className="call__control call__control--end"
          onClick={onLeave}
          aria-label={t('chat.endCall')}
          title={t('chat.endCall')}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
            <path d="M2 2l20 20" />
          </svg>
        </button>
      </div>
    </section>
  )
}

export default CallPanel