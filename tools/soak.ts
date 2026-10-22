import {
  newGame,
  addCrawler,
  begin,
  resolveRound,
  makeActor,
  hash,
  random,
  clone,
  tile,
} from "../packages/engine/src/index";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import type { Action } from "../packages/engine/src/types";
import { enqueue } from "../packages/engine/src/environment";
const count = Number(process.env.SOAK_ROUNDS ?? 30000);
const times: number[] = [];
let s = newGame(8971, "soak");
for (let i = 0; i < 4; i++)
  addCrawler(s, "p" + i, "Bot " + i, "night_custodian");
begin(s);
// A controlled headless load fixture, not a balance or win-rate simulation.
for (const a of Object.values(s.actors))
  if (a.kind === "enemy") delete s.actors[a.id];
for (const t of s.tiles) {
  t.kind = "floor";
  t.hazards = {};
}
for (const a of Object.values(s.actors)) {
  a.hp = a.maxHP = 1e9;
  a.stats.armor = 100;
}
for (let i = 0; i < 50; i++) {
  const e = makeActor(
    "e" + i,
    "Load rat",
    "enemy",
    "turnstile_rat",
    12 + (i % 10),
    12 + Math.floor(i / 10),
  );
  e.hp = e.maxHP = 1e9;
  e.alert = true;
  e.noReward = true;
  s.actors[e.id] = e;
}
const rng = { rng: { fuzz: 972 } };
let rejected = 0;
const start = performance.now();
let maxHeap = 0;
let maxDeferred = 0;
const slowest: {
  round: number;
  ms: number;
  deferred: number;
  actors: number;
}[] = [];
for (let round = 0; round < count; round++) {
  s.phase = "PLANNING";
  const plans = ["p0", "p1", "p2", "p3"].map((actorId) => {
    const a = s.actors[actorId];
    const dx = random(rng, "fuzz", 3) - 1;
    const action: Action =
      round % 7 === 0
        ? {
            type: "MOVE",
            x: Math.max(0, Math.min(44, a.x + dx)),
            y: Math.max(0, Math.min(44, a.y + 1)),
          }
        : round % 11 === 0
          ? { type: "ATTACK", target: "missing" }
          : { type: "GUARD" };
    return { actorId, actions: [action] };
  });
  if (round % 50 === 0) enqueue(s, { x: 20, y: 20 }, "water", 2, "fuzz");
  if (process.env.SOAK_CAPTURE && round === 20814)
    writeFileSync(
      process.env.SOAK_CAPTURE,
      JSON.stringify({ state: s, plans }),
    );
  const at = performance.now();
  const result = resolveRound(s, plans);
  const ms = performance.now() - at;
  times.push(ms);
  s = result.state;
  maxDeferred = Math.max(maxDeferred, s.deferredEvents.length);
  slowest.push({
    round,
    ms,
    deferred: s.deferredEvents.length,
    actors: Object.keys(s.actors).length,
  });
  slowest.sort((a, b) => b.ms - a.ms);
  if (slowest.length > 8) slowest.pop();
  rejected += result.events.filter((e) => e.type === "action_rejected").length;
  for (const a of Object.values(s.actors)) {
    if (
      !Number.isFinite(a.hp) ||
      a.hp < 0 ||
      a.hp > a.maxHP ||
      a.ap < 0 ||
      a.inventory.some((i) => i.count < 0)
    )
      throw Error("Invariant at " + round);
  }
  if (round % 1000 === 0) {
    const heap = process.memoryUsage().heapUsed;
    maxHeap = Math.max(maxHeap, heap);
    if (round % 5000 === 0)
      console.log(
        `Soak ${round}/${count}; heap ${(heap / 1048576).toFixed(1)} MiB`,
      );
  }
}
times.sort((a, b) => a - b);
const report = {
  rounds: count,
  fixture:
    "4 crawlers + 50 enemies, open 45x45 map, debug HP and armor; includes invalid commands and bounded water propagation",
  elapsedSeconds: (performance.now() - start) / 1000,
  medianMs: times[Math.floor(times.length * 0.5)],
  p95Ms: times[Math.floor(times.length * 0.95)],
  maxMs: times.at(-1),
  maxDeferred,
  slowest,
  maxObservedHeapMiB: maxHeap / 1048576,
  rejectedActions: rejected,
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  checksum: hash(s),
  qualification:
    "Load/invariant test only; no human win-rate or separate-network claim.",
};
writeFileSync(
  process.env.SOAK_OUTPUT ?? "docs/soak-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
