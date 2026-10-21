import { Room, Client, ServerError } from "@colyseus/core";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  newGame,
  addCrawler,
  begin,
  resolveRound,
  microAction,
  projection,
  hash,
  living,
  distance,
  neighbors,
  walkable,
  same,
} from "../../../packages/engine/src/index";
import { emit } from "../../../packages/engine/src/events";
import type { State, Action } from "../../../packages/engine/src/types";
import { SaveStore, digest, type Session } from "./persistence";
export const roomCodes = new Map<string, string>();
export const store = new SaveStore(process.env.DATA_DIR ?? ".data");
const token = () => randomBytes(24).toString("hex");
const valid = (a: unknown, b: string) =>
  typeof a === "string" &&
  a.length < 200 &&
  timingSafeEqual(Buffer.from(digest(a)), Buffer.from(b));
const actionNames = [
  "MOVE",
  "ATTACK",
  "ABILITY",
  "USE",
  "GUARD",
  "DODGE",
  "OVERWATCH",
  "WAIT",
  "INTERACT",
  "REVIVE",
  "EQUIP",
  "DROP",
  "GIVE",
  "TRADE",
  "REST",
  "CRAFT",
  "BUY",
  "SELL",
  "CHOOSE",
  "OFFER",
  "REWARD",
  "DESCEND",
  "MEDIC",
];
export function validateAction(a: any): a is Action {
  return (
    !!a &&
    typeof a === "object" &&
    actionNames.includes(a.type) &&
    Object.keys(a).every((k) =>
      [
        "type",
        "target",
        "x",
        "y",
        "id",
        "choice",
        "swap",
        "transactionId",
      ].includes(k),
    ) &&
    ["target", "id", "choice", "swap", "transactionId"].every(
      (k) =>
        a[k] === undefined || (typeof a[k] === "string" && a[k].length < 100),
    ) &&
    ["x", "y"].every(
      (k) =>
        a[k] === undefined ||
        (Number.isInteger(a[k]) && a[k] >= 0 && a[k] < 100),
    )
  );
}
export class CrawlRoom extends Room {
  // Reconnect reservations may briefly overlap an old socket; logical slots remain four.
  maxClients = 8;
  autoDispose = false;
  game!: State;
  invite = "";
  inviteHash = "";
  code = "";
  hostId = "";
  sessions: Session[] = [];
  bindings = new Map<string, Session>();
  rates = new Map<string, { time: number; count: number }>();
  startedAt = Date.now();
  warning = "";
  onCreate(options: any) {
    this.setPrivate(true);
    if (options?.resume) {
      const loaded = store.load(String(options.resume));
      if (roomCodes.has(loaded.data.code))
        throw Error("Run already active; reconnect to its existing room");
      if (!valid(options.invite, loaded.data.inviteHash))
        throw Error("Invalid resume secret");
      Object.assign(this, {
        game: loaded.data.game,
        inviteHash: loaded.data.inviteHash,
        code: loaded.data.code,
        hostId: loaded.data.hostId,
        sessions: loaded.data.sessions,
        startedAt: loaded.data.startedAt,
        warning: loaded.warning ?? "",
      });
      for (const session of this.sessions) {
        session.offlineSince = Date.now();
        this.game.actors[session.actorId].online = false;
      }
      this.invite = options.invite;
    } else {
      this.game = newGame(
        Number.isSafeInteger(options?.seed)
          ? options.seed
          : randomBytes(4).readUInt32LE(),
        randomBytes(8).toString("hex"),
      );
      this.game.unlocks = store.unlocked();
      this.invite = token();
      this.inviteHash = digest(this.invite);
      this.code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    }
    roomCodes.set(this.code, this.roomId);
    this.onMessage("command", (client, message) => {
      try {
        this.handle(client, message);
      } catch (e) {
        client.send("error", {
          message: e instanceof Error ? e.message : "Invalid command",
        });
      }
    });
    this.clock.setInterval(() => this.tick(), 1000);
  }
  onAuth(_client: Client, options: any) {
    if (options?.protocolVersion !== undefined && options.protocolVersion !== 1)
      throw new ServerError(403, "Version mismatch; refresh the client");
    if (
      options?.palette === 6 &&
      !this.game.unlocks.includes("concourse_survivor")
    )
      throw new ServerError(403, "Complete a run to unlock the Broadcast suit");
    if (
      options?.palette === 7 &&
      !this.game.unlocks.includes("producer_favorite")
    )
      throw new ServerError(403, "Earn the Producer favor to unlock this suit");
    if (this.sessions.length === 0) return true;
    if (!valid(options?.invite, this.inviteHash))
      throw new ServerError(403, "Invalid invitation");
    if (options?.sessionToken) {
      const session = this.sessions.find((s) =>
        valid(options.sessionToken, s.tokenHash),
      );
      if (!session) throw new ServerError(403, "Invalid session token");
      return true;
    }
    if (this.sessions.length >= 4)
      throw new ServerError(
        409,
        "Room is full; reconnect with an existing session",
      );
    if (this.game.phase !== "LOBBY")
      throw new ServerError(
        403,
        "Run started; reconnect with your saved session",
      );
    return true;
  }
  onJoin(client: Client, options: any) {
    let session = options?.sessionToken
      ? this.sessions.find((s) => valid(options.sessionToken, s.tokenHash))
      : undefined;
    let sessionToken = options?.sessionToken;
    if (session) {
      for (const [id, bound] of this.bindings)
        if (bound === session) {
          this.clients.find((c) => c.sessionId === id)?.leave(4001);
          this.bindings.delete(id);
        }
      session.offlineSince = 0;
      session.lastSeen = Date.now();
      this.game.actors[session.actorId].online = true;
    } else {
      if (this.game.phase !== "LOBBY" || this.sessions.length >= 4)
        throw Error("Room full or started");
      const name =
        String(options?.name ?? "Crawler")
          .replace(/[<>\x00-\x1f]/g, "")
          .trim()
          .slice(0, 24) || "Crawler";
      const id = randomBytes(8).toString("hex");
      addCrawler(
        this.game,
        id,
        name,
        String(options?.background ?? "night_custodian"),
      );
      sessionToken = token();
      session = {
        actorId: id,
        tokenHash: digest(sessionToken),
        nonce: 0,
        lastSeen: Date.now(),
        offlineSince: 0,
        ready: false,
        plan: [],
      };
      this.sessions.push(session);
      if (!this.hostId) this.hostId = id;
    }
    if (
      Number.isInteger(options?.palette) &&
      options.palette >= 0 &&
      options.palette < 8
    )
      this.game.actors[session.actorId].palette = options.palette;
    this.bindings.set(client.sessionId, session);
    client.send("welcome", {
      actorId: session.actorId,
      sessionToken,
      invite: this.invite,
      roomId: this.roomId,
      code: this.code,
      runId: this.game.runId,
      warning: this.warning,
    });
    this.persist();
    this.sync();
  }
  onLeave(client: Client) {
    const session = this.bindings.get(client.sessionId);
    if (!session) return;
    this.bindings.delete(client.sessionId);
    session.offlineSince = Date.now();
    this.game.actors[session.actorId].online = false;
    if (this.hostId === session.actorId) {
      const next = this.sessions.find((s) => !s.offlineSince);
      if (next) this.hostId = next.actorId;
    }
    this.persist();
    this.sync();
  }
  handle(client: Client, m: any) {
    const session = this.bindings.get(client.sessionId);
    if (!session) return;
    const rate = this.rates.get(client.sessionId) ?? {
      time: Date.now(),
      count: 0,
    };
    if (Date.now() - rate.time > 1000) {
      rate.time = Date.now();
      rate.count = 0;
    }
    this.rates.set(client.sessionId, rate);
    if (++rate.count > 30) throw Error("Rate limited");
    if (!m || typeof m !== "object" || JSON.stringify(m).length > 32000)
      throw Error("Malformed packet");
    if (m.actorId && m.actorId !== session.actorId)
      throw Error("Actor identity mismatch");
    session.lastSeen = Date.now();
    if (m.type === "PING") return;
    const a = this.game.actors[session.actorId];
    if (m.type === "PARK") {
      if (session.actorId !== this.hostId) throw Error("Host only");
      const offline = this.sessions.find(
        (s) =>
          s.actorId === m.target &&
          s.offlineSince &&
          Date.now() - s.offlineSince >= 300000,
      );
      const safe = this.game.objects.find((o) => o.kind === "safe");
      if (!offline || !safe || distance(a, safe) > 4)
        throw Error(
          "Parking requires the host near the saferoom and a crawler offline for five minutes",
        );
      const actor = this.game.actors[offline.actorId];
      const position = neighbors(safe).find(
        (p) =>
          walkable(this.game, p) &&
          !Object.values(this.game.actors).some((v) => !v.dead && same(v, p)),
      );
      if (!position || actor.dead || actor.downed)
        throw Error("No safe parking position");
      actor.x = position.x;
      actor.y = position.y;
      emit(this.game, "parked", a.id, [actor.id], {}, position);
      this.persist();
      this.sync();
      return;
    }
    if (m.type === "PING_TILE") {
      if (
        !Number.isInteger(m.x) ||
        !Number.isInteger(m.y) ||
        m.x < 0 ||
        m.y < 0 ||
        m.x >= this.game.width ||
        m.y >= this.game.height ||
        !this.game.tiles[m.y * this.game.width + m.x].explored
      )
        throw Error("Cannot ping an unseen tile");
      emit(
        this.game,
        "party_ping",
        session.actorId,
        [],
        {},
        { x: m.x, y: m.y },
      );
      this.persist();
      this.sync();
      return;
    }
    if (m.type === "START") {
      if (session.actorId !== this.hostId) throw Error("Host only");
      begin(this.game);
      for (const s of this.sessions) s.ready = false;
    } else if (m.type === "SNAPSHOT") {
      this.sync();
      return;
    } else if (m.type === "FORCE_READY") {
      if (session.actorId !== this.hostId) throw Error("Host only");
      for (const s of this.sessions.filter(
        (s) =>
          !s.ready &&
          !this.game.actors[s.actorId].dead &&
          !this.game.actors[s.actorId].downed,
      )) {
        if (Date.now() - s.lastSeen < 45000)
          throw Error("Unready player has responded within 45 seconds");
        s.ready = true;
        s.plan = [{ type: "GUARD" }];
      }
      this.advance();
    } else if (m.type === "PLAN") {
      if (this.game.phase !== "PLANNING" || a.dead || a.downed)
        throw Error("Not planning");
      if (m.round !== this.game.round || m.runId !== this.game.runId)
        throw Error("Stale round or wrong run");
      if (!Number.isSafeInteger(m.nonce) || m.nonce < 1)
        throw Error("Invalid nonce");
      if (m.nonce <= session.nonce) {
        client.send("ack", { nonce: m.nonce, duplicate: true });
        return;
      }
      if (
        !Array.isArray(m.actions) ||
        m.actions.length > 4 ||
        !m.actions.every(validateAction)
      )
        throw Error("Invalid action list");
      session.nonce = m.nonce;
      session.plan = m.actions;
      session.ready = !!m.ready;
      this.advance();
    } else if (m.type === "ACTION") {
      if (!validateAction(m.action)) throw Error("Invalid action");
      if (!Number.isSafeInteger(m.nonce) || m.nonce < 1)
        throw Error("Invalid nonce");
      if (m.nonce <= session.nonce) {
        client.send("ack", { nonce: m.nonce, duplicate: true });
        return;
      }
      if (m.runId !== this.game.runId || m.round !== this.game.round)
        throw Error("Stale round or wrong run");
      session.nonce = m.nonce;
      this.game = microAction(this.game, a.id, m.action);
    } else throw Error("Unknown message");
    this.persist();
    this.sync();
  }
  advance() {
    if (this.game.phase !== "PLANNING") return;
    const active = this.sessions.filter((s) => {
      const a = this.game.actors[s.actorId];
      return !a.dead && !a.downed;
    });
    if (!active.length || !active.every((s) => s.ready)) return;
    this.game = resolveRound(
      this.game,
      active.map((s) => ({ actorId: s.actorId, actions: s.plan })),
    ).state;
    for (const s of this.sessions) {
      s.ready = false;
      s.plan = [];
    }
  }
  tick() {
    if (!this.sessions.some((s) => !s.offlineSince)) return;
    let changed = false;
    for (const s of this.sessions)
      if (s.offlineSince && Date.now() - s.offlineSince >= 30000 && !s.ready) {
        s.ready = true;
        s.plan = [{ type: "GUARD" }];
        changed = true;
      }
    if (changed) {
      this.advance();
      this.persist();
      this.sync();
    }
  }
  persist() {
    store.save(this.game.runId, {
      version: 1,
      game: this.game,
      inviteHash: this.inviteHash,
      code: this.code,
      hostId: this.hostId,
      sessions: this.sessions,
      startedAt: this.startedAt,
    });
  }
  sync() {
    const game = projection(this.game);
    this.broadcast("snapshot", {
      game,
      checksum: hash(game),
      hostId: this.hostId,
      sessions: this.sessions.map(
        ({ actorId, ready, offlineSince, nonce }) => ({
          actorId,
          ready,
          nonce,
          offlineSince,
          online: !offlineSince,
        }),
      ),
      startedAt: this.startedAt,
    });
  }
  onDispose() {
    roomCodes.delete(this.code);
    this.persist();
  }
}
