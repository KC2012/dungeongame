import Phaser from "phaser";
import {
  compileEffects,
  traitModifiers,
  professionModifiers,
} from "../../../packages/content/src/index";
import { Client, type Room } from "colyseus.js";
import { DungeonScene } from "./map";
import { Broadcast } from "./broadcast";
import { enemyIdentity, itemOpportunity } from "./identity";
import { scenarios } from "../../../packages/content/src/scenarios";
import "./style.css";
import type {
  State,
  Action,
  Actor,
  Point,
  Catalog,
  Entry,
} from "../../../packages/engine/src/types";
import { actionCost, stat, weight } from "../../../packages/engine/src/index";
import { accuracy } from "../../../packages/engine/src/combat";
import {
  distance,
  path,
  tile,
  same,
  los,
} from "../../../packages/engine/src/grid";
const broadcast = new Broadcast();
const root = document.querySelector<HTMLDivElement>("#app")!;
const escape = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const client = new Client(
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`,
);
let room: Room | undefined,
  game: State | undefined,
  actorId = "",
  hostId = "",
  sessions: any[] = [],
  catalog: Catalog = {},
  queue: Action[] = [],
  selected: Point | undefined,
  mode = "MOVE",
  skillId = "",
  nonce = 0,
  lastRound = -1,
  scene: DungeonScene | undefined,
  phaser: Phaser.Game | undefined,
  drawer = "",
  session: any,
  connected = false,
  startedAt = Date.now();
const saved = () => {
  try {
    return JSON.parse(localStorage.getItem("concourse.session") ?? "null");
  } catch {
    return null;
  }
};
let intentionalLeave = false;
let profileUnlocks: string[] = [];
let inFlight:
  | {
      action: Action;
      nonce: number;
      sentAt: number;
      round: number;
      runId: string;
    }
  | undefined;
const bufferedActions: Action[] = [];
let settings = {
  sound: false,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  font: 14,
  announcer: true,
  ...JSON.parse(localStorage.getItem("concourse.settings") ?? "{}"),
};
document.documentElement.style.fontSize = settings.font + "px";
function find(kind: string, id: string): Entry {
  return (
    catalog[kind]?.find((v) => v.id === id) ?? { id, name: id, description: "" }
  );
}
function modifierText(values: Record<string, number>): string {
  const names: Record<string, string> = {
    armor: "armor",
    fireResist: "fire resistance",
    poisonResist: "poison resistance",
    shockResist: "shock resistance",
    coldResist: "cold resistance",
    speed: "initiative",
    dodge: "evasion",
    waterCost: "water movement AP",
    deviceRange: "device reach",
    interactionAPDiscount: "interaction AP discount",
    carrySlots: "inventory slots",
    maxFocus: "maximum Focus",
    capacity: "carry weight",
    sight: "sight",
    guard: "guard armor",
    accuracy: "accuracy",
    heal: "healing",
    hack: "device checks",
    structural: "structural damage",
    reach: "melee reach",
    pierce: "armor ignored",
    regeneration: "HP every third round",
    knockbackResist: "forced-move resistance",
    shield: "barrier each round",
    discount: "shop discount (%)",
    trap: "trap power",
    hazard: "hazard intensity",
    stealth: "enemy sight reduction",
    light: "sight in darkness",
  };
  return Object.entries(values)
    .map(
      ([k, n]) =>
        `${n > 0 ? "+" : ""}${n} ${names[k] ?? k.replaceAll("_", " ")}`,
    )
    .join(" · ");
}
function itemMechanics(e: Entry): string {
  if (e.kind === "material")
    return e.trait === "quest"
      ? "Consumed to operate a matching floor device from up to 3 tiles away."
      : "Consumed by matching crafting recipes.";
  if (e.kind === "armor" || e.kind === "trinket")
    return (
      (e.kind === "armor" ? `Armor ${e.power}. ` : "") +
      modifierText(traitModifiers[e.trait] ?? {})
    );
  if (e.kind === "weapon")
    return `Damage ${e.power} ${e.effects[0].element ?? "physical"} · range ${e.range + (e.trait === "reach" ? 1 : 0)} · ${e.accuracy ?? 0} accuracy · ${e.trait.replaceAll("_", " ")}`;
  return e.effects
    .map(
      (f: any) =>
        `${f.type.replaceAll("_", " ")} ${f.magnitude}${f.element ? " " + f.element : ""}`,
    )
    .join(" · ");
}
function button(label: string, act: string, extra = "") {
  return `<button data-act="${act}" ${extra}>${label}</button>`;
}
function toast(message: string) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "alert");
  t.textContent = message;
  document.body.append(t);
  setTimeout(() => t.remove(), 6500);
}
function title() {
  phaser?.destroy(true);
  phaser = undefined;
  scene = undefined;
  root.innerHTML = `<header><b class="brand">THE CRAWL</b><span>CONCOURSE // PRIVATE LOCAL ALPHA</span>${button("Credits", "credits")}${button("Settings", "settings")}</header><main class="title"><div class="eyebrow">The Producer welcomes your compliance</div><h1>Six floors.<br>One way off the air.</h1><p class="intro">A tactical cooperative crawl through the Concourse. Read the room, improvise with its machinery, and keep your friends alive. Every round is resolved by the host server.</p><div class="columns"><section class="card"><h2>Enter the Concourse</h2><label>Crawler name<input id="name" maxlength="24" value="Crawler"></label><label>Background<select id="background">${(catalog.backgrounds ?? []).map((e) => `<option value="${e.id}">${escape(e.name)}</option>`).join("")}</select></label><p id="background-help" class="muted"></p><label>Suit palette<select id="palette"><option value="0">Ochre</option><option value="1">Moss</option><option value="2">Lilac</option><option value="3">Slate</option><option value="4">Clay</option><option value="5">Linen</option>${profileUnlocks.includes("concourse_survivor") ? '<option value="6">Broadcast gold · survivor</option>' : ""}${profileUnlocks.includes("producer_favorite") ? '<option value="7">Producer seal · earned favor</option>' : ""}</select></label><label>Run seed <small>Leave blank for a new floor layout</small><input id="seed" inputmode="numeric" placeholder="Random"></label>${button("Create private room", "create", 'class="primary"')}</section><section class="card"><h2>Join your crew</h2><p class="muted">Use the six character room code and the invitation secret supplied by your host, or open their invitation link.</p><label>Room code<input id="code" maxlength="6" value="${escape(new URLSearchParams(location.search).get("room") ?? "")}"></label><label>Invitation secret<input id="invite" type="password" value="${escape(location.hash.slice(1))}" autocomplete="off"></label>${button("Join room", "join")}${saved() ? button("Reconnect / resume saved run", "resume") + '<label>Restore a host backup<input type="file" id="backup-file" accept="application/json"></label>' : ""}<details><summary>How to play</summary><p class="muted">Move with arrows or WASD. Outside combat, moves happen immediately. In combat, queue up to 3 AP and press R to ready. All active crawlers must be ready. Click enemies to attack; inspect machinery for alternative solutions. Inventory: I. Character: C. Escape: cancel.</p></details></section></div><p class="disclaimer">An unofficial private fan-setting interpretation inspired by Dungeon Crawler Carl. Not licensed or affiliated. All playable cast, dialogue, floors and procedural pixel art are original. No accounts, paid services or remote AI. This local alpha has not passed separate-network acceptance testing.</p></main><div class="drawer" id="drawer"></div>`;
  backgroundHelp();
}
function backgroundHelp() {
  const e = find(
    "backgrounds",
    (document.querySelector("#background") as HTMLSelectElement)?.value,
  );
  const el = document.querySelector("#background-help");
  if (el)
    el.textContent =
      e.description + " · " + JSON.stringify(e.attributeMods ?? {});
}
async function connect(which: string) {
  try {
    const name =
      (document.querySelector("#name") as HTMLInputElement)?.value ?? "Crawler";
    const palette = Number(
      (document.querySelector("#palette") as HTMLSelectElement)?.value ?? 0,
    );
    const background =
      (document.querySelector("#background") as HTMLSelectElement)?.value ??
      "night_custodian";
    if (which === "create") {
      const seed = (document.querySelector("#seed") as HTMLInputElement).value;
      room = await client.create("crawl", {
        name,
        background,
        palette,
        ...(seed ? { seed: Number(seed) } : {}),
      });
    } else if (which === "join") {
      const code = (document.querySelector("#code") as HTMLInputElement).value;
      const invite = (document.querySelector("#invite") as HTMLInputElement)
        .value;
      const response = await fetch("/api/rooms/" + encodeURIComponent(code));
      if (!response.ok) throw Error("Room not active; ask host to resume");
      const { roomId } = await response.json();
      room = await client.joinById(roomId, {
        name,
        background,
        palette,
        invite,
      });
    } else {
      const s = saved();
      if (!s) throw Error("No session saved");
      nonce = s.nonce ?? 0;
      try {
        const res = await fetch("/api/rooms/" + encodeURIComponent(s.code));
        if (!res.ok) throw Error("not active");
        const { roomId } = await res.json();
        room = await client.joinById(roomId, {
          invite: s.invite,
          sessionToken: s.sessionToken,
        });
      } catch {
        room = await client.create("crawl", {
          resume: s.runId,
          invite: s.invite,
          sessionToken: s.sessionToken,
        });
      }
    }
    bindRoom();
  } catch (e) {
    toast(String(e));
  }
}
function bindRoom() {
  if (!room) return;
  const current = room;
  connected = true;
  inFlight = undefined;
  bufferedActions.length = 0;
  const heartbeat = setInterval(() => {
    if (connected && room === current)
      current.send("command", { type: "PING" });
  }, 15000);
  const recovery = setInterval(() => {
    if (
      connected &&
      room === current &&
      inFlight &&
      Date.now() - inFlight.sentAt > 5000
    ) {
      inFlight.sentAt = Date.now();
      current.send("command", { type: "SNAPSHOT" });
      current.send("command", {
        type: "ACTION",
        action: inFlight.action,
        nonce: inFlight.nonce,
        round: inFlight.round,
        runId: inFlight.runId,
      });
    }
  }, 5000);
  room.onLeave(() => {
    clearInterval(heartbeat);
    clearInterval(recovery);
  });
  room.onMessage("welcome", (m: any) => {
    if (room !== current) return;
    actorId = m.actorId;
    session = { ...m, nonce };
    localStorage.setItem("concourse.session", JSON.stringify(session));
    history.replaceState(null, "", `?room=${m.code}#${m.invite}`);
    if (m.warning) toast(m.warning);
  });
  room.onMessage("snapshot", (m: any) => {
    if (room !== current) return;
    broadcast.accept(m.game, performance.now());
    game = m.game;
    root.dataset.checksum = m.checksum;
    root.dataset.revision = String(m.game.revision);
    hostId = m.hostId;
    sessions = m.sessions;
    if (
      inFlight &&
      (sessions.find((s) => s.actorId === actorId)?.nonce ?? -1) >=
        inFlight.nonce
    )
      inFlight = undefined;
    startedAt = m.startedAt;
    if (game!.round !== lastRound) {
      queue = [];
      lastRound = game!.round;
    }
    render();
    if (!inFlight && bufferedActions.length)
      enqueueAction(bufferedActions.shift()!);
  });
  room.onMessage("error", (m: any) => {
    if (room !== current) return;
    inFlight = undefined;
    bufferedActions.length = 0;
    toast(m.message);
    send({ type: "SNAPSHOT" });
  });
  room.onMessage("ack", (m: any) => {
    if (room !== current) return;
    if (inFlight && m.nonce === inFlight.nonce) {
      inFlight = undefined;
      send({ type: "SNAPSHOT" });
    }
  });
  room.onError((_code, message) => toast(message ?? "Connection error"));
  room.onLeave((code: number) => {
    if (room !== current) return;
    connected = false;
    broadcast.reset();
    scene?.stream.reset();
    scene?.effects?.clear();
    inFlight = undefined;
    bufferedActions.length = 0;
    if (!intentionalLeave)
      toast("Disconnected. The server owns the run. Reconnect to continue.");
    render();
    if (!intentionalLeave && code !== 4001 && game?.phase !== "RESULT")
      retryConnection(current, 0);
  });
}
function retryConnection(previous: Room, attempt: number) {
  if (attempt >= 6) return;
  setTimeout(
    () => {
      if (connected || room !== previous || intentionalLeave) return;
      void (async () => {
        await connect("resume");
        if (!connected && room === previous)
          retryConnection(previous, attempt + 1);
      })();
    },
    Math.min(10000, 1500 * 2 ** attempt),
  );
}
function send(m: any) {
  if (!connected || !room) {
    toast("Reconnect to the server first");
    return;
  }
  room.send("command", {
    ...m,
    ...(m.type === "ACTION" && game
      ? { runId: game.runId, round: game.round }
      : {}),
  });
}
function nextNonce() {
  nonce++;
  if (session) {
    session.nonce = nonce;
    localStorage.setItem("concourse.session", JSON.stringify(session));
  }
  return nonce;
}
function me(): Actor | undefined {
  return game?.actors[actorId];
}
function render() {
  if (!game || !actorId) return;
  root.dataset.connection = connected ? "connected" : "offline";
  root.dataset.pending = String(inFlight?.nonce ?? 0);
  root.dataset.buffered = String(bufferedActions.length);
  if (game.phase === "LOBBY") {
    root.innerHTML = `<header><b class="brand">THE CRAWL</b><span>PRIVATE ROOM ${escape(session?.code)}</span>${button("Settings", "settings")}</header><main class="title stack"><div class="eyebrow">Arrival / waiting for your crew</div><h1>The next shift is yours.</h1><p class="intro">One to four crawlers. Solo uses the same authoritative server. Share the invitation privately before starting.</p><div class="columns"><section class="card"><h2>Your crew · ${sessions.length}/4</h2>${Object.values(
      game.actors,
    )
      .map(
        (a) =>
          `<div class="lobby-player"><b>${escape(a.name)}</b> ${a.id === hostId ? "· host" : ""}<p class="muted">${escape(find("backgrounds", a.catalogId).name)} · HP ${a.hp} · Focus ${a.focus} · ${a.online ? "connected" : "offline"}</p></div>`,
      )
      .join(
        "",
      )}${actorId === hostId ? button("Begin the run", "start", 'class="primary"') : '<p class="muted">Waiting for the host to begin.</p>'}</section><section class="card"><h2>Private invitation</h2><p class="note">Room ${escape(session?.code)} · The link includes a secret. Share it only with your crew.</p>${button("Copy invitation", "invite")}<label>Invitation link<input readonly value="${escape(location.href)}"></label><p class="muted">The host process must stay running. Closing a browser does not end the run. Save data lives on the host machine.</p></section></div></main><div class="drawer" id="drawer"></div>`;
    return;
  }
  if (game.phase === "RESULT") {
    phaser?.destroy(true);
    phaser = undefined;
    root.innerHTML = `<header><b class="brand">THE CRAWL</b><span>TRANSMISSION ENDED</span></header><main class="recap"><div class="eyebrow">${game.result === "VICTORY" ? "The signal is yours" : "End of contract"}</div><h1>${game.result === "VICTORY" ? "You went off script." : "The shift is over."}</h1><p class="intro">${game.result === "VICTORY" ? "The Concourse falls silent. For once, the Producer has no prepared remarks." : "Your crew is remembered. The Producer would prefer you considered that compensation."}</p><div class="note">Seed ${game.seed} · Floor ${game.floor}/6 · ${game.turns} turns · ${Math.floor((Date.now() - startedAt) / 60000)} minutes · Audience ${game.audience}</div><div class="grid">${Object.values(
      game.actors,
    )
      .filter((a) => a.kind === "crawler")
      .map(
        (a) =>
          `<article class="item"><h2>${escape(a.name)}</h2><p>${a.dead ? "Memorial · lost in the Concourse" : a.downed ? "Downed" : "Survivor"} · Level ${a.level}</p><p>${escape(a.profession ?? find("backgrounds", a.catalogId).name)}</p></article>`,
      )
      .join(
        "",
      )}</div><h2>Feats earned · ${game.achievements.length}</h2><p class="muted">${game.achievements.map((id) => escape(find("achievements", id).name)).join(" · ") || "No feats this run."}</p><p>Unlocks: ${game.unlocks.map(escape).join(", ") || "None"}</p><p class="muted">Boss routes: ${game.floorRoutes.map(escape).join(" → ")}</p><div class="row">${button("Copy recap", "recap")}${button("New run", "new", 'class="primary"')}</div><p class="disclaimer">Original cast, writing and procedural art. Unofficial private fan-setting interpretation; not affiliated with or licensed by the author or publisher.</p></main>`;
    return;
  }
  const a = me()!;
  const focused = document.activeElement as HTMLElement | null,
    focusId = focused?.id,
    focusAction = focused?.dataset.act;
  const drawerScroll = document.querySelector("#drawer")?.scrollTop ?? 0;
  if (!document.querySelector("#map")) {
    root.innerHTML = `<header><b class="brand">THE CRAWL</b><span id="header-info"></span><div class="row">${button("Invite", "invite")}${button("Settings", "settings")}${button("Reconnect", "reconnect")}${actorId === hostId ? button("Export save", "export") : ""}</div></header><main class="workspace"><section class="map-column"><div class="map-bar"><div><b id="floor-name"></b><br><small id="phase-name"></small></div><div class="controls">${button("−", "zoom-out", 'aria-label="Zoom out"')}${button("+", "zoom-in", 'aria-label="Zoom in"')}${button("Inspect [F]", "inspect")}</div></div><div class="broadcast-strip"><div id="producer-line" role="status" aria-live="polite"></div><div id="audience-meter"></div></div><div id="boss-hud" aria-live="polite"></div><div id="map" tabindex="0" role="application" aria-label="Dungeon map. Arrow keys move; F inspect; R ready; I inventory; C character."></div><div class="map-bar"><small>WASD / arrows move · click target · R ready · Esc cancel</small><small>? objective · # boss device · + safe · > descent</small></div></section><aside class="side"><section id="mission"></section><section id="party"></section><section id="inspector"></section><section><h3>Transmission log</h3><div id="log" class="log" role="log" aria-live="polite"></div></section></aside><section class="actions" id="actions"></section><section class="actions" id="context"></section></main><div class="drawer" id="drawer"></div>`;
    scene = new DungeonScene();
    scene.reducedMotion = settings.reducedMotion;
    scene.choose = pick;
    scene.hover = (p) => {
      if (mode === "MOVE" || !game || (selected && same(selected, p))) return;
      selected = p;
      inspector();
      scene?.setState(game, actorId, selected, scene.queued);
    };
    phaser = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: "map",
      width: document.querySelector("#map")!.clientWidth,
      height: document.querySelector("#map")!.clientHeight,
      backgroundColor: "#111613",
      pixelArt: true,
      scene: [scene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      audio: { noAudio: true },
    });
  }
  const reconnect = document.querySelector<HTMLButtonElement>(
    '[data-act="reconnect"]',
  );
  if (reconnect) reconnect.disabled = connected;
  document.querySelector("#header-info")!.textContent =
    `${connected ? "CONNECTED" : "OFFLINE"} · Round ${game.round} · Seed ${game.seed}`;
  document.querySelector("#floor-name")!.textContent =
    `${game.floor.toString().padStart(2, "0")} / ${find("floors", catalog.floors[game.floor - 1].id).name}`;
  document.querySelector("#phase-name")!.textContent =
    game.phase === "PLANNING"
      ? "TACTICAL PLANNING · 3 AP · team commits together"
      : game.phase === "SAFE_ROOM"
        ? "SAFEROOM · services available"
        : "EXPLORATION · server-confirmed movement";
  const f = catalog.floors[game.floor - 1];
  const producer = document.querySelector<HTMLElement>("#producer-line")!;
  const notice = broadcast.current;
  const producerText =
    settings.announcer && notice
      ? `PRODUCER / ${notice.title} — ${notice.text}`
      : "PRODUCER / " +
        (settings.announcer ? "Watching the floor." : "Commentary muted");
  if (producer.textContent !== producerText)
    producer.textContent = producerText;
  const change = broadcast.audienceChange;
  document.querySelector("#audience-meter")!.innerHTML =
    `<b>◉ ${game.audience}</b><small> / 100 AUDIENCE</small>${change ? `<span class="audience-change">${change.delta > 0 ? "+" : ""}${change.delta} · ${escape(change.cause)}</span>` : ""}<meter min="0" max="100" value="${game.audience}" aria-label="Audience interest">${game.audience}</meter>`;
  const boss = Object.values(game.actors).find(
    (v) => v.tags.includes("boss") && !v.dead,
  );
  const bossHud = document.querySelector<HTMLElement>("#boss-hud")!;
  bossHud.hidden = !boss;
  bossHud.innerHTML = boss
    ? `<b>${escape(boss.name)}</b><span>${boss.hp}/${boss.maxHP} HP · Phase ${boss.bossPhase + 1}</span><div class="health"><span style="width:${(100 * boss.hp) / boss.maxHP}%"></span></div><small>${boss.telegraph.length ? "⚠ MARKED TILES STRIKE NEXT ENEMY PHASE · move clear before Ready" : "Watch for the next marked attack"} · Devices ${game.alternate.length}/${f.alternateBoss.goal}</small>`
    : "";
  document.querySelector("#mission")!.innerHTML =
    `<h3>Floor objective</h3><b>${escape(f.requiredObjective.id.replaceAll("_", " "))}</b><p class="muted">${game.objective.length}/${f.requiredObjective.goal} complete</p><p class="statusline">Boss: ${game.bossDefeated ? "resolved" : escape(find("bosses", f.boss).name)}<br>Alternative: ${game.alternate.length}/${f.alternateBoss.goal} devices<br>Audience ${game.audience}/100 · Credits ${game.credits} · XP ${game.xp}</p>`;
  document.querySelector("#party")!.innerHTML = `<h3>Crew</h3>${Object.values(
    game.actors,
  )
    .filter((v) => v.kind === "crawler")
    .map(
      (v) =>
        `<div class="party-row ${v.id === actorId ? "you" : ""}"><b>${escape(v.name)}</b> <small>${v.id === actorId ? "YOU" : ""} · ${v.dead ? "DEAD" : v.downed ? "DOWNED " + v.downed : v.online ? "online" : "offline"}</small><div class="health"><span style="width:${(100 * v.hp) / v.maxHP}%"></span></div><small>HP ${v.hp}/${v.maxHP} · Focus ${v.focus}/${v.maxFocus} · L${v.level} ${sessions.find((s) => s.actorId === v.id)?.ready ? "· READY" : ""}</small><p class="statusline">${Object.keys(v.statuses).map(escape).join(" · ")}</p></div>`,
    )
    .join("")}`;
  const verbs = queue
    .map(
      (c) =>
        `<span>${escape(c.type)}${c.id ? " · " + escape(find(c.type === "ABILITY" ? "abilities" : "items", c.id).name) : ""}</span>`,
    )
    .join("");
  const skills = catalog.abilities.filter(
    (e) => e.profession === "general" || e.profession === a.profession,
  );
  document.querySelector("#actions")!.innerHTML =
    `<div class="row"><h3 class="grow">${a.dead ? "Spectating" : a.downed ? "Downed · ask your crew for a revive" : "Action plan"}</h3><b>${queue.length ? queue.length + " queued · " + queue.reduce((n, c) => n + actionCost(game!, a, c), 0) + "/" + (a.statuses.stunned ? 2 : 3) + " AP" : "No actions queued"}</b></div><div class="queue">${verbs || "<small>Choose an action, then a target. Invalid actions refund AP.</small>"}</div><div class="tabs">${button("Move [1]", "mode:MOVE", `class="${mode === "MOVE" ? "selected" : ""}"`)}${button("Attack [2]", "mode:ATTACK", `class="${mode === "ATTACK" ? "selected" : ""}"`)}${button("Guard [3]", "guard")}${button("Dodge", "dodge")}${button("Overwatch", "overwatch")}${button("Inventory [I]", "inventory")}${button("Character [C]", "character")}</div><div class="row"><select id="skill" aria-label="Ability"><option value="">Choose ability</option>${skills.map((e) => `<option value="${e.id}" ${skillId === e.id ? "selected" : ""}>${escape(e.name)} · ${e.apCost} AP / ${e.focusCost} focus / range ${e.range}</option>`).join("")}</select>${button("Use ability", "ability")}${button("Undo", "undo", queue.length ? "" : "disabled")}${button(sessions.find((s) => s.actorId === actorId)?.ready ? "Unready [R]" : "Ready [R]", "ready", `class="primary" ${game.phase === "PLANNING" && !a.dead && !a.downed ? "" : "disabled"}`)}</div><small>${escape(mode === "ABILITY" ? find("abilities", skillId).description : mode === "USE" ? "Choose a target for " + find("items", skillId).name + "." : mode === "INSPECT" ? "Inspect tiles, actors, and devices. No AP cost." : mode === "ATTACK" ? "Select an enemy in range and line of sight." : "Click a tile or use arrow keys to move.")}</small>`;
  const nearby = game.objects.filter((o) => !o.done && distance(a, o) <= 1);
  document.querySelector("#context")!.innerHTML = `<h3>Nearby actions</h3>${
    actorId === hostId
      ? sessions
          .filter(
            (s) => s.offlineSince && Date.now() - s.offlineSince >= 300000,
          )
          .map((s) => button("Park offline crawler", "park:" + s.actorId))
          .join("")
      : ""
  }${(game.tradeRequests ?? [])
    .filter((r) => r.to === actorId && !r.resolved)
    .map(
      (r) =>
        `<p>${escape(game!.actors[r.from].name)} offers ${escape(find("items", r.item).name)}</p>${button("Accept trade", "trade:" + r.id + ":accept")}${button("Decline", "trade:" + r.id + ":decline")}`,
    )
    .join(
      "",
    )}${nearby.map((o) => button(`${escape(o.kind === "cache" ? "Loot" : o.kind === "safe" ? "Enter" : "Use")} · ${escape(o.name)}`, "object:" + o.id)).join("") || '<p class="muted">Approach a marked object to interact.</p>'}${Object.values(
    game.actors,
  )
    .filter((v) => v.downed && !v.dead && distance(a, v) <= 1)
    .map((v) => button("Revive " + escape(v.name), "revive:" + v.id))
    .join(
      "",
    )}${game.phase === "SAFE_ROOM" ? button("Saferoom services", "safe", 'class="primary"') : ""}${actorId === hostId && game.phase === "PLANNING" ? button("Force ready after 45s idle", "force") : ""}<p class="muted">${game.bossDefeated ? "Exit unlocked when floor objectives are complete." : "Boss attacks mark tiles one round ahead. Move out of ! tiles."}</p>`;
  if (a.dead || a.downed) {
    document.querySelector("#actions")!.innerHTML =
      `<h2>${a.dead ? "Your crawler has died. Spectating the crew." : "Downed · " + a.downed + " rounds to receive help."}</h2><p class="muted">${a.dead ? "Death is permanent for this run. You can inspect, ping and watch allies." : "An adjacent ally needs 2 AP and a medkit to revive you."}</p><div class="row">${button("Inventory", "inventory")}${button("Character", "character")}${Object.values(
        game.actors,
      )
        .filter((v) => v.kind === "crawler" && !v.dead && v.id !== a.id)
        .map((v) => button("Watch " + escape(v.name), "spectate:" + v.id))
        .join("")}</div>`;
    document.querySelector("#context")!.innerHTML =
      '<p class="muted">Inspect a visible tile to ping your crew.</p>';
  }
  inspector();
  const log = document.querySelector("#log")!;
  log.innerHTML = game.events
    .slice(-40)
    .reverse()
    .map((e) => `<p><small>${e.round}</small> ${escape(eventText(e))}</p>`)
    .join("");
  if (scene) {
    const effects =
      mode === "ABILITY" || mode === "USE"
        ? compileEffects(
            find(mode === "ABILITY" ? "abilities" : "items", skillId),
          )
        : [];
    scene.previewRadius = Math.max(
      0,
      ...effects.filter((f) => f.target === "area").map((f) => f.radius ?? 1),
    );
  }
  scene?.setState(
    game,
    actorId,
    selected,
    queue.filter((c) => c.type === "MOVE").map((c) => ({ x: c.x!, y: c.y! })),
  );
  if (drawer) {
    showDrawer(drawer);
    document.querySelector("#drawer")!.scrollTop = drawerScroll;
  }
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  else if (focusAction)
    document
      .querySelector<HTMLElement>(
        '[data-act="' + CSS.escape(focusAction) + '"]',
      )
      ?.focus({ preventScroll: true });
}
function eventText(e: State["events"][number]): string {
  const source =
    game?.actors[e.actorId]?.name ??
    (catalog.hazards.some((h) => h.id === e.actorId)
      ? find("hazards", e.actorId).name
      : "the environment");
  const targets = e.targetIds
    .map((id) => game?.actors[id]?.name ?? "an unseen actor")
    .join(", ");
  if (e.type === "damage")
    return `${targets}: ${e.payload.amount} ${e.payload.element} damage from ${source}${e.payload.absorbed ? " (" + e.payload.absorbed + " shielded)" : ""}`;
  if (e.type === "cast")
    return `${source} uses ${find(e.payload.kind === "ABILITY" ? "abilities" : "items", e.payload.id).name}`;
  if (e.type === "miss") return `${source} misses ${targets}`;
  if (e.payload.message) return e.payload.message;
  if (e.payload.reason) return e.payload.reason;
  return `${e.type.replaceAll("_", " ")}${targets ? " · " + targets : ""}`;
}
function targetPreview(p: Point, target?: Actor): string {
  const actor = me();
  if (!game || !actor || !["ATTACK", "ABILITY", "USE"].includes(mode))
    return "";
  const weapon = find("items", actor.equipment.weapon ?? "");
  const entry =
    mode === "ATTACK"
      ? weapon
      : find(mode === "ABILITY" ? "abilities" : "items", skillId);
  const effects = mode === "ATTACK" ? [] : compileEffects(entry);
  const moving = effects.find(
    (f) => f.type === "dash" || f.type === "teleport",
  );
  const range =
    mode === "ATTACK"
      ? (weapon.range ?? 1) +
        ((weapon.range ?? 1) === 1 ? stat(actor, "reach") : 0)
      : moving
        ? moving.magnitude
        : Math.max(
            entry.range ?? 4,
            effects.some((f) => f.target === "ally" || f.target === "tile")
              ? 1
              : 0,
          );
  const d = distance(actor, p),
    clear = los(game, actor, p);
  const ap = actionCost(game, actor, {
    type: mode as "ATTACK" | "ABILITY" | "USE",
    id: skillId,
    ...p,
  });
  const hit =
    mode === "ATTACK" && target?.kind === "enemy" && d <= range && clear
      ? ` · ${accuracy(actor, target, weapon.accuracy ?? 0, tile(game, p)?.cover ?? 0, Math.max(0, d - Math.max(1, range - 2)))}% hit`
      : "";
  const radius = Math.max(
    0,
    ...effects.filter((f) => f.target === "area").map((f) => f.radius ?? 1),
  );
  const allyRisk =
    radius > 0 &&
    Object.values(game.actors).some(
      (a) => a.kind === "crawler" && !a.dead && distance(a, p) <= radius,
    );
  return `<p class="note">Current position: ${ap} AP · max range ${range} · distance ${d} · ${clear ? "clear LOS" : "blocked LOS"}${d > range ? " · out of range" : ""}${hit}${entry.focusCost ? " · " + entry.focusCost + " Focus" : ""}${radius ? " · area radius " + radius : ""}${allyRisk ? " · WARNING: crawler in area" : ""}. Resolution can change after queued movement.</p>`;
}
function inspector() {
  if (!game) return;
  const el = document.querySelector("#inspector");
  if (!el) return;
  if (!selected) {
    el.innerHTML =
      "<h3>Inspector</h3><small>Click a tile in Inspect mode to read its hazards and machinery.</small>";
    return;
  }
  const t = tile(game, selected);
  if (!t?.explored) {
    el.innerHTML = "<h3>Unexplored</h3>";
    return;
  }
  const a = Object.values(game.actors).find(
    (a) => !a.dead && same(a, selected!),
  );
  const o = game.objects.find((o) => same(o, selected!));
  const situation = scenarios.find((v) => t.tags.includes("scene:" + v.id));
  const enemy =
    a?.kind === "enemy"
      ? find(a.tags.includes("boss") ? "bosses" : "monsters", a.catalogId)
      : undefined;
  const role = enemy ? enemyIdentity(enemy) : undefined;
  el.innerHTML = `${role ? `<p class="pill">${escape(role.glyph)} · ${escape(role.name)}</p><small>${escape(role.plan)}${enemy?.weakness ? " Weakness: " + escape(enemy.weakness) + "." : ""}</small>` : ""}${situation ? `<h3>${escape(situation.name)}</h3><p class="statusline">${escape(situation.situation)}</p><small>${escape(situation.possibilities)}</small>` : ""}${targetPreview(selected, a)}<h3>Inspector · ${selected.x}, ${selected.y}</h3><b>${escape(a?.name ?? o?.name ?? t.kind)}</b><p class="statusline">${a ? `HP ${a.hp}/${a.maxHP} · ${escape(a.tags.join(", "))}<br>${escape(a.kind === "enemy" ? (find(a.tags.includes("boss") ? "bosses" : "monsters", a.catalogId).telegraph ?? "Watch marked tiles.") : "Ally")}` : o ? `${escape(o.kind)} · ${o.done ? "complete" : "available"} · ${escape(o.operation ?? "")}` : `${escape(t.tags.join(", "))} · Cover ${t.cover}`}</p>${Object.entries(
    t.hazards,
  )
    .map(
      ([el, h]) =>
        `<p class="danger">${escape(el.toUpperCase())} · intensity ${h.intensity} · ${h.persistent ? "until disabled" : h.duration + " rounds"} · ${h.damage} damage/tick<br><small>${escape(find("hazards", h.source).telegraph ?? "Affects actors standing on this tile.")} · ${escape(find("hazards", h.source).propagation ?? "material reactions")}</small></p>`,
    )
    .join(
      "",
    )}${t.kind === "door" ? button(t.open ? "Close door" : "Open door", "door:" + selected!.x + ":" + selected!.y) : ""}${button("Ping tile", "ping")}${a?.kind === "enemy" ? button("Attack target", "target-attack") : ""}${o && !o.done ? button("Approach / interact", "approach:" + o.id) : ""}`;
}
function enqueueAction(c: Action) {
  if (!game || !me() || me()!.dead || me()!.downed) return;
  if (!connected) {
    toast("Waiting for the authority server. Reconnect to act.");
    return;
  }
  if (game.phase === "PLANNING") {
    if (queue.length >= 4) {
      toast("At most four actions; total AP must fit within 3.");
      return;
    }
    const budget = me()!.statuses.stunned ? 2 : 3;
    const cost =
      queue.reduce((n, a) => n + actionCost(game!, me()!, a), 0) +
      actionCost(game!, me()!, c);
    if (cost > budget) {
      toast(`This plan needs ${cost} AP; ${budget} available.`);
      return;
    }
    queue.push(c);
    render();
  } else {
    if (inFlight) {
      if (bufferedActions.length < 6) bufferedActions.push(c);
      return;
    }
    inFlight = {
      action: c,
      nonce: nextNonce(),
      sentAt: Date.now(),
      round: game.round,
      runId: game.runId,
    };
    root.dataset.pending = String(inFlight.nonce);
    send({ type: "ACTION", action: c, nonce: inFlight.nonce });
  }
  if (settings.sound) {
    try {
      const ctx = new AudioContext(),
        osc = ctx.createOscillator(),
        gain = ctx.createGain();
      gain.gain.value = 0.015;
      osc.frequency.value = 240;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      osc.onended = () => ctx.close();
    } catch {}
  }
}
function pick(p: Point) {
  if (!game || !me()) return;
  selected = p;
  const a = me()!,
    t = tile(game, p);
  if (!t?.explored) {
    inspector();
    return;
  }
  if (mode === "INSPECT") {
    render();
    return;
  }
  const target = Object.values(game.actors).find((v) => !v.dead && same(v, p));
  if (mode === "ATTACK") {
    if (target) enqueueAction({ type: "ATTACK", target: target.id });
    else if (t.kind === "wall" || t.kind === "door")
      enqueueAction({ type: "ATTACK", ...p });
    else toast("Select a visible enemy or a destructible wall");
  } else if (mode === "ABILITY" || mode === "USE") {
    const e = find(mode === "ABILITY" ? "abilities" : "items", skillId);
    const area = e.effects?.some(
      (f: any) => f.target === "area" || f.type === "spawn_hazard",
    );
    if (
      area &&
      Object.values(game.actors).some(
        (v) => v.kind === "crawler" && distance(v, p) <= 1,
      )
    ) {
      showConfirm(
        "This area may hit a crawler. Environmental and explosive damage affects allies.",
        () =>
          enqueueAction({
            type: mode as "ABILITY" | "USE",
            id: skillId,
            target: target?.id,
            x: p.x,
            y: p.y,
          }),
      );
    } else
      enqueueAction({
        type: mode as "ABILITY" | "USE",
        id: skillId,
        target: target?.id,
        x: p.x,
        y: p.y,
      });
  } else {
    const last = queue.filter((c) => c.type === "MOVE").at(-1);
    const from = last ? { x: last.x!, y: last.y! } : a;
    const steps = path(game, from, p);
    if (!steps.length) return;
    if (game.phase === "PLANNING") {
      for (const n of steps) {
        const c: Action = { type: "MOVE", ...n };
        if (
          queue.length >= 4 ||
          queue.reduce((sum, c) => sum + actionCost(game!, a, c), 0) +
            actionCost(game, a, c) >
            (a.statuses.stunned ? 2 : 3)
        )
          break;
        queue.push(c);
      }
      render();
    } else enqueueAction({ type: "MOVE", ...steps[0] });
  }
}
function showConfirm(message: string, yes: () => void) {
  const d = document.createElement("dialog");
  const p = document.createElement("p");
  p.className = "intro";
  p.textContent = message;
  d.append(p);
  for (const label of ["Confirm", "Cancel"]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => {
      d.close();
      d.remove();
      if (label === "Confirm") yes();
    };
    d.append(b);
  }
  document.body.append(d);
  d.showModal();
}
function showDrawer(kind: string) {
  drawer = kind;
  const el = document.querySelector("#drawer");
  if (!el) return;
  el.classList.add("open");
  let html = "";
  const a = me();
  if (kind === "credits") {
    html =
      '<p class="intro">The Concourse · The Crawl. Original playable characters, dialogue, content and procedural pixel geometry. Phaser, Colyseus and other open-source dependencies retain their own licenses. An unofficial private fan-setting interpretation inspired by Dungeon Crawler Carl; not affiliated with or licensed by the author or publisher. No book text, novel cast, logos or licensed sprites are included.</p>';
  } else if (kind === "settings") {
    html = `<div class="stack"><label>Text size<select id="font"><option value="14">Standard</option><option value="16" ${settings.font === 16 ? "selected" : ""}>Large</option><option value="18" ${settings.font === 18 ? "selected" : ""}>Extra large</option></select></label><label><input id="sound" type="checkbox" ${settings.sound ? "checked" : ""}>Synthesized action sounds</label><label><input id="motion" type="checkbox" ${settings.reducedMotion ? "checked" : ""}>Reduced motion · stationary feedback, no travel</label><label><input id="announcer" type="checkbox" ${settings.announcer ? "checked" : ""}>Producer commentary</label><p class="muted">No flashing effects or time-limited text. Keyboard and pointer use the same inspector. All hazards have letter or shape labels.</p></div>`;
  } else if (a && game) {
    if (kind === "inventory") {
      const total = a.inventory.reduce(
        (n, s) => n + find("items", s.id).weight * s.count,
        0,
      );
      html = `<p class="intro">${a.inventory.length}/${10 + stat(a, "carrySlots")} slots · ${total}/${10 + 3 * stat(a, "Might") + stat(a, "capacity")} weight · Equipment: ${Object.values(
        a.equipment,
      )
        .map((id) => escape(find("items", id).name))
        .join(", ")}</p><div class="grid">${a.inventory
        .map((s) => {
          const e = find("items", s.id),
            equip = ["weapon", "armor", "trinket", "tool"].includes(e.kind);
          return `<article class="item"><h2>${escape(e.name)} ×${s.count}</h2><p>${escape(e.description)}</p>${itemOpportunity(e) ? `<p class="opportunity">↳ ${escape(itemOpportunity(e))}</p>` : ""}<small>${escape(e.trait)} · ${e.weight} weight · ${escape(itemMechanics(e))}</small><div class="row">${equip ? button("Equip", "equip:" + e.id) : ""}${e.kind === "consumable" || (e.kind === "tool" && e.effects.some((f: any) => f.type !== "modify_stat")) || e.trait === "quest" ? button("Use / target", "use:" + e.id) : e.kind === "material" ? "<small>Recipe material</small>" : ""}${button("Drop at cache", "drop:" + e.id)}</div>${Object.values(
            game!.actors,
          )
            .filter(
              (v) =>
                v.kind === "crawler" &&
                v.id !== a.id &&
                !v.dead &&
                distance(v, a) <= 1,
            )
            .map((v) =>
              button("Give to " + escape(v.name), "give:" + e.id + ":" + v.id),
            )
            .join("")}</article>`;
        })
        .join("")}</div>`;
    } else if (kind === "character") {
      html = `<p class="intro">${escape(a.name)} · ${escape(find("backgrounds", a.catalogId).name)} · Level ${a.level}<br>${Object.entries(
        a.stats,
      )
        .map(([k, v]) => escape(k) + ": " + v)
        .join(
          " · ",
        )}<br>${escape(modifierText(Object.fromEntries(["armor", "fireResist", "shockResist", "poisonResist", "coldResist", "speed", "dodge", "sight", "capacity"].map((k) => [k, stat(a, k)]).filter(([k, v]) => v !== 0)) as Record<string, number>))}<br>Profession ${escape(a.profession ?? "unselected")} · Adaptation ${escape(a.adaptation ?? "unselected")} · Wounds ${a.wounds}</p>${a.offers.length ? `<h2>Choose a talent</h2><div class="row">${a.offers.map((id) => button(id + " +1", "talent:" + id)).join("")}</div>` : ""}<h2>Current statuses</h2>${
        Object.entries(a.statuses)
          .map(
            ([id, v]) =>
              `<p>${escape(id)} · ${v.duration} rounds · potency ${v.potency} · ${escape(({ burning: "Fire damage each round", poisoned: "Poison damage each round", bleeding: "Physical damage each round", corroded: "Armor reduced by 2", chilled: "Movement costs 1 extra AP", stunned: "Next tactical budget reduced to 2 AP", confused: "Accuracy reduced by 15", exposed: "Incoming accuracy increased by 15", aimed: "Accuracy increased by 15" } as Record<string, string>)[id] ?? "Temporary modifier")}</p>`,
          )
          .join("") || "<p class=muted>No active statuses.</p>"
      }<section class="identity-moment"><div class="eyebrow">Floor 3 / crawler development</div><h2>Rewrite your contract.</h2><p class="intro">One profession. One adaptation. Both stay with you for this run. ${game.floor >= 3 && game.phase === "SAFE_ROOM" ? "The station is ready. Choose each path below." : "The station opens in a saferoom on floor 3 or later."}</p>${[
        "professions",
        "adaptations",
      ]
        .map(
          (k) =>
            `<h2>${k === "professions" ? "01 · Your profession" : "02 · Your adaptation"} ${a[k === "professions" ? "profession" : "adaptation"] ? "✓ chosen" : ""}</h2><div class="grid">${catalog[
              k
            ]
              .map(
                (e) =>
                  `<article class="item ${a[k === "professions" ? "profession" : "adaptation"] === e.id ? "chosen" : ""}"><h2>${escape(e.name)}</h2><p>${escape(e.description)}</p><p>${escape(e.passive ? modifierText(professionModifiers[e.passive] ?? {}) : modifierText({ ...e.bonus, ...e.drawback }))}</p>${
                    k === "professions"
                      ? `<small>Unlocks ${catalog.abilities
                          .filter((v) => v.profession === e.id)
                          .map((v) => escape(v.name))
                          .join(" · ")}</small>`
                      : ""
                  }${button("Choose " + escape(e.name), "choose:" + k + ":" + e.id, game!.floor >= 3 && game!.phase === "SAFE_ROOM" && !(k === "professions" ? a.profession : a.adaptation) ? "" : "disabled")}</article>`,
              )
              .join("")}</div>`,
        )
        .join("")}</section>`;
    } else if (kind === "safe") {
      html = `<div class="row">${button("Rest · once this floor", "rest", a.restFloor === game.floor ? "disabled" : "")}${button("Treat wound · " + 5 * game.floor + " credits", "medic", a.wounds ? "" : "disabled")}${button("Leave saferoom", "leave-safe")}${button(game.floor === 6 ? "End the broadcast" : game.descendVotes?.includes(actorId) ? "Waiting for crew" : "Vote to descend", "descend", game.bossDefeated && game.objective.length >= catalog.floors[game.floor - 1].requiredObjective.goal ? 'class="primary"' : "disabled")}</div><p class="intro">Credits ${game.credits}. Rest heals 35% HP and restores Focus. Complete floor objectives and resolve the boss to descend. Crafting consumes the listed materials.</p><h2>Rewards & overflow</h2><div class="row">${game.rewards
        .filter((r) => !r.claimed)
        .map(
          (r) =>
            button(
              "Claim " + escape(find("items", r.item).name),
              "reward:" + r.id,
              r.turn === a.id ? "" : "disabled",
            ) +
            (r.turn === a.id
              ? button("Pass reward", "passreward:" + r.id)
              : ""),
        )
        .join(
          "",
        )}${game.overflow.map((s, i) => button("Take " + escape(find("items", s.id).name), "overflow:" + i)).join("")}</div><h2>Shop</h2><div class="grid">${game.shop
        .filter((s) => s.count > 0)
        .map((s) => {
          const e = find("items", s.id);
          return `<article class="item"><b>${escape(e.name)}</b><p>${escape(e.description)}</p>${button("Buy · " + Math.ceil(e.basePrice * (1 + 0.1 * (game!.floor - 1)) * (1 - Math.min(25, stat(a, "discount")) / 100 + stat(a, "shopTax") / 100)) + " credits", "buy:" + s.id)}</article>`;
        })
        .join(
          "",
        )}</div><h2>Sell</h2><div class="row">${a.inventory.map((s) => button("Sell " + escape(find("items", s.id).name), "sell:" + s.id)).join("")}</div><h2>Recipes</h2><div class="grid">${catalog.recipes.map((e) => `<article class="item"><b>${escape(e.name)}</b><p>${escape(e.description)}<br>${escape(JSON.stringify(e.ingredients))}</p>${button("Craft", "craft:" + e.id)}</article>`).join("")}</div><h2>Producer offers</h2><div class="grid">${
        game.offers
          .filter((id) => !game!.resolvedOffers.includes(id))
          .map((id) => {
            const e = find("events", id);
            return `<article class="item"><h2>${escape(e.name)}</h2><p>${escape(e.description)}</p>${e.choices.map((c: any) => button(escape(c.label) + " · risk: " + escape(c.risk.replaceAll("_", " ")), "offer:" + id + ":" + c.id)).join("")}</article>`;
          })
          .join("") ||
        '<p class="muted">Earn audience interest through unusual outcomes to receive optional bargains.</p>'
      }</div>`;
    }
  }
  el.innerHTML = `<div class="drawer-head"><h2>${escape(kind === "safe" ? "Saferoom services" : kind[0].toUpperCase() + kind.slice(1))}</h2>${button("Close [Esc]", "close")}</div>${html}`;
}
function closeDrawer() {
  drawer = "";
  document.querySelector("#drawer")?.classList.remove("open");
}
async function act(value: string) {
  const [key, id, extra] = value.split(":");
  switch (key) {
    case "create":
    case "join":
    case "resume":
      await connect(key);
      break;
    case "export": {
      if (!session) return;
      const response = await fetch("/api/runs/" + session.runId + "/export", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.sessionToken },
      });
      if (!response.ok) {
        toast("Only the current host can export this run.");
        break;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "concourse-" + session.runId + ".json";
      link.click();
      URL.revokeObjectURL(url);
      break;
    }
    case "reconnect":
      await connect("resume");
      break;
    case "start":
      send({ type: "START" });
      break;
    case "invite":
      try {
        await navigator.clipboard.writeText(location.href);
        toast("Private invitation copied");
      } catch {
        toast("Copy the invitation link from the address bar");
      }
      break;
    case "mode":
      mode = id;
      render();
      break;
    case "inspect":
      mode = "INSPECT";
      render();
      break;
    case "target-attack":
      mode = "ATTACK";
      if (selected) pick(selected);
      break;
    case "guard":
      enqueueAction({ type: "GUARD" });
      break;
    case "dodge":
      enqueueAction({ type: "DODGE" });
      break;
    case "overwatch":
      enqueueAction({ type: "OVERWATCH" });
      break;
    case "undo":
      queue.pop();
      render();
      break;
    case "ability":
      skillId = (document.querySelector("#skill") as HTMLSelectElement).value;
      if (!skillId) break;
      mode = "ABILITY";
      if (
        find("abilities", skillId).effects.every(
          (f: any) => f.target === "self" || f.target === "party",
        ) &&
        !find("abilities", skillId).effects.some((f: any) =>
          ["dash", "teleport"].includes(f.type),
        )
      )
        enqueueAction({ type: "ABILITY", id: skillId });
      render();
      break;
    case "ready":
      if (game?.phase === "PLANNING")
        send({
          type: "PLAN",
          runId: game.runId,
          round: game.round,
          nonce: nextNonce(),
          actions: queue,
          ready: !sessions.find((s) => s.actorId === actorId)?.ready,
        });
      break;
    case "force":
      send({ type: "FORCE_READY" });
      break;
    case "door":
      enqueueAction({ type: "INTERACT", x: Number(id), y: Number(extra) });
      break;
    case "ping":
      if (selected) send({ type: "PING_TILE", ...selected });
      break;
    case "spectate":
      if (scene) {
        scene.spectateId = id;
        scene.paint();
      }
      break;
    case "object":
      enqueueAction({ type: "INTERACT", id });
      break;
    case "recover":
      enqueueAction({ type: "INTERACT", target: id });
      break;
    case "revive":
      enqueueAction({ type: "REVIVE", target: id });
      break;
    case "approach": {
      const o = game?.objects.find((v) => v.id === id);
      if (o && me()) {
        if (distance(o, me()!) <= 1) enqueueAction({ type: "INTERACT", id });
        else {
          mode = "MOVE";
          pick(o);
        }
      }
      break;
    }
    case "trade": {
      const parts = value.split(":");
      enqueueAction({
        type: "TRADE",
        id: parts.slice(1, -1).join(":"),
        choice: parts.at(-1),
      });
      break;
    }
    case "equip":
      enqueueAction({ type: "EQUIP", id });
      break;
    case "drop":
      enqueueAction({ type: "DROP", id });
      break;
    case "give":
      enqueueAction({ type: "GIVE", id, target: extra });
      break;
    case "use":
      skillId = id;
      mode = "USE";
      closeDrawer();
      if (
        find("items", id).trait !== "stun" &&
        find("items", id).trait !== "quest" &&
        find("items", id).effects.every((f: any) => f.target === "self")
      )
        enqueueAction({ type: "USE", id });
      else toast("Choose a target on the map");
      render();
      break;
    case "talent":
      enqueueAction({ type: "CHOOSE", id });
      break;
    case "choose":
      showConfirm("Choose " + find(id, extra).name + " for this run?", () =>
        enqueueAction({
          type: "CHOOSE",
          id: extra,
          choice: id === "professions" ? "profession" : "adaptation",
        }),
      );
      break;
    case "rest":
      enqueueAction({ type: "REST" });
      break;
    case "medic":
      enqueueAction({ type: "MEDIC" });
      break;
    case "buy":
      enqueueAction({ type: "BUY", id });
      break;
    case "sell":
      enqueueAction({ type: "SELL", id });
      break;
    case "craft":
      enqueueAction({ type: "CRAFT", id });
      break;
    case "park":
      send({ type: "PARK", target: id });
      break;
    case "passreward":
      enqueueAction({ type: "REWARD", id: value.slice(11), choice: "pass" });
      break;
    case "reward":
      enqueueAction({ type: "REWARD", id: value.slice(7) });
      break;
    case "overflow":
      enqueueAction({ type: "REWARD", id: "overflow:" + id });
      break;
    case "offer":
      enqueueAction({ type: "OFFER", id, choice: extra });
      break;
    case "descend":
      closeDrawer();
      enqueueAction({ type: "DESCEND" });
      break;
    case "leave-safe":
      closeDrawer();
      {
        const a = me();
        if (a) {
          const t = game!.tiles;
          const p = [
            { x: a.x + 1, y: a.y },
            { x: a.x - 1, y: a.y },
            { x: a.x, y: a.y + 1 },
            { x: a.x, y: a.y - 1 },
          ].find(
            (p) =>
              tile(game!, p)?.kind === "floor" &&
              !Object.values(game!.actors).some((v) => !v.dead && same(v, p)),
          );
          if (p) enqueueAction({ type: "MOVE", ...p });
        }
      }
      break;
    case "inventory":
    case "character":
    case "settings":
    case "credits":
    case "safe":
      showDrawer(key);
      break;
    case "close":
      closeDrawer();
      break;
    case "zoom-in":
    case "zoom-out":
      if (scene) {
        scene.zoom = Math.max(
          1,
          Math.min(4, scene.zoom + (key === "zoom-in" ? 0.25 : -0.25)),
        );
        scene.paint();
      }
      break;
    case "new":
      intentionalLeave = true;
      await room?.leave();
      intentionalLeave = false;
      room = undefined;
      game = undefined;
      queue = [];
      drawer = "";
      history.replaceState(null, "", location.pathname);
      title();
      break;
    case "recap":
      await navigator.clipboard.writeText(
        `The Concourse: ${game?.result}, seed ${game?.seed}, ${game?.turns} turns; routes ${game?.floorRoutes.join(", ")}; achievements ${game?.achievements.join(", ")}`,
      );
      toast("Recap copied");
      break;
  }
}
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
  if (b) void act(b.dataset.act!);
});
document.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === "backup-file") {
    const file = t.files?.[0];
    const previous = saved();
    if (file && previous) {
      if (file.size > 8 * 1024 * 1024) {
        toast("Backup exceeds 8 MiB");
        return;
      }
      showConfirm(
        "Restore this backup as a new private run? The original checkpoint is preserved.",
        () => {
          void (async () => {
            try {
              const checkpoint = JSON.parse(await file.text());
              const response = await fetch(
                "/api/runs/" + previous.runId + "/import",
                {
                  method: "POST",
                  headers: {
                    Authorization: "Bearer " + previous.sessionToken,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ checkpoint }),
                },
              );
              const result = await response.json();
              if (!response.ok) throw Error(result.error);
              localStorage.setItem(
                "concourse.session",
                JSON.stringify({ ...previous, ...result }),
              );
              await connect("resume");
            } catch (error) {
              toast(String(error));
            }
          })();
        },
      );
    }
  }
  if (t.id === "skill") skillId = t.value;
  if (t.id === "background") backgroundHelp();
  if (["font", "sound", "motion", "announcer"].includes(t.id)) {
    settings = {
      ...settings,
      font: t.id === "font" ? Number(t.value) : settings.font,
      sound: t.id === "sound" ? t.checked : settings.sound,
      announcer: t.id === "announcer" ? t.checked : settings.announcer,
      reducedMotion: t.id === "motion" ? t.checked : settings.reducedMotion,
    };
    localStorage.setItem("concourse.settings", JSON.stringify(settings));
    document.documentElement.style.fontSize = settings.font + "px";
    if (scene) scene.reducedMotion = settings.reducedMotion;
    if (game && game.phase !== "LOBBY") render();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  )
    return;
  if (e.key === "Escape") {
    queue = [];
    mode = "MOVE";
    closeDrawer();
    render();
    return;
  }
  if (drawer) return;
  const key = e.key.toLowerCase();
  const mappings: Record<string, string> = {
    r: "ready",
    i: "inventory",
    c: "character",
    f: "inspect",
    "1": "mode:MOVE",
    "2": "mode:ATTACK",
    "3": "guard",
  };
  if (key === " " && selected) {
    e.preventDefault();
    pick(selected);
    return;
  }
  if (mappings[key]) {
    e.preventDefault();
    void act(mappings[key]);
    return;
  }
  const moves: Record<string, Point> = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };
  if (moves[key] && me()) {
    e.preventDefault();
    const base =
      [...queue, ...(inFlight ? [inFlight.action] : []), ...bufferedActions]
        .filter((c) => c.type === "MOVE")
        .at(-1) ?? me()!;
    const p = { x: base.x! + moves[key].x, y: base.y! + moves[key].y };
    if (mode !== "MOVE") {
      selected = {
        x: (selected ?? me()!).x + moves[key].x,
        y: (selected ?? me()!).y + moves[key].y,
      };
      render();
    } else enqueueAction({ type: "MOVE", ...p });
  }
});
try {
  const response = await fetch("/api/catalog");
  catalog = await response.json();
  const profile = await fetch("/api/profile");
  profileUnlocks = (await profile.json()).unlocks ?? [];
  title();
} catch {
  root.innerHTML =
    '<main class="title"><h1>Host unavailable</h1><p>Start the local host and reload this page.</p></main>';
}
