import type { Entry } from "../../../packages/engine/src/types";
const roles: Record<string, { glyph: string; name: string; plan: string }> = {
  seek_melee: {
    glyph: "M",
    name: "Pursuer",
    plan: "Closes to melee. Control the approach.",
  },
  seek_ranged: {
    glyph: "R",
    name: "Gunner",
    plan: "Attacks from range. Break sight or close the gap.",
  },
  guard_post: {
    glyph: "G",
    name: "Sentry",
    plan: "Holds a position. Use cover or another approach.",
  },
  flanker: {
    glyph: "F",
    name: "Flanker",
    plan: "Looks for a side approach. Watch open routes.",
  },
  hazard_placer: {
    glyph: "H",
    name: "Hazard setter",
    plan: "Seeds dangerous ground. Keep an escape route.",
  },
  summoner: {
    glyph: "S",
    name: "Summoner",
    plan: "Brings reinforcements. Pressure the source.",
  },
  support: {
    glyph: "+",
    name: "Support",
    plan: "Sustains other enemies. Separate it from its allies.",
  },
  charger: {
    glyph: "C",
    name: "Charger",
    plan: "Closes quickly. Avoid a direct approach.",
  },
  skirmisher: {
    glyph: "K",
    name: "Skirmisher",
    plan: "Repositions around attacks. Limit its space.",
  },
  boss_script: {
    glyph: "B",
    name: "Floor guardian",
    plan: "Crosshatched tiles strike in the next enemy phase. Devices offer another resolution.",
  },
};
export function enemyIdentity(record: Entry) {
  return roles[record.ai] ?? roles.seek_melee;
}
export function itemOpportunity(record: Entry): string {
  const hints: Record<string, string> = {
    reach: "Keep a tile between you and a melee threat.",
    breach: "Break brittle structures to open another route.",
    conductive: "A wet target can start a shock network.",
    wet_chain: "A wet target can start a shock network.",
    pull: "Drag a target toward your position and nearby hazards.",
    push: "Drive a target into dangerous ground.",
    ignite: "Fire reacts with fuel, vapor and volatile stores.",
    flammable: "Lay fuel, then bring a source of fire.",
    freeze: "Cold freezes wet ground into ice.",
    wet: "Water can extinguish fire or connect a circuit.",
    corrode: "Acid reduces armor and attacks corrodible structures.",
    insulating: "Prepare before crossing an energized wet area.",
    revival: "Keep this for an ally whose rescue window is closing.",
    ricochet: "Look for a second enemy next to your target.",
    line: "Line up a second enemy behind your target.",
    conceal: "Smoke interrupts sight lines.",
    repair: "Restore a damaged door or machine.",
    cover: "Create cover where the room offers none.",
    disarm: "Remove a trap before the crew crosses it.",
  };
  return hints[record.trait] ?? "";
}
