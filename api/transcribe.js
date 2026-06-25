// Serverless Whisper proxy (Vercel Edge). The browser POSTs the raw recorded
// audio as the request body; we forward it to OpenAI with the secret key, which
// NEVER reaches the client. Keep this in sync with src/lib/voice.js.
export const config = { runtime: 'edge' }

// Nudges Whisper toward the karate vocabulary it would otherwise mangle.
const PROMPT =
  'Karate kata move description in English. Likely terms: ' +
  'stances (cat stance, front stance, back stance, horse stance, ' +
  'naihanchi stance, sumo stance); blocks (middle block, high block, ' +
  'low block, knife hand block, outside block, double block); ' +
  'punches (lunge punch, reverse punch, high punch, middle punch); ' +
  'strikes (elbow, back fist, hammer fist, spear hand, palm heel); ' +
  'kicks (front kick, roundhouse, side kick, back kick, knee strike); ' +
  'directions (turn left, turn right, 90, 180, 270 degrees, pivot); ' +
  'movements (step forward, step back, in place, cross step, slide); ' +
  'chamber, hikite, kiai, move number.'

// Whisper detects format from the filename extension, so map the recording's
// content-type to a supported extension.
const EXT = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405)
  }
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return json({ error: { message: 'OPENAI_API_KEY is not set on the server' } }, 500)
  }

  const type = (req.headers.get('content-type') || 'audio/webm').split(';')[0].trim()
  const ext = EXT[type] || 'webm'

  const audio = await req.blob()
  if (!audio || audio.size === 0) {
    return json({ error: { message: 'Empty audio upload' } }, 400)
  }

  const form = new FormData()
  form.append('file', audio, `audio.${ext}`)
  form.append('model', 'whisper-1')
  form.append('language', 'en')
  form.append('prompt', PROMPT)

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })

  // Pass OpenAI's JSON (and status) straight through.
  const body = await r.text()
  return new Response(body, {
    status: r.status,
    headers: { 'content-type': 'application/json' },
  })
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
