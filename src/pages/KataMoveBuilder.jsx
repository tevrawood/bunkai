import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSupabase } from '../lib/useSupabase.js'
import VoiceRecorder from '../components/VoiceRecorder.jsx'
import { extFor } from '../lib/voice.js'

// Mode 1: speak each move of a kata in turn. Whisper transcribes it, we save the
// text + audio to kata_moves, then advance to the next move number. Claude
// field-parsing (stance/hands/level) is a later enhancement — this captures the
// move list that powers the bunkai move dropdown.
export default function KataMoveBuilder() {
  const { kataId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { userId } = useAuth()

  const [kata, setKata] = useState(null)
  const [moves, setMoves] = useState([])
  const [moveNumber, setMoveNumber] = useState(1)
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  async function load() {
    setLoading(true)
    const { data: kataRow } = await supabase
      .from('kata')
      .select('id, name, lineage')
      .eq('id', kataId)
      .single()
    const { data: moveRows } = await supabase
      .from('kata_moves')
      .select('id, move_number, notes, audio_url')
      .eq('kata_id', kataId)
      .order('move_number', { ascending: true })

    setKata(kataRow ?? null)
    setMoves(moveRows ?? [])
    const maxN = (moveRows ?? []).reduce((m, r) => Math.max(m, r.move_number || 0), 0)
    setMoveNumber(maxN + 1)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kataId, supabase])

  // VoiceRecorder hands back the transcript + raw audio. Append text so a second
  // take adds to the first rather than replacing it.
  function onResult({ transcript: t, audioBlob: b }) {
    if (t) setTranscript((prev) => (prev ? `${prev} ${t}` : t))
    if (b) setAudioBlob(b)
  }

  function reset() {
    setTranscript('')
    setAudioBlob(null)
  }

  async function saveMove() {
    if (!transcript.trim() && !audioBlob) return
    setSaving(true)

    // Audio is optional metadata — if the upload fails (e.g. the storage bucket
    // isn't set up), keep going and save the move text so nothing is lost.
    let audioPath = null
    let audioWarn = null
    if (audioBlob) {
      try {
        const ext = extFor(audioBlob.type)
        const path = `${userId}/kata-move/${kataId}-${moveNumber}-${Date.now()}.${ext}`
        const { data: up, error: upErr } = await supabase.storage
          .from('bunkai-audio')
          .upload(path, audioBlob, { contentType: audioBlob.type || 'audio/webm' })
        if (upErr) throw upErr
        audioPath = up.path
      } catch (e) {
        audioWarn = e?.message || String(e)
      }
    }

    // Don't save a totally empty move (audio failed AND no text).
    if (!transcript.trim() && !audioPath) {
      setSaving(false)
      alert(
        'Audio upload failed and there is no text to save:\n' +
          audioWarn +
          '\n\nCreate the "bunkai-audio" storage bucket in Supabase, or type the move text in.'
      )
      return
    }

    const { error } = await supabase.from('kata_moves').insert({
      user_id: userId,
      kata_id: kataId,
      move_number: moveNumber,
      notes: transcript.trim() || null,
      audio_url: audioPath,
    })
    setSaving(false)
    if (error) {
      alert('Could not save move: ' + error.message)
      return
    }
    if (audioWarn) {
      alert(
        'Saved the move text, but the audio could not attach:\n' +
          audioWarn +
          '\n\nCreate the "bunkai-audio" bucket in Supabase to store audio with future moves.'
      )
    }
    reset()
    setMoveNumber((n) => n + 1)
    load()
  }

  function skip() {
    reset()
    setMoveNumber((n) => n + 1)
  }

  function startEdit(m) {
    setEditId(m.id)
    setEditText(m.notes ?? '')
  }

  async function saveEdit(id) {
    const text = editText.trim()
    const { error } = await supabase
      .from('kata_moves')
      .update({ notes: text || null })
      .eq('id', id)
    if (error) {
      alert('Could not save changes: ' + error.message)
      return
    }
    setMoves((prev) => prev.map((m) => (m.id === id ? { ...m, notes: text || null } : m)))
    setEditId(null)
    setEditText('')
  }

  async function deleteMove(m) {
    if (!confirm(`Delete move ${m.move_number}? This cannot be undone.`)) return
    const { error } = await supabase.from('kata_moves').delete().eq('id', m.id)
    if (error) {
      alert('Could not delete move: ' + error.message)
      return
    }
    setMoves((prev) => prev.filter((x) => x.id !== m.id))
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <h1 className="page-title">Build Kata</h1>
      <p className="page-sub">{kata?.name} · speak each move in order</p>

      <div className="build-move-num">
        <span className="bmn-label">MOVE</span>
        <span className="bmn-num">{moveNumber}</span>
      </div>

      <VoiceRecorder onResult={onResult} disabled={saving} />

      <div className="field" style={{ marginTop: 16 }}>
        <label>Move {moveNumber} — transcript</label>
        <textarea
          className="textarea"
          placeholder="Speak the move, or type it here — e.g. cat stance, turn left 90, left knife-hand block, step left"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        {audioBlob && <span className="hint">🎙 audio attached — saves with this move</span>}
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={saving || (!transcript.trim() && !audioBlob)}
        onClick={saveMove}
      >
        {saving ? 'Saving…' : `Save Move ${moveNumber}`}
      </button>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={skip} disabled={saving}>
          Skip
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={() => navigate(`/kata/${kataId}`)}
          disabled={saving}
        >
          Done
        </button>
      </div>

      {moves.length > 0 && (
        <section className="section" style={{ marginTop: 26 }}>
          <div className="section-title">Saved moves</div>
          <div className="list">
            {moves.map((m) => (
              <div key={m.id} className="card">
                {editId === m.id ? (
                  <>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <span className="bmn-chip">{m.move_number}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Editing move {m.move_number}</span>
                    </div>
                    <textarea
                      className="textarea"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => saveEdit(m.id)}>
                        Save
                      </button>
                      <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setEditId(null); setEditText('') }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                      <span className="bmn-chip">{m.move_number}</span>
                      <span style={{ fontSize: 14, flex: 1 }}>
                        {m.notes || <span style={{ color: 'var(--dim)' }}>(audio only)</span>}
                      </span>
                      {m.audio_url && <span title="audio saved">🎙</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                      <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '6px 12px' }} onClick={() => startEdit(m)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '6px 12px' }} onClick={() => deleteMove(m)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
