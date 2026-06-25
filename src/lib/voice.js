// Browser-side voice helpers. The OpenAI key lives only in the /api/transcribe
// serverless function — we just POST the recorded blob to it.

// Send a recorded audio blob to the Whisper proxy and return the transcript.
export async function transcribeAudio(blob) {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  })
  if (!res.ok) {
    const raw = await res.text()
    let msg = raw
    try {
      msg = JSON.parse(raw)?.error?.message || raw
    } catch {
      /* keep raw text */
    }
    throw new Error(`Transcription failed (${res.status})${msg ? ': ' + msg : ''}`)
  }
  const data = await res.json()
  return (data.text ?? '').trim()
}

// Map a recording's mime type to a file extension for storage paths.
export function extFor(type = '') {
  const t = type.split(';')[0].trim()
  return (
    {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'mp4',
      'audio/x-m4a': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    }[t] || 'webm'
  )
}
