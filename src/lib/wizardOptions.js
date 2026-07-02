// Shared vocabulary for the Bunkai capture wizard. Extracted from BunkaiWizard
// so the wizard UI and the Claude voice parser (api/parse.js) agree on the exact
// option strings — the same single-source-of-truth pattern as lib/finish.js.
// api/parse.js imports these to build its tool schema, so allowed values can
// never drift from the dropdowns.

export const ATTACK_TYPES = ["Punch", "Kick", "Wrist", "Grab", "Choke", "Push"];

export const ATTACK_DETAILS = {
  Punch: { subtypes: ["Reverse","Jab","Hook"],                          extra: { label: "Hand",          options: ["Right","Left"] } },
  Kick:  { subtypes: ["Front","Round","Side"],                          extra: { label: "Leg",           options: ["Right","Left"] } },
  Wrist: { subtypes: ["Cross","Single","Double"],                       extra: { label: "Wrist grabbed", options: ["Right","Left"] } },
  Grab:  { subtypes: ["Single","Double"],                               extra: { label: "Location",      options: ["Collar","Shoulder","Sleeve"] } },
  Choke: { subtypes: ["2-hand front","1-hand front","Rear naked","Headlock"], extra: null },
  Push:  { subtypes: ["1-hand","2-hand"],                               extra: { label: "Hand",          options: ["Right","Left"] } },
};

export const STANCES = ["Shiko-dachi","Naihanchi-dachi","Zenkutsu-dachi","Neko-ashi-dachi","Shizentai"];

// Control concepts — multi-select. The first row is the classical concept
// categories; "More" reveals the specific actions. Values are stored verbatim.
export const CONCEPT_TOP = [
  "Atemi (strike)", "Kyusho (pressure point)", "Tuite (joint lock)",
  "Kuzushi (off-balance)", "Hikite",
];
export const CONCEPT_MORE = [
  "Eye strike", "Throat strike", "Groin strike", "Temple strike", "Rib strike",
  "Leg kick", "Knee kick", "Shin kick", "Hair grab", "Head pull", "Distraction",
];

export const CAN_CONTINUE = ["No — they're done","Unlikely","Possibly — disengage now"];

// Compass rose for Motion (Slide/Step) and Finish fall direction. `deg` is the
// stored value; row/col place the cell in the 3×3 grid.
export const BEARINGS = [
  { label: "Fwd",  deg: 0,   row: 0, col: 1 },
  { label: "FR",   deg: 45,  row: 0, col: 2 },
  { label: "R",    deg: 90,  row: 1, col: 2 },
  { label: "BR",   deg: 135, row: 2, col: 2 },
  { label: "Back", deg: 180, row: 2, col: 1 },
  { label: "BL",   deg: 225, row: 2, col: 0 },
  { label: "L",    deg: 270, row: 1, col: 0 },
  { label: "FL",   deg: 315, row: 0, col: 0 },
];

export const BEARING_LABELS = {
  0:"Straight forward", 45:"Forward right 45°", 90:"Straight right",
  135:"Back right 45°", 180:"Straight back",    225:"Back left 45°",
  270:"Straight left",  315:"Forward left 45°",
};
