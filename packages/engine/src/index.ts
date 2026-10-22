import { actionReason } from "./action-reasons";
import { compareIds } from "./random";
import type { Action, Actor, Plan, Point, State } from "./types";
import {
  catalog,
  entry,
  contentHash,
  compileEffects,
} from "../../content/src/index";
import { clone, hash, random, seedNumber } from "./random";
import { generateFloor, makeActor } from "./generation";
import { distance, los, neighbors, path, same, tile, walkable } from "./grid";
import { emit, reject, award } from "./events";
import { attack, hurt, push, status, applyTileHazards } from "./combat";
import { effect, revive } from "./effects";
import { environment, enqueue } from "./environment";
import { applyOffer, enterRiskRoom } from "./offers";
import { activateObjective } from "./objectives";
import {
  stat,
  modifiers,
  give,
  consume,
  living,
  canCarry,
  weight,
} from "./stats";
export * from "./types";
export * from "./random";
export * from "./grid";
export * from "./generation";
export * from "./stats";
export function newGame(seed: number, runId = "run"): State {
  return {
    schemaVersion: 1,
    contentHash,
    runId,
    seed,
    rng: Object.fromEntries(
      ["generation", "combat", "loot", "director", "cosmetic"].map((k) => [
        k,
        seedNumber(seed + ":" + k),
      ]),
    ),
    floor: 1,
    round: 0,
    revision: 0,
    phase: "LOBBY",
    width: 0,
    height: 0,
    tiles: [],
    objects: [],
    actors: {},
    objective: [],
    alternate: [],
    bossDefeated: false,
    xp: 0,
    credits: 12,
    audience: 0,
    achievements: [],
    achievementKeys: [],
    counters: {},
    events: [],
    nextEventId: 1,
    deferredEvents: [],
    shop: [],
    overflow: [],
    rewards: [],
    offers: [],
    resolvedOffers: [],
    risks: [],
    unlocks: [],
    transactions: [],
    floorRoutes: [],
    visited: [],
    safeUsed: false,
    turns: 0,
  };
}
export function addCrawler(
  s: State,
  id: string,
  name: string,
  background: string,
): Actor {
  if (
    s.phase !== "LOBBY" ||
    Object.values(s.actors).filter((a) => a.kind === "crawler").length >= 4
  )
    throw Error("Lobby full or run already started");
  const bg = entry("backgrounds", background);
  const a = makeActor(id, name, "crawler", background, 7, 7);
  for (const [k, v] of Object.entries(bg.attributeMods))
    a.stats[k] = Math.max(1, Math.min(5, a.stats[k] + Number(v)));
  a.hp = a.maxHP = 20 + 4 * a.stats.Might;
  a.focus = a.maxFocus = 5 + 2 * a.stats.Wit;
  s.actors[id] = a;
  give(s, a, bg.starterItem);
  const starter = entry("items", bg.starterItem);
  if (
    starter.kind === "weapon" ||
    starter.kind === "armor" ||
    starter.kind === "trinket"
  )
    a.equipment[starter.slot] = starter.id;
  if (!a.equipment.weapon) {
    give(s, a, "mop_pole");
    a.equipment.weapon = "mop_pole";
  }
  give(s, a, "first_aid_pack");
  give(s, a, "water_bladder");
  return a;
}
export function begin(s: State) {
  if (s.phase !== "LOBBY" || !living(s).length) throw Error("Cannot start");
  generateFloor(s);
  s.phase = "EXPLORATION";
  updateVisibility(s);
  emit(s, "floor_enter", "", [], { floor: s.floor });
  s.revision++;
}
export function updateVisibility(s: State) {
  for (const a of living(s)) {
    const radius =
      (s.risks.includes("darkness") ? 4 + stat(a, "light") : 8) +
      stat(a, "sight");
    for (
      let y = Math.max(0, a.y - radius);
      y <= Math.min(s.height - 1, a.y + radius);
      y++
    )
      for (
        let x = Math.max(0, a.x - radius);
        x <= Math.min(s.width - 1, a.x + radius);
        x++
      )
        if (distance(a, { x, y }) <= radius && los(s, a, { x, y }))
          tile(s, { x, y })!.explored = true;
    const room = tile(s, a)?.room ?? -1;
    if (room >= 0 && !s.visited.includes(room)) {
      s.visited.push(room);
      enterRiskRoom(s, a);
      emit(s, "room_enter", a.id, [], { room }, a);
    }
  }
}
export function visible(s: State, a: Actor): boolean {
  return (
    a.kind === "crawler" ||
    living(s).some(
      (c) =>
        distance(c, a) <=
          (s.risks.includes("darkness") ? 4 + stat(c, "light") : 8) +
            stat(c, "sight") && los(s, c, a),
    )
  );
}
export function projection(s: State): State {
  const out = clone(s);
  for (const [id, a] of Object.entries(out.actors))
    if (!visible(s, a)) delete out.actors[id];
  return out;
}
function phaseCheck(s: State) {
  if (s.phase === "RESULT" || s.phase === "LOBBY" || s.phase === "SAFE_ROOM")
    return;
  const alerted =
    Object.values(s.actors).some(
      (a) =>
        a.kind === "enemy" &&
        !a.dead &&
        (visible(s, a) ||
          (a.alert && living(s).some((c) => distance(a, c) <= 12))),
    ) ||
    living(s).some(
      (a) =>
        Object.values(tile(s, a)?.hazards ?? {}).some((h) => h.damage > 0) ||
        ["burning", "poisoned", "bleeding"].some((k) => !!a.statuses[k]),
    );
  s.phase =
    alerted ||
    Object.values(s.actors).some(
      (a) => a.kind === "crawler" && a.downed && !a.dead,
    )
      ? "PLANNING"
      : "EXPLORATION";
}
export function actionCost(s: State, a: Actor, c: Action): number {
  if (
    [
      "EQUIP",
      "DROP",
      "GIVE",
      "TRADE",
      "CHOOSE",
      "OFFER",
      "REWARD",
      "DESCEND",
      "REST",
      "BUY",
      "SELL",
      "MEDIC",
    ].includes(c.type)
  )
    return s.phase === "SAFE_ROOM" ? 0 : c.type === "EQUIP" ? 1 : 0;
  if (c.type === "ABILITY") return catalog.abilities.find(e=>e.id===c.id)?.apCost??4;
  if (c.type === "ATTACK")
    return a.equipment.weapon &&
      entry("items", a.equipment.weapon).range === 1 &&
      entry("items", a.equipment.weapon).power <= 4
      ? 1
      : 2;
  if (c.type === "REVIVE" || c.type === "CRAFT") return 2;
  if (c.type === "USE") return catalog.items.find(e=>e.id===c.id)?.useCost??1;
  if (c.type === "MOVE") {
    const t = tile(s, { x: c.x!, y: c.y! });
    return (
      1 +
      (t?.kind === "rubble" ? 1 : 0) +
      (t?.tags.includes("wet") ? Math.max(0, 1 + stat(a, "waterCost")) : 0) +
      (a.statuses.chilled ? 1 : 0)
    );
  }
  if (c.type === "INTERACT")
    return Math.max(0, 1 - stat(a, "interactionAPDiscount"));
  return 1;
}
function equipmentAttack(s: State, a: Actor, t: Actor): boolean {
  const w = a.equipment.weapon ? entry("items", a.equipment.weapon) : undefined;
  const m = modifiers(a);
  if (
    !attack(
      s,
      a,
      t,
      w?.power ?? 2,
      w?.effects?.[0]?.element ?? "physical",
      (w?.range ?? 1) + (w?.range === 1 ? (m.reach ?? 0) : 0),
      w?.accuracy ?? 0,
      m.pierce ?? 0,
    )
  )
    return false;
  const hit = s.events.at(-1)?.type === "hit";
  if (!hit) return true;
  for (const [tag, name] of [
    ["bleed", "bleeding"],
    ["pin", "chilled"],
    ["corrode", "corroded"],
    ["ignite", "burning"],
    ["freeze", "chilled"],
    ["stun", "stunned"],
  ] as const)
    if (m[tag]) status(t, name, 2, name === "burning" ? 3 : 2, a.id);
  if (m.push) push(s, a, t, 1);
  if (m.pull) push(s, a, t, 1, true);
  if (m.conductive && tile(s, t)?.tags.includes("wet"))
    enqueue(s, t, "shock", 2, a.id);
  if (m.cloud) enqueue(s, t, "poison", 1, a.id);
  if (m.loud)
    for (const e of Object.values(s.actors).filter(
      (e) => e.kind === "enemy" && distance(e, a) <= 12,
    ))
      e.alert = true;
  if (m.battery && a.charges > 0) {
    a.charges--;
    hurt(s, t, 2, "shock", a.id);
  }
  if (m.fragile && w) {
    const st = a.inventory.find((i) => i.id === w.id)!;
    if (
      (a.used["fragileAttacks"] = (a.used["fragileAttacks"] ?? 0) + 1) % 3 ===
      0
    )
      st.durability--;
    if (st.durability <= 0) {
      consume(a, w.id);
      emit(s, "glass_broken", a.id, [t.id]);
    }
  }
  if (m.ricochet || m.line) {
    const second = Object.values(s.actors)
      .filter(
        (v) =>
          v.kind === "enemy" &&
          !v.dead &&
          v.id !== t.id &&
          distance(v, t) <= 2 &&
          (!m.line ||
            (t.x === a.x &&
              v.x === a.x &&
              Math.sign(v.y - t.y) === Math.sign(t.y - a.y)) ||
            (t.y === a.y &&
              v.y === a.y &&
              Math.sign(v.x - t.x) === Math.sign(t.x - a.x))) &&
          los(s, t, v),
      )
      .sort((a, b) => compareIds(a.id, b.id))[0];
    if (second)
      attack(
        s,
        a,
        second,
        Math.floor((w?.power ?? 2) / 2),
        "physical",
        distance(a, second),
      );
  }
  if (t.dead && w && w.tier === 1)
    emit(s, "improvised_weapon_kill", a.id, [t.id]);
  return true;
}
export function perform(s: State, a: Actor, c: Action): boolean {
  if (a.dead || a.downed || s.phase === "RESULT") return false;
  const requiredCatalog=c.type==='ABILITY'?'abilities':c.type==='CRAFT'?'recipes':['USE','EQUIP','DROP','GIVE','BUY','SELL'].includes(c.type)?'items':c.type==='CHOOSE'&&c.choice==='profession'?'professions':c.type==='CHOOSE'&&c.choice==='adaptation'?'adaptations':undefined;
  if(requiredCatalog&&!catalog[requiredCatalog].some(e=>e.id===c.id))return false;
  const target = c.target ? s.actors[c.target] : undefined;
  const p: Point =
    c.x !== undefined && c.y !== undefined
      ? { x: c.x, y: c.y }
      : target
        ? { x: target.x, y: target.y }
        : { x: a.x, y: a.y };
  const cost = actionCost(s, a, c);
  if (cost > a.ap) return false;
  let ok = false;
  switch (c.type) {
    case "WAIT":
      ok = true;
      break;
    case "MOVE": {
      const t = tile(s, p);
      if (!t || distance(a, p) !== 1) break;
      if (t.kind === "door" && t.locked) {
        const key = a.inventory.find(
          (i) => entry("items", i.id).trait === "quest",
        );
        if (key) {
          consume(a, key.id);
          t.locked = false;
          t.open = true;
          emit(s, "locked_path_bypass", a.id, [], { key: key.id }, p);
          ok = true;
        }
        break;
      }
      if (t.kind === "door" && !t.open && !t.locked) {
        t.open = true;
        ok = true;
        break;
      }
      if (
        !walkable(s, p) ||
        Object.values(s.actors).some(
          (v) => !v.dead && v.id !== a.id && same(v, p),
        )
      )
        break;
      const old = { x: a.x, y: a.y };
      a.x = p.x;
      a.y = p.y;
      if (t.tags.includes("ice") && random(s, "combat", 2) === 0) {
        const slide = {
          x: a.x + Math.sign(a.x - old.x),
          y: a.y + Math.sign(a.y - old.y),
        };
        if (
          walkable(s, slide) &&
          !Object.values(s.actors).some((v) => !v.dead && same(v, slide))
        ) {
          a.x = slide.x;
          a.y = slide.y;
          emit(s, "slide", a.id, [], {}, slide);
        }
      }
      ok = true;
      emit(s, "move", a.id, [], {}, a);
      applyTileHazards(s, a);
      break;
    }
    case "ATTACK":
      if (
        !target &&
        distance(a, p) <= 1 &&
        ["wall", "door"].includes(tile(s, p)?.kind ?? "")
      ) {
        ok = effect(s, a, undefined, p, {
          type: "destroy_tile",
          magnitude: a.equipment.weapon
            ? entry("items", a.equipment.weapon).power
            : 2,
          target: "tile",
        });
      } else
        ok = !!target && visible(s, target) && equipmentAttack(s, a, target);
      break;
    case "GUARD":
      a.guard = 2 + stat(a, "guard");
      a.reaction = "GUARD";
      ok = true;
      break;
    case "DODGE":
      a.reaction = "DODGE";
      ok = true;
      break;
    case "OVERWATCH":
      a.reaction = "OVERWATCH";
      ok = true;
      break;
    case "REVIVE":
      ok = !!target && revive(s, a, target);
      break;
    case "ABILITY":
    case "USE": {
      const e = entry(c.type === "ABILITY" ? "abilities" : "items", c.id ?? "");
      if (
        c.type === "ABILITY" &&
        e.profession !== "general" &&
        e.profession !== a.profession
      )
        break;
      if (c.type === "USE" && !a.inventory.some((i) => i.id === e.id)) break;
      if (c.type === "USE" && e.kind === "material" && e.trait === "quest") {
        const required = [
          "badge_fragment",
          "transit_pass",
          "signal_coil",
          "transit_pass",
          "debt_ledger",
          "signal_coil",
        ][s.floor - 1];
        const object = s.objects.find(
          (o) => o.kind === "objective" && !o.done && same(o, p),
        );
        if (
          e.id === required &&
          object &&
          distance(a, p) <= 3 &&
          los(s, a, p)
        ) {
          if (activateObjective(s, a, object, "quest")) {
            consume(a, e.id);
            ok = true;
          }
        }
        break;
      }
      if (
        e.kind === "material" ||
        e.kind === "armor" ||
        e.kind === "trinket" ||
        e.kind === "weapon"
      )
        break;
      if (
        (a.cooldowns[e.id] ?? 0) > s.round ||
        (e.context === "safe_room" && s.phase !== "SAFE_ROOM") ||
        (e.usageLimit === "once_per_floor" && a.used[e.id] === s.floor) ||
        a.focus < (e.focusCost ?? 0)
      )
        break;
      const effects = compileEffects(e);
      const moving = effects.some(
        (f) => f.type === "dash" || f.type === "teleport",
      );
      const range = moving
        ? effects[0].magnitude
        : Math.max(
            e.range ?? 4,
            effects.some((f) => f.target === "ally" || f.target === "tile")
              ? 1
              : 0,
          );
      if (distance(a, p) > range || (range > 0 && !los(s, a, p))) break;
      if (
        effects.some((f) => f.target === "enemy") &&
        (!target || target.kind !== "enemy" || !visible(s, target))
      )
        break;
      if (
        effects.some((f) => f.target === "ally") &&
        (!target || target.kind !== "crawler")
      )
        break;
      const healing =
        effects.some((f) => f.type === "heal") && c.type === "ABILITY";
      if (
        healing &&
        s.phase !== "PLANNING" &&
        !a.inventory.some((i) => i.id === "first_aid_pack")
      )
        break;
      // Apply the complete action transactionally: precondition failures never leave partial effects.
      const draft = clone(s),
        caster = draft.actors[a.id];
      let good = true;
      for (const f of effects)
        if (
          !effect(
            draft,
            caster,
            target ? draft.actors[target.id] : undefined,
            p,
            f,
          )
        ) {
          good = false;
          break;
        }
      if (!good) break;
      caster.focus -= e.focusCost ?? 0;
      if (healing && s.phase !== "PLANNING") consume(caster, "first_aid_pack");
      if (
        c.type === "USE" &&
        e.consumedOnUse !== false &&
        e.kind === "consumable"
      )
        consume(caster, e.id);
      if (e.trait === "flammable") {
        const t = tile(draft, p)!;
        delete t.hazards.fire;
        t.tags.push("flammable");
        draft.deferredEvents = draft.deferredEvents.filter(
          (v) => !(same(v, p) && v.source === a.id),
        );
      }
      caster.cooldowns[e.id] = e.cooldown ? s.round + e.cooldown + 1 : s.round;
      caster.used[e.id] = s.floor;
      Object.assign(s, draft);
      a = s.actors[a.id];
      ok = true;
      emit(
        s,
        "cast",
        a.id,
        target ? [target.id] : [],
        { id: e.id, kind: c.type },
        p,
      );
      break;
    }
    case "EQUIP": {
      const st = a.inventory.find((i) => i.id === c.id);
      if (!st) break;
      const e = entry("items", st.id);
      if (!["weapon", "armor", "trinket", "tool"].includes(e.kind)) break;
      const slot =
        e.kind === "trinket"
          ? a.equipment.trinket
            ? "trinket2"
            : "trinket"
          : e.slot === "none"
            ? "tool"
            : e.slot;
      a.equipment[slot] = e.id;
      ok = true;
      break;
    }
    case "DROP": {
      if (!c.id || !a.inventory.some((i) => i.id === c.id)) break;
      const cache = s.objects.find(
        (o) => o.kind === "cache" && distance(o, a) <= 1,
      );
      if (!cache) break;
      consume(a, c.id);
      (cache.items ??= []).push({ id: c.id, count: 1, durability: 12 });
      cache.done = false;
      ok = true;
      break;
    }
    case "GIVE": {
      if (
        target &&
        c.id &&
        distance(a, target) <= 1 &&
        !canCarry(target, c.id)
      ) {
        emit(s, "failed_trade", a.id, [target.id], {
          reason: "recipient capacity",
        });
        break;
      }
      if (
        !target ||
        target.kind !== "crawler" ||
        target.dead ||
        distance(a, target) > 1 ||
        !c.id ||
        !canCarry(target, c.id) ||
        !a.inventory.some((i) => i.id === c.id)
      )
        break;
      if (
        (s.tradeRequests ?? []).some(
          (r) =>
            !r.resolved &&
            r.from === a.id &&
            r.to === target.id &&
            r.item === c.id,
        )
      )
        break;
      const request = {
        id: "trade:" + s.nextEventId,
        from: a.id,
        to: target.id,
        item: c.id,
        resolved: false,
      };
      (s.tradeRequests ??= []).push(request);
      emit(s, "trade_requested", a.id, [target.id], {
        id: request.id,
        item: c.id,
      });
      ok = true;
      break;
    }
    case "TRADE": {
      const request = s.tradeRequests?.find(
        (r) => r.id === c.id && r.to === a.id && !r.resolved,
      );
      if (!request) break;
      const from = s.actors[request.from];
      if (c.choice === "decline") {
        request.resolved = true;
        emit(s, "failed_trade", from.id, [a.id], { reason: "declined" });
        ok = true;
        break;
      }
      if (
        c.choice !== "accept" ||
        !from ||
        from.dead ||
        distance(a, from) > 1 ||
        !canCarry(a, request.item) ||
        !from.inventory.some((i) => i.id === request.item)
      ) {
        emit(s, "failed_trade", request.from, [a.id], {
          reason: "unavailable",
        });
        break;
      }
      consume(from, request.item);
      give(s, a, request.item);
      request.resolved = true;
      const trades = (s.counters["trades:" + from.id] =
        (s.counters["trades:" + from.id] ?? 0) + 1);
      if (trades === 2)
        emit(s, "trade_twice", from.id, [a.id], { item: request.item });
      emit(s, "trade_completed", from.id, [a.id], {
        id: request.id,
        item: request.item,
      });
      ok = true;
      break;
    }
    case "INTERACT": {
      if (
        target?.kind === "crawler" &&
        target.dead &&
        distance(a, target) <= 1
      ) {
        const item = target.inventory.find((i) => !c.id || i.id === c.id);
        if (item && canCarry(a, item.id)) {
          const id = item.id;
          consume(target, id);
          give(s, a, id);
          emit(s, "corpse_recovered", a.id, [target.id], { item: id });
          ok = true;
        }
        break;
      }
      const o = s.objects.find((o) => o.id === c.id);
      if (!o) {
        const door = tile(s, p);
        if (
          door?.kind === "door" &&
          !door.locked &&
          distance(a, p) <= 1 &&
          !Object.values(s.actors).some((v) => !v.dead && same(v, p))
        ) {
          door.open = !door.open;
          ok = true;
          emit(s, "door", a.id, [], { open: door.open }, p);
        }
        break;
      }
      if (distance(a, o) > 1 || o.done) break;
      if (o.kind === "objective" || o.kind === "alternate") {
        ok = activateObjective(s, a, o);
      } else if (o.kind === "cache") {
        if (!o.items?.length) break;
        const st = o.items[0];
        if (!give(s, a, st.id, st.count)) break;
        o.items.shift();
        o.done = o.items.length === 0;
        emit(s, "loot", a.id, [], { id: st.id }, o);
        if (entry("items", st.id).tier <= 1)
          emit(s, "loot_low_rarity", a.id, [], {}, o);
        ok = true;
      } else if (o.kind === "safe") {
        if (living(s).some((v) => distance(v, o) > 4)) {
          reject(
            s,
            a,
            "Bring the living crew within four tiles of the saferoom.",
          );
          break;
        }
        if (
          Object.values(s.actors).some(
            (v) =>
              v.kind === "enemy" &&
              !v.dead &&
              living(s).some((c) => distance(v, c) <= 8),
          )
        )
          break;
        s.phase = "SAFE_ROOM";
        if (!s.safeUsed && s.audience >= 25) {
          const pool = catalog.events.filter(
            (e) =>
              e.availableFromFloor <= s.floor &&
              !s.offers.includes(e.id) &&
              !s.resolvedOffers.includes(e.id),
          );
          for (
            let i = 0;
            i < Math.min(3, Math.floor(s.audience / 25)) && pool.length;
            i++
          ) {
            const index = random(s, "director", pool.length);
            s.offers.push(pool.splice(index, 1)[0].id);
          }
        }
        s.safeUsed = true;
        ok = true;
        emit(s, "saferoom", a.id);
      } else if (o.kind === "exit") {
        ok = descend(s, a);
      } else if (o.kind === "machine") {
        o.powered = !o.powered;
        enqueue(s, o, o.powered ? "shock" : "water", 2, a.id);
        emit(s, "found_off_switch", a.id, [], { id: o.id, powered:o.powered, element:o.powered?"shock":"water" }, o);
        ok = true;
      } else if (o.kind === "secret") {
        o.done = true;
        s.credits += 8;
        s.xp += 5;
        emit(s, "secret_discovery", a.id, [], {}, o);
        ok = true;
      }
      break;
    }
    case "REST":
      if (s.phase !== "SAFE_ROOM" || a.restFloor === s.floor) break;
      a.hp = Math.min(a.maxHP, a.hp + Math.ceil(a.maxHP * 0.35));
      a.focus = a.maxFocus;
      a.statuses = {};
      a.downs = 0;
      a.restFloor = s.floor;
      ok = true;
      break;
    case "MEDIC":
      if (s.phase !== "SAFE_ROOM" || a.wounds === 0 || s.credits < 5 * s.floor)
        break;
      s.credits -= 5 * s.floor;
      a.wounds--;
      ok = true;
      break;
    case "CRAFT": {
      if (s.phase !== "SAFE_ROOM" && !a.bench) break;
      const r = entry("recipes", c.id ?? "");
      if (
        !Object.entries(r.ingredients).every(([id, n]) =>
          a.inventory.some((i) => i.id === id && i.count >= Number(n)),
        )
      )
        break;
      const draft = clone(a);
      for (const [id, n] of Object.entries(r.ingredients))
        consume(draft, id, Number(n));
      if (!canCarry(draft, r.outputItem, r.outputCount)) break;
      Object.assign(a, draft);
      give(s, a, r.outputItem, r.outputCount);
      emit(s, "craft_complete", a.id, [], { id: r.id });
      ok = true;
      break;
    }
    case "BUY":
    case "SELL": {
      if (s.phase !== "SAFE_ROOM" || !c.id) break;
      const e = entry("items", c.id);
      const price = Math.ceil(
        e.basePrice *
          (1 + 0.1 * (s.floor - 1)) *
          (1 -
            Math.min(25, stat(a, "discount")) / 100 +
            stat(a, "shopTax") / 100),
      );
      if (c.type === "BUY") {
        const stock = s.shop.find((i) => i.id === e.id && i.count > 0);
        if (!stock || s.credits < price || !give(s, a, e.id)) {
          emit(s, "vendor_refused", a.id, [], {
            reason: !stock ? "out of stock" : "credits or capacity",
          });
          break;
        }
        stock.count--;
        s.credits -= price;
      } else {
        if (!consume(a, e.id)) break;
        s.credits += Math.floor(price * 0.4);
      }
      ok = true;
      break;
    }
    case "CHOOSE":
      if (c.choice === "profession" || c.choice === "adaptation") {
        if (s.floor < 3 || s.phase !== "SAFE_ROOM" || a[c.choice]) break;
        entry(
          c.choice === "profession" ? "professions" : "adaptations",
          c.id ?? "",
        );
        a[c.choice] = c.id;
        a.maxFocus = 5 + 2 * a.stats.Wit + stat(a, "maxFocus");
        a.focus = Math.min(a.focus, a.maxFocus);
        ok = true;
      } else if (c.id && a.offers.includes(c.id)) {
        a.talents.push(c.id);
        a.offers = [];
        ok = true;
      }
      break;
    case "OFFER": {
      if (
        s.phase !== "SAFE_ROOM" ||
        !c.id ||
        !s.offers.includes(c.id) ||
        s.resolvedOffers.includes(c.id)
      )
        break;
      const offer = entry("events", c.id);
      const choice = offer.choices.find((v: any) => v.id === c.choice);
      if (!choice) break;
      s.resolvedOffers.push(c.id);
      if (choice.id === "accept") applyOffer(s, a, choice.reward, choice.risk);
      emit(s, "offer_resolved", a.id, [], { id: c.id, choice: c.choice });
      ok = true;
      break;
    }
    case "REWARD": {
      if (s.phase !== "SAFE_ROOM") break;
      const reward = s.rewards.find(
        (r) => r.id === c.id && !r.claimed && r.turn === a.id,
      );
      if (reward) {
        if (c.choice === "pass") {
          const actors = living(s);
          (reward.passed ??= []).push(a.id);
          if (actors.every((v) => reward.passed!.includes(v.id))) {
            reward.claimed = true;
            s.overflow.push({ id: reward.item, count: 1, durability: 12 });
            ok = true;
            break;
          }
          reward.turn =
            actors[
              (actors.findIndex((v) => v.id === a.id) + 1) % actors.length
            ].id;
          ok = true;
        } else if (give(s, a, reward.item)) {
          reward.claimed = true;
          s.counters["rewards:" + a.id] =
            (s.counters["rewards:" + a.id] ?? 0) + 1;
          ok = true;
        }
      } else if (c.id?.startsWith("overflow:")) {
        const i = Number(c.id.slice(9)),
          st = s.overflow[i];
        if (st && give(s, a, st.id, st.count)) {
          s.overflow.splice(i, 1);
          ok = true;
        }
      }
      break;
    }
    case "DESCEND":
      ok = descend(s, a);
      break;
  }
  if (ok) {
    a = s.actors[a.id];
    a.ap = Math.max(0, a.ap - cost);
    emit(s,"action_performed",a.id,target?[target.id]:[],{action:c.type,id:c.id,cost},p);
  }
  return ok;
}
function descend(s: State, a: Actor): boolean {
  const f = catalog.floors[s.floor - 1];
  if (!s.bossDefeated || s.objective.length < f.requiredObjective.goal)
    return false;
  if (
    s.phase !== "SAFE_ROOM" &&
    distance(a, s.objects.find((o) => o.kind === "exit")!) > 1
  )
    return false;
  const voters = living(s).filter((v) => v.online);
  s.descendVotes ??= [];
  if (!s.descendVotes.includes(a.id)) s.descendVotes.push(a.id);
  if (!voters.every((v) => s.descendVotes!.includes(v.id))) {
    emit(s, "descent_vote", a.id, [], {
      ready: s.descendVotes.length,
      required: voters.length,
    });
    return true;
  }
  if (s.floor === 6) {
    completeVictory(s, a.id);
    return true;
  }
  s.floor++;
  generateFloor(s);
  s.phase = "EXPLORATION";
  emit(s, "floor_enter", a.id, [], { floor: s.floor });
  return true;
}
function completeVictory(s: State, actorId: string) {
  if (s.phase === "RESULT") return;
  s.phase = "RESULT";
  s.result = "VICTORY";
  if (!s.unlocks.includes("concourse_survivor"))
    s.unlocks.push("concourse_survivor");
  emit(s, "finish_floor_six", actorId);
  const party = Object.values(s.actors).filter((a) => a.kind === "crawler");
  if (party.length === 1 || party.length === 4)
    emit(
      s,
      party.length === 1 ? "solo_win" : "four_player_win",
      actorId,
      living(s).map((a) => a.id),
    );
  emit(
    s,
    party.some((a) => a.dead) ? "survive_with_casualty" : "all_survive",
    actorId,
  );
}
function enemyTurn(s: State, a: Actor) {
  const targets = living(s);
  if (!targets.length || a.dead || a.downed) return;
  const record = entry(
    a.tags.includes("boss") ? "bosses" : "monsters",
    a.catalogId,
  );
  const taunt = Object.keys(a.statuses).find((k) => k.startsWith("taunt:"));
  const target = taunt
    ? (s.actors[taunt.slice(6)] ?? targets[0])
    : targets.sort(
        (x, y) =>
          distance(a, x) -
            stat(x, "threat") -
            (distance(a, y) - stat(y, "threat")) || compareIds(x.id, y.id),
      )[0];
  if (
    !a.alert &&
    distance(a, target) >
      (record.sight ?? 8) -
        stat(target, "stealth") -
        (target.statuses.hidden ? 3 : 0)
  )
    return;
  if (!los(s, a, target) && !a.alert) return;
  a.alert = true;
  if (a.tags.includes("boss")) {
    if (s.objective.length < catalog.floors[s.floor - 1].requiredObjective.goal)
      return;
    const phases = [
      ...record.phases,
      ...(s.counters.extraBossPhase === s.floor
        ? [
            {
              thresholdPercent: 10,
              telegraph: "Contract rider: an additional core pulse charges.",
              effect: {
                type: "damage",
                magnitude: 10 + s.floor,
                element: record.attackElement,
                target: "area",
              },
            },
          ]
        : []),
    ];
    const phase =
      [...phases]
        .reverse()
        .find((p: any) => (a.hp / a.maxHP) * 100 <= p.thresholdPercent) ??
      record.phases[0];
    a.bossPhase = phases.indexOf(phase);
    if (phase.effect.type === "apply_status") {
      status(a, phase.effect.status, 2, phase.effect.magnitude, a.id);
      // An exposed phase remains dangerous, using the previous combat phase.
    }
    if (a.telegraph.length) {
      const hits = targets.filter((t) => a.telegraph.some((p) => same(p, t)));
      for (const t of hits)
        if (phase.effect.type === "damage")
          hurt(s, t, phase.effect.magnitude, record.attackElement, a.id, true);
        else hurt(s, t, 4 + a.bossPhase, record.attackElement, a.id, true);
      for (const p of a.telegraph)
        if (phase.effect.type === "spawn_hazard")
          enqueue(s, p, record.attackElement, a.bossPhase + 1, a.id);
      if (!hits.length) emit(s, "boss_telegraph_avoid", target.id, [], {}, a);
      a.telegraph = [];
    } else {
      a.telegraph = [
        { x: target.x, y: target.y },
        ...neighbors(target).filter((p) => walkable(s, p)),
      ];
      if (s.counters.extraBossPhase === s.floor)
        a.telegraph.push(...neighbors(a).filter((p) => walkable(s, p)));
      emit(
        s,
        "telegraph",
        a.id,
        targets.map((v) => v.id),
        { message: phase.telegraph, tiles: a.telegraph },
      );
    }
    return;
  }
  for (const c of targets.filter(
    (c) => c.reaction === "OVERWATCH" && distance(c, a) <= 5 && los(s, c, a),
  )) {
    equipmentAttack(s, c, a);
    c.reaction = "";
    if (a.dead) return;
  }
  const ai = record.ai;
  if (ai === "support") {
    const ally = Object.values(s.actors).find(
      (v) =>
        v.kind === "enemy" && !v.dead && v.hp < v.maxHP && distance(v, a) <= 4,
    );
    if (ally) {
      ally.hp = Math.min(ally.maxHP, ally.hp + 3);
      return;
    }
  }
  if (
    ai === "summoner" &&
    !a.noReward &&
    s.round % 3 === 0 &&
    Object.values(s.actors).filter((v) => v.owner === a.id && !v.dead).length <
      2
  ) {
    const n = neighbors(a).find(
      (p) =>
        walkable(s, p) &&
        !Object.values(s.actors).some((v) => !v.dead && same(v, p)),
    );
    if (n) {
      const minion = makeActor(
        `${a.id}_spawn_${s.round}`,
        record.name + " echo",
        "enemy",
        a.catalogId,
        n.x,
        n.y,
      );
      minion.hp = minion.maxHP = 4;
      minion.noReward = true;
      minion.owner = a.id;
      minion.statuses.lifetime = { duration: 3, potency: 1, source: a.id };
      s.actors[minion.id] = minion;
      return;
    }
  }
  if (ai === "hazard_placer" && distance(a, target) <= 4) {
    a.telegraph = [{ x: target.x, y: target.y }];
    enqueue(s, target, record.attackElement, 1, a.id);
    return;
  }
  const range = ["seek_ranged", "skirmisher"].includes(ai) ? 4 : 1;
  if (distance(a, target) <= range && los(s, a, target)) {
    attack(s, a, target, record.attackPower, record.attackElement, range);
    if (ai === "skirmisher") {
      const retreat = neighbors(a)
        .filter(
          (p) =>
            walkable(s, p) &&
            !Object.values(s.actors).some((v) => !v.dead && same(v, p)),
        )
        .sort((p, q) => distance(q, target) - distance(p, target))[0];
      if (retreat) {
        a.x = retreat.x;
        a.y = retreat.y;
      }
    }
  } else if (ai !== "guard_post") {
    // A sealed target has no reachable approach tile. Avoid a full-grid search
    // for every actor waiting behind the same occupied front line.
    if (
      neighbors(target).every(
        (n) =>
          !walkable(s, n) ||
          Object.values(s.actors).some(
            (v) => !v.dead && v.id !== a.id && same(v, n),
          ),
      )
    ) {
      a.telegraph = [{ x: target.x, y: target.y }];
      return;
    }
    const allies = Object.values(s.actors).filter(
      (v) =>
        v.kind === "enemy" &&
        !v.dead &&
        v.id !== a.id &&
        distance(v, target) <= 3,
    );
    const flank =
      ai === "flanker"
        ? neighbors(target)
            .filter(
              (p) =>
                walkable(s, p) &&
                !Object.values(s.actors).some(
                  (v) => !v.dead && v.id !== a.id && same(v, p),
                ),
            )
            .sort((p, q) =>
              allies.reduce((n, v) => n + distance(v, q) - distance(v, p), 0),
            )[0]
        : undefined;
    const steps = path(
      s,
      a,
      flank ?? target,
      false,
      Object.values(s.actors).filter(
        (v) => !v.dead && v.id !== a.id && v.id !== target.id,
      ),
    );
    const n = steps[0];
    if (n && !same(n, target)) {
      a.x = n.x;
      a.y = n.y;
      if (ai === "charger" && steps[1] && !same(steps[1], target)) {
        a.x = steps[1].x;
        a.y = steps[1].y;
      }
    }
  }
  a.telegraph = [{ x: target.x, y: target.y }];
}
function end(s: State, ages: Record<string, Record<string, number>> = {}) {
  for (const object of s.objects)
    if (
      object.disabled > 0 &&
      --object.disabled === 0 &&
      object.hp > 0 &&
      !object.jammed
    )
      object.powered = true;
  for (const a of Object.values(s.actors)) {
    for (const [key, v] of Object.entries(a.statuses)) {
      if (
        ages[a.id]?.[key] !== undefined &&
        ages[a.id][key] === (v.serial ?? 0) &&
        --v.duration <= 0
      ) {
        delete a.statuses[key];
        if (key === "lifetime") a.dead = true;
      }
    }
    if (a.downed && !a.dead && a.downedAt < s.round && --a.downed <= 0) {
      a.dead = true;
      emit(s, "first_death", a.id, [], {}, a);
    }
    a.shield = 0;
    a.guard = 0;
    a.reaction = "";
    if (
      !s.events.some(
        (e) =>
          e.round === s.round &&
          e.actorId === a.id &&
          e.type === "cast" &&
          e.payload.kind === "ABILITY",
      )
    )
      a.focus = Math.min(a.maxFocus, a.focus + 1);
    const thresholds = [0, 20, 45, 75, 110, 150, 195, 245];
    const level = Math.min(8, thresholds.filter((v) => s.xp >= v).length);
    if (a.kind === "crawler" && !a.dead && level > a.level) {
      a.maxHP += 4 * (level - a.level);
      if (!a.downed) a.hp = Math.min(a.maxHP, a.hp + 4 * (level - a.level));
      a.level = level;
      a.offers = [
        "armor",
        "accuracy",
        "capacity",
        "speed",
        "sight",
        "fireResist",
        "poisonResist",
      ]
        .filter((v) => !a.talents.includes(v))
        .slice(0, 3);
      emit(s, "level_up", a.id, [], { level });
    }
  }
  if (!living(s).length) {
    s.phase = "RESULT";
    s.result = "DEFEAT";
    emit(s, "party_wipe");
  }
  if (
    !s.events.some(
      (e) =>
        e.round === s.round &&
        [
          "enemy_defeated",
          "objective",
          "revive_ally",
          "alternate_boss",
          "shock_chain",
          "wall_break",
          "secret_discovery",
        ].includes(e.type),
    )
  ) {
    s.counters.boringRounds = (s.counters.boringRounds ?? 0) + 1;
    if (s.counters.boringRounds >= 5) s.audience = Math.max(0, s.audience - 1);
  } else s.counters.boringRounds = 0;
  if (
    s.floor === 6 &&
    s.bossDefeated &&
    s.objective.length >= catalog.floors[5].requiredObjective.goal
  )
    completeVictory(s, living(s)[0]?.id ?? "");
  updateVisibility(s);
  phaseCheck(s);
  if (s.bossDefeated && !s.rewards.some((r) => r.id === `boss:${s.floor}`)) {
    const actors = living(s);
    if (actors.length) {
      const loot = catalog.items.filter(
        (e) => e.tier === Math.min(4, Math.ceil(s.floor / 2) + 1),
      );
      s.rewards.push({
        id: `boss:${s.floor}`,
        item: loot[random(s, "loot", loot.length)].id,
        turn: actors[0].id,
        claimed: false,
      });
    }
  }
}
export function resolveRound(
  original: State,
  plans: Plan[],
): { state: State; events: State["events"] } {
  const s = clone(original),
    start = s.nextEventId;
  if (s.phase === "RESULT" || s.phase === "LOBBY" || s.phase === "SAFE_ROOM")
    return { state: s, events: [] };
  s.round++;
  s.turns++;
  s.exposures = [];
  const statusAges = Object.fromEntries(
    Object.values(s.actors).map((a) => [
      a.id,
      Object.fromEntries(
        Object.entries(a.statuses).map(([k, v]) => [k, v.serial ?? 0]),
      ),
    ]),
  );
  const initiative = new Map<string, number>();
  for (const a of Object.values(s.actors).sort((a, b) =>
    compareIds(a.id, b.id),
  )) {
    a.ap =
      a.dead || a.downed ? 0 : Math.max(0, 3 - (a.statuses.stunned ? 1 : 0));
    a.shield = Math.min(12,stat(a,'shield')+stat(a,'openingShield'));a.shieldSource=a.id;delete a.statuses['stat:openingShield'];
    a.guard = 0;
    for (const [k, v] of Object.entries(a.statuses))
      if (["burning", "poisoned", "bleeding"].includes(k))
        hurt(
          s,
          a,
          v.potency,
          k === "burning" ? "fire" : k === "poisoned" ? "poison" : "physical",
          v.source,
          true,
        );
    if (s.round % 3 === 0 && stat(a, "regeneration"))
      a.hp = Math.min(a.maxHP, a.hp + stat(a, "regeneration"));
    initiative.set(
      a.id,
      10 + stat(a, "Finesse") + stat(a, "speed") + random(s, "combat", 6) + 1,
    );
  }
  const ordered = plans
    .slice()
    .sort(
      (a, b) =>
        (initiative.get(b.actorId) ?? 0) - (initiative.get(a.actorId) ?? 0) ||
        compareIds(a.actorId, b.actorId),
    );
  for (let index = 0; index < 4; index++) {
    const done = new Set<string>(),
      visiting = new Set<string>();
    const runMove = (plan: Plan): void => {
      if (done.has(plan.actorId) || visiting.has(plan.actorId)) return;
      const c = plan.actions[index],
        a = s.actors[plan.actorId];
      if (!c || c.type !== "MOVE" || !a || a.dead || a.downed) return;
      visiting.add(a.id);
      const p = { x: c.x!, y: c.y! };
      if (c.swap) {
        const b = s.actors[c.swap],
          bp = ordered.find((p) => p.actorId === c.swap),
          bc = bp?.actions[index];
        if (
          b &&
          b.kind === "crawler" &&
          !b.dead &&
          !b.downed &&
          bc?.swap === a.id &&
          distance(a, b) === 1 &&
          !Object.values(tile(s, a)!.hazards).some((h) => h.damage) &&
          !Object.values(tile(s, b)!.hazards).some((h) => h.damage)
        ) {
          const ca = actionCost(s, a, { type: "MOVE", x: b.x, y: b.y }),
            cb = actionCost(s, b, { type: "MOVE", x: a.x, y: a.y });
          if (a.ap >= ca && b.ap >= cb) {
            const old = { x: a.x, y: a.y };
            a.x = b.x;
            a.y = b.y;
            b.x = old.x;
            b.y = old.y;
            a.ap -= ca;
            b.ap -= cb;
            done.add(a.id);
            done.add(b.id);
            visiting.delete(a.id);
            return;
          }
        }
      }
      const occupant = Object.values(s.actors).find(
        (b) => !b.dead && b.id !== a.id && same(b, p),
      );
      if (occupant) {
        const bp = ordered.find((plan) => plan.actorId === occupant.id),
          bc = bp?.actions[index];
        if (
          bp &&
          bc?.type === "MOVE" &&
          !bc.swap &&
          distance(occupant, { x: bc.x!, y: bc.y! }) === 1 &&
          walkable(s, { x: bc.x!, y: bc.y! })
        ) {
          const claimant = ordered.find((plan) => {
            const cc = plan.actions[index],
              actor = s.actors[plan.actorId];
            return (
              actor &&
              !actor.dead &&
              !actor.downed &&
              cc?.type === "MOVE" &&
              cc.x === bc.x &&
              cc.y === bc.y &&
              distance(actor, { x: cc.x!, y: cc.y! }) === 1 &&
              actor.ap >= actionCost(s, actor, cc)
            );
          });
          if (claimant?.actorId === occupant.id) runMove(bp);
        }
      }
      const reason=actionReason(s,a,c,actionCost(s,a,c));
      if (!perform(s, a, c)) reject(s, a, reason+"; AP refunded");
      done.add(a.id);
      visiting.delete(a.id);
    };
    for (const plan of ordered) runMove(plan);
  }
  commands: for (const plan of ordered)
    for (const c of plan.actions.filter((c) => c.type !== "MOVE").slice(0, 4)) {
      const a = s.actors[plan.actorId];
      const reason=a?actionReason(s,a,c,actionCost(s,a,c)):"Missing crawler";
      if (a && !perform(s, a, c)) reject(s,a,reason+"; AP refunded");
      if (
        s.floor !== original.floor ||
        (s.phase as string) === "RESULT" ||
        (s.phase as string) === "SAFE_ROOM"
      )
        break commands;
    }
  if (
    s.floor !== original.floor ||
    (s.phase as string) === "RESULT" ||
    (s.phase as string) === "SAFE_ROOM"
  ) {
    s.revision++;
    updateVisibility(s);
    award(s, start);
    return { state: s, events: s.events.filter((e) => e.eventId >= start) };
  }
  if (
    ordered.length &&
    ordered.every((p) => p.actions.length === 1) &&
    !s.events.some((e) => e.eventId >= start && e.type === "action_rejected")
  )
    emit(s, "quick_plan", ordered[0].actorId);
  environment(s);
  for (const minion of Object.values(s.actors).filter(
    (v) => v.kind === "minion" && !v.dead,
  )) {
    const enemy = Object.values(s.actors)
      .filter((v) => v.kind === "enemy" && !v.dead)
      .sort((a, b) => distance(minion, a) - distance(minion, b))[0];
    if (enemy) {
      if (distance(minion, enemy) <= 1) attack(s, minion, enemy, 3);
      else {
        const step = path(
          s,
          minion,
          enemy,
          false,
          Object.values(s.actors).filter(
            (a) => !a.dead && a.id !== minion.id && a.id !== enemy.id,
          ),
        )[0];
        if (step) {
          minion.x = step.x;
          minion.y = step.y;
        }
      }
    }
  }
  for (const a of Object.values(s.actors)
    .filter((a) => a.kind === "enemy")
    .sort(
      (a, b) =>
        (initiative.get(b.id) ?? 0) - (initiative.get(a.id) ?? 0) ||
        compareIds(a.id, b.id),
    ))
    enemyTurn(s, a);
  end(s, statusAges);
  s.revision++;
  award(s, start);
  return { state: s, events: s.events.filter((e) => e.eventId >= start) };
}
export function microAction(
  original: State,
  actorId: string,
  action: Action,
): State {
  const s = clone(original),
    a = s.actors[actorId],
    start = s.nextEventId;
  if (
    !a ||
    s.phase === "RESULT" ||
    s.phase === "LOBBY" ||
    s.phase === "PLANNING"
  )
    return s;
  if (s.phase === "SAFE_ROOM" && action.type === "MOVE")
    s.phase = "EXPLORATION";
  const statusAges = Object.fromEntries(
    Object.values(s.actors).map((a) => [
      a.id,
      Object.fromEntries(
        Object.entries(a.statuses).map(([k, v]) => [k, v.serial ?? 0]),
      ),
    ]),
  );
  s.exposures = [];
  a.ap = 3;
  const reason=actionReason(s,a,action,actionCost(s,a,action));
  if (!perform(s, a, action)){reject(s,a,reason+"; no turn spent");s.revision++;}
  else {
    if (
      (s.phase as string) !== "SAFE_ROOM" &&
      (s.phase as string) !== "RESULT"
    ) {
      s.round++;
      s.turns++;
      for (const actor of Object.values(s.actors).filter(
        (v) => v.kind === "crawler" && !v.dead,
      ))
        for (const [name, v] of Object.entries(actor.statuses))
          if (
            statusAges[actor.id]?.[name] !== undefined &&
            ["burning", "poisoned", "bleeding"].includes(name)
          )
            hurt(
              s,
              actor,
              v.potency,
              name === "burning"
                ? "fire"
                : name === "poisoned"
                  ? "poison"
                  : "physical",
              v.source,
              true,
            );
      environment(s);
      end(s, statusAges);
    }
    s.revision++;
    updateVisibility(s);
    phaseCheck(s);
    if (!living(s).length && (s.phase as string) !== "RESULT") {
      s.phase = "RESULT";
      s.result = "DEFEAT";
      emit(s, "party_wipe");
    }
    award(s, start);
  }
  return s;
}
