import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useSupabase, isSupabaseConfigured } from '../lib/useSupabase.js'
import VoiceRecorder from '../components/VoiceRecorder.jsx'

// "Jun 25, 2026 · 11:42 AM"
function fmtDate(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  )
}

// Free-form dated notes — jot or dictate a thought, search them later. Not tied
// to any kata or bunkai.
export default function Notes() {
  const supabase = useSupabase()
  const { userId } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  async function load() {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('id, body, created_at')
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Dictation appends the transcript so a second take adds to the first.
  function onVoice({ transcript }) {
    if (!transcript) return
    setBody((prev) => (prev ? `${prev} ${transcript}` : transcript))
  }

  async function save(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSaving(true)
    const { error } = await supabase.from('notes').insert({ user_id: userId, body: text })
    setSaving(false)
    if (error) {
      alert('Could not save note: ' + error.message)
      return
    }
    setBody('')
    load()
  }

  async function remove(id) {
    if (!confirm('Delete this note? This cannot be undone.')) return
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) {
      alert('Could not delete: ' + error.message)
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  function startEdit(n) {
    setEditId(n.id)
    setEditText(n.body)
  }

  async function saveEdit(id) {
    const text = editText.trim()
    if (!text) return
    const { error } = await supabase.from('notes').update({ body: text }).eq('id', id)
    if (error) {
      alert('Could not save changes: ' + error.message)
      return
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body: text } : n)))
    setEditId(null)
    setEditText('')
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => n.body.toLowerCase().includes(q))
  }, [notes, query])

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">Notes</h1>
      <p className="page-sub">Jot or dictate a thought — dated automatically, searchable anytime.</p>

      <form onSubmit={save} className="section">
        <VoiceRecorder onResult={onVoice} disabled={saving} label="Tap to dictate a note" />
        <textarea
          className="textarea"
          style={{ marginTop: 12 }}
          placeholder="What did you learn today? Corrections, questions for sensei, drills to try…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={saving || !body.trim()}>
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </form>

      <div className="field">
        <input
          className="input"
          type="search"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="big">📝</div>
          {notes.length === 0 ? 'No notes yet.' : 'No notes match your search.'}
        </div>
      ) : (
        <div className="list">
          {filtered.map((n) => (
            <div key={n.id} className="card">
              {editId === n.id ? (
                <>
                  <textarea
                    className="textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={!editText.trim()}
                      onClick={() => saveEdit(n.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ flex: 1 }}
                      onClick={() => { setEditId(null); setEditText('') }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="snote" style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                  <div
                    className="scount"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}
                  >
                    <span>{fmtDate(n.created_at)}</span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 12px' }}
                        onClick={() => startEdit(n)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 12px' }}
                        onClick={() => remove(n.id)}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
