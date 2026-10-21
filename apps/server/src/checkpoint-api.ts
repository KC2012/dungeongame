import type { Express, Request } from "express";
import express from "express";
import { randomBytes } from "node:crypto";
import { catalog, contentHash } from "../../../packages/content/src/index";
import { SaveStore, digest, type Saved } from "./persistence";
const phases = ["LOBBY", "EXPLORATION", "PLANNING", "SAFE_ROOM", "RESULT"];
function validate(data: Saved) {
  const g = data?.game;
  const number = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  const id = (v: unknown) =>
    typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
  if (
    data?.version !== 1 ||
    g?.schemaVersion !== 1 ||
    g.contentHash !== contentHash ||
    !phases.includes(g.phase) ||
    !Number.isInteger(g.width) ||
    !Number.isInteger(g.height) ||
    g.width < 0 ||
    g.height < 0 ||
    g.width > 80 ||
    g.height > 80 ||
    !Array.isArray(g.tiles) ||
    g.tiles.length !== g.width * g.height
  )
    throw Error("Unsupported or malformed checkpoint");
  if (
    !g.actors ||
    Object.keys(g.actors).length > 1000 ||
    !Array.isArray(data.sessions) ||
    data.sessions.length > 4 ||
    !data.sessions.some((s) => s.actorId === data.hostId) ||
    !Array.isArray(g.events) ||
    g.events.length > 1000 ||
    !Array.isArray(g.objects) ||
    g.objects.length > 1000
  )
    throw Error("Malformed entities");
  for (const tile of g.tiles)
    if (
      !["wall", "floor", "door", "rubble", "pit"].includes(tile.kind) ||
      !number(tile.hp) ||
      !Array.isArray(tile.tags) ||
      tile.tags.some((t) => typeof t !== "string" || t.length > 100) ||
      !tile.hazards
    )
      throw Error("Malformed tile");
  for (const [key, a] of Object.entries(g.actors)) {
    if (
      !id(key) ||
      a.id !== key ||
      !["crawler", "enemy", "minion"].includes(a.kind) ||
      !number(a.hp) ||
      !number(a.maxHP) ||
      a.hp > a.maxHP ||
      !number(a.focus) ||
      !number(a.maxFocus) ||
      !Number.isInteger(a.x) ||
      !Number.isInteger(a.y) ||
      (g.phase !== "LOBBY" &&
        (a.x < 0 || a.y < 0 || a.x >= g.width || a.y >= g.height)) ||
      !Array.isArray(a.inventory) ||
      a.inventory.length > 100 ||
      a.inventory.some(
        (i) =>
          !catalog.items.some((e) => e.id === i.id) ||
          !Number.isInteger(i.count) ||
          i.count < 1 ||
          i.count > 1000,
      )
    )
      throw Error("Malformed actor");
    if (
      a.kind === "crawler" &&
      !catalog.backgrounds.some((b) => b.id === a.catalogId)
    )
      throw Error("Unknown background");
  }
  for (const s of data.sessions)
    if (
      !g.actors[s.actorId] ||
      !Number.isSafeInteger(s.nonce) ||
      s.nonce < 0 ||
      !/^[0-9a-f]{64}$/.test(s.tokenHash)
    )
      throw Error("Malformed session");
  if (
    !/^[0-9a-f]{64}$/.test(data.inviteHash) ||
    !id(g.runId) ||
    !number(g.round) ||
    !number(g.revision)
  )
    throw Error("Malformed identity");
}
export function registerCheckpoints(app: Express, store: SaveStore) {
  app.use("/api/runs", express.json({ limit: "8mb" }));
  function authorize(req: Request) {
    const data = store.load(String(req.params.id)).data;
    const bearer = req.headers.authorization?.match(
      /^Bearer ([a-f0-9]{48})$/,
    )?.[1];
    const host = data.sessions.find((s) => s.actorId === data.hostId);
    if (!bearer || !host || digest(bearer) !== host.tokenHash)
      throw Error("Host authorization required");
    return data;
  }
  app.post("/api/runs/:id/export", (q, r) => {
    try {
      const data = authorize(q);
      r.setHeader(
        "Content-Disposition",
        'attachment; filename="concourse-' + data.game.runId + '.json"',
      );
      r.json({ data, checksum: digest(JSON.stringify(data)) });
    } catch {
      r.status(403).json({
        error: "Host authorization required or checkpoint unavailable",
      });
    }
  });
  app.post("/api/runs/:id/import", (q, r) => {
    try {
      const current = authorize(q);
      const envelope = q.body?.checkpoint;
      if (
        !envelope?.data ||
        digest(JSON.stringify(envelope.data)) !== envelope.checksum
      )
        throw Error("Checkpoint checksum mismatch");
      const data: Saved = structuredClone(envelope.data);
      validate(data);
      if (
        data.hostId !== current.hostId ||
        data.sessions.find((s) => s.actorId === data.hostId)?.tokenHash !==
          current.sessions.find((s) => s.actorId === current.hostId)?.tokenHash
      )
        throw Error("Backup belongs to a different host session");
      const runId = randomBytes(8).toString("hex"),
        invite = randomBytes(24).toString("hex");
      data.game.runId = runId;
      for (const event of data.game.events) event.runId = runId;
      data.inviteHash = digest(invite);
      data.code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
      for (const session of data.sessions) {
        session.offlineSince = Date.now();
        data.game.actors[session.actorId].online = false;
      }
      store.save(runId, data);
      r.status(201).json({
        runId,
        invite,
        code: data.code,
        actorId: data.hostId,
        nonce: data.sessions.find((s) => s.actorId === data.hostId)!.nonce,
      });
    } catch (e) {
      r.status(400).json({
        error: e instanceof Error ? e.message : "Invalid backup",
      });
    }
  });
}
