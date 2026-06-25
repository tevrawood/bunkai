import { useState } from 'react'
import { Select, SegControl } from './Field.jsx'
import {
  MOVE_SIDES, DEFENSE, LEVELS, HIKITE_ACTIONS, TUITE, KYUSHO, NONE, labelFor,
} from '../lib/lexicons.js'

// One collapsible move block (Move 1/2/3). `data` is the slice of form state for
// this move (m{n}_side, m{n}_technique, ...). `prefix` is e.g. "m1".
// `onChange(field, value)` patches a single field on the parent form state.
export default function MoveBlock({ index, prefix, data, onChange, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  const f = (name) => `${prefix}_${name}`
  const technique = data[f('technique')]

  // One-line summary shown when collapsed.
  const summaryParts = [
    labelFor(data[f('technique')]) && data[f('technique')],
    data[f('level')] && data[f('level')] !== NONE ? data[f('level')] : null,
    labelFor(data[f('kyusho')]) && `→ ${data[f('kyusho')]}`,
  ].filter(Boolean)
  const summary = summaryParts.length ? summaryParts.join(' · ') : 'empty'

  return (
    <div className="move-block">
      <button type="button" className="mb-head" onClick={() => setOpen((o) => !o)}>
        <span className="mb-num">{index}</span>
        <span className="mb-title">Move</span>
        <span className="mb-sum">{summary}</span>
        <span className="mb-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mb-body">
          <SegControl
            label="Side"
            options={MOVE_SIDES}
            value={data[f('side')] || NONE}
            onChange={(v) => onChange(f('side'), v)}
          />
          <Select
            label="Technique"
            options={DEFENSE}
            value={technique || NONE}
            onChange={(v) => onChange(f('technique'), v)}
          />
          <Select
            label="Level"
            options={LEVELS}
            value={data[f('level')] || NONE}
            onChange={(v) => onChange(f('level'), v)}
          />
          <Select
            label="Hikite Action"
            options={HIKITE_ACTIONS}
            value={data[f('hikite_action')] || NONE}
            onChange={(v) => onChange(f('hikite_action'), v)}
          />
          <Select
            label="Hikite Target"
            hint="Where the hikite hand lands on uke's body"
            options={KYUSHO}
            value={data[f('hikite_target')] || NONE}
            onChange={(v) => onChange(f('hikite_target'), v)}
          />
          <Select
            label="Tuite"
            options={TUITE}
            value={data[f('tuite')] || NONE}
            onChange={(v) => onChange(f('tuite'), v)}
          />
          <Select
            label="Kyusho"
            hint="Primary strike / pressure-point target"
            options={KYUSHO}
            value={data[f('kyusho')] || NONE}
            onChange={(v) => onChange(f('kyusho'), v)}
          />
        </div>
      )}
    </div>
  )
}
