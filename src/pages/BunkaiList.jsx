import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'

// Build a compact "M1 → M2 → M3" technique summary line.
function moveSummary(b) {
  const moves = [1, 2, 3]
    .map((n) => b[`m${n}_technique`])
    .filter((t) => t && t !== NONE)
  return moves.length ? moves.join(' → ') : 'No moves recorded'
}

// Collect kyusho + tuite targets across moves for the chip row.
function targets(b) {
  const chips = []
  for (const n of [1, 2, 3]) {
    const ky = b[`m${n}_kyusho`]
    const tu = b[`m${n}_tuite`]
    if (ky && ky !== NONE) chips.push({ kind: 'kyusho', value: ky })
    if (tu && tu !== NONE) chips.push({ kind: 'tuite', value: tu })
  }
  return chips
}

export default function BunkaiList() {
  const { segmentId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const [segment, setSegment] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: seg } = await supabase
      .from('segments')
      .select('id, name, move_range, kata:kata_id (name)')
      .eq('id', segmentId)
      .single()

    const { data: rows } = await supabase
      .from('bunkai')
      .select('*')
      .eq('segment_id', segmentId)
      .order('created_at', { ascending: false })

    setSegment(seg ?? null)
    setEntries(rows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId, supabase])

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">{segment?.name ?? 'Segment'}</h1>
      <p className="page-sub">
        {segment?.kata?.name}
        {segment?.move_range ? ` · ${segment.move_range}` : ''} · Bunkai
      </p>

      {entries.length === 0 ? (
        <div className="empty">
          <div className="big">🥋</div>
          No bunkai logged for this segment yet.
        </div>
      ) : (
        <div className="list">
          {entries.map((b) => {
            const chips = targets(b)
            return (
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
                <div className="bk-moves">{moveSummary(b)}</div>
                {chips.length > 0 && (
                  <div className="bk-kyusho">
                    {chips.map((c, i) => (
                      <span key={i} className={`chip ${c.kind}`}>
                        {c.value}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="fab-row">
        <button
          className="btn btn-primary btn-block"
          onClick={() => navigate(`/segment/${segmentId}/new`)}
        >
          + Add Bunkai
        </button>
      </div>
    </>
  )
}
