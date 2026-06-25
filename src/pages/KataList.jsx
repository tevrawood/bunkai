import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase, isSupabaseConfigured } from '../lib/useSupabase.js'
import { CURRICULUM } from '../lib/curriculum.js'

// SEG / BK stat pair shown on active kata.
function Stats({ k }) {
  return (
    <>
      <span className="kc-stat seg"><b>{k.segs}</b><i>SEG</i></span>
      <span className="kc-stat bk"><b>{k.bk}</b><i>BK</i></span>
    </>
  )
}

export default function KataList() {
  const supabase = useSupabase()
  const navigate = useNavigate()
  // name -> { id, segs, bk } for every kata row the user can see.
  const [byName, setByName] = useState({})
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
        .select('id, name')

      // Segments (for SEG counts) + a segment→kata map so we can roll bunkai
      // counts up to the kata. RLS limits both to the current user's rows.
      const { data: segRows } = await supabase
        .from('segments')
        .select('id, kata_id')
      const { data: bkRows } = await supabase
        .from('bunkai')
        .select('segment_id')

      if (!active) return
      if (kErr) {
        setError(kErr.message)
        setLoading(false)
        return
      }

      const segToKata = {}
      const segCount = {}
      for (const s of segRows ?? []) {
        segToKata[s.id] = s.kata_id
        segCount[s.kata_id] = (segCount[s.kata_id] ?? 0) + 1
      }
      const bkCount = {}
      for (const b of bkRows ?? []) {
        const kataId = segToKata[b.segment_id]
        if (kataId) bkCount[kataId] = (bkCount[kataId] ?? 0) + 1
      }

      const map = {}
      for (const k of kataRows ?? []) {
        map[k.name] = { id: k.id, segs: segCount[k.id] ?? 0, bk: bkCount[k.id] ?? 0 }
      }
      setByName(map)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [supabase])

  const open = (k) => k && navigate(`/kata/${k.id}`)

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
      <p className="page-sub">The path, in order. Tap a kata to work its segments.</p>

      {CURRICULUM.map((grp) => (
        <div key={grp.rank} className="kata-series">
          <div className="series-head">
            <span className="s-rank">{grp.rank}</span>
            <span className="s-bar" />
            <span className="s-name">{grp.name}</span>
            <span className="s-kanji">{grp.kanji}</span>
            <span className="s-sub">{grp.sub}</span>
          </div>

          {grp.solo ? (
            grp.members.map((m) => {
              const k = byName[m.db]
              const active = (k?.segs ?? 0) > 0
              return (
                <button
                  key={m.db}
                  className={`kata-row${active ? '' : ' inactive'}`}
                  onClick={() => open(k)}
                >
                  <div>
                    <div className="kr-title">{m.title}</div>
                    <div className="kr-label">SINGLE KATA</div>
                  </div>
                  {active ? (
                    <div className="kr-stats"><Stats k={k} /></div>
                  ) : (
                    <div className="kr-none">Not started</div>
                  )}
                </button>
              )
            })
          ) : (
            <div className="series-rail">
              {grp.members.map((m) => {
                const k = byName[m.db]
                const active = (k?.segs ?? 0) > 0
                return (
                  <button
                    key={m.db}
                    className={`kata-card${active ? '' : ' inactive'}`}
                    onClick={() => open(k)}
                  >
                    <div className="kc-title">{m.title}</div>
                    <div className="kc-sup">{m.sup}</div>
                    {active ? (
                      <div className="kc-stats"><Stats k={k} /></div>
                    ) : (
                      <div className="kc-none">Not started</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
