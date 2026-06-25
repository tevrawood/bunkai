import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase, isSupabaseConfigured } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'

// Compact "M1 → M2 → M3" technique line.
function moveSummary(b) {
  const moves = [1, 2, 3].map((n) => b[`m${n}_technique`]).filter((t) => t && t !== NONE)
  return moves.length ? moves.join(' → ') : 'No moves recorded'
}

// Where this application sits: kata (+ segment, or the kata moves it covers), or
// free-standing technique that isn't pinned to a kata.
function context(b) {
  const kataName = b.segment?.kata?.name || b.kata?.name
  if (!kataName) return 'Standalone technique'
  if (b.segment?.name) return `${kataName} · ${b.segment.name}`
  if (b.move_numbers?.length) return `${kataName} · moves ${b.move_numbers.join(', ')}`
  return kataName
}

// The Bunkai tab: a flat list of every application logged, with one button to
// capture a new one (with or without a kata attached).
export default function BunkaiHome() {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('bunkai')
        .select('*, segment:segment_id (name, kata:kata_id (name)), kata:kata_id (name)')
        .order('created_at', { ascending: false })
      if (!active) return
      setRows(data ?? [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [supabase])

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">Bunkai</h1>
      <p className="page-sub">Every application you've logged. Add one with or without a kata.</p>

      {rows.length === 0 ? (
        <div className="empty">
          <div className="big">🥋</div>
          No bunkai yet. Capture your first application.
        </div>
      ) : (
        <div className="list">
          {rows.map((b) => (
            <button
              key={b.id}
              className="card bk-card"
              onClick={() => navigate(`/bunkai/${b.id}`)}
            >
              <div className="bk-attack">
                {labelFor(b.attack) ? b.attack : 'Attack —'}
                {b.attack_side && <span className="chip">{b.attack_side}</span>}
                {b.kiai && <span className="kiai-badge">Kiai</span>}
              </div>
              <div className="snote" style={{ marginTop: 4 }}>{context(b)}</div>
              <div className="bk-moves">{moveSummary(b)}</div>
            </button>
          ))}
        </div>
      )}

      <div className="fab-row">
        <button className="btn btn-primary btn-block" onClick={() => navigate('/bunkai/new')}>
          + Add Bunkai
        </button>
      </div>
    </>
  )
}
