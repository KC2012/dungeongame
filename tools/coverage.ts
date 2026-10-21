import {
  catalog,
  compileEffects,
  traitModifiers,
  professionModifiers,
  backgroundModifiers,
} from "../packages/content/src/index";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const sources = readdirSync("packages/engine/src")
  .filter((p) => p.endsWith(".ts"))
  .map((p) => readFileSync(join("packages/engine/src", p), "utf8"))
  .join("\n");
const hooks = catalog.achievement_events.map((e) => ({
  id: e.id,
  fixtureFile: "tests/unit/achievement-hooks.test.ts",
  sourceMention: sources.includes(`'${e.id}'`) || sources.includes(`"${e.id}"`),
}));
const rows = Object.entries(catalog).map(([kind, records]) => ({
  kind,
  count: records.length,
  ids: records.map((r) => r.id),
  route: (
    {
      items:
        "equipment/attack/use; materials through recipes or floor objectives",
      abilities: "profession/general actions through primitive interpreter",
      rooms: "floor-prefab selection and rotation",
      monsters: "seeded per-floor encounter selection",
      hazards: "floor fixtures or optional archive selection",
      backgrounds: "lobby character creation",
      professions: "floor-3 saferoom choice",
      adaptations: "floor-3 saferoom choice",
      floors: "ordered run transitions",
      bosses: "combat phases and alternate devices",
      recipes: "ingredient-consuming craft transaction",
      achievements: "confirmed server event matcher",
      achievement_events:
        "60 confirmed-outcome source fixtures and authored achievement/reward matching tests",
      events: "audience-threshold saferoom bargains",
      sponsors: "qualified event gift transaction",
    } as Record<string, string>
  )[kind],
}));
const report = {
  records: rows.reduce((s, r) => s + r.count, 0),
  catalogs: rows,
  traits: Object.keys(traitModifiers).length,
  professionPassives: Object.keys(professionModifiers).length,
  backgroundTraits: Object.keys(backgroundModifiers).length,
  skillsCompiled: catalog.abilities.length,
  hooks,
  missingSourceMentions: hooks.filter((h) => !h.sourceMention).map((h) => h.id),
  qualification:
    "Source mentions and compilation are structural coverage, not proof of behavioral completeness. See executed content-behavior, gold-scenario, whole-run and networking tests.",
};
writeFileSync(
  "docs/content-coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    records: report.records,
    missingHooks: report.missingSourceMentions,
  }),
);
