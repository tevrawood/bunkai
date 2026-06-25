import { useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../lib/voice.js'

const MAX_SECONDS = 60

// Pick the first mime type the browser's MediaRecorder actually supports.
// Android Chrome does webm; iOS Safari does mp4. Empty string = let it choose.
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* isTypeSupported can throw on old browsers */
    }
  }
  return ''
}

// Records up to 60s of mic audio, sends it to Whisper, and hands the transcript
// + raw blob back via onResult({ transcript, audioBlob }). On a denied or
// unsupported mic it surfaces an error so the parent's text box can be used.
export default function VoiceRecorder({ onResult, disabled }) {
  const [status, setStatus] = useState('idle') // idle | recording | transcribing | error
  const [elapsed, setElapsed] = useState(0)
  const [err, setErr] = useState(null)

  const recRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => cleanup(), [])

  // Auto-stop at the cap.
  useEffect(() => {
    if (status === 'recording' && elapsed >= MAX_SECONDS) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, status])

  function cleanup() {
    clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function start() {
    setErr(null)
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setStatus('error')
      setErr("Recording isn't supported on this browser — type the move below.")
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus('error')
      setErr('Microphone blocked. Allow mic access, or type the move below.')
      return
    }
    streamRef.current = stream

    const mimeType = pickMime()
    let rec
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      rec = new MediaRecorder(stream)
    }
    recRef.current = rec
    chunksRef.current = []
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data)
    }
    rec.onstop = handleStop
    rec.start()

    setElapsed(0)
    setStatus('recording')
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  function stop() {
    clearInterval(timerRef.current)
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  async function handleStop() {
    cleanup()
    const type = recRef.current?.mimeType || chunksRef.current[0]?.type || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type })
    if (!blob.size) {
      setStatus('idle')
      return
    }
    setStatus('transcribing')
    try {
      const transcript = await transcribeAudio(blob)
      onResult({ transcript, audioBlob: blob })
      setStatus('idle')
    } catch (e) {
      // Keep the audio even if transcription fails — the user can type the text.
      onResult({ transcript: '', audioBlob: blob })
      setStatus('error')
      setErr((e.message || 'Transcription failed') + ' — audio kept; type the move below.')
    }
  }

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  if (status === 'transcribing') {
    return (
      <div className="recorder">
        <div className="rec-status">
          <span className="spinner-inline" /> Transcribing…
        </div>
      </div>
    )
  }

  return (
    <div className="recorder">
      {status === 'recording' ? (
        <button type="button" className="rec-btn recording" onClick={stop}>
          <span className="rec-dot" />
          <span className="rec-label">Recording… tap to stop</span>
          <span className="rec-timer">{mmss}</span>
        </button>
      ) : (
        <button type="button" className="rec-btn" onClick={start} disabled={disabled}>
          <span className="rec-mic">🎙</span>
          <span className="rec-label">Tap to record this move</span>
        </button>
      )}
      {err && <div className="rec-err">{err}</div>}
    </div>
  )
}
