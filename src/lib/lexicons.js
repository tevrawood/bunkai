// Single source of truth for all dropdown options.
// Each option is { value, label }. The value is the short code stored in the DB;
// the label is what the practitioner sees.

const opt = (value, label) => ({ value, label: label ?? value })

// The "none" sentinel used by every optional dropdown.
export const NONE = '—'

export const SIDES = [
  opt('L', 'L'),
  opt('R', 'R'),
  opt('Both', 'Both'),
]

// Move blocks allow a "none" side as well.
export const MOVE_SIDES = [
  opt(NONE, '—'),
  opt('L', 'L'),
  opt('R', 'R'),
  opt('Both', 'Both'),
]

export const LEVELS = [
  opt(NONE, '—'),
  opt('Jo', 'Jo (High)'),
  opt('Ch', 'Ch (Mid)'),
  opt('Ge', 'Ge (Low)'),
]

export const ATTACKS = [
  opt('OiZuki', 'OiZuki (Lunge Punch)'),
  opt('GyzZuki', 'GyzZuki (Reverse Punch)'),
  opt('MorZuki', 'MorZuki (Double Punch)'),
  opt('Uraken', 'Uraken (Back-fist)'),
  opt('Shuto', 'Shuto (Knife-hand Strike)'),
  opt('Haito', 'Haito (Ridge-hand)'),
  opt('Empi', 'Empi (Elbow Strike)'),
  opt('Tettsui', 'Tettsui (Hammer-fist)'),
  opt('Shotei', 'Shotei (Palm-heel)'),
  opt('Nukite', 'Nukite (Spear-hand)'),
  opt('MaeGeri', 'MaeGeri (Front Kick)'),
  opt('MawaGeri', 'MawaGeri (Roundhouse Kick)'),
  opt('YokoGeri', 'YokoGeri (Side Kick)'),
  opt('UshiroGeri', 'UshiroGeri (Back Kick)'),
  opt('HizaGeri', 'HizaGeri (Knee Strike)'),
  opt('KansGeri', 'KansGeri (Stomp Kick)'),
  opt('Grab', 'Grab (Lapel/Wrist/Shoulder)'),
  opt('Choke', 'Choke'),
  opt('Sweep', 'Sweep'),
]

export const DEFENSE = [
  opt(NONE, '—'),
  opt('LowUk', 'LowUk (Low Block / Gedan Barai)'),
  opt('HiUk', 'HiUk (High Rising Block)'),
  opt('MidUk', 'MidUk (Mid Outside-In / Soto-uke)'),
  opt('InsUk', 'InsUk (Mid Inside-Out / Uchi-uke)'),
  opt('ShutoUk', 'ShutoUk (Knife-hand Block)'),
  opt('MorUk', 'MorUk (Augmented Block)'),
  opt('KakUk', 'KakUk (Hooking Block)'),
  opt('OsUk', 'OsUk (Pressing Block)'),
  opt('SukUk', 'SukUk (Scooping Block)'),
  opt('GyzZuki', 'GyzZuki (Reverse Punch)'),
  opt('OiZuki', 'OiZuki (Lunge Punch)'),
  opt('Empi', 'Empi (Elbow Strike)'),
  opt('Uraken', 'Uraken (Back-fist)'),
  opt('Shuto', 'Shuto (Knife-hand Strike)'),
  opt('Tettsui', 'Tettsui (Hammer-fist)'),
  opt('Shotei', 'Shotei (Palm-heel)'),
  opt('MaeGeri', 'MaeGeri (Front Kick)'),
  opt('HizaGeri', 'HizaGeri (Knee Strike)'),
  opt('WrLk', 'WrLk (Wrist Lock / Kote-gaeshi)'),
  opt('ArmBr', 'ArmBr (Arm Bar / Ude-gatame)'),
  opt('ThrFwd', 'ThrFwd (Forward Throw)'),
  opt('Sweep', 'Sweep (Leg Sweep / Ashi-barai)'),
  opt('Takedn', 'Takedn (Takedown)'),
]

export const STANCES = [
  opt(NONE, '—'),
  opt('Zenkutsu', 'Zenkutsu (Front Stance)'),
  opt('Neko', 'Neko (Cat Stance)'),
  opt('Naihanchi', 'Naihanchi (Naihanchi Stance)'),
  opt('Kiba', 'Kiba (Horse Stance)'),
  opt('Sanchin', 'Sanchin (Hourglass Stance)'),
  opt('Tsuru', 'Tsuru (Crane Stance)'),
  opt('Kokutsu', 'Kokutsu (Back Stance)'),
  opt('Shiko', 'Shiko (Sumo Stance)'),
  opt('Heiko', 'Heiko (Parallel Stance)'),
]

export const HIKITE_ACTIONS = [
  opt(NONE, '— (none / standard chamber)'),
  opt('Hiki', 'Hiki (Pull / Draw)'),
  opt('Shime', 'Shime (Squeeze / Nerve compression)'),
  opt('Neru', 'Neru (Grind / Sustained pressure)'),
  opt('Yubi-tori', 'Yubi-tori (Finger lock / finger-by-finger)'),
  opt('Oshi', 'Oshi (Push / Press into point)'),
  opt('Kakae', 'Kakae (Encircling grab / wrap)'),
  opt('Kote-gaeshi', 'Kote-gaeshi (Wrist reversal)'),
  opt('Strip', 'Strip (Strip uke\'s grip)'),
  opt('Control-elbow', 'Control-elbow (Control / trap elbow)'),
]

export const TUITE = [
  opt(NONE, '— (none)'),
  opt('Kote-gaeshi', 'Kote-gaeshi (Wrist turn/reversal)'),
  opt('Ude-gatame', 'Ude-gatame (Straight arm bar)'),
  opt('Ude-garami', 'Ude-garami (Bent arm lock)'),
  opt('Yubi-tori', 'Yubi-tori (Finger lock)'),
  opt('Kansetsu-oshi', 'Kansetsu-oshi (Joint press)'),
  opt('Shoulder-lock', 'Shoulder-lock'),
  opt('Elbow-lock', 'Elbow-lock'),
  opt('Wrist-flex', 'Wrist-flex (Wrist hyperflexion)'),
]

export const KYUSHO = [
  opt(NONE, '— (none)'),
  opt('BrachN', 'BrachN (Brachial Nerve — inner upper arm)'),
  opt('RadN', 'RadN (Radial Nerve — outer forearm)'),
  opt('UlnN', 'UlnN (Ulnar Nerve — medial elbow / funny bone)'),
  opt('MedN', 'MedN (Median Nerve — inner wrist)'),
  opt('SolPlx', 'SolPlx (Solar Plexus)'),
  opt('VagN', 'VagN (Vagus / Carotid triangle)'),
  opt('TemPt', 'TemPt (Temple)'),
  opt('ThrPt', 'ThrPt (Throat / Larynx)'),
  opt('MstdPt', 'MstdPt (Mastoid — behind ear)'),
  opt('MandN', 'MandN (Mandibular Nerve — jaw angle)'),
  opt('FibN', 'FibN (Peroneal Nerve — outer knee)'),
  opt('FemN', 'FemN (Femoral Nerve — inner thigh)'),
  opt('SciN', 'SciN (Sciatic — back of thigh)'),
  opt('KidPt', 'KidPt (Kidney / Floating rib)'),
  opt('InnerKn', 'InnerKn (Inner Knee — SP10)'),
  opt('OuterKn', 'OuterKn (Outer Knee — GB33)'),
  opt('AnklPt', 'AnklPt (Achilles / Ankle)'),
  opt('St9', 'St9 (Carotid Sinus)'),
  opt('Tw17', 'Tw17 (Behind Earlobe)'),
  opt('Pc6', 'Pc6 (Inner Wrist — 2 cun up)'),
  opt('Sp9', 'Sp9 (Below Medial Knee)'),
]

export const FINISH = [
  opt(NONE, '— (none / continues)'),
  opt('Takedown', 'Takedown'),
  opt('ThrFwd', 'ThrFwd (Forward Throw)'),
  opt('ThrBk', 'ThrBk (Backward Throw)'),
  opt('Sweep', 'Sweep (Leg Sweep)'),
  opt('Pin', 'Pin'),
  opt('Release', 'Release'),
  opt('Choke', 'Choke'),
  opt('Disengage', 'Disengage'),
]

// Lookup a human label from a stored value, across all lexicons. Used by detail
// and list views so we don't show raw codes when a friendlier label exists.
const ALL = [
  ...ATTACKS, ...DEFENSE, ...STANCES, ...LEVELS,
  ...HIKITE_ACTIONS, ...TUITE, ...KYUSHO, ...FINISH,
]
const LABELS = ALL.reduce((m, o) => {
  if (!(o.value in m)) m[o.value] = o.label
  return m
}, {})

export function labelFor(value) {
  if (value == null || value === '' || value === NONE) return null
  return LABELS[value] ?? value
}
