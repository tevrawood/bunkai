import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSupabase } from '../lib/useSupabase.js'
import { Select, SegControl, Textarea, ChipMulti } from '../components/Field.jsx'
import MoveBlock from '../components/MoveBlock.jsx'
import VoiceRecorder from '../components/VoiceRecorder.jsx'
import { ATTACKS, SIDES, STANCES, FINISH, NONE } from '../lib/lexicons.js'
import { CURRICULUM } from '../lib/curriculum.js'

// Dropdown fields default to the NONE sentinel; we strip those back to null on
// save so partial entries stay clean in the database.
const MOVE_FIELDS = ['side', 'technique', 'level', 'hikite_action', 'hikite_target', 'tuite', 'kyusho']

// Curriculum position for each kata name, so the kata selector lists them in the
// same order as the home grid rather than alphabetically.
const KATA_ORDER = (() => {
  const order = {}
  let i = 0
  for (const grp of CURRICULUM) for (const m of grp.members) order[m.db] = i++
  return order
})()

function initialState() {
  const s = {
    kata_id: '',
    move_numbers: [],
    attack: '',
    attack_side: '',
    stance: 'Shizentai', // natural stance — most applications start here
    finish: NONE,
    kiai: false,
    technique_notes: '',
  }
  for (const n of [1, 2, 3]) {
    for (const f of MOVE_FIELDS) s[`m${n}_${f}`] = NONE
  }
  return s
}

// Turn NONE / empty strings into null for storage.
function clean(v) {
  if (v === NONE || v === '' || v == null) return null
  return v
}

export default function BunkaiForm() {
  const { segmentId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { userId } = useAuth()

  // Two entry points share this form: under a segment (segmentId present) or
  // free-standing from the Bunkai tab (standalone), where the kata + moves are
  // optional selectors instead of being implied by the segment.
  const standalone = !segmentId
  const backTo = segmentId ? `/segment/${segmentId}` : '/bunkai'

  const [form, setForm] = useState(initialState)
  const [saving, setSaving] = useState(false)
  const [kataList, setKataList] = useState([])
  const [kataMoves, setKataMoves] = useState([])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  // Load the kata list once for the selector (standalone mode only).
  useEffect(() => {
    if (!standalone) return
    let active = true
    ;(async () => {
      const { data } = await supabase.from('kata').select('id, name')
      if (!active) return
      const sorted = (data ?? [])
        .slice()
        .sort((a, b) => (KATA_ORDER[a.name] ?? 99) - (KATA_ORDER[b.name] ?? 99))
      setKataList(sorted)
    })()
    return () => {
      active = false
    }
  }, [standalone, supabase])

  // When a kata is chosen, pull its recorded moves to drive the multi-select.
  useEffect(() => {
    if (!standalone || !form.kata_id) {
      setKataMoves([])
      return
    }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('kata_moves')
        .select('move_number, notes')
        .eq('kata_id', form.kata_id)
        .order('move_number', { ascending: true })
      if (!active) return
      setKataMoves(data ?? [])
    })()
    return () => {
      active = false
    }
  }, [standalone, form.kata_id, supabase])

  // Changing the kata clears any move selection that belonged to the old one.
  const pickKata = (v) => setForm((prev) => ({ ...prev, kata_id: v, move_numbers: [] }))

  // Voice capture: until Claude field-parsing lands, the transcript just lands in
  // Notes (appended, so repeat takes add rather than overwrite). The audio blob is
  // not persisted yet — bunkai has no audio_url column.
  function onVoice({ transcript }) {
    if (!transcript) return
    setForm((prev) => ({
      ...prev,
      technique_notes: prev.technique_notes
        ? `${prev.technique_notes} ${transcript}`
        : transcript,
    }))
  }

  const moveOptions = kataMoves.map((m) => ({
    value: m.move_number,
    label: `#${m.move_number}`,
    title: m.notes || '',
  }))

  async function save(e) {
    e.preventDefault()
    if (!form.attack) {
      alert('Pick an attack type — that\'s the only required field.')
      return
    }
    setSaving(true)

    const row = { user_id: userId, kiai: form.kiai }
    if (segmentId) row.segment_id = segmentId
    if (standalone) {
      row.kata_id = form.kata_id || null
      row.move_numbers = form.move_numbers.length ? form.move_numbers : null
    }
    row.attack = clean(form.attack)
    row.attack_side = clean(form.attack_side)
    row.stance = clean(form.stance)
    row.finish = clean(form.finish)
    row.technique_notes = clean(form.technique_notes)
    for (const n of [1, 2, 3]) {
      for (const f of MOVE_FIELDS) {
        const key = `m${n}_${f}`
        row[key] = clean(form[key])
      }
    }

    const { error } = await supabase.from('bunkai').insert(row)
    setSaving(false)
    if (error) {
      alert('Could not save bunkai: ' + error.message)
      return
    }
    navigate(backTo)
  }

  return (
    <form onSubmit={save}>
      <h1 className="page-title">New Bunkai</h1>
      <p className="page-sub">Only the attack type is required — log what you have.</p>

      {/* VOICE — transcript drops into Notes for now; field-parsing comes later */}
      <section className="section">
        <div className="section-title">Record</div>
        <VoiceRecorder onResult={onVoice} disabled={saving} label="Tap to record this bunkai" />
        <p className="hint" style={{ marginTop: 8 }}>
          Speak the application — the transcript lands in Notes below. Auto-parsing
          into the fields is coming.
        </p>
      </section>

      {/* KATA + MOVES (standalone only — under a segment these are implied) */}
      {standalone && (
        <section className="section">
          <div className="section-title">Kata <span className="opt-tag">optional</span></div>
          <Select
            label="Kata"
            hint="Leave on “No kata” for free-standing technique that isn't tied to a form."
            options={[
              { value: '', label: '— No kata —' },
              ...kataList.map((k) => ({ value: k.id, label: k.name })),
            ]}
            value={form.kata_id}
            onChange={pickKata}
          />
          {form.kata_id && (
            <ChipMulti
              label="Which moves"
              hint={moveOptions.length ? 'Tap every move this application comes from.' : null}
              empty="No moves recorded for this kata yet — build them from the kata's page first."
              options={moveOptions}
              value={form.move_numbers}
              onChange={(v) => set('move_numbers', v)}
            />
          )}
        </section>
      )}

      {/* ATTACK */}
      <section className="section">
        <div className="section-title">Attack</div>
        <SegControl
          label="Attacker's side"
          options={SIDES}
          value={form.attack_side}
          onChange={(v) => set('attack_side', v === form.attack_side ? '' : v)}
        />
        <Select
          label="Attack type *"
          options={[{ value: '', label: '— select —' }, ...ATTACKS]}
          value={form.attack}
          onChange={(v) => set('attack', v)}
        />
        <Select
          label="Defender's stance"
          options={STANCES}
          value={form.stance}
          onChange={(v) => set('stance', v)}
        />
      </section>

      {/* MOVES */}
      <section className="section">
        <div className="section-title">Moves</div>
        <MoveBlock index={1} prefix="m1" data={form} onChange={set} defaultOpen />
        <MoveBlock index={2} prefix="m2" data={form} onChange={set} />
        <MoveBlock index={3} prefix="m3" data={form} onChange={set} />
      </section>

      {/* FINISH */}
      <section className="section">
        <div className="section-title">Finish</div>
        <Select
          label="Finish"
          options={FINISH}
          value={form.finish}
          onChange={(v) => set('finish', v)}
        />
      </section>

      {/* KIAI */}
      <section className="section">
        <div className="section-title">Kiai</div>
        <div className="check-row">
          <input
            id="kiai"
            type="checkbox"
            checked={form.kiai}
            onChange={(e) => set('kiai', e.target.checked)}
          />
          <label htmlFor="kiai">Kiai on this sequence</label>
        </div>
      </section>

      {/* NOTES */}
      <section className="section">
        <div className="section-title">Notes</div>
        <Textarea
          label="Technique notes"
          hint="What worked, corrections, questions to bring back to sensei"
          value={form.technique_notes}
          onChange={(e) => set('technique_notes', e.target.value)}
        />
      </section>

      <button className="btn btn-primary btn-block" disabled={saving}>
        {saving ? 'Saving…' : 'Save Bunkai'}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        style={{ marginTop: 10 }}
        onClick={() => navigate(backTo)}
      >
        Cancel
      </button>
    </form>
  )
}
