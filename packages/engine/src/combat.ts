import type { Actor, Element, Point, State } from "./types";
import { entry } from "../../content/src/index";
import { random } from "./random";
import { distance, los, tile, walkable, same } from "./grid";
import { emit } from "./events";
import { stat, give } from "./stats";
export function status(
  a: Actor,
  name: string,
  duration: number,
  potency: number,
  source: string,
) {
  a.statusSerial = (a.statusSerial ?? 0) + 1;
  a.statuses[name] = {
    serial: a.statusSerial,
    duration: Math.max(a.statuses[name]?.duration ?? 0, duration),
    potency,
    source,
  };
}
export function hurt(
  s: State,
  target: Actor,
  amount: number,
  element: Element,
  source: string,
  guaranteed = false,
): number {
  if (target.dead) return 0;
  const resistance = stat(target, element + "Resist");
  if (resistance >= 999) {
    emit(s, "resisted", source, [target.id], { element });
    return 0;
  }
  const weakness =
    target.kind === "enemy" && !target.tags.includes("boss")
      ? entry("monsters", target.catalogId).weakness
      : undefined;
  let n = Math.max(
    guaranteed ? 0 : 1,
    amount - resistance + (weakness === element ? 3 : 0),
  );
  if (
    (target.tags.includes("metal") || stat(target, "metal") > 0) &&
    tile(s, target)?.tags.includes("wet") &&
    element === "shock"
  )
    n += 3;
  const barrier = Math.min(target.shield, n);
  target.shield -= barrier;
  n -= barrier;
  target.hp = Math.max(0, target.hp - n);
  emit(
    s,
    "damage",
    source,
    [target.id],
    { amount: n, absorbed: barrier, element },
    target,
  );
  if (
    barrier &&
    target.kind === "crawler" &&
    target.shieldSource &&
    target.shieldSource !== target.id
  )
    emit(
      s,
      element === "shock" ? "shock_ally_saved" : "guard_ally",
      target.shieldSource,
      [target.id],
      { absorbed: barrier },
    );
  if (target.hp === 0) {
    if (target.kind !== "crawler") {
      target.dead = true;
      if (
        target.kind === "enemy" &&
        !target.tags.includes("boss") &&
        entry("monsters", target.catalogId).ai === "support"
      )
        emit(s, "support_enemy_defeat", source, [target.id], {}, target);
      emit(s, "enemy_defeated", source, [target.id], { element }, target);
      if (!target.noReward) {
        s.xp += target.tags.includes("boss") ? 25 : 5;
        s.credits += target.tags.includes("boss") ? 20 : 2;
        const cache = s.objects.find((o) => o.kind === "cache" && !o.done);
        if (cache && random(s, "loot", 3) === 0)
          cache.items?.push({ id: "scrap_metal", count: 1, durability: 12 });
      }

      if (target.tags.includes("boss")) {
        s.bossDefeated = true;
        s.floorRoutes[s.floor - 1] = "combat";
        emit(s, "boss_combat", source, [target.id], {}, target);
      }
    } else if (!target.downed) {
      target.downs++;
      if (target.downs >= 2) {
        target.dead = true;
        emit(s, "first_death", source, [target.id], {}, target);
      } else {
        target.downed = 3;
        target.ap = 0;
        target.downedAt = s.round;
        emit(s, "downed", source, [target.id], {}, target);
      }
    }
  }
  return n;
}
export function accuracy(
  attacker: Actor,
  target: Actor,
  base = 0,
  cover = 0,
  rangeBeyond = 0,
): number {
  return Math.max(
    10,
    Math.min(
      95,
      70 +
        5 * (stat(attacker, "Finesse") - 2) +
        base +
        stat(attacker, "accuracy") +
        (attacker.statuses.aimed ? 15 : 0) -
        (attacker.statuses.confused ? 15 : 0) +
        (target.statuses.exposed ? 15 : 0) -
        8 * cover -
        7 * rangeBeyond -
        stat(target, "dodge") -
        (target.reaction === "DODGE" ? 20 : 0),
    ),
  );
}
export function attack(
  s: State,
  a: Actor,
  t: Actor,
  base: number,
  element: Element = "physical",
  range = 1,
  bonus = 0,
  pierce = 0,
): boolean {
  if (
    t.dead ||
    t.downed ||
    (a.kind === "crawler" && t.kind === "crawler") ||
    distance(a, t) > range ||
    !los(s, a, t)
  )
    return false;
  const roll = random(s, "combat", 100) + 1;
  const chance = accuracy(
    a,
    t,
    bonus,
    tile(s, t)?.cover ?? 0,
    Math.max(0, distance(a, t) - Math.max(1, range - 2)),
  );
  if (t.reaction === "DODGE") t.reaction = "";
  if (roll > chance) {
    if (range > 2 && t.reaction === "GUARD" && stat(t, "shield") > 0)
      emit(s, "projectile_deflected", t.id, [a.id], {}, t);
    emit(s, "miss", a.id, [t.id], { roll, chance }, t);
    return true;
  }
  const crit = roll <= 5;
  const armor = Math.max(
    0,
    stat(t, "armor") + (t.statuses.corroded ? -2 : 0) + t.guard - pierce,
  );
  const amount = Math.max(
    1,
    Math.floor(
      (base +
        stat(a, range > 2 ? "Wit" : "Might") +
        random(s, "combat", 4) +
        1) *
        (crit ? 1.5 : 1),
    ) - armor,
  );
  hurt(s, t, amount, element, a.id);
  emit(s, "hit", a.id, [t.id], { roll, chance, crit }, t);
  return true;
}
export function push(
  s: State,
  a: Actor,
  t: Actor,
  magnitude: number,
  pull = false,
) {
  if (stat(t, "knockbackResist") && !t.used[`knock:${s.round}`]) {
    t.used[`knock:${s.round}`] = 1;
    emit(s, "braced", t.id);
    return;
  }
  if (t.tags.includes("boss") && !t.statuses.exposed)
    magnitude = Math.min(1, magnitude);
  let dx = t.x - a.x,
    dy = t.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    dx = Math.sign(dx) || 1;
    dy = 0;
  } else {
    dy = Math.sign(dy);
    dx = 0;
  }
  if (pull) {
    dx = -dx;
    dy = -dy;
  }
  for (let i = 0; i < magnitude; i++) {
    const p = { x: t.x + dx, y: t.y + dy };
    if (
      (!walkable(s, p) && tile(s, p)?.kind !== "pit") ||
      Object.values(s.actors).some((o) => !o.dead && !same(o, t) && same(o, p))
    ) {
      hurt(s, t, 2 * (magnitude - i), "physical", a.id);
      break;
    }
    t.x = p.x;
    t.y = p.y;
    if (tile(s, p)?.kind === "pit") {
      hurt(s, t, 9, "physical", a.id, true);
      emit(s, "pit_fall", a.id, [t.id], {}, p);
      break;
    }
    applyTileHazards(s, t, a.id);
    if (t.dead) {
      emit(s, "push_hazard_kill", a.id, [t.id], {}, t);
      break;
    }
  }
  emit(s, pull ? "pull" : "push", a.id, [t.id], {}, t);
}

/** Shared arrival/standing exposure ledger prevents double damage in one resolution. */
export function applyTileHazards(s: State, a: Actor, credit?: string): void {
  const exposed = new Set(s.exposures ?? []);
  for (let hop = 0; hop < 4 && !a.dead; hop++) {
    const origin = { x: a.x, y: a.y },
      t = tile(s, a);
    if (!t) break;
    for (const [element, h] of Object.entries(t.hazards)) {
      const key = a.id + ":" + element;
      if (exposed.has(key) || (h.disabled && h.disabled > 0)) continue;
      exposed.add(key);
      const source = credit ?? h.source;
      if (
        h.source === "conveyor_belt" ||
        (h.source === "magnetic_pulse" &&
          (a.tags.includes("metal") || stat(a, "metal") > 0))
      ) {
        const next = { x: a.x + 1, y: a.y };
        if (
          walkable(s, next) &&
          !Object.values(s.actors).some((v) => !v.dead && same(v, next))
        ) {
          a.x = next.x;
          a.y = next.y;
          emit(s, "conveyor", source, [a.id], {}, next);
        }
      }
      if (h.source === "glue_trap") status(a, "chilled", 2, 1, source);
      if (h.source === "crusher_plate" && s.round % 2 === 1) continue;
      if (
        h.damage &&
        a.kind === "crawler" &&
        ["glue_trap", "crusher_plate", "spiked_grate", "trapdoor_pit"].includes(
          h.source,
        )
      )
        emit(s, "trap_trigger_self", a.id, [], { hazard: h.source }, a);
      if (h.damage) hurt(s, a, h.damage, element as Element, source, true);
      if (element === "fire" && h.damage) status(a, "burning", 2, 3, source);
      if (element === "poison") status(a, "poisoned", 3, 2, source);
      if (element === "acid" && h.intensity >= 2)
        status(a, "corroded", 2, 2, source);
      if (element === "cold" && h.intensity >= 2)
        status(a, "chilled", 1, 1, source);
      if (element === "shock" && (t.tags.includes("wet") || h.intensity >= 2))
        status(a, "stunned", 1, 1, source);
    }
    if (t.trap && a.kind === "enemy") {
      let dealt = 0;
      if (!exposed.has(a.id + ":physical")) {
        exposed.add(a.id + ":physical");
        dealt = hurt(s, a, t.trap.damage, "physical", t.trap.owner, true);
      }
      if (dealt && a.dead && t.kind === "door")
        emit(s, "door_trap_kill", t.trap.owner, [a.id], {}, a);
      status(a, "chilled", 1, 1, t.trap.owner);
      delete t.trap;
    }
    if (same(origin, a)) break;
  }
  s.exposures = [...exposed];
}
