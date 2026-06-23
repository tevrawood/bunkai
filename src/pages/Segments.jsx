import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSupabase } from '../lib/useSupabase.js'
import Modal from '../components/Modal.jsx'
import { Input, Textarea } from '../components/Field.jsx'

export default function Segments() {
  const { kataId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { userId } = useAuth()

  const [kata, setKata] = useState(null)
  const [segments, setSegments] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', move_range: '', notes: '' })

  async function load() {
    setLoading(true)
    const { data: kataRow } = await supabase
      .from('kata')
      .select('id, name, lineage')
      .eq('id', kataId)
      .single()

    const { data: segRows } = await supabase
      .from('segments')
      .select('id, name, move_range, notes, created_at')
      .eq('kata_id', kataId)
      .order('created_at', { ascending: false })

    const { data: bkRows } = await supabase
      .from('bunkai')
      .select('segment_id')

    const c = {}
    for (const b of bkRows ?? []) c[b.segment_id] = (c[b.segment_id] ?? 0) + 1

    setKata(kataRow ?? null)
    setSegments(segRows ?? [])
    setCounts(c)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kataId, supabase])

  async function saveSegment(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('segments').insert({
      user_id: userId,
      kata_id: kataId,
      name: form.name.trim(),
      move_range: form.move_range.trim() || null,
      notes: form.notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      alert('Could not save segment: ' + error.message)
      return
    }
    setForm({ name: '', move_range: '', notes: '' })
    setShowModal(false)
    load()
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">{kata?.name ?? 'Kata'}</h1>
      <p className="page-sub">{kata?.lineage} · Segments</p>

      {segments.length === 0 ? (
        <div className="empty">
          <div className="big">🧩</div>
          No segments yet. Slice this kata into the chunks you want to study.
        </div>
      ) : (
        <div className="list">
          {segments.map((s) => (
            <button
              key={s.id}
              className="card seg-card"
              onClick={() => navigate(`/segment/${s.id}`)}
            >
              <div className="row-top">
                <span className="sname">{s.name}</span>
                {s.move_range && <span className="srange">{s.move_range}</span>}
              </div>
              {s.notes && <div className="snote">{s.notes}</div>}
              <div className="scount">
                {counts[s.id] ? `${counts[s.id]} bunkai logged` : 'No bunkai yet'}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="fab-row">
        <button className="btn btn-primary btn-block" onClick={() => setShowModal(true)}>
          + Add Segment
        </button>
      </div>

      {showModal && (
        <Modal title="New Segment" onClose={() => setShowModal(false)}>
          <form onSubmit={saveSegment}>
            <Input
              label="Name"
              placeholder='e.g. "mid block kick turn"'
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Input
              label="Move range (optional)"
              placeholder='e.g. "4-6"'
              value={form.move_range}
              onChange={(e) => setForm({ ...form, move_range: e.target.value })}
            />
            <Textarea
              label="Segment notes"
              hint="Instructor context, lineage notes, what this sequence means"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="btn btn-primary btn-block" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save Segment'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
