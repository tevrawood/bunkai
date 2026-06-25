// Serverless Claude proxy (Vercel Edge). Takes a raw spoken bunkai transcript
// and returns it parsed into the app's form fields, using ONLY the short
// lexicon codes so the values drop straight into the dropdowns. The Anthropic
// key is a server-side env var and never reaches the client. Mirrors
// api/transcribe.js. Keep the schema in sync with src/lib/lexicons.js — it is
// imported from there so the allowed values can never drift.
import {
  ATTACKS, SIDES, STANCES, FINISH,
  MOVE_SIDES, DEFENSE, LEVELS, HIKITE_ACTIONS, TUITE, KYUSHO, NONE,
} from '../src/lib/lexicons.js'

export const config = { runtime: 'edge' }

// Cheap + fast field parser. Bump to claude-sonnet-4-6 / claude-opus-4-8 if
// accuracy on tricky transcripts isn't enough.
const MODEL = 'claude-haiku-4-5'

// Strip the NONE sentinel — "not mentioned" is expressed as null, not '—'.
const codes = (lex) => lex.map((o) => o.value).filter((v) => v !== NONE)

// A field that is either one of the lexicon's codes or null (not stated).
// anyOf is explicitly supported by strict structured outputs.
const nullableEnum = (lex) => ({ anyOf: [{ type: 'string', enum: codes(lex) }, { type: 'null' }] })

const MOVE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    side: nullableEnum(MOVE_SIDES),
    technique: nullableEnum(DEFENSE),
    level: nullableEnum(LEVELS),
    hikite_action: nullableEnum(HIKITE_ACTIONS),
    hikite_target: nullableEnum(KYUSHO),
    tuite: nullableEnum(TUITE),
    kyusho: nullableEnum(KYUSHO),
  },
  required: ['side', 'technique', 'level', 'hikite_action', 'hikite_target', 'tuite', 'kyusho'],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    attack: nullableEnum(ATTACKS),
    attack_side: nullableEnum(SIDES),
    stance: nullableEnum(STANCES),
    finish: nullableEnum(FINISH),
    kiai: { type: 'boolean' },
    moves: { type: 'array', items: MOVE },
    technique_notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['attack', 'attack_side', 'stance', 'finish', 'kiai', 'moves', 'technique_notes'],
}

const SYSTEM =
  "You parse a karate practitioner's spoken description of a bunkai (a practical " +
  'self-defense application of a kata) into structured fields. Call the ' +
  'record_bunkai tool exactly once. Use ONLY the enum codes allowed by the ' +
  'schema — never invent values and never use full Japanese names. If something ' +
  'is not clearly stated, use null; do not guess. Map the defender\'s techniques ' +
  'to the moves array in the order performed (at most three). Put any extra ' +
  'detail, correction, or context that has no matching field into technique_notes.'

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405)

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return json({ error: { message: 'ANTHROPIC_API_KEY is not set on the server' } }, 500)

  let transcript = ''
  try {
    const body = await req.json()
    transcript = (body?.transcript ?? '').toString().trim()
  } catch {
    return json({ error: { message: 'Invalid JSON body' } }, 400)
  }
  if (!transcript) return json({ error: { message: 'Empty transcript' } }, 400)

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [
        {
          name: 'record_bunkai',
          description: 'Record the parsed bunkai fields.',
          input_schema: SCHEMA,
          strict: true,
        },
      ],
      tool_choice: { type: 'tool', name: 'record_bunkai' },
      messages: [{ role: 'user', content: transcript }],
    }),
  })

  const raw = await r.text()
  if (!r.ok) {
    let msg = raw
    try {
      msg = JSON.parse(raw)?.error?.message || raw
    } catch {
      /* keep raw text */
    }
    return json({ error: { message: `Parse failed (${r.status})${msg ? ': ' + msg : ''}` } }, r.status)
  }

  let fields = null
  try {
    const data = JSON.parse(raw)
    const block = (data.content || []).find((b) => b.type === 'tool_use')
    fields = block?.input ?? null
  } catch {
    /* fall through to the 502 below */
  }
  if (!fields) return json({ error: { message: 'Model returned no structured output' } }, 502)

  return json({ fields }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
