// Single source of truth for the wizard's Finish step — the finish types and
// the per-type specificity fields. Shared by the capture wizard (BunkaiWizard)
// and the Bunkai list's finish filter so the two never drift.

export const FINISH_TYPES = ["Lock", "Throw / Sweep", "Strike", "Takedown"];

export const FINISH_OPTIONS = {
  Lock:            { techniques: ["Figure four", "Wrist lock", "Arm bar", "Shoulder lock", "Neck crank", "Other"], positions: ["Standing", "Kneeling", "Grounded", "Wall"] },
  "Throw / Sweep": { techniques: ["Hip throw", "Leg sweep", "Shoulder throw", "Foot sweep", "Other"] },
  Strike:          { weapons: ["Seiken", "Shuto", "Hiji (elbow)", "Knee", "Head butt", "Other"], targets: ["Temple", "Throat", "Back of head", "Spine", "Groin", "Ribs", "Other"] },
  Takedown:        { techniques: ["Double leg", "Single leg", "Body lock", "Trips", "Other"], positions: ["Face down", "Face up", "Side", "Seated"] },
};

// The primary specific field the finish filter drills into once a type is
// picked, mapped to the payload.finishData key it's stored under. Keeps the
// sub-filter aligned with what the wizard actually saves.
export const FINISH_SUBFIELD = {
  Lock:            { key: "technique", label: "Lock type",  options: FINISH_OPTIONS.Lock.techniques },
  "Throw / Sweep": { key: "technique", label: "Throw type", options: FINISH_OPTIONS["Throw / Sweep"].techniques },
  Strike:          { key: "weapon",    label: "Weapon",     options: FINISH_OPTIONS.Strike.weapons },
  Takedown:        { key: "technique", label: "Takedown",   options: FINISH_OPTIONS.Takedown.techniques },
};
