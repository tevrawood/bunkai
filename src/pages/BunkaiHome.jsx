import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase, isSupabaseConfigured } from '../lib/useSupabase.js'
import { NONE, labelFor } from '../lib/lexicons.js'
import { buildCsv, downloadCsv } from '../lib/csv.js'

// Prefer a friendly lexicon label, but fall back to the raw stored value so
// free-text finish/attack values (e.g. the wizard's "Throw / Sweep") still show.
const display = (v) => labelFor(v) ?? v

// Compact "M1 → M2 → M3" technique line.
function moveSummary(b) {
  const moves = [1, 2, 3].map((n) => b[`m${n}_technique`]).filter((t) => t && t !== NONE)
  return moves.length ? moves.join(' → ') : 'No moves recorded'
}

// A bunkai's kata: from its segment, or — for standalone entries — picked
// directly on the entry.
const kataOf = (b) => b.segment?.kata?.name || b.kata?.name || null

// Where this application sits: kata (+ segment, or the kata moves it covers), or
// free-standing technique that isn't pinned to a kata.
function context(b) {
  const kataName = kataOf(b)
  if (!kataName) return 'Standalone technique'
  if (b.segment?.name) return `${kataName} · ${b.segment.name}`
  if (b.move_numbers?.length) return `${kataName} · moves ${b.move_numbers.join(', ')}`
  return kataName
}

// Control concepts captured by the wizard, plus any free-text "other" concept.
const conceptsOf = (b) => {
  const list = Array.isArray(b.payload?.concepts) ? b.payload.concepts : []
  const other = b.payload?.conceptOther?.trim()
  return other ? [...list, other] : list
}

// Display name: "Kata — Finish: Attack" (e.g. "Passai Sho — Takedown: Reverse
// Punch"). Falls back gracefully when kata, finish, or attack is missing.
function titleFor(b) {
  const kata = kataOf(b)
  const finish = b.finish && b.finish !== NONE ? display(b.finish) : null
  const attack = b.attack && b.attack !== NONE ? display(b.attack) : null
  const action = finish && attack ? `${finish}: ${attack}` : finish || attack
  if (kata && action) return `${kata} — ${action}`
  return kata || action || 'Bunkai'
}

// The Bunkai tab: every application logged, with a kata filter and CSV export
// (formerly the Log tab), plus the button to capture a new one.
export default function BunkaiHome() {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [kataFilter, setKataFilter] = useState('all')
  const [attackFilter, setAttackFilter] = useState('all')
  const [finishFilter, setFinishFilter] = useState('all')
  const [conceptFilter, setConceptFilter] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
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

  const kataNames = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (kataOf(r)) set.add(kataOf(r))
    return [...set].sort()
  }, [rows])

  // Attack / finish options are built from the values actually present, so the
  // dropdowns stay in sync with the data (and self-heal as it normalizes). Each
  // option keeps the raw stored value; we render it through `display`.
  const attackValues = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (r.attack && r.attack !== NONE) set.add(r.attack)
    return [...set].sort((a, b) => display(a).localeCompare(display(b)))
  }, [rows])

  const finishValues = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (r.finish && r.finish !== NONE) set.add(r.finish)
    return [...set].sort((a, b) => display(a).localeCompare(display(b)))
  }, [rows])

  const conceptValues = useMemo(() => {
    const set = new Set()
    for (const r of rows) for (const c of conceptsOf(r)) set.add(c)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  // Everything a text search should look through for one entry.
  const haystack = (r) =>
    [
      r.attack, display(r.attack), r.attack_side, r.stance, display(r.stance),
      context(r), r.finish, display(r.finish),
      r.m1_technique, r.m2_technique, r.m3_technique,
      display(r.m1_technique), display(r.m2_technique), display(r.m3_technique),
      ...conceptsOf(r), r.technique_notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

  const q = query.trim().toLowerCase()
  const hasFilters =
    kataFilter !== 'all' || attackFilter !== 'all' || finishFilter !== 'all' ||
    conceptFilter !== 'all' || q !== ''

  // Filters combine (AND): each active one narrows the set further.
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kataFilter !== 'all' && kataOf(r) !== kataFilter) return false
      if (attackFilter !== 'all' && r.attack !== attackFilter) return false
      if (finishFilter !== 'all' && r.finish !== finishFilter) return false
      if (conceptFilter !== 'all' && !conceptsOf(r).includes(conceptFilter)) return false
      if (q && !haystack(r).includes(q)) return false
      return true
    })
  }, [rows, kataFilter, attackFilter, finishFilter, conceptFilter, q])

  function clearFilters() {
    setKataFilter('all')
    setAttackFilter('all')
    setFinishFilter('all')
    setConceptFilter('all')
    setQuery('')
  }

  function exportCsv() {
    // Flatten the joined relations into the columns the CSV builder expects.
    const flat = filtered.map((r) => ({
      ...r,
      kata_name: kataOf(r) ?? '',
      segment_name: r.segment?.name ?? '',
      move_range: r.segment?.move_range ?? '',
    }))
    const stamp = new Date().toISOString().slice(0, 10)
    const scope =
      kataFilter !== 'all'
        ? kataFilter.replace(/\s+/g, '-').toLowerCase()
        : hasFilters
          ? 'filtered'
          : 'all'
    downloadCsv(`shorinkan-bunkai-${scope}-${stamp}.csv`, buildCsv(flat))
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">Bunkai</h1>
      <p className="page-sub">Every application you've logged. Filter, export, or add a new one.</p>

      <input
        className="input"
        type="search"
        placeholder="Search attack, finish, technique, notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 9 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
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
        <select
          className="select"
          value={attackFilter}
          onChange={(e) => setAttackFilter(e.target.value)}
        >
          <option value="all">All attacks</option>
          {attackValues.map((v) => (
            <option key={v} value={v}>
              {display(v)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={finishFilter}
          onChange={(e) => setFinishFilter(e.target.value)}
        >
          <option value="all">All finishes</option>
          {finishValues.map((v) => (
            <option key={v} value={v}>
              {display(v)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={conceptFilter}
          onChange={(e) => setConceptFilter(e.target.value)}
          disabled={conceptValues.length === 0}
        >
          <option value="all">All concepts</option>
          {conceptValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar">
        <span className="snote" style={{ flex: 1 }}>
          {filtered.length} of {rows.length}
          {hasFilters && (
            <>
              {' · '}
              <button
                onClick={clearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'var(--gold)',
                  cursor: 'pointer',
                }}
              >
                Clear filters
              </button>
            </>
          )}
        </span>
        <button className="btn btn-accent" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="big">🥋</div>
          {rows.length === 0
            ? 'No bunkai yet. Capture your first application.'
            : 'No bunkai match these filters.'}
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
                {titleFor(b)}
                {b.attack_side && <span className="chip">{b.attack_side}</span>}
                {b.kiai && <span className="kiai-badge">Kiai</span>}
              </div>
              <div className="snote" style={{ marginTop: 4 }}>{context(b)}</div>
              {conceptsOf(b).length > 0 ? (
                <div className="bk-moves">{conceptsOf(b).join(' · ')}</div>
              ) : moveSummary(b) !== 'No moves recorded' ? (
                <div className="bk-moves">{moveSummary(b)}</div>
              ) : null}
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
