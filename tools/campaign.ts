import { playBot } from "./bot";
import { writeFileSync } from "node:fs";
const count = Number(process.env.CAMPAIGN_SEEDS ?? 100);
const assisted = process.env.CAMPAIGN_ASSISTED !== "0";
const players = Number(process.env.CAMPAIGN_PLAYERS ?? 1);
const rows: any[] = [];
const start = Date.now();
for (let seed = 0; seed < count; seed++) {
  const route = seed % 10 === 0 ? "alternate" : "combat";
  const r = playBot(seed, players, route, 2500, assisted);
  rows.push({
    seed,
    players,
    route,
    result: r.result,
    floor: r.floor,
    turns: r.turns,
    reason: r.reason,
  });
  if (seed % 5 === 0)
    console.log(
      `Campaign ${seed + 1}/${count}: ${r.result}, floor ${r.floor}, ${r.turns} turns`,
    );
  writeFileSync(
    `docs/campaign-${assisted ? "assisted" : "normal"}-${players}.json`,
    JSON.stringify(
      {
        assisted,
        assistance: assisted
          ? "Starting 500 HP, +8 armor and rail driver; no teleporting, save resets, free objective flags or in-run stat modifications."
          : "None",
        elapsedSeconds: (Date.now() - start) / 1000,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
}
const failed = rows.filter((r) => r.result !== "VICTORY");
console.log(
  JSON.stringify({
    seeds: count,
    assisted,
    players,
    passed: count - failed.length,
    failed,
  }),
);
if (assisted && failed.length) process.exitCode = 1;
