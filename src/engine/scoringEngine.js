// Diognosis — Adverse burden scoring.
// computeAdverseBurden lives in data/pharmacology.js with ACB_SCORES and
// BEERS_FLAGS so those data tables and the scorer stay versioned together.

// ═══════════════════════════════════════════════════════════════════
// TRANSPORTER-ENZYME CROSSTALK (#7)
// Two-step gut extraction: Fg = (1 − Emetab) × (1 − Etransporter)
// ═══════════════════════════════════════════════════════════════════

// computeGutExtraction(drugName) — estimates oral bioavailability loss from gut wall
// Returns {Emetab, Etransporter, Fg, note}
