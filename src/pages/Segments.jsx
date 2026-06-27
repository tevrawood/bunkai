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
  const [editing, setEditing] = useState(null) // segment being edited, or null = new
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

  function openNew() {
    setEditing(null)
    setForm({ name: '', move_range: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(s) {
    setEditing(s)
    setForm({ name: s.name ?? '', move_range: s.move_range ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', move_range: '', notes: '' })
  }

  async function saveSegment(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const fields = {
      name: form.name.trim(),
      move_range: form.move_range.trim() || null,
      notes: form.notes.trim() || null,
    }
    const { error } = editing
      ? await supabase.from('segments').update(fields).eq('id', editing.id)
      : await supabase.from('segments').insert({ user_id: userId, kata_id: kataId, ...fields })
    setSaving(false)
    if (error) {
      alert('Could not save segment: ' + error.message)
      return
    }
    closeModal()
    load()
  }

  async function removeSegment(s) {
    if (!confirm(`Delete segment "${s.name}"? Bunkai logged under it will also be removed. This cannot be undone.`)) return
    const { error } = await supabase.from('segments').delete().eq('id', s.id)
    if (error) {
      alert('Could not delete segment: ' + error.message)
      return
    }
    setSegments((prev) => prev.filter((x) => x.id !== s.id))
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
            <div key={s.id} className="card seg-card">
              <div
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/segment/${s.id}`)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/segment/${s.id}`)}
              >
                <div className="row-top">
                  <span className="sname">{s.name}</span>
                  {s.move_range && <span className="srange">{s.move_range}</span>}
                </div>
                {s.notes && <div className="snote">{s.notes}</div>}
                <div className="scount">
                  {counts[s.id] ? `${counts[s.id]} bunkai logged` : 'No bunkai yet'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '6px 12px' }} onClick={() => openEdit(s)}>
                  Rename / Edit
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '6px 12px' }} onClick={() => removeSegment(s)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fab-row">
        <button
          className="btn btn-record btn-block"
          onClick={() => navigate(`/kata/${kataId}/build`)}
        >
          🎙 Build Kata Moves
        </button>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 10 }}
          onClick={openNew}
        >
          + Add Segment
        </button>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Segment' : 'New Segment'} onClose={closeModal}>
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Segment'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
