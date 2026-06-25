import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'
import { buildCsv, downloadCsv } from '../lib/csv.js'

function moveSummary(b) {
  const moves = [1, 2, 3].map((n) => b[`m${n}_technique`]).filter((t) => t && t !== NONE)
  return moves.length ? moves.join(' → ') : 'No moves recorded'
}

export default function Log() {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [kataFilter, setKataFilter] = useState('all')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('bunkai')
        .select('*, segment:segment_id (name, move_range, kata:kata_id (name)), kata:kata_id (name)')
        .order('created_at', { ascending: false })
      if (!active) return
      setRows(data ?? [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [supabase])

  // A bunkai's kata comes from its segment, or — for standalone entries — from
  // the kata picked directly on the entry.
  const kataOf = (r) => r.segment?.kata?.name || r.kata?.name || null

  const kataNames = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (kataOf(r)) set.add(kataOf(r))
    return [...set].sort()
  }, [rows])

  const filtered = useMemo(() => {
    if (kataFilter === 'all') return rows
    return rows.filter((r) => kataOf(r) === kataFilter)
  }, [rows, kataFilter])

  function exportCsv() {
    // Flatten the joined relations into the columns the CSV builder expects.
    const flat = filtered.map((r) => ({
      ...r,
      kata_name: kataOf(r) ?? '',
      segment_name: r.segment?.name ?? '',
      move_range: r.segment?.move_range ?? '',
    }))
    const stamp = new Date().toISOString().slice(0, 10)
    const scope = kataFilter === 'all' ? 'all' : kataFilter.replace(/\s+/g, '-').toLowerCase()
    downloadCsv(`shorinkan-bunkai-${scope}-${stamp}.csv`, buildCsv(flat))
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">Log</h1>
      <p className="page-sub">All bunkai, newest first.</p>

      <div className="filter-bar">
        <select
          className="select"
          value={kataFilter}
          onChange={(e) => setKataFilter(e.target.value)}
        >
          <option value="all">All kata</option>
          {kataNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          className="btn btn-accent"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="big">📖</div>
          Nothing logged yet.
        </div>
      ) : (
        <div className="list">
          {filtered.map((b) => (
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
              <div className="snote" style={{ marginTop: 4 }}>
                {kataOf(b)
                  ? `${kataOf(b)}${b.segment?.name ? ` · ${b.segment.name}` : ''}`
                  : 'Standalone technique'}
              </div>
              <div className="bk-moves">{moveSummary(b)}</div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
