import {
  readdirSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  openSync,
  fsyncSync,
  closeSync,
  copyFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { contentHash } from "../../../packages/content/src/index";
import type { State, Action } from "../../../packages/engine/src/types";
export type Session = {
  actorId: string;
  tokenHash: string;
  nonce: number;
  lastSeen: number;
  offlineSince: number;
  ready: boolean;
  plan: Action[];
};
export type Saved = {
  version: 1;
  game: State;
  inviteHash: string;
  code: string;
  hostId: string;
  sessions: Session[];
  startedAt: number;
};
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class SaveStore {
  constructor(public directory: string) {
    mkdirSync(directory, { recursive: true });
  }
  unlocked(): string[] {
    const ids = new Set<string>();
    for (const file of readdirSync(this.directory).filter((f) =>
      /^[A-Za-z0-9_-]+\.json$/.test(f),
    )) {
      try {
        const saved = this.decode(
          readFileSync(join(this.directory, file), "utf8"),
        );
        if (saved.game.result === "VICTORY")
          for (const id of saved.game.unlocks) ids.add(id);
      } catch {
        /* Corrupt checkpoints are preserved for explicit recovery. */
      }
    }
    return [...ids].sort();
  }
  file(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw Error("Invalid run id");
    return join(this.directory, id + ".json");
  }
  decode(raw: string): Saved {
    const env = JSON.parse(raw);
    if (digest(JSON.stringify(env.data)) !== env.checksum)
      throw Error("Checkpoint checksum mismatch");
    if (env.data.version !== 1 || env.data.game.schemaVersion !== 1)
      throw Error("Unsupported checkpoint version; migration requires backup");
    if (env.data.game.contentHash !== contentHash)
      throw Error(
        "Catalog version mismatch; preserve checkpoint before migration",
      );
    return env.data;
  }
  load(id: string): { data: Saved; warning?: string } {
    const file = this.file(id);
    let failure = "";
    for (const suffix of ["", ".bak1", ".bak2", ".bak3"]) {
      if (!existsSync(file + suffix)) continue;
      try {
        const data = this.decode(readFileSync(file + suffix, "utf8"));
        if (suffix) {
          if (existsSync(file))
            renameSync(file, file + ".corrupt-" + Date.now());
          return {
            data,
            warning: `Recovered ${suffix}; original preserved. ${failure}`,
          };
        }
        return { data };
      } catch (e) {
        failure = String(e);
      }
    }
    throw Error(`No valid checkpoint: ${failure || "not found"}`);
  }
  save(id: string, data: Saved) {
    const file = this.file(id);
    if (existsSync(file)) {
      this.decode(readFileSync(file, "utf8"));
      for (let n = 3; n >= 2; n--)
        if (existsSync(file + `.bak${n - 1}`))
          copyFileSync(file + `.bak${n - 1}`, file + `.bak${n}`);
      copyFileSync(file, file + ".bak1");
    }
    const envelope = JSON.stringify({
      data,
      checksum: digest(JSON.stringify(data)),
    });
    const temp = file + ".tmp";
    const fd = openSync(temp, "w", 0o600);
    try {
      writeFileSync(fd, envelope);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(temp, file);
    const dir = openSync(this.directory, "r");
    try {
      fsyncSync(dir);
    } finally {
      closeSync(dir);
    }
    appendFileSync(
      join(this.directory, id + ".journal"),
      JSON.stringify({
        revision: data.game.revision,
        round: data.game.round,
        checksum: digest(JSON.stringify(data.game)),
      }) + "\n",
      { mode: 0o600 },
    );
  }
}
