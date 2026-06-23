import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'

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

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('bunkai')
        .select('*, segment:segment_id (id, name, kata:kata_id (name))')
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
    navigate(segId ? `/segment/${segId}` : '/log')
  }

  if (loading) return <div className="spinner" />
  if (!b) return <div className="empty">Entry not found.</div>

  return (
    <>
      <h1 className="page-title">
        {labelFor(b.attack) ? b.attack : 'Bunkai'}
        {b.kiai && <span className="kiai-badge" style={{ marginLeft: 10 }}>Kiai</span>}
      </h1>
      <p className="page-sub">
        {b.segment?.kata?.name} · {b.segment?.name}
      </p>

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

      <button className="btn btn-danger btn-block" style={{ marginTop: 8 }} onClick={remove}>
        Delete Entry
      </button>
    </>
  )
}
