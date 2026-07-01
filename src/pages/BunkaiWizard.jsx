import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useSupabase } from "../lib/useSupabase.js";
import { CURRICULUM } from "../lib/curriculum.js";
import VoiceRecorder from "../components/VoiceRecorder.jsx";

// New stepped Bunkai capture wizard (Kata → Attack → Counter → Motion →
// Control → Finish). Self-contained inline styling so it renders consistently
// regardless of the app theme. Save is best-effort: it writes to the EXISTING
// bunkai columns (attack / attack_side / stance / finish / technique_notes +
// kata_id) plus a readable summary, so it needs no schema change. Full-fidelity
// JSON payload is a later upgrade. If the save fails, the wizard still works.

const COLORS = {
  bg: "#000321", surface: "#0a0f2e", border: "#1e2a4a",
  crimson: "#8B1A1A", crimsonBright: "#C0392B",
  gold: "#C9A84C", goldLight: "#E8C87A",
  green: "#2F7B52", greenDeep: "#25653f",
  text: "#E8E8E8", textMuted: "#8892A4",
};

const ATTACK_TYPES = ["Punch", "Kick", "Wrist", "Grab", "Choke", "Push"];
const ATTACK_DETAILS = {
  Punch: { subtypes: ["Reverse","Jab","Hook"],                          extra: { label: "Hand",          options: ["Right","Left"] } },
  Kick:  { subtypes: ["Front","Round","Side"],                          extra: { label: "Leg",           options: ["Right","Left"] } },
  Wrist: { subtypes: ["Cross","Single","Double"],                       extra: { label: "Wrist grabbed", options: ["Right","Left"] } },
  Grab:  { subtypes: ["Single","Double"],                               extra: { label: "Location",      options: ["Collar","Shoulder","Sleeve"] } },
  Choke: { subtypes: ["2-hand front","1-hand front","Rear naked","Headlock"], extra: null },
  Push:  { subtypes: ["1-hand","2-hand"],                               extra: { label: "Hand",          options: ["Right","Left"] } },
};

const STANCES = ["Shiko-dachi","Naihanchi-dachi","Zenkutsu-dachi","Neko-ashi-dachi","Shizentai"];

// Control concepts — multi-select. The first row is the classical concept
// categories; "More" reveals the specific actions. This list is easy to reshape
// later (the values are stored verbatim, so tweaking labels is low-risk).
const CONCEPT_TOP = [
  "Atemi (strike)", "Kyusho (pressure point)", "Tuite (joint lock)",
  "Kuzushi (off-balance)", "Hikite",
];
const CONCEPT_MORE = [
  "Eye strike", "Throat strike", "Groin strike", "Temple strike", "Rib strike",
  "Leg kick", "Knee kick", "Shin kick", "Hair grab", "Head pull", "Distraction",
];

const FINISH_TYPES = ["Lock","Throw / Sweep","Strike","Takedown"];

const FINISH_OPTIONS = {
  Lock:           { techniques: ["Figure four","Wrist lock","Arm bar","Shoulder lock","Neck crank","Other"], positions: ["Standing","Kneeling","Grounded","Wall"] },
  "Throw / Sweep":{ techniques: ["Hip throw","Leg sweep","Shoulder throw","Foot sweep","Other"] },
  Strike:         { weapons: ["Seiken","Shuto","Hiji (elbow)","Knee","Head butt","Other"], targets: ["Temple","Throat","Back of head","Spine","Groin","Ribs","Other"] },
  Takedown:       { techniques: ["Double leg","Single leg","Body lock","Trips","Other"], positions: ["Face down","Face up","Side","Seated"] },
};

const CAN_CONTINUE = ["No — they're done","Unlikely","Possibly — disengage now"];

const VOICE_PROMPTS = [
  "Name the attack. Describe your counter — inside or outside, hard or soft. What stance did you land in?",
  "What was your motion? Slide, step, or turn — and in which direction?",
  "Walk through your combination. What did you do to set up the finish? Did your stance shift?",
  "Describe the finish. What type — lock, throw, strike, or takedown? Where do they end up? Can they continue?",
];

// Curriculum order for the kata dropdown (matches the home grid).
const KATA_ORDER = (() => {
  const order = {};
  let i = 0;
  for (const grp of CURRICULUM) for (const m of grp.members) order[m.db] = i++;
  return order;
})();

const STEPS = [
  { key: "kata",    label: "Kata"    },
  { key: "attack",  label: "Attack"  },
  { key: "counter", label: "Counter" },
  { key: "motion",  label: "Motion"  },
  { key: "control", label: "Control" },
  { key: "finish",  label: "Finish"  },
];

const BEARINGS = [
  { label: "Fwd",  deg: 0,   row: 0, col: 1 },
  { label: "FR",   deg: 45,  row: 0, col: 2 },
  { label: "R",    deg: 90,  row: 1, col: 2 },
  { label: "BR",   deg: 135, row: 2, col: 2 },
  { label: "Back", deg: 180, row: 2, col: 1 },
  { label: "BL",   deg: 225, row: 2, col: 0 },
  { label: "L",    deg: 270, row: 1, col: 0 },
  { label: "FL",   deg: 315, row: 0, col: 0 },
];

const BEARING_LABELS = {
  0:"Straight forward", 45:"Forward right 45°", 90:"Straight right",
  135:"Back right 45°", 180:"Straight back",    225:"Back left 45°",
  270:"Straight left",  315:"Forward left 45°",
};

// ── Shared UI ────────────────────────────────────────────────────────────────

const labelSt = { fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" };
const selSt = {
  background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8,
  fontSize: 15, padding: "12px 14px", width: "100%",
  appearance: "none", WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238892A4' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36,
  cursor: "pointer", boxSizing: "border-box",
};

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {label && <div style={labelSt}>{label}</div>}
      {children}
    </div>
  );
}

function Sel({ label, options, value, onChange, placeholder = "—" }) {
  return (
    <Field label={label}>
      <select style={{ ...selSt, color: value ? COLORS.text : COLORS.textMuted }}
        value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => (
          typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Chip({ label, active, onTap, accent, small }) {
  const c = accent || COLORS.gold;
  return (
    <div onClick={onTap} style={{
      padding: small ? "7px 11px" : "9px 14px",
      borderRadius: 7, fontSize: small ? 12 : 13, fontWeight: 500, cursor: "pointer",
      border: `1px solid ${active ? c : COLORS.border}`,
      background: active ? `${c}22` : COLORS.bg,
      color: active ? c : COLORS.textMuted,
      userSelect: "none", transition: "all 0.12s", whiteSpace: "nowrap",
    }}>{label}</div>
  );
}

function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 6, height: 6, borderRadius: 3,
          background: i === current ? COLORS.gold : i < current ? "rgba(201,168,76,0.4)" : COLORS.border,
          transition: "all 0.2s",
        }} />
      ))}
    </div>
  );
}

function StanceSelect({ label, value, onChange }) {
  return <Sel label={label || "Stance"} options={STANCES} value={value} onChange={onChange} />;
}

// ── Compass Rose ─────────────────────────────────────────────────────────────

function CompassRose({ bearing, setBearing, centerLabel = "YOU", title }) {
  const CELL = 70, GAP = 6, SIZE = CELL * 3 + GAP * 2;
  const grid = Array(3).fill(null).map(() => Array(3).fill(null));
  BEARINGS.forEach(b => { grid[b.row][b.col] = b; });

  return (
    <Field label={title || "Bearing"}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${CELL}px)`, gap: GAP, width: SIZE }}>
          {grid.map((row, ri) => row.map((cell, ci) => {
            if (!cell) return (
              <div key={`c${ri}${ci}`} style={{
                width: CELL, height: CELL, borderRadius: 10,
                background: "rgba(201,168,76,0.07)", border: `1px solid ${COLORS.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2,
              }}>
                <div style={{ fontSize: 16 }}>⬤</div>
                <div style={{ fontSize: 9, color: COLORS.textMuted, letterSpacing: "0.05em" }}>{centerLabel}</div>
              </div>
            );
            const active = bearing === cell.deg;
            return (
              <div key={`c${ri}${ci}`} onClick={() => setBearing(active ? null : cell.deg)} style={{
                width: CELL, height: CELL, borderRadius: 10, cursor: "pointer",
                border: `1px solid ${active ? COLORS.gold : COLORS.border}`,
                background: active ? "rgba(201,168,76,0.18)" : COLORS.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3,
                transition: "all 0.13s",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: active ? COLORS.goldLight : COLORS.textMuted }}>{cell.label}</div>
                <div style={{ fontSize: 10, color: active ? COLORS.gold : COLORS.textMuted }}>{cell.deg}°</div>
              </div>
            );
          }))}
        </div>
        {bearing != null && (
          <div style={{ fontSize: 13, color: COLORS.goldLight, fontWeight: 500 }}>{BEARING_LABELS[bearing]}</div>
        )}
      </div>
    </Field>
  );
}

// ── Concept Picker ───────────────────────────────────────────────────────────

// Multi-select concept tags for the Control step. Tap to toggle; "Other" reveals
// a free-text field. The messy sequence itself is captured in the description /
// recording below — these tags are the queryable/filterable summary of it.
function ConceptPicker({ selected, setSelected, other, setOther }) {
  const [showMore, setShowMore] = useState(false);
  const [showOther, setShowOther] = useState(!!other);
  const opts = showMore ? [...CONCEPT_TOP, ...CONCEPT_MORE] : CONCEPT_TOP;
  const toggle = (c) => setSelected(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  return (
    <Field label="Choose concept — tap all that apply">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {opts.map(c => (
          <Chip key={c} label={c} active={selected.includes(c)} onTap={() => toggle(c)} />
        ))}
        <div onClick={() => setShowMore(m => !m)} style={{
          padding: "9px 14px", borderRadius: 7, fontSize: 13, cursor: "pointer",
          border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.textMuted, userSelect: "none",
        }}>{showMore ? "Less ↑" : "More →"}</div>
        <Chip label="Other" accent={COLORS.crimsonBright} active={showOther}
          onTap={() => { const n = !showOther; setShowOther(n); if (!n) setOther(""); }} />
      </div>
      {showOther && (
        <input
          value={other}
          onChange={e => setOther(e.target.value)}
          placeholder="Describe the other concept"
          style={{
            marginTop: 4, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, fontSize: 15, padding: "12px 14px", width: "100%",
            color: COLORS.text, boxSizing: "border-box",
          }}
        />
      )}
    </Field>
  );
}

// ── Finish Step ──────────────────────────────────────────────────────────────

function FinishStep({ finishType, setFinishType, finishData, setFinishData, canContinue, setCanContinue }) {
  const set = (key, val) => setFinishData(p => ({ ...p, [key]: val }));
  const opts = FINISH_OPTIONS[finishType];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <Field label="Type of finish">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FINISH_TYPES.map(t => (
            <Chip key={t} label={t} active={finishType === t}
              onTap={() => { setFinishType(t); setFinishData({}); }} />
          ))}
        </div>
      </Field>

      {finishType === "Lock" && opts && (
        <>
          <Sel label="Technique" options={opts.techniques} value={finishData.technique || ""} onChange={v => set("technique", v)} />
          <Sel label="Position they're in" options={opts.positions} value={finishData.position || ""} onChange={v => set("position", v)} />
        </>
      )}

      {finishType === "Throw / Sweep" && opts && (
        <>
          <Sel label="Technique" options={opts.techniques} value={finishData.technique || ""} onChange={v => set("technique", v)} />
          <CompassRose
            title="They fall"
            centerLabel="THEM"
            bearing={finishData.fallBearing != null ? finishData.fallBearing : null}
            setBearing={v => set("fallBearing", v)}
          />
        </>
      )}

      {finishType === "Strike" && opts && (
        <>
          <Sel label="Weapon" options={opts.weapons} value={finishData.weapon || ""} onChange={v => set("weapon", v)} />
          <Sel label="Target" options={opts.targets} value={finishData.target || ""} onChange={v => set("target", v)} />
        </>
      )}

      {finishType === "Takedown" && opts && (
        <>
          <Sel label="Technique" options={opts.techniques} value={finishData.technique || ""} onChange={v => set("technique", v)} />
          <CompassRose
            title="Direction they go"
            centerLabel="THEM"
            bearing={finishData.fallBearing != null ? finishData.fallBearing : null}
            setBearing={v => set("fallBearing", v)}
          />
          <Sel label="Ground position" options={opts.positions} value={finishData.position || ""} onChange={v => set("position", v)} />
        </>
      )}

      {finishType && (
        <Field label="Can they continue?">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {CAN_CONTINUE.map(opt => (
              <div key={opt} onClick={() => setCanContinue(opt)} style={{
                padding: "11px 14px", borderRadius: 7, cursor: "pointer",
                border: `1px solid ${canContinue === opt ? COLORS.crimsonBright : COLORS.border}`,
                background: canContinue === opt ? "rgba(192,57,43,0.13)" : COLORS.bg,
                color: canContinue === opt ? "#fff" : COLORS.textMuted,
                fontSize: 13, fontWeight: canContinue === opt ? 600 : 400,
                transition: "all 0.12s",
              }}>{opt}</div>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

// ── Voice Modal (visual demo — real capture is a later upgrade) ───────────────

function VoiceModal({ onClose, pace, setPace }) {
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const start = () => {
    setActive(true); setIdx(0);
    const ms = pace === "slow" ? 15000 : 10000;
    const t = setInterval(() => {
      setIdx(p => { if (p >= VOICE_PROMPTS.length - 1) { clearInterval(t); setActive(false); return p; } return p + 1; });
    }, ms);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,3,33,0.93)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.gold }}>Record Bunkai</div>
          <div onClick={onClose} style={{ color: COLORS.textMuted, fontSize: 20, cursor: "pointer" }}>✕</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["normal","slow"].map(p => (
            <div key={p} onClick={() => setPace(p)} style={{
              flex: 1, textAlign: "center", padding: "9px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500,
              border: `1px solid ${pace === p ? COLORS.gold : COLORS.border}`,
              background: pace === p ? "rgba(201,168,76,0.13)" : COLORS.bg,
              color: pace === p ? COLORS.goldLight : COLORS.textMuted,
            }}>{p === "normal" ? "Normal (10s)" : "Slow (15s)"}</div>
          ))}
        </div>
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10,
          padding: "18px", minHeight: 88, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          {active ? (
            <>
              <div style={{ fontSize: 11, color: COLORS.crimsonBright, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {["Counter","Motion","Control","Finish"][idx]}
              </div>
              <div style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.5 }}>{VOICE_PROMPTS[idx]}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 1.6 }}>
              Coached prompts guide you through<br />counter → motion → control → finish
            </div>
          )}
        </div>
        <button onClick={active ? undefined : start} style={{
          background: active ? COLORS.crimson : COLORS.crimsonBright, border: "none", borderRadius: 10,
          padding: "15px", fontSize: 15, fontWeight: 700, color: "#fff",
          cursor: active ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{active ? "⏺" : "🎙"}</span>
          {active ? "Recording..." : "Start Recording"}
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function BunkaiWizard() {
  const navigate = useNavigate();
  const supabase = useSupabase();
  const { userId } = useAuth();
  const { bunkaiId } = useParams();
  const editing = !!bunkaiId;

  // Editing jumps straight into the stepped form; a new entry starts on the
  // record-first intro.
  const [phase, setPhase] = useState(editing ? "form" : "intro"); // intro | form | review
  const [loading, setLoading] = useState(editing);
  const [transcript, setTranscript] = useState("");
  const [step, setStep] = useState(0);
  const [showVoice, setShowVoice] = useState(false);
  const [pace, setPace] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Kata attribution (kata = DB uuid)
  const [kataList, setKataList] = useState([]);
  const [kataMoves, setKataMoves] = useState([]);
  const [kata,     setKata]     = useState("");
  const [kataMove, setKataMove] = useState("");

  // Attack
  const [numAttacks, setNumAttacks]   = useState(1);
  const [attackType, setAttackType]   = useState("Punch");
  const [attackSub,  setAttackSub]    = useState("Reverse");
  const [attackExtra,setAttackExtra]  = useState("Right");

  // Counter
  const [counterSide,  setCounterSide]  = useState("");
  const [counterDir,   setCounterDir]   = useState("");
  const [counterStance,setCounterStance]= useState("");

  // Motion
  const [moveType, setMoveType] = useState("");
  const [bearing,  setBearing]  = useState(null);
  const [turnDir,  setTurnDir]  = useState("");
  const [turnDeg,  setTurnDeg]  = useState("");

  // Control
  const [concepts,      setConcepts]      = useState([]);
  const [conceptOther,  setConceptOther]  = useState("");
  const [controlDesc,   setControlDesc]   = useState("");
  const [stanceShift,   setStanceShift]   = useState(false);
  const [controlStance, setControlStance] = useState("");

  // Finish
  const [finishType,   setFinishType]   = useState("");
  const [finishData,   setFinishData]   = useState({});
  const [canContinue,  setCanContinue]  = useState("");

  // Load the kata list once (curriculum order, matching the home grid).
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("kata").select("id, name");
      if (!active) return;
      const sorted = (data ?? []).slice()
        .sort((a, b) => (KATA_ORDER[a.name] ?? 99) - (KATA_ORDER[b.name] ?? 99));
      setKataList(sorted);
    })();
    return () => { active = false; };
  }, [supabase]);

  // When a kata is chosen, pull its recorded moves for the move dropdown.
  useEffect(() => {
    if (!kata) { setKataMoves([]); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("kata_moves")
        .select("move_number, notes")
        .eq("kata_id", kata)
        .order("move_number", { ascending: true });
      if (!active) return;
      setKataMoves(data ?? []);
    })();
    return () => { active = false; };
  }, [kata, supabase]);

  // Edit mode: load the entry and rehydrate every wizard field from its saved
  // `payload`. Entries saved before the payload column existed fall back to the
  // handful of stored columns (the structured steps just start blank).
  useEffect(() => {
    if (!editing) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("bunkai").select("*").eq("id", bunkaiId).single();
      if (!active) return;
      const p = data?.payload;
      if (p && typeof p === "object") {
        setKata(p.kata ?? data.kata_id ?? "");
        setKataMove(p.kataMove ?? "");
        setNumAttacks(p.numAttacks ?? 1);
        setAttackType(p.attackType ?? "Punch");
        setAttackSub(p.attackSub ?? "");
        setAttackExtra(p.attackExtra ?? "");
        setCounterSide(p.counterSide ?? "");
        setCounterDir(p.counterDir ?? "");
        setCounterStance(p.counterStance ?? "");
        setMoveType(p.moveType ?? "");
        setBearing(p.bearing ?? null);
        setTurnDir(p.turnDir ?? "");
        setTurnDeg(p.turnDeg ?? "");
        setConcepts(Array.isArray(p.concepts) ? p.concepts : []);
        setConceptOther(p.conceptOther ?? "");
        setControlDesc(p.controlDesc ?? "");
        setStanceShift(!!p.stanceShift);
        setControlStance(p.controlStance ?? "");
        setFinishType(p.finishType ?? "");
        setFinishData(p.finishData ?? {});
        setCanContinue(p.canContinue ?? "");
        setTranscript(p.transcript ?? "");
      } else if (data) {
        // No structured payload — prefill what the columns can give us.
        setKata(data.kata_id ?? "");
        setCounterStance(data.stance ?? "");
        setFinishType(data.finish ?? "");
        setControlDesc(data.technique_notes ?? "");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [editing, bunkaiId, supabase]);

  const kataName    = kataList.find(k => k.id === kata)?.name || "";
  const detail      = ATTACK_DETAILS[attackType];
  const isLast      = step === STEPS.length - 1;
  const attackLabel = [numAttacks > 1 ? `${numAttacks}×` : "", attackSub, attackType].filter(Boolean).join(" ");
  const changeAttackType = val => { setAttackType(val); setAttackSub(""); setAttackExtra(""); };
  const showAttackPill = step > 1 && attackLabel;

  const moveOptions = kataMoves.map(m => ({ value: String(m.move_number), label: `#${m.move_number}${m.notes ? " · " + m.notes : ""}` }));

  // Build a readable one-line summary for technique_notes so the saved entry is
  // legible in the existing list / detail / CSV views.
  function buildSummary() {
    const parts = [];
    if (kataName) parts.push(kataMove ? `${kataName} · move ${kataMove}` : kataName);
    parts.push(attackLabel + (detail?.extra ? ` (${attackExtra})` : ""));
    const counter = [
      counterSide,
      counterDir ? ({ F:"Forward", B:"Back", L:"Left", R:"Right" })[counterDir] : "",
      counterStance ? `land ${counterStance}` : "",
    ].filter(Boolean).join(", ");
    if (counter) parts.push(`Counter: ${counter}`);
    let motion = "";
    if (moveType === "Turn") motion = turnDir && turnDeg ? `Turn ${turnDeg}° ${turnDir === "L" ? "left" : "right"}` : "Turn";
    else if (moveType) motion = `${moveType}${bearing != null ? " → " + BEARING_LABELS[bearing] : ""}`;
    if (motion) parts.push(`Motion: ${motion}`);
    const conceptList = [...concepts, conceptOther.trim()].filter(Boolean).join(", ");
    const control = [
      conceptList,
      controlDesc.trim(),
      stanceShift && controlStance ? `shift to ${controlStance}` : "",
    ].filter(Boolean).join("; ");
    if (control) parts.push(`Control: ${control}`);
    if (finishType) {
      const fd = [finishData.technique, finishData.weapon, finishData.target, finishData.position,
        finishData.fallBearing != null ? BEARING_LABELS[finishData.fallBearing] : ""].filter(Boolean).join(", ");
      parts.push(`Finish: ${finishType}${fd ? " — " + fd : ""}`);
    }
    if (canContinue) parts.push(`Can continue: ${canContinue}`);
    return parts.join(". ");
  }

  // Voice: capture the spoken transcript and move to the review screen. Parsing
  // into the individual fields is a later upgrade — for now the words are kept
  // as a note so nothing is lost.
  function onVoice({ transcript: t }) {
    if (!t) return; // transcription failed — VoiceRecorder shows its own error
    setTranscript(t);
    setPhase("review");
  }

  // The full structured wizard state, stored in the `payload` jsonb column so an
  // edit can rehydrate every step. Keep in sync with the hydrate effect above.
  function buildPayload() {
    return {
      v: 1,
      kata, kataMove,
      numAttacks, attackType, attackSub, attackExtra,
      counterSide, counterDir, counterStance,
      moveType, bearing, turnDir, turnDeg,
      concepts, conceptOther, controlDesc, stanceShift, controlStance,
      finishType, finishData, canContinue,
      transcript,
    };
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    // Writes the existing bunkai columns plus a readable summary AND the full
    // structured payload. Any spoken transcript is appended so the words are
    // never lost.
    const notes = [buildSummary(), transcript ? `Recorded: ${transcript}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const base = {
      user_id: userId,
      kata_id: kata || null,
      attack: attackLabel || null,
      attack_side: detail?.extra ? attackExtra : null,
      stance: counterStance || controlStance || null,
      finish: finishType || null,
      technique_notes: notes,
    };
    const payload = buildPayload();

    // Write with the payload; if that column isn't there yet, retry without it
    // so saving still works (structured edit just won't round-trip until the
    // migration is run).
    const write = (withPayload) => {
      const row = withPayload ? { ...base, payload } : base;
      return editing
        ? supabase.from("bunkai").update(row).eq("id", bunkaiId)
        : supabase.from("bunkai").insert(row);
    };
    let { error } = await write(true);
    if (error && /payload/i.test(error.message || "")) {
      ({ error } = await write(false));
    }
    setSaving(false);
    if (error) {
      // Saving is best-effort — the wizard still worked. Surface, don't block.
      setSaveMsg("Couldn't save (" + error.message + ") — your entry is still on screen.");
      return;
    }
    navigate(editing ? `/bunkai/${bunkaiId}` : "/bunkai");
  }

  const shell = { background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text, display: "flex", justifyContent: "center" };
  const col = { width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" };
  const headerSt = { background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" };

  // While an edit is loading its saved payload, hold the form back.
  if (loading) return <div className="spinner" />;

  // ── INTRO: record-first ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={shell}>
        <div style={col}>
          <div style={headerSt}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.gold }}>Add Bunkai</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>
                Record it, or fill it out
              </div>
            </div>
            <div onClick={() => navigate("/bunkai")} style={{ fontSize: 18, color: COLORS.textMuted, cursor: "pointer" }}>✕</div>
          </div>

          <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>Record</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5, lineHeight: 1.5 }}>
                Set the kata (optional), then talk through the whole bunkai in one go. We'll keep your words and you can save or revise.
              </div>
            </div>

            <Sel
              label="Kata (optional)"
              options={kataList.map(k => ({ value: k.id, label: k.name }))}
              value={kata}
              onChange={v => { setKata(v); setKataMove(""); }}
              placeholder="No kata (unattributed)"
            />

            <Field label="Talk through it — in this order">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
                {["Attack & counter", "Motion", "Control / combo", "Finish"].map((p, i) => (
                  <div key={p} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.crimsonBright, minWidth: 14 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: COLORS.text }}>{p}</span>
                  </div>
                ))}
              </div>
            </Field>

            <VoiceRecorder onResult={onVoice} label="Tap to record your bunkai" />

            <button onClick={() => setPhase("form")} style={{
              background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10,
              padding: "13px", fontSize: 14, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer", width: "100%",
            }}>
              Or fill it out manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── REVIEW: after recording ──────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div style={shell}>
        <div style={col}>
          <div style={headerSt}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.gold }}>Review</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>
                {kataName || "No kata"}
              </div>
            </div>
            <div onClick={() => navigate("/bunkai")} style={{ fontSize: 18, color: COLORS.textMuted, cursor: "pointer" }}>✕</div>
          </div>

          <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>Here's what you recorded</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5, lineHeight: 1.5 }}>
                Save it as a note now, or revise to fill in the structured fields.
              </div>
            </div>

            <Field label="Transcript">
              <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 14, color: COLORS.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {transcript}
              </div>
            </Field>

            {saveMsg && <div style={{ fontSize: 12, color: COLORS.crimsonBright, lineHeight: 1.5 }}>{saveMsg}</div>}

            <button onClick={save} disabled={saving} style={{
              background: COLORS.green, border: "none", borderRadius: 10, padding: "15px",
              fontSize: 15, fontWeight: 700, color: "#fff", cursor: saving ? "default" : "pointer",
              width: "100%", boxShadow: "0 6px 20px rgba(47,123,82,0.35)", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : "Save"}
            </button>

            <button onClick={() => { setPhase("form"); setStep(0); }} style={{
              background: COLORS.gold, border: "none", borderRadius: 10, padding: "15px",
              fontSize: 15, fontWeight: 700, color: COLORS.bg, cursor: "pointer", width: "100%",
            }}>
              Revise — walk me through it
            </button>

            <button onClick={() => { setTranscript(""); setPhase("intro"); }} style={{
              background: "transparent", border: "none", padding: "4px", fontSize: 13,
              color: COLORS.textMuted, cursor: "pointer", width: "100%",
            }}>
              ↺ Re-record
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM: the stepped wizard ─────────────────────────────────────────────
  return (
    <div style={{ background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ background: COLORS.bg,
          borderBottom: `1px solid ${COLORS.border}`, padding: "14px 20px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.gold }}>{editing ? "Edit Bunkai" : "Add Bunkai"}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>
              {kataName ? (kataMove ? kataName + " · #" + kataMove : kataName) : "No kata selected"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div onClick={() => navigate(editing ? `/bunkai/${bunkaiId}` : "/bunkai")} style={{ fontSize: 18, color: COLORS.textMuted, cursor: "pointer" }}>✕</div>
            <StepDots current={step} total={STEPS.length} />
          </div>
        </div>

        {/* Step heading */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {step > 1 && <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.crimsonBright, lineHeight: 1 }}>{step}</div>}
            <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{STEPS[step].label}</div>
          </div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5, lineHeight: 1.5 }}>
            {step === 0 && "Optional — select a kata and move to attribute this bunkai"}
            {step === 1 && "What was the attack?"}
            {step === 2 && "Initial motions to stop the attack from hitting you"}
            {step === 3 && "Where did you move and how did you land?"}
            {step === 4 && "Remove the opponent's desire to continue to strike"}
            {step === 5 && "The result you leave the opponent in so you can exit"}
          </div>
          {showAttackPill && (
            <div style={{
              display: "inline-block", marginTop: 10,
              background: "rgba(192,57,43,0.12)", border: `1px solid rgba(192,57,43,0.28)`,
              borderRadius: 5, padding: "3px 10px",
              fontSize: 11, color: COLORS.crimsonBright, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>{attackLabel}</div>
          )}
        </div>

        {/* Step content */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KATA */}
          {step === 0 && (
            <>
              <Sel
                label="Kata"
                options={kataList.map(k => ({ value: k.id, label: k.name }))}
                value={kata}
                onChange={v => { setKata(v); setKataMove(""); }}
                placeholder="No kata (unattributed)"
              />
              {kata && moveOptions.length > 0 && (
                <Sel
                  label="Move / Segment"
                  options={moveOptions}
                  value={kataMove}
                  onChange={setKataMove}
                  placeholder="No specific move"
                />
              )}
              {kata && moveOptions.length === 0 && (
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", paddingLeft: 2 }}>
                  No moves recorded for this kata yet — you can still save the bunkai and link a move later.
                </div>
              )}
              {!kata && (
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", paddingLeft: 2 }}>
                  Skip to save bunkai without kata attribution. You can link it later.
                </div>
              )}
            </>
          )}

          {/* ATTACK */}
          {step === 1 && (
            <>
              <Field label="Number of attacks">
                <div style={{ display: "flex", gap: 8 }}>
                  {[1,2,3].map(n => (
                    <div key={n} onClick={() => setNumAttacks(n)} style={{
                      width: 50, height: 50, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${numAttacks === n ? COLORS.gold : COLORS.border}`,
                      background: numAttacks === n ? "rgba(201,168,76,0.13)" : COLORS.bg,
                      color: numAttacks === n ? COLORS.goldLight : COLORS.textMuted,
                    }}>{n}</div>
                  ))}
                </div>
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Sel label="Type" options={ATTACK_TYPES} value={attackType} onChange={changeAttackType} />
                <Sel label={attackType === "Punch" ? "Punch" : attackType === "Kick" ? "Kick" : "Subtype"}
                  options={detail.subtypes} value={attackSub} onChange={setAttackSub} />
              </div>
              {detail.extra && (
                <Sel label={detail.extra.label} options={detail.extra.options} value={attackExtra} onChange={setAttackExtra} />
              )}
            </>
          )}

          {/* COUNTER */}
          {step === 2 && (
            <>
              <Sel label="Side" options={["Inside","Outside"]} value={counterSide} onChange={setCounterSide} />
              <Field label="Direction">
                <div style={{ display: "flex", gap: 8 }}>
                  {["F","B","L","R"].map(d => (
                    <Chip key={d} label={d} active={counterDir === d}
                      onTap={() => setCounterDir(counterDir === d ? "" : d)} />
                  ))}
                </div>
                {counterDir && (
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {({ F:"Forward", B:"Back", L:"Left", R:"Right" })[counterDir]}
                  </div>
                )}
              </Field>
              <StanceSelect label="Stance you land in" value={counterStance} onChange={setCounterStance} />
            </>
          )}

          {/* MOTION */}
          {step === 3 && (
            <>
              <Field label="Move type">
                <div style={{ display: "flex", gap: 8 }}>
                  {["Slide","Step","Turn"].map(m => (
                    <Chip key={m} label={m} active={moveType === m}
                      onTap={() => { setMoveType(m); setBearing(null); setTurnDir(""); setTurnDeg(""); }} />
                  ))}
                </div>
              </Field>
              {(moveType === "Slide" || moveType === "Step") && (
                <CompassRose bearing={bearing} setBearing={setBearing} />
              )}
              {moveType === "Turn" && (
                <>
                  <Field label="Direction">
                    <div style={{ display: "flex", gap: 8 }}>
                      {["L","R"].map(d => (
                        <Chip key={d} label={d === "L" ? "Left" : "Right"} active={turnDir === d} onTap={() => setTurnDir(d)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Degrees">
                    <div style={{ display: "flex", gap: 8 }}>
                      {["90","180","270"].map(d => (
                        <Chip key={d} label={d + "°"} active={turnDeg === d} onTap={() => setTurnDeg(d)} />
                      ))}
                    </div>
                  </Field>
                  {turnDir && turnDeg && (
                    <div style={{ fontSize: 13, color: COLORS.goldLight, fontWeight: 500 }}>
                      Turn {turnDeg}° to the {turnDir === "L" ? "left" : "right"}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* CONTROL */}
          {step === 4 && (
            <>
              <ConceptPicker
                selected={concepts} setSelected={setConcepts}
                other={conceptOther} setOther={setConceptOther}
              />

              <Field label="Describe the control">
                <textarea
                  value={controlDesc}
                  onChange={e => setControlDesc(e.target.value)}
                  placeholder="e.g. slip outside and strike, kick the back of the knee, then headlock"
                  rows={3}
                  style={{
                    background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8,
                    fontSize: 15, padding: "12px 14px", width: "100%", color: COLORS.text,
                    boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
                  }}
                />
              </Field>

              <VoiceRecorder
                label="Tap to record this control"
                onResult={({ transcript: t }) => {
                  if (t) setControlDesc(p => (p ? `${p} ${t}` : t));
                }}
              />

              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
                <Field label="Stance shift during control?">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Chip label="Yes" active={stanceShift === true}  onTap={() => setStanceShift(true)} />
                    <Chip label="No"  active={stanceShift === false} onTap={() => { setStanceShift(false); setControlStance(""); }} />
                  </div>
                </Field>
                {stanceShift === true && (
                  <div style={{ marginTop: 12 }}>
                    <StanceSelect label="Shift to" value={controlStance} onChange={setControlStance} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* FINISH */}
          {step === 5 && (
            <FinishStep
              finishType={finishType}   setFinishType={setFinishType}
              finishData={finishData}   setFinishData={setFinishData}
              canContinue={canContinue} setCanContinue={setCanContinue}
            />
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 10 }}>
          {saveMsg && (
            <div style={{ fontSize: 12, color: COLORS.crimsonBright, lineHeight: 1.5, textAlign: "center" }}>{saveMsg}</div>
          )}
          {editing ? (
            // Editing: save is available from any step, and steps can be jumped
            // freely rather than marched through in order.
            <>
              <button onClick={save} disabled={saving} style={{
                background: COLORS.green, border: "none", borderRadius: 10,
                padding: "15px", fontSize: 15, fontWeight: 700, color: "#fff",
                cursor: saving ? "default" : "pointer", width: "100%",
                boxShadow: "0 6px 20px rgba(47,123,82,0.35)", opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.textMuted }}>
                <span onClick={() => step > 0 && setStep(s => s - 1)}
                  style={{ cursor: step > 0 ? "pointer" : "default", opacity: step > 0 ? 1 : 0.3, padding: "4px", userSelect: "none" }}>
                  ← {step > 0 ? STEPS[step - 1].label : ""}
                </span>
                <span onClick={() => !isLast && setStep(s => s + 1)}
                  style={{ cursor: !isLast ? "pointer" : "default", opacity: !isLast ? 1 : 0.3, padding: "4px", userSelect: "none" }}>
                  {!isLast ? STEPS[step + 1].label : ""} →
                </span>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => isLast ? save() : setStep(s => s + 1)} disabled={saving} style={{
                background: isLast ? COLORS.green : COLORS.gold, border: "none", borderRadius: 10,
                padding: "15px", fontSize: 15, fontWeight: 700,
                color: isLast ? "#fff" : COLORS.bg, cursor: saving ? "default" : "pointer", width: "100%",
                boxShadow: isLast ? "0 6px 20px rgba(47,123,82,0.35)" : "none",
                opacity: saving ? 0.7 : 1,
              }}>
                {isLast ? (saving ? "Saving…" : "Save Bunkai") : `Next — ${STEPS[step + 1].label}`}
              </button>
              {step > 0 && (
                <div onClick={() => setStep(s => s - 1)}
                  style={{ textAlign: "center", fontSize: 13, color: COLORS.textMuted, cursor: "pointer", padding: "4px", userSelect: "none" }}>
                  ← Back to {STEPS[step - 1].label}
                </div>
              )}
            </>
          )}
        </div>

        {showVoice && <VoiceModal onClose={() => setShowVoice(false)} pace={pace} setPace={setPace} />}
      </div>
    </div>
  );
}
