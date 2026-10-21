import { it, expect, afterAll, beforeAll } from "vitest";
import { Client, type Room } from "colyseus.js";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { path, distance } from "../../packages/engine/src/grid";
let process: ChildProcess;
const directory = mkdtempSync(join(tmpdir(), "crawl-net-"));
const endpoint = "ws://127.0.0.1:2571";
let output = "";
async function waitFor<T>(
  get: () => T | undefined,
  predicate: (v: T) => boolean,
  timeout = 10000,
): Promise<T> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const value = get();
    if (value !== undefined && predicate(value)) return value;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Timed out waiting for server state. " + output.slice(-1000));
}
async function start() {
  output = "";
  process = spawn("node", ["--import", "tsx", "apps/server/src/index.ts"], {
    cwd: globalThis.process.cwd(),
    env: { ...globalThis.process.env, DATA_DIR: directory, PORT: "2571" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout?.on("data", (v) => (output += String(v)));
  process.stderr?.on("data", (v) => (output += String(v)));
  await waitFor(
    () => output,
    (v) => v.includes("listening on port"),
    15000,
  );
}
async function stop() {
  if (!process || process.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    process.once("exit", () => resolve());
    process.kill("SIGTERM");
  });
}
beforeAll(start, 20000);
afterAll(async () => {
  await stop();
  rmSync(directory, { recursive: true, force: true });
});
function watch(room: Room) {
  const result: { welcome?: any; snapshot?: any; error?: any; ack?: any } = {};
  room.onMessage("welcome", (m) => (result.welcome = m));
  room.onMessage("snapshot", (m) => (result.snapshot = m));
  room.onMessage("error", (m) => (result.error = m));
  room.onMessage("ack", (m) => (result.ack = m));
  room.onError(() => {});
  return result;
}
it("authoritative four-client round, duplicate/spoof rejection, role migration and actual server restart", async () => {
  const sdk = new Client(endpoint);
  const host = await sdk.create("crawl", { seed: 1234, name: "Host" });
  const h = watch(host);
  await waitFor(() => h.welcome, Boolean);
  const rooms = [host],
    views = [h];
  for (let i = 1; i < 4; i++) {
    const r = await new Client(endpoint).joinById(host.roomId, {
      invite: h.welcome.invite,
      name: "Guest " + i,
    });
    rooms.push(r);
    views.push(watch(r));
    await waitFor(() => views[i].welcome, Boolean);
  }
  await expect(
    new Client(endpoint).joinById(host.roomId, { invite: "wrong" }),
  ).rejects.toThrow();
  host.send("command", { type: "START" });
  await waitFor(
    () => h.snapshot,
    (v) => v.game.phase === "EXPLORATION",
  );
  let nonce = 0;
  host.send("command", {
    type: "ACTION",
    runId: h.snapshot.game.runId,
    round: h.snapshot.game.round,
    actorId: views[1].welcome.actorId,
    nonce: ++nonce,
    action: { type: "GUARD" },
  });
  await waitFor(
    () => h.error,
    (v) => v.message === "Actor identity mismatch",
  );
  const revision = h.snapshot.game.revision;
  host.send("command", {
    type: "ACTION",
    runId: h.snapshot.game.runId,
    round: h.snapshot.game.round,
    nonce: ++nonce,
    action: { type: "GUARD" },
  });
  await waitFor(
    () => h.snapshot,
    (v) => v.game.revision > revision,
  );
  const once = h.snapshot.game.revision;
  host.send("command", {
    type: "ACTION",
    runId: h.snapshot.game.runId,
    round: h.snapshot.game.round,
    nonce,
    action: { type: "GUARD" },
  });
  await waitFor(
    () => h.ack,
    (v) => v.duplicate,
  );
  expect(h.snapshot.game.revision).toBe(once);
  for (
    let step = 0;
    step < 60 && h.snapshot.game.phase !== "PLANNING";
    step++
  ) {
    const s = h.snapshot.game,
      a = s.actors[h.welcome.actorId];
    const objective = s.objects.find((o: any) => o.kind === "objective");
    const next = path(
      s,
      a,
      objective,
      true,
      Object.values(s.actors).filter(
        (v: any) => v.id !== a.id && !v.dead,
      ) as any,
    )[0];
    expect(next).toBeDefined();
    const rev = s.revision;
    host.send("command", {
      type: "ACTION",
      runId: h.snapshot.game.runId,
      round: h.snapshot.game.round,
      nonce: ++nonce,
      action: { type: "MOVE", ...next },
    });
    await waitFor(
      () => h.snapshot,
      (v) => v.game.revision > rev,
    );
  }
  expect(h.snapshot.game.phase).toBe("PLANNING");
  const round = h.snapshot.game.round;
  for (let i = 0; i < 4; i++) {
    const n = i === 0 ? ++nonce : 1;
    rooms[i].send("command", {
      type: "PLAN",
      runId: h.snapshot.game.runId,
      round,
      nonce: n,
      actions: [{ type: "GUARD" }],
      ready: true,
    });
  }
  await waitFor(
    () => h.snapshot,
    (v) => v.game.round === round + 1,
  );
  for (const view of views)
    await waitFor(
      () => view.snapshot,
      (v) => v.game.round === round + 1,
    );
  expect(new Set(views.map((v) => v.snapshot.checksum)).size).toBe(1);
  // Oversized/forged action shapes are rejected without mutating canonical state.
  host.send("command", {
    type: "PLAN",
    runId: h.snapshot.game.runId,
    round: round + 1,
    nonce: ++nonce,
    actions: [{ type: "MOVE", x: -1, y: 999 }],
    ready: true,
  });
  await waitFor(
    () => h.error,
    (v) => v.message === "Invalid action list",
  );
  await host.leave();
  await waitFor(
    () => views[1].snapshot,
    (v) => v.hostId !== h.welcome.actorId,
  );
  const saved = views[1].snapshot.game;
  const welcomes = views.map((v) => v.welcome);
  await stop();
  await start();
  const resumed = await new Client(endpoint).create("crawl", {
    resume: saved.runId,
    invite: welcomes[1].invite,
    sessionToken: welcomes[1].sessionToken,
  });
  const resumedView = watch(resumed);
  await waitFor(() => resumedView.snapshot, Boolean);
  expect(resumedView.snapshot.game.round).toBe(saved.round);
  expect(resumedView.snapshot.game.rng).toEqual(saved.rng);
  expect(
    resumedView.snapshot.game.actors[welcomes[1].actorId].inventory,
  ).toEqual(saved.actors[welcomes[1].actorId].inventory);
  expect(resumedView.welcome.actorId).toBe(welcomes[1].actorId);
  resumed.send("command", {
    type: "PLAN",
    runId: saved.runId,
    round: saved.round,
    nonce: 1,
    actions: [{ type: "GUARD" }],
    ready: true,
  });
  await waitFor(
    () => resumedView.ack,
    (v) => v.duplicate,
  );
  await resumed.leave();
}, 60000);
