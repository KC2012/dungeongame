import {
  newGame,
  addCrawler,
  generateFloor,
  validateFloor,
} from "../packages/engine/src/index";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
const count = Number(process.env.GENERATION_SEEDS ?? 10000),
  start = performance.now(),
  rows: any[] = [];
for (let floor = 1; floor <= 6; floor++) {
  for (let seed = 0; seed < count; seed++) {
    const s = newGame(seed, "generation");
    addCrawler(s, "a", "A", "night_custodian");
    s.floor = floor;
    generateFloor(s);
    const errors = validateFloor(s);
    if (errors.length) throw Error(`${floor}/${seed}: ${errors.join(", ")}`);
  }
  rows.push({ floor, seeds: count, valid: count });
  console.log(`Floor ${floor}: ${count} valid connected layouts`);
  writeFileSync(
    "docs/generation-report.json",
    JSON.stringify(
      {
        elapsedSeconds: (performance.now() - start) / 1000,
        rows,
        qualification:
          "Checks connectivity, reachable objective/alternate/safe/exit objects and four safe spawns. Not a balance or complete gameplay proof.",
      },
      null,
      2,
    ) + "\n",
  );
}
