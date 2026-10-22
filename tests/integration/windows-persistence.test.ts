import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync, fsyncSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SaveStore,
  digest,
  type Saved,
} from "../../apps/server/src/persistence";
import { newGame, addCrawler, hash } from "../../packages/engine/src/index";

// Exercise the Windows branch without changing the runner's process globals.
vi.mock("node:process", async (original) => ({
  ...(await original<typeof import("node:process")>()),
  platform: "win32",
}));
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  return {
    ...fs,
    fsyncSync: vi.fn((fd: number) => {
      if (fs.fstatSync(fd).isDirectory())
        throw Object.assign(
          new Error("EPERM: operation not permitted, fsync"),
          { code: "EPERM" },
        );
      fs.fsyncSync(fd);
    }),
  };
});

const dirs: string[] = [];
afterEach(() => {
  dirs
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.clearAllMocks();
});
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "crawl-windows-save-"));
  dirs.push(dir);
  const game = newGame(42, "windows");
  addCrawler(game, "a", "A", "night_custodian");
  const data: Saved = {
    version: 1,
    game,
    code: "ABC123",
    hostId: "a",
    inviteHash: digest("invite"),
    startedAt: 1,
    sessions: [
      {
        actorId: "a",
        tokenHash: digest("session"),
        nonce: 0,
        lastSeen: 1,
        offlineSince: 0,
        ready: false,
        plan: [],
      },
    ],
  };
  return { dir, store: new SaveStore(dir), data };
}
describe("Windows save compatibility", () => {
  it("creates a room checkpoint and journal, then saves and reloads with a backup", () => {
    const { dir, store, data } = setup();
    store.save("windows", data);
    expect(hash(store.load("windows").data)).toBe(hash(data));
    expect(readFileSync(join(dir, "windows.journal"), "utf8")).toContain(
      '"revision":0',
    );
    data.game.revision++;
    store.save("windows", data);
    expect(store.load("windows").data.game.revision).toBe(1);
    expect(
      store.decode(readFileSync(store.file("windows") + ".bak1", "utf8")).game
        .revision,
    ).toBe(0);
    // Both checkpoint files are flushed; no unsupported directory flush occurs.
    expect(fsyncSync).toHaveBeenCalledTimes(2);
  });
  it("does not suppress EPERM when flushing the checkpoint file itself", () => {
    const { store, data } = setup();
    store.save("windows", data);
    const original = readFileSync(store.file("windows"), "utf8");
    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw Object.assign(new Error("file flush denied"), { code: "EPERM" });
    });
    data.game.revision++;
    expect(() => store.save("windows", data)).toThrow("file flush denied");
    expect(readFileSync(store.file("windows"), "utf8")).toBe(original);
    expect(store.load("windows").data.game.revision).toBe(0);
  });
});
