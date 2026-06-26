// Serverless Whisper proxy (Vercel Edge). The browser POSTs the raw recorded
// audio as the request body; we forward it to OpenAI with the secret key, which
// NEVER reaches the client. Keep this in sync with src/lib/voice.js.
export const config = { runtime: 'edge' }

// Biases Whisper toward the Okinawan/Japanese vocabulary it would otherwise
// mangle. The speaker mixes romaji and English, so prime both — Whisper only
// uses ~224 tokens of this, so keep it to the highest-value terms.
const PROMPT =
  'Okinawan Shorin-ryu Shorinkan karate; the speaker mixes Japanese romaji and ' +
  'English. Likely vocabulary — ' +
  'stances: shizentai, neko-ashi-dachi, zenkutsu-dachi, kokutsu-dachi, ' +
  'kiba-dachi, shiko-dachi, naihanchi-dachi, sanchin-dachi, heiko-dachi; ' +
  'blocks: gedan-barai, age-uke, soto-uke, uchi-uke, shuto-uke, morote-uke, ' +
  'kake-uke; punches/strikes: oi-zuki, gyaku-zuki, morote-zuki, uraken, shuto, ' +
  'haito, empi, tettsui, shotei, nukite; kicks: mae-geri, mawashi-geri, ' +
  'yoko-geri, ushiro-geri, hiza-geri; grappling: tuite, kyusho, hikite, ' +
  'kote-gaeshi, ude-garami, ude-gatame, kansetsu; ' +
  'levels: jodan, chudan, gedan; kata: Wanshu, Naihanchi, Pinan, Passai, ' +
  'Kusanku, Chinto, Gojushiho. Also: kiai, turn 90/180, step, pivot, takedown.'

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
