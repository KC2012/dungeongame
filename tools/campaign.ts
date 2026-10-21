import { playBot } from "./bot";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const count = Number(process.env.CAMPAIGN_SEEDS ?? 100);
const assisted = process.env.CAMPAIGN_ASSISTED !== "0";
const players = Number(process.env.CAMPAIGN_PLAYERS ?? 1);
const rows: any[] = [];
const sourceHash = createHash("sha256")
  .update(
    ["packages/engine/src", "packages/content/src"]
      .flatMap((dir) =>
        readdirSync(dir)
          .filter((f) => f.endsWith(".ts"))
          .sort()
          .map((f) => readFileSync(dir + "/" + f)),
      )
      .join("\n"),
  )
  .digest("hex");
const start = Date.now();
const first = Number(process.env.CAMPAIGN_START ?? 0);
for (let seed = first; seed < first + count; seed++) {
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
      `Campaign ${seed - first + 1}/${count}: ${r.result}, floor ${r.floor}, ${r.turns} turns`,
    );
  writeFileSync(
    process.env.CAMPAIGN_OUTPUT ??
      `docs/campaign-${assisted ? "assisted" : "normal"}-${players}.json`,
    JSON.stringify(
      {
        assisted,
        sourceHash,
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
