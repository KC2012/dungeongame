import {
  newGame,
  addCrawler,
  begin,
  microAction,
  resolveRound,
  visible,
  path,
  distance,
  neighbors,
  walkable,
  actionCost,
  stat,
  tile,
  los,
  canCarry,
} from "../packages/engine/src/index";
import type { State, Action, Actor, Point } from "../packages/engine/src/types";
import { catalog, entry } from "../packages/content/src/index";
export type BotReport = {
  seed: number;
  players: number;
  route: string;
  result: string;
  floor: number;
  turns: number;
  reason: string;
  state: State;
};
export function playBot(
  seed: number,
  players = 1,
  route = "alternate",
  limit = 5000,
  assisted = false,
): BotReport {
  let s = newGame(seed, "bot");
  for (let i = 0; i < players; i++)
    addCrawler(s, "p" + i, "Bot " + i, "construction_worker");
  if (assisted)
    for (const a of Object.values(s.actors)) {
      a.hp = a.maxHP = 500;
      a.stats.armor = 8;
      a.inventory.push({ id: "rail_driver", count: 1, durability: 12 });
      a.equipment.weapon = "rail_driver";
    }
  begin(s);
  const escapes = new Map<string, Point[]>();
  const forcedMoves = new Map<string, Action>();
  let reserved: Point[] = [];
  let iterations = 0,
    stuck = 0,
    last = "";
  function next(a: Actor): Action {
    if (a.id === "p0") reserved = [];
    const forced = forcedMoves.get(a.id);
    if (forced) {
      forcedMoves.delete(a.id);
      return forced;
    }
    const enemies = Object.values(s.actors)
      .filter((v) => v.kind === "enemy" && !v.dead && visible(s, v))
      .sort((x, y) => distance(a, x) - distance(a, y));
    const threat = enemies[0];
    const rescue = Object.values(s.actors).find(
      (v) => v.kind === "crawler" && v.downed && !v.dead && distance(a, v) <= 1,
    );
    if (rescue && a.inventory.some((i) => i.id === "first_aid_pack"))
      return { type: "REVIVE", target: rescue.id };
    const telegraphs = Object.values(s.actors)
      .filter((v) => !v.dead && v.tags.includes("boss"))
      .flatMap((v) => v.telegraph);
    if (
      telegraphs.some((p) => samePoint(p, a)) ||
      Object.values(tile(s, a)?.hazards ?? {}).some((h) => h.damage > 0)
    ) {
      const boss = Object.values(s.actors).find(
        (v) => v.tags.includes("boss") && !v.dead,
      );
      const goal =
        route === "alternate"
          ? (s.objects.find((o) => o.kind === "alternate" && !o.done) ?? boss)
          : boss;
      const candidates: Point[][] = [];
      for (let y = a.y - 2; y <= a.y + 2; y++)
        for (let x = a.x - 2; x <= a.x + 2; x++) {
          const p = { x, y };
          if (
            !walkable(s, p) ||
            telegraphs.some((t) => samePoint(t, p)) ||
            Object.values(tile(s, p)!.hazards).some((h) => h.damage > 0)
          )
            continue;
          const steps = path(
            s,
            a,
            p,
            true,
            Object.values(s.actors).filter((v) => !v.dead && v.id !== a.id),
          );
          if (steps.length > 0 && steps.length <= 2) candidates.push(steps);
        }
      candidates.sort(
        (p, q) =>
          (goal ? distance(p.at(-1)!, goal) - distance(q.at(-1)!, goal) : 0) ||
          p.length - q.length,
      );
      if (candidates.length) {
        escapes.set(a.id, candidates[0]);
        return { type: "MOVE", ...candidates[0][0], choice: "escape" };
      }
    }
    const weaponScore = (id: string) => {
      if (!id) return 0;
      const w = entry("items", id);
      return w.kind === "weapon" ? w.power + w.range : 0;
    };
    const better = a.inventory.find(
      (i) => weaponScore(i.id) > weaponScore(a.equipment.weapon),
    );
    if (better) return { type: "EQUIP", id: better.id };
    const armor = a.inventory.find(
      (i) =>
        entry("items", i.id).kind === "armor" &&
        entry("items", i.id).power >
          (a.equipment[entry("items", i.id).slot]
            ? entry("items", a.equipment[entry("items", i.id).slot]).power
            : 0),
    );
    if (armor) return { type: "EQUIP", id: armor.id };
    if (
      a.hp < a.maxHP * 0.5 &&
      a.inventory.some((i) => i.id === "first_aid_pack")
    )
      return { type: "USE", id: "first_aid_pack" };
    const cache = s.objects.find(
      (o) =>
        o.kind === "cache" &&
        !o.done &&
        distance(a, o) <= 1 &&
        o.items?.length &&
        canCarry(a, o.items[0].id) &&
        (o.items[0].id === "first_aid_pack"
          ? canCarryLocal(a)
          : weaponScore(o.items[0].id) > weaponScore(a.equipment.weapon) ||
            (entry("items", o.items[0].id).kind === "armor" &&
              !a.equipment[entry("items", o.items[0].id).slot])),
    );
    if (cache) return { type: "INTERACT", id: cache.id };
    if (a.offers.length) return { type: "CHOOSE", id: a.offers[0] };
    if (s.phase === "SAFE_ROOM") {
      if (a.restFloor !== s.floor) return { type: "REST" };
      if (s.floor >= 3 && !a.profession)
        return { type: "CHOOSE", choice: "profession", id: "breaker" };
      if (s.floor >= 3 && !a.adaptation)
        return { type: "CHOOSE", choice: "adaptation", id: "ceramic_skin" };
      const upgrade = s.shop
        .filter(
          (i) =>
            i.count > 0 &&
            canCarry(a, i.id) &&
            Math.ceil(
              entry("items", i.id).basePrice * (1 + 0.1 * (s.floor - 1)),
            ) <= s.credits &&
            (weaponScore(i.id) > weaponScore(a.equipment.weapon) ||
              (entry("items", i.id).kind === "armor" &&
                !a.equipment[entry("items", i.id).slot])),
        )
        .sort((a, b) => weaponScore(b.id) - weaponScore(a.id))[0];
      if (upgrade) return { type: "BUY", id: upgrade.id };
      if (s.bossDefeated) return { type: "DESCEND" };
      return moveToward(a, { x: a.x + 1, y: a.y });
    }
    if (
      threat &&
      a.hp < a.maxHP * 0.5 &&
      a.focus > 0 &&
      s.phase === "PLANNING" &&
      (a.cooldowns.emergency_bandage ?? 0) <= s.round
    )
      return { type: "ABILITY", id: "emergency_bandage", target: a.id };
    if (threat && !(route === "alternate" && threat.tags.includes("boss"))) {
      const w = entry("items", a.equipment.weapon);
      if (
        distance(a, threat) <= w.range + (w.trait === "reach" ? 1 : 0) &&
        los(s, a, threat)
      )
        return { type: "ATTACK", target: threat.id };
      if (distance(a, threat) <= 4 && los(s, a, threat))
        return { type: "ABILITY", id: "throw_debris", target: threat.id };
      return moveToward(a, threat);
    }
    // A vote persists. Move voted crawlers away from a narrow exit so the
    // remaining crew can approach and vote instead of blocking one another.
    if (s.bossDefeated && s.descendVotes?.includes(a.id)) {
      const exit = s.objects.find((o) => o.kind === "exit")!;
      if (distance(a, exit) >= 3) return { type: "WAIT" };
      const occupied = Object.values(s.actors).filter(
        (v) => !v.dead && v.id !== a.id,
      );
      const approach = Object.values(s.actors)
        .filter(
          (v) =>
            v.kind === "crawler" && !v.dead && !s.descendVotes?.includes(v.id),
        )
        .flatMap((v) => path(s, v, exit, true));
      const options: Point[][] = [];
      for (let y = exit.y - 4; y <= exit.y + 4; y++)
        for (let x = exit.x - 4; x <= exit.x + 4; x++) {
          const p = { x, y };
          if (
            distance(p, exit) < 3 ||
            distance(p, exit) > 4 ||
            !walkable(s, p) ||
            occupied.some((v) => samePoint(v, p)) ||
            approach.some((v) => samePoint(v, p)) ||
            Object.values(tile(s, p)!.hazards).some((h) => h.damage > 0)
          )
            continue;
          const steps = path(s, a, p, true, occupied);
          if (steps.length) options.push(steps);
        }
      options.sort((p, q) => p.length - q.length);
      if (options[0]) return { type: "MOVE", ...options[0][0] };
      return { type: "WAIT" };
    }
    const leader = s.actors.p0;
    if (a.id !== "p0" && !leader.dead && !leader.downed) {
      const exit = s.objects.find((o) => o.kind === "exit")!;
      if (s.bossDefeated && s.objective.length >= catalog.floors[s.floor - 1].requiredObjective.goal) {
        if (distance(a, exit) <= 1) return { type: "INTERACT", id: exit.id };
        return moveToward(a, exit);
      }
      if (distance(a, leader) > 1) return moveToward(a, leader);
      return { type: "WAIT" };
    }
    const floor = catalog.floors[s.floor - 1];
    let target = s.objects.find((o) => o.kind === "objective" && !o.done);
    if (s.objective.length >= floor.requiredObjective.goal) {
      target = s.objects.find(
        (o) => o.kind === "safe" && a.restFloor !== s.floor,
      );
      if (!target && !s.bossDefeated) {
        if (route === "alternate")
          target = s.objects.find((o) => o.kind === "alternate" && !o.done);
        else {
          const boss = s.actors["boss_" + s.floor];
          if (boss && !boss.dead) return moveToward(a, boss);
        }
      }
      if (!target && s.bossDefeated)
        target = s.objects.find((o) => o.kind === "exit");
    }
    if (target) {
      if (distance(a, target) <= 1) return { type: "INTERACT", id: target.id };
      return moveToward(a, target);
    }
    return { type: "WAIT" };
  }
  function moveToward(a: Actor, p: Point): Action {
    const occupied: Point[] = Object.values(s.actors).filter(
      (v) => !v.dead && v.id !== a.id && !samePoint(v, p),
    );
    for (let i = 0; i < s.tiles.length; i++)
      if (Object.values(s.tiles[i].hazards).some((h) => h.damage > 0))
        occupied.push({ x: i % s.width, y: Math.floor(i / s.width) });
    if (
      Object.values(s.actors).some(
        (v) => v.kind === "crawler" && v.id !== a.id && samePoint(v, p),
      )
    ) {
      const points: Point[] = [];
      for (let y = p.y - 4; y <= p.y + 4; y++)
        for (let x = p.x - 4; x <= p.x + 4; x++) {
          const n = { x, y };
          if (
            distance(p, n) > 0 &&
            distance(p, n) <= 4 &&
            walkable(s, n) &&
            !occupied.some((o) => samePoint(o, n)) &&
            !reserved.some((r) => samePoint(r, n))
          )
            points.push(n);
        }
      points.sort(
        (x, y) =>
          distance(x, p) - distance(y, p) || distance(a, x) - distance(a, y),
      );
      for (const n of points) {
        if (samePoint(a, n)) return { type: "WAIT" };
        const steps = path(s, a, n, true, occupied);
        if (steps.length && !reserved.some((r) => samePoint(r, steps[0])))
          return { type: "MOVE", ...steps[0] };
      }
      return { type: "WAIT" };
    }
    const destinations = [p, ...neighbors(p)].filter(
      (n) => walkable(s, n) && !occupied.some((o) => samePoint(o, n)),
    );
    const options = destinations
      .map((n) => path(s, a, n, true, occupied))
      .filter((p) => p.length)
      .sort((a, b) => a.length - b.length);
    const n = options[0]?.[0];
    if (a.id === "p0") reserved = path(s, a, p, true).slice(0, 3);
    if (!n && a.id === "p0") {
      const step = path(s, a, p, true)[0];
      const friend = step
        ? Object.values(s.actors).find(
            (v) => v.kind === "crawler" && v.id !== a.id && samePoint(v, step),
          )
        : undefined;
      if (friend) {
        const aside = neighbors(friend).find(
          (n) =>
            walkable(s, n) &&
            !Object.values(s.actors).some((v) => !v.dead && samePoint(v, n)) &&
            !Object.values(tile(s, n)!.hazards).some((h) => h.damage > 0),
        );
        if (aside) forcedMoves.set(friend.id, { type: "MOVE", ...aside });
      }
    }
    return n ? { type: "MOVE", ...n } : { type: "GUARD" };
  }
  while (s.phase !== "RESULT" && iterations++ < limit) {
    if (process.env.BOT_VERBOSE && iterations % 250 === 0)
      console.log({
        iteration: iterations,
        floor: s.floor,
        phase: s.phase,
        objective: s.objective.length,
        alternate: s.alternate.length,
        party: Object.values(s.actors)
          .filter((a) => a.kind === "crawler")
          .map((a) => [a.id, a.x, a.y]),
      });
    const before = s;
    const actors = Object.values(s.actors).filter(
      (v) => v.kind === "crawler" && !v.dead && !v.downed,
    );
    if (!actors.length) break;
    if (s.phase === "PLANNING") {
      const plans = actors.map((a) => {
        const c = next(a);
        const cost = actionCost(s, a, c);
        const actions = [c];
        if (c.choice === "escape") {
          actions.splice(
            0,
            1,
            ...escapes.get(a.id)!.map((p) => ({ type: "MOVE" as const, ...p })),
          );
          actions.push({ type: "GUARD" });
          return { actorId: a.id, actions };
        }
        if (c.type === "ATTACK" && cost === 1) actions.push(c, c);
        else if (c.type === "ABILITY" && c.id === "throw_debris")
          actions.push(c, c);
        else if (cost === 2) actions.push({ type: "GUARD" });
        else if (c.type === "MOVE") actions.push({ type: "GUARD" });
        return { actorId: a.id, actions };
      });
      s = resolveRound(s, plans).state;
    } else {
      for (const actor of actors) {
        const a = s.actors[actor.id];
        if (s.phase === "PLANNING" || s.phase === "RESULT") break;
        s = microAction(s, a.id, next(a));
      }
    }
    const key =
      s.floor +
      ":" +
      s.phase +
      ":" +
      Object.values(s.actors)
        .filter((a) => a.kind === "crawler")
        .map((a) => `${a.x},${a.y},${a.hp}`)
        .join(";") +
      ":" +
      s.objective.length +
      ":" +
      s.alternate.length;
    if (key === last) stuck++;
    else stuck = 0;
    last = key;
    if (stuck > 30)
      return {
        seed,
        players,
        route,
        result: "STUCK",
        floor: s.floor,
        turns: s.turns,
        reason: s.events.at(-1)?.payload.reason ?? "no progress",
        state: s,
      };
  }
  return {
    seed,
    players,
    route,
    result: s.result ?? "LIMIT",
    floor: s.floor,
    turns: s.turns,
    reason: s.events.at(-1)?.type ?? "",
    state: s,
  };
}
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

function canCarryLocal(a: Actor) {
  return (
    a.inventory
      .filter((i) => i.id === "first_aid_pack")
      .reduce((n, i) => n + i.count, 0) < 2
  );
}
