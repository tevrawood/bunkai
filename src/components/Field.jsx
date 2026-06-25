// Small, reusable form primitives. Each renders a labeled field with large tap
// targets suited to phone use during training.

export function Input({ label, hint, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <input className="input" {...props} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function Textarea({ label, hint, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <textarea className="textarea" {...props} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function Select({ label, hint, options, value, onChange, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <select
        className="select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

// Multi-select rendered as toggle chips. `value` is an array; `onChange` is
// called with the new array. An option may carry a `title` for the hover/long
// label (used to show a kata move's transcript).
export function ChipMulti({ label, hint, options, value = [], onChange, empty }) {
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {options.length === 0 ? (
        <span className="hint">{empty ?? 'Nothing to choose from yet.'}</span>
      ) : (
        <div className="chip-multi">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={value.includes(o.value) ? 'on' : ''}
              onClick={() => toggle(o.value)}
              title={o.title || undefined}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

// Segmented L / R / Both (and optional —) control.
export function SegControl({ label, hint, options, value, onChange }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="seg-control">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? 'on' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
