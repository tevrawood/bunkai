import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'
import Modal from '../components/Modal.jsx'
import { Input, Textarea } from '../components/Field.jsx'

function Row({ label, value }) {
  if (!value || value === NONE) return null
  return (
    <>
      <dt>{label}</dt>
      <dd>{labelFor(value) ?? value}</dd>
    </>
  )
}

function MoveDetail({ index, b }) {
  const p = `m${index}`
  const has = ['technique', 'side', 'level', 'hikite_action', 'hikite_target', 'tuite', 'kyusho']
    .some((f) => b[`${p}_${f}`] && b[`${p}_${f}`] !== NONE)
  if (!has) return null
  return (
    <section className="section">
      <div className="section-title">Move {index}</div>
      <dl className="detail-grid">
        <Row label="Side" value={b[`${p}_side`]} />
        <Row label="Technique" value={b[`${p}_technique`]} />
        <Row label="Level" value={b[`${p}_level`]} />
        <Row label="Hikite action" value={b[`${p}_hikite_action`]} />
        <Row label="Hikite target" value={b[`${p}_hikite_target`]} />
        <Row label="Tuite" value={b[`${p}_tuite`]} />
        <Row label="Kyusho" value={b[`${p}_kyusho`]} />
      </dl>
    </section>
  )
}

export default function BunkaiDetail() {
  const { bunkaiId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ attack: '', attack_side: '', stance: '', finish: '', technique_notes: '' })

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('bunkai')
        .select('*, segment:segment_id (id, name, kata:kata_id (name)), kata:kata_id (name)')
        .eq('id', bunkaiId)
        .single()
      if (!active) return
      setB(data ?? null)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [bunkaiId, supabase])

  async function remove() {
    if (!confirm('Delete this bunkai entry? This cannot be undone.')) return
    const segId = b?.segment?.id
    const { error } = await supabase.from('bunkai').delete().eq('id', bunkaiId)
    if (error) {
      alert('Could not delete: ' + error.message)
      return
    }
    navigate(segId ? `/segment/${segId}` : '/bunkai')
  }

  function openEdit() {
    setForm({
      attack: b.attack ?? '',
      attack_side: b.attack_side ?? '',
      stance: b.stance ?? '',
      finish: b.finish ?? '',
      technique_notes: b.technique_notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const fields = {
      attack: form.attack.trim() || null,
      attack_side: form.attack_side.trim() || null,
      stance: form.stance.trim() || null,
      finish: form.finish.trim() || null,
      technique_notes: form.technique_notes.trim() || null,
    }
    const { error } = await supabase.from('bunkai').update(fields).eq('id', bunkaiId)
    setSaving(false)
    if (error) {
      alert('Could not save changes: ' + error.message)
      return
    }
    setB((prev) => ({ ...prev, ...fields }))
    setEditing(false)
  }

  if (loading) return <div className="spinner" />
  if (!b) return <div className="empty">Entry not found.</div>

  const kataName = b.segment?.kata?.name || b.kata?.name
  const subtitle = kataName
    ? `${kataName}${b.segment?.name ? ` · ${b.segment.name}` : ''}`
    : 'Standalone technique'

  return (
    <>
      <h1 className="page-title">
        {labelFor(b.attack) ? b.attack : 'Bunkai'}
        {b.kiai && <span className="kiai-badge" style={{ marginLeft: 10 }}>Kiai</span>}
      </h1>
      <p className="page-sub">{subtitle}</p>

      {b.move_numbers?.length > 0 && (
        <section className="section">
          <div className="section-title">Kata Moves</div>
          <div className="bk-kyusho">
            {b.move_numbers.map((n) => (
              <span key={n} className="chip">#{n}</span>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-title">Attack</div>
        <dl className="detail-grid">
          <Row label="Attack" value={b.attack} />
          <Row label="Side" value={b.attack_side} />
          <Row label="Stance" value={b.stance} />
        </dl>
      </section>

      <MoveDetail index={1} b={b} />
      <MoveDetail index={2} b={b} />
      <MoveDetail index={3} b={b} />

      {b.finish && b.finish !== NONE && (
        <section className="section">
          <div className="section-title">Finish</div>
          <dl className="detail-grid">
            <Row label="Finish" value={b.finish} />
          </dl>
        </section>
      )}

      {b.technique_notes && (
        <section className="section">
          <div className="section-title">Notes</div>
          <div className="note-box">{b.technique_notes}</div>
        </section>
      )}

      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={openEdit}>
        Edit Entry
      </button>
      <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={remove}>
        Delete Entry
      </button>

      {editing && (
        <Modal title="Edit Bunkai" onClose={() => setEditing(false)}>
          <form onSubmit={saveEdit}>
            <Input
              label="Attack"
              value={form.attack}
              onChange={(e) => setForm({ ...form, attack: e.target.value })}
              autoFocus
            />
            <Input
              label="Attacker's side"
              value={form.attack_side}
              onChange={(e) => setForm({ ...form, attack_side: e.target.value })}
            />
            <Input
              label="Stance"
              value={form.stance}
              onChange={(e) => setForm({ ...form, stance: e.target.value })}
            />
            <Input
              label="Finish"
              value={form.finish}
              onChange={(e) => setForm({ ...form, finish: e.target.value })}
            />
            <Textarea
              label="Notes"
              value={form.technique_notes}
              onChange={(e) => setForm({ ...form, technique_notes: e.target.value })}
            />
            <button className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
