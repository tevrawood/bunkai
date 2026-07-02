// Serverless Claude proxy (Vercel Edge). Takes a raw spoken bunkai transcript
// and returns it parsed into the capture wizard's structured fields, using ONLY
// the exact option strings the wizard uses so values drop straight into the
// steps. The Anthropic key is a server-side env var and never reaches the
// client. Keep the vocabulary in sync with src/lib/wizardOptions.js +
// src/lib/finish.js — imported from there so allowed values can never drift.
import {
  ATTACK_TYPES, ATTACK_DETAILS, STANCES,
  CONCEPT_TOP, CONCEPT_MORE, CAN_CONTINUE, BEARINGS,
} from '../src/lib/wizardOptions.js'
import { FINISH_TYPES, FINISH_OPTIONS } from '../src/lib/finish.js'

export const config = { runtime: 'edge' }

// Cheap + fast field parser. Bump to claude-sonnet-5 / claude-opus-4-8 if
// accuracy on tricky transcripts isn't enough.
const MODEL = 'claude-haiku-4-5'

const CONCEPTS = [...CONCEPT_TOP, ...CONCEPT_MORE]
const BEARING_DEGS = BEARINGS.map((b) => b.deg)

// Nullable field helpers for strict structured outputs — "not stated" is null,
// never a guess. anyOf is explicitly supported by strict tool schemas.
const nullableEnum = (values) => ({ anyOf: [{ type: 'string', enum: values }, { type: 'null' }] })
const nullableStr = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const nullableIntEnum = (values) => ({ anyOf: [{ type: 'integer', enum: values }, { type: 'null' }] })

// Finish specifics. Which keys apply depends on finishType (see FINISH_OPTIONS);
// the client vets each value against the chosen type, so a flat all-nullable
// object is enough here.
const FINISH_DATA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    technique:   nullableStr,
    position:    nullableStr,
    weapon:      nullableStr,
    target:      nullableStr,
    fallBearing: nullableIntEnum(BEARING_DEGS),
  },
  required: ['technique', 'position', 'weapon', 'target', 'fallBearing'],
}

// Mirrors the wizard's payload (buildPayload in BunkaiWizard). Kata is a DB uuid
// the model can't know — the user sets it in the UI — so it's deliberately left
// out of the parse.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    numAttacks:    nullableIntEnum([1, 2, 3]),
    attackType:    nullableEnum(ATTACK_TYPES),
    attackSub:     nullableStr,
    attackExtra:   nullableStr,
    counterSide:   nullableEnum(['Inside', 'Outside']),
    counterDir:    nullableEnum(['F', 'B', 'L', 'R']),
    counterStance: nullableEnum(STANCES),
    moveType:      nullableEnum(['Slide', 'Step', 'Turn']),
    bearing:       nullableIntEnum(BEARING_DEGS),
    turnDir:       nullableEnum(['L', 'R']),
    turnDeg:       nullableEnum(['90', '180', '270']),
    concepts:      { type: 'array', items: { type: 'string', enum: CONCEPTS } },
    conceptOther:  nullableStr,
    controlDesc:   nullableStr,
    stanceShift:   { type: 'boolean' },
    controlStance: nullableEnum(STANCES),
    finishType:    nullableEnum(FINISH_TYPES),
    finishData:    FINISH_DATA,
    canContinue:   nullableEnum(CAN_CONTINUE),
  },
  required: [
    'numAttacks', 'attackType', 'attackSub', 'attackExtra',
    'counterSide', 'counterDir', 'counterStance',
    'moveType', 'bearing', 'turnDir', 'turnDeg',
    'concepts', 'conceptOther', 'controlDesc', 'stanceShift', 'controlStance',
    'finishType', 'finishData', 'canContinue',
  ],
}

// Human-readable option references, built from the same lists so the model knows
// exactly which strings are valid without them drifting from the dropdowns.
const attackRef = ATTACK_TYPES.map((t) => {
  const d = ATTACK_DETAILS[t]
  const extra = d.extra ? `; ${d.extra.label}: ${d.extra.options.join('/')}` : ''
  return `${t} (subtype: ${d.subtypes.join('/')}${extra})`
}).join('\n  ')

const finishRef = FINISH_TYPES.map((t) => {
  const o = FINISH_OPTIONS[t] || {}
  const parts = []
  if (o.techniques) parts.push(`technique: ${o.techniques.join('/')}`)
  if (o.weapons) parts.push(`weapon: ${o.weapons.join('/')}`)
  if (o.targets) parts.push(`target: ${o.targets.join('/')}`)
  if (o.positions) parts.push(`position: ${o.positions.join('/')}`)
  return `${t} (${parts.join('; ')})`
}).join('\n  ')

const SYSTEM =
  "You parse a karate practitioner's spoken description of a bunkai (a practical " +
  'self-defense application of a kata) into the capture wizard\'s structured ' +
  'fields by calling the record_bunkai tool exactly once.\n\n' +
  'A bunkai flows: ATTACK (what the opponent does) -> COUNTER (the first ' +
  'defensive motion) -> MOTION (how the defender moves or turns) -> CONTROL (the ' +
  'combination that neutralizes the opponent) -> FINISH (how it ends).\n\n' +
  'Fill only what the speaker actually says. Use null for anything not stated — ' +
  'do NOT guess. Map each spoken term to the CLOSEST allowed option below; never ' +
  'invent values.\n\n' +
  'ATTACK\n' +
  '- numAttacks: how many attacks (1-3).\n' +
  '- attackType + attackSub + attackExtra — allowed combinations:\n  ' + attackRef + '\n' +
  '  attackSub and attackExtra must belong to the chosen attackType. attackExtra ' +
  'is the hand/leg/location detail; null if not stated.\n\n' +
  'COUNTER\n' +
  '- counterSide: Inside or Outside (which side of the attacking limb).\n' +
  '- counterDir: F/B/L/R — the direction the defender moves to counter.\n' +
  '- counterStance: the stance the defender lands in — one of: ' + STANCES.join(', ') + '.\n\n' +
  'MOTION\n' +
  '- moveType: Slide, Step, or Turn.\n' +
  '- For Slide/Step, set bearing to the compass degrees travelled (0=forward, ' +
  '45=forward-right, 90=right, 135=back-right, 180=back, 225=back-left, ' +
  '270=left, 315=forward-left); leave turnDir/turnDeg null.\n' +
  '- For Turn, set turnDir (L/R) and turnDeg (90/180/270); leave bearing null.\n\n' +
  'CONTROL\n' +
  '- concepts: every tag that applies (multi-select): ' + CONCEPTS.join(', ') + '.\n' +
  '- conceptOther: a concept that matches none of those tags, else null.\n' +
  '- controlDesc: a short plain-language description of the control combination.\n' +
  '- stanceShift: true only if they mention shifting stance during the control.\n' +
  '- controlStance: the stance shifted to (one of the stances above), else null.\n\n' +
  'FINISH\n' +
  '- finishType: one of ' + FINISH_TYPES.join(', ') + '.\n' +
  '- finishData fields depend on finishType — allowed values:\n  ' + finishRef + '\n' +
  '  Use fallBearing (compass degrees, same scale as bearing) for the direction ' +
  'the opponent falls/goes on Throw / Sweep and Takedown; null otherwise.\n' +
  '- canContinue: one of ' + CAN_CONTINUE.join(' | ') + '.\n\n' +
  'The speaker uses Okinawan/Japanese terms in romaji, often run together or ' +
  'loosely spelled — e.g. "nekoashidachi" = Neko-ashi-dachi; "gyaku zuki" = a ' +
  'Reverse punch; "mawashi geri" = a Round kick; "shiko dachi" = Shiko-dachi. ' +
  'Suffixes: -dachi/-tachi = stance, -zuki/-tsuki = punch/thrust, -geri = kick, ' +
  '-uke = block/receive, -uchi/-ate = strike, -barai = sweep/parry.'

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
          description: 'Record the parsed bunkai fields for the capture wizard.',
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
