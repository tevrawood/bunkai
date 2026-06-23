// Flatten bunkai rows (joined with segment + kata) into a CSV download.

const COLUMNS = [
  ['created_at', 'logged_at'],
  ['kata_name', 'kata'],
  ['segment_name', 'segment'],
  ['move_range', 'move_range'],
  ['attack', 'attack'],
  ['attack_side', 'attack_side'],
  ['stance', 'stance'],
  ['m1_side', 'm1_side'], ['m1_technique', 'm1_technique'], ['m1_level', 'm1_level'],
  ['m1_hikite_action', 'm1_hikite_action'], ['m1_hikite_target', 'm1_hikite_target'],
  ['m1_tuite', 'm1_tuite'], ['m1_kyusho', 'm1_kyusho'],
  ['m2_side', 'm2_side'], ['m2_technique', 'm2_technique'], ['m2_level', 'm2_level'],
  ['m2_hikite_action', 'm2_hikite_action'], ['m2_hikite_target', 'm2_hikite_target'],
  ['m2_tuite', 'm2_tuite'], ['m2_kyusho', 'm2_kyusho'],
  ['m3_side', 'm3_side'], ['m3_technique', 'm3_technique'], ['m3_level', 'm3_level'],
  ['m3_hikite_action', 'm3_hikite_action'], ['m3_hikite_target', 'm3_hikite_target'],
  ['m3_tuite', 'm3_tuite'], ['m3_kyusho', 'm3_kyusho'],
  ['finish', 'finish'],
  ['kiai', 'kiai'],
  ['technique_notes', 'technique_notes'],
]

function esc(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function buildCsv(rows) {
  const header = COLUMNS.map(([, h]) => h).join(',')
  const lines = rows.map((r) =>
    COLUMNS.map(([key]) => esc(r[key])).join(',')
  )
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
