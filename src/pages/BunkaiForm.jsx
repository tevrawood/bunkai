import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSupabase } from '../lib/useSupabase.js'
import { Select, SegControl, Textarea } from '../components/Field.jsx'
import MoveBlock from '../components/MoveBlock.jsx'
import { ATTACKS, SIDES, STANCES, FINISH, NONE } from '../lib/lexicons.js'

// Dropdown fields default to the NONE sentinel; we strip those back to null on
// save so partial entries stay clean in the database.
const MOVE_FIELDS = ['side', 'technique', 'level', 'hikite_action', 'hikite_target', 'tuite', 'kyusho']

function initialState() {
  const s = {
    attack: '',
    attack_side: '',
    stance: NONE,
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

  const [form, setForm] = useState(initialState)
  const [saving, setSaving] = useState(false)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  async function save(e) {
    e.preventDefault()
    if (!form.attack) {
      alert('Pick an attack type — that\'s the only required field.')
      return
    }
    setSaving(true)

    const row = { user_id: userId, segment_id: segmentId, kiai: form.kiai }
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
    navigate(`/segment/${segmentId}`)
  }

  return (
    <form onSubmit={save}>
      <h1 className="page-title">New Bunkai</h1>
      <p className="page-sub">Only the attack type is required — log what you have.</p>

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
        onClick={() => navigate(`/segment/${segmentId}`)}
      >
        Cancel
      </button>
    </form>
  )
}
