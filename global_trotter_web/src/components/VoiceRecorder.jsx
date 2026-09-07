import { useEffect, useRef, useState } from 'react'
import VoiceMessage from './VoiceMessage.jsx'
import { useTranslation } from '../hooks/useTranslation.js'
import { formatDuration } from '../utils/chatFormat.js'
import '../styles/VoiceRecorder.css'

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4'
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

function VoiceRecorder({ onSend, onCancel, onError, maxSeconds = 60 }) {
  const { t } = useTranslation()

  const [status, setStatus] = useState('starting')
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const segmentStartRef = useRef(0)
  const accruedRef = useRef(0)
  const wantPreviewRef = useRef(false)
  const finishRef = useRef(null)
  const previewUrlRef = useRef(null)

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startTimer() {
    stopTimer()
    segmentStartRef.current = Date.now()

    timerRef.current = setInterval(() => {
      const seconds = accruedRef.current + (Date.now() - segmentStartRef.current) / 1000
      setElapsed(seconds)
      if (seconds >= maxSeconds) finish()
    }, 200)
  }

  function currentSeconds() {
    if (segmentStartRef.current === 0) return accruedRef.current
    return accruedRef.current + (Date.now() - segmentStartRef.current) / 1000
  }

  function releasePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }

  function teardown() {
    stopTimer()
    releasePreview()

    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false

    async function begin() {
      const mimeType = pickMimeType()

      if (mimeType === null) {
        onError(t('chat.recordingUnsupported'))
        onCancel()
        return
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError(t('chat.micUnavailable'))
        onCancel()
        return
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        onError(t('chat.micDenied'))
        onCancel()
        return
      }

      if (cancelled) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []
      accruedRef.current = 0

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)

        if (wantPreviewRef.current) {
          wantPreviewRef.current = false
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
          const url = URL.createObjectURL(blob)
          previewUrlRef.current = url
          setPreviewUrl(url)
        }
      }

      recorder.onstop = () => {
        const finisher = finishRef.current
        finishRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        chunksRef.current = []
        teardown()

        if (finisher === 'send') {
          const seconds = accruedRef.current
          if (seconds >= 1) onSend({ blob, mime: recorder.mimeType, duration: seconds })
          else onCancel()
        } else {
          onCancel()
        }
      }

      recorder.start()
      startTimer()
      setStatus('recording')
    }

    begin()

    return () => {
      cancelled = true

      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.ondataavailable = null
        recorder.stop()
      }

      teardown()
    }
  }, [])

  function pause() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return

    accruedRef.current = currentSeconds()
    segmentStartRef.current = 0
    stopTimer()
    setElapsed(accruedRef.current)

    wantPreviewRef.current = true
    recorder.requestData()
    recorder.pause()
    setStatus('paused')
  }

  function resume() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return

    releasePreview()
    recorder.resume()
    startTimer()
    setStatus('recording')
  }

  function finish() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    accruedRef.current = currentSeconds()
    segmentStartRef.current = 0
    stopTimer()

    finishRef.current = 'send'
    if (recorder.state === 'paused') recorder.resume()
    recorder.stop()
  }

  function discard() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      teardown()
      onCancel()
      return
    }

    finishRef.current = 'discard'
    if (recorder.state === 'paused') recorder.resume()
    recorder.stop()
  }

  const paused = status === 'paused'

  return (
    <div className={`recorder ${paused ? 'is-paused' : ''}`}>
      {paused && previewUrl ? (
        <VoiceMessage src={previewUrl} duration={elapsed} seed="preview" compact />
      ) : (
        <>
          <span className="recorder__dot" aria-hidden="true" />
          <span className="recorder__time">{formatDuration(elapsed)}</span>
          <span className="recorder__hint">
            {status === 'starting' ? t('chat.micStarting') : t('chat.recordingHint')}
          </span>
        </>
      )}

      <div className="recorder__controls">
        <button
          type="button"
          className="recorder__button recorder__button--danger"
          onClick={discard}
          aria-label={t('common.cancel')}
          title={t('common.cancel')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          </svg>
        </button>

        {paused ? (
          <button
            type="button"
            className="recorder__button"
            onClick={resume}
            aria-label={t('chat.resumeRecording')}
            title={t('chat.resumeRecording')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="recorder__button"
            onClick={pause}
            disabled={status === 'starting'}
            aria-label={t('chat.pauseRecording')}
            title={t('chat.pauseRecording')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="recorder__button recorder__button--send"
          onClick={finish}
          disabled={status === 'starting'}
          aria-label={t('chat.send')}
          title={t('chat.send')}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default VoiceRecorder