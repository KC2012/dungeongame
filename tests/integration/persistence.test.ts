import { describe, it, expect, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SaveStore,
  digest,
  type Saved,
} from "../../apps/server/src/persistence";
import {
  newGame,
  addCrawler,
  begin,
  hash,
  resolveRound,
} from "../../packages/engine/src/index";
const dirs: string[] = [];
afterEach(() =>
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })),
);
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "crawl-save-"));
  dirs.push(dir);
  const store = new SaveStore(dir);
  const game = newGame(42, "save");
  addCrawler(game, "a", "A", "night_custodian");
  begin(game);
  const data: Saved = {
    version: 1,
    game,
    code: "ABC123",
    hostId: "a",
    inviteHash: digest("private"),
    sessions: [
      {
        actorId: "a",
        tokenHash: digest("session"),
        nonce: 41,
        lastSeen: 1,
        offlineSince: 0,
        ready: true,
        plan: [{ type: "GUARD" }],
      },
    ],
    startedAt: 1,
  };
  return { dir, store, data };
}
describe("durable checkpoints", () => {
  it("round trips exact state including pending plans, nonce and RNG", () => {
    const { store, data } = setup();
    store.save("save", data);
    expect(hash(store.load("save").data)).toBe(hash(data));
  });
  it("restores a mid-boss telegraph without a reroll", () => {
    const { store, data } = setup();
    const boss = data.game.actors.boss_1;
    boss.hp = 55;
    boss.bossPhase = 1;
    boss.telegraph = [{ x: 36, y: 35 }];
    store.save("save", data);
    const restored = store.load("save").data;
    expect(restored.game.actors.boss_1).toEqual(boss);
    expect(hash(resolveRound(restored.game, []).state)).toBe(
      hash(resolveRound(data.game, []).state),
    );
  });
  it("recovers backup and preserves corrupt bytes", () => {
    const { store, data, dir } = setup();
    store.save("save", data);
    data.game.round++;
    store.save("save", data);
    writeFileSync(store.file("save"), "corrupt data");
    const restored = store.load("save");
    expect(restored.warning).toContain("Recovered");
    expect(restored.data.game.round).toBe(0);
    const file = readdirSync(dir).find((f) => f.includes(".corrupt-"));
    expect(readFileSync(join(dir, file!), "utf8")).toBe("corrupt data");
  });
  it("refuses to overwrite a corrupt current file", () => {
    const { store, data } = setup();
    store.save("save", data);
    writeFileSync(store.file("save"), "broken");
    expect(() => store.save("save", data)).toThrow();
    expect(readFileSync(store.file("save"), "utf8")).toBe("broken");
  });
  it("refuses a tampered checksum", () => {
    const { store, data } = setup();
    store.save("save", data);
    const file = JSON.parse(readFileSync(store.file("save"), "utf8"));
    file.data.game.credits = 999;
    writeFileSync(store.file("save"), JSON.stringify(file));
    expect(() => store.load("save")).toThrow();
  });
  it("rejects traversal IDs", () => {
    const { store } = setup();
    expect(() => store.load("../outside")).toThrow("Invalid run id");
  });
  it("retains three rotating backups", () => {
    const { store, data, dir } = setup();
    for (let i = 0; i < 6; i++) {
      data.game.revision = i;
      store.save("save", data);
    }
    expect(readdirSync(dir).filter((f) => f.includes(".bak"))).toHaveLength(3);
    expect(store.load("save").data.game.revision).toBe(5);
  });
});
