import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase, isSupabaseConfigured } from '../lib/useSupabase.js'

export default function KataList() {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [kata, setKata] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Supabase not wired up yet — skip the fetch and show the notice below.
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      setLoading(true)
      const { data: kataRows, error: kErr } = await supabase
        .from('kata')
        .select('id, name, lineage')
        .order('name')

      // Segment counts per kata for the current user (RLS limits to own rows).
      const { data: segRows } = await supabase
        .from('segments')
        .select('kata_id')

      if (!active) return
      if (kErr) {
        setError(kErr.message)
      } else {
        setKata(kataRows ?? [])
        const c = {}
        for (const s of segRows ?? []) c[s.kata_id] = (c[s.kata_id] ?? 0) + 1
        setCounts(c)
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [supabase])

  if (loading) return <div className="spinner" />
  if (!isSupabaseConfigured)
    return (
      <>
        <h1 className="page-title">Kata</h1>
        <div className="empty">
          <div className="big">🔌</div>
          You're signed in — auth works.
          <div style={{ marginTop: 10, fontSize: 13 }}>
            Add your Supabase URL and anon key to <code>.env</code> (then restart
            the dev server) to load your kata and start logging bunkai.
          </div>
        </div>
      </>
    )
  if (error)
    return (
      <div className="empty">
        Couldn't load kata.
        <div style={{ marginTop: 8, fontSize: 12 }}>{error}</div>
      </div>
    )

  return (
    <>
      <h1 className="page-title">Kata</h1>
      <p className="page-sub">Choose a kata to work its segments.</p>
      <div className="grid">
        {kata.map((k) => (
          <button
            key={k.id}
            className="card kata-tile"
            onClick={() => navigate(`/kata/${k.id}`)}
          >
            <div>
              <div className="kname">{k.name}</div>
              <div className="klin">{k.lineage}</div>
            </div>
            <div className="kcount">
              {counts[k.id] ? `${counts[k.id]} segment${counts[k.id] > 1 ? 's' : ''}` : 'No segments yet'}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
