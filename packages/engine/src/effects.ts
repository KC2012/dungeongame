import type { State, Actor, Point, Effect } from "./types";
import { distance, los, tile, walkable, path, same } from "./grid";
import { attack, hurt, push, status, applyTileHazards } from "./combat";
import { emit } from "./events";
import { enqueue } from "./environment";
import { entry } from "../../content/src/index";
import { give, consume, stat, living } from "./stats";
import { random } from "./random";
import { activateObjective } from "./objectives";
export function revive(s: State, a: Actor, t: Actor, free = false): boolean {
  if (!t.downed || t.dead || distance(a, t) > 1 || t.revivedFloor === s.floor)
    return false;
  const freeTag = stat(a, "freeRevive") && !a.used[`revive:${s.floor}`];
  if (!free && !freeTag && !consume(a, "first_aid_pack")) return false;
  a.used[`revive:${s.floor}`] = 1;
  if (t.downed === 1) emit(s, "revive_final_round", a.id, [t.id], {}, t);
  t.downed = 0;
  t.hp = Math.ceil(t.maxHP * 0.2);
  t.wounds++;
  t.revivedFloor = s.floor;
  emit(s, "revive_ally", a.id, [t.id], {}, t);
  return true;
}
export function effect(
  s: State,
  a: Actor,
  target: Actor | undefined,
  p: Point,
  e: Effect,
): boolean {
  const t = tile(s, p);
  const targets =
    e.target === "party"
      ? living(s).filter((v) => distance(a, v) <= (e.radius ?? 99))
      : e.target === "self"
        ? [a]
        : e.target === "area"
          ? Object.values(s.actors).filter(
              (v) => !v.dead && distance(v, p) <= (e.radius ?? 1),
            )
          : target
            ? [target]
            : [];
  const object = s.objects.find((o) => same(o, p));
  switch (e.type) {
    case "damage":{
      let affected=false;
      for (const v of targets) {
        if (
          e.target === "area" &&
          v.kind === "crawler" &&
          ["blast", "fire", "shock", "acid", "poison"].includes(e.element ?? "")
        )
          {hurt(s, v, e.magnitude, e.element!, a.id, true);affected=true;}
        else
          affected=attack(
            s,
            a,
            v,
            e.magnitude,
            e.element ?? "physical",
            Math.max(1, distance(a, p)+(e.target==='area'?(e.radius??1):0)),
          )||affected;
      }
      return affected;
    }
    case "heal":
      for (const v of targets) {
        if (v.dead || v.downed) continue;
        v.hp = Math.min(v.maxHP, v.hp + e.magnitude + stat(a, "heal"));
        emit(s, "heal", a.id, [v.id], { amount: e.magnitude });
      }
      return targets.some((v) => !v.dead && !v.downed);
    case "shield":
      for (const v of targets) {
        v.shield = Math.min(12, Math.max(v.shield, e.magnitude));
        v.shieldSource = a.id;
        emit(s, "shield", a.id, [v.id], { amount: e.magnitude });
      }
      if (targets.length > 1)
        emit(
          s,
          "shield_multi_ally",
          a.id,
          targets.map((t) => t.id),
        );
      return targets.length > 0;
    case "guard":
      a.guard = Math.max(a.guard, e.magnitude + stat(a, "guard"));
      return true;
    case "push":
    case "pull":
      if (!target) return false;
      push(s, a, target, e.magnitude, e.type === "pull");
      return true;
    case "dash": {
      const steps = path(
        s,
        a,
        p,
        false,
        Object.values(s.actors)
          .filter((v) => !v.dead && v.id !== a.id)
          .map((v) => ({ x: v.x, y: v.y })),
      );
      if (!steps.length || steps.length > e.magnitude) return false;
      for (const n of steps) {
        a.x = n.x;
        a.y = n.y;
        applyTileHazards(s, a);
      }
      return true;
    }
    case "teleport":
      if (
        !walkable(s, p) ||
        distance(a, p) > e.magnitude ||
        !los(s, a, p) ||
        Object.values(s.actors).some((v) => !v.dead && same(v, p))
      )
        return false;
      a.x = p.x;
      a.y = p.y;
      applyTileHazards(s, a);
      return true;
    case "apply_status":
      for (const v of targets)
        status(v, e.status ?? "stunned", e.duration ?? 2, e.magnitude, a.id);
      return targets.length > 0;
    case "spawn_hazard":
      if (!t || t.kind === "wall") return false;
      enqueue(
        s,
        p,
        e.element ?? "poison",
        e.magnitude + stat(a, "hazard"),
        a.id,
        e.element === "blast" ? e.magnitude * 3 : 0,
        e.duration ?? 2,
      );
      return true;
    case "destroy_tile":
      if (!t || (t.kind !== "wall" && t.kind !== "door")) return false;
      t.hp -= e.magnitude + stat(a, "structural");
      if (t.hp <= 0) {
        t.kind = "rubble";
        t.tags = [];
        emit(s, "wall_break", a.id, [], {}, p);
        emit(s, "breach_route", a.id, [], {}, p);
      }
      return true;
    case "reveal":
      for (
        let y = Math.max(0, p.y - e.magnitude);
        y <= Math.min(s.height - 1, p.y + e.magnitude);
        y++
      )
        for (
          let x = Math.max(0, p.x - e.magnitude);
          x <= Math.min(s.width - 1, p.x + e.magnitude);
          x++
        )
          if (los(s, a, { x, y })) tile(s, { x, y })!.explored = true;
      if (target) status(target, "exposed", 2, 1, a.id);
      emit(s, "inspect", a.id, target ? [target.id] : [], {}, p);
      return true;
    case "revive":
      return !!target && revive(s, a, target, !!e.freeMedkitRevive);
    case "cleanse":
      for (const v of targets) {
        for (const name of Object.keys(v.statuses)
          .filter((k) =>
            [
              "burning",
              "corroded",
              "chilled",
              "stunned",
              "poisoned",
              "confused",
              "bleeding",
            ].includes(k),
          )
          .slice(0, e.magnitude))
          delete v.statuses[name];
        if (e.clearsWound) v.wounds = Math.max(0, v.wounds - 1);
      }
      return targets.length > 0;
    case "gain_resource":
      if (e.resourceKind === "credits") s.credits += e.magnitude;
      else if (e.resourceKind === "audience")
        s.audience = Math.min(100, s.audience + e.magnitude);
      else if (e.resourceKind === "charges") a.charges += e.magnitude;
      else
        for (const v of targets)
          v.focus = Math.min(v.maxFocus, v.focus + e.magnitude);
      return true;
    case "modify_stat":
      if (e.stat === "passive") return false;
      for (const v of targets)
        status(v, "stat:" + e.stat, e.duration ?? 2, e.magnitude, a.id);
      return targets.length > 0;
    case "modify_audience":
      s.audience = Math.min(100, s.audience + e.magnitude);
      return true;
    case "set_trap":
      if (!t || !walkable(s, p)) return false;
      {
        const traps = s.tiles.filter((v) => v.trap?.owner === a.id);
        if (traps.length >= 3) delete traps[0].trap;
        t.trap = { owner: a.id, damage: e.magnitude * 3 + stat(a, "trap") };
      }
      return true;
    case "create_cover":
      if (t?.kind === "pit" && stat(a, "bridge")) {
        t.kind = "floor";
        emit(s, "locked_path_bypass", a.id, [], {}, p);
        return true;
      }
      if (
        !t ||
        !walkable(s, p) ||
        Object.values(s.actors).some((v) => !v.dead && same(v, p))
      )
        return false;
      t.cover = 2;
      t.hp = 6 + 2 * e.magnitude;
      emit(s, "cover_created", a.id, [], {}, p);
      return true;
    case "taunt":
      for (const v of e.target === "tile"
        ? Object.values(s.actors).filter(
            (v) => v.kind === "enemy" && distance(v, p) <= 2,
          )
        : targets)
        status(v, "taunt:" + a.id, 2, e.magnitude, a.id);
      return true;
    case "hack":
      if (!object && t?.kind !== "door") return false;
      if (object?.jammed || t?.jammed) return false;
      {
        const roll = random(s, "combat", 20) + 1;
        const dc =
          object?.kind === "objective" ||
          object?.kind === "alternate" ||
          t?.locked
            ? 14
            : 10;
        const wasLocked = !!t?.locked;
        const success =
          roll === 20 ||
          (roll !== 1 &&
            roll + stat(a, "Wit") + stat(a, "hack") + e.magnitude >= dc);
        if (success) {
          if (object) {
            object.powered = false;
            object.disabled = 2;
          }
          if (t?.kind === "door") {
            t.locked = false;
            t.open = true;
          }
          if (object) activateObjective(s, a, object, "hack");
          emit(
            s,
            "machine_hacked",
            a.id,
            [],
            {
              roll,
              wasLocked,
              objective:
                object?.kind === "objective" || object?.kind === "alternate",
            },
            p,
          );
          if (dc >= 14) emit(s, "hard_check_success", a.id, [], { roll }, p);
        } else {
          if (object) object.jammed = true;
          else if (t) t.jammed = true;
          emit(s, "hack_failed", a.id, [], { roll }, p);
        }
        return true;
      }
    case "disable_machine":
      if (!object || !object.powered) return false;
      object.powered = false;
      object.disabled = 2 + stat(a, "disable");
      for (let i = 0; i < s.tiles.length; i++) {
        const p2 = { x: i % s.width, y: Math.floor(i / s.width) };
        if (distance(p, p2) <= 4)
          for (const [el, h] of Object.entries(s.tiles[i].hazards))
            if (h.persistent && ["shock", "force", "physical"].includes(el))
              h.disabled = object.disabled;
      }
      activateObjective(s, a, object, "disable");
      emit(s, "machine_disable", a.id, [], { id: object.id }, p);
      return true;
    case "repair_object":
      if (!object && t?.kind === "door" && t.jammed) {
        t.jammed = false;
        t.hp += e.magnitude;
        emit(s, "repair", a.id, [], { kind: "door" }, p);
        return true;
      }
      if (!object || (object.hp >= object.maxHP && !object.jammed))
        return false;
      object.hp = Math.min(
        object.maxHP,
        object.hp + e.magnitude + stat(a, "repair"),
      );
      object.jammed = false;
      emit(s, "repair", a.id, [], { id: object.id }, p);
      return true;
    case "enable_crafting":
      a.bench = true;
      return true;
    case "craft_component":
      return false;
    case "grant_item":
      return !!e.itemId && give(s, a, e.itemId, e.magnitude, true);
    case "trade":
      if (s.phase !== "SAFE_ROOM") return false;
      status(a, "stat:discount", 999, 5, a.id);
      return true;
    case "conjure_object":
      if (a.used[`conjure:${s.floor}`] || !t) return false;
      a.used[`conjure:${s.floor}`] = 1;
      t.cover = 1;
      t.hp = 8;
      return true;
    case "summon": {
      if (
        Object.values(s.actors).filter((v) => v.owner === a.id && !v.dead)
          .length >= 2 ||
        !walkable(s, p) ||
        Object.values(s.actors).some((v) => !v.dead && same(v, p))
      )
        return false;
      const minion = structuredClone(a);
      minion.id = `minion_${a.id}_${s.nextEventId}`;
      minion.kind = "minion";
      minion.owner = a.id;
      minion.x = p.x;
      minion.y = p.y;
      minion.hp = minion.maxHP = 6;
      minion.noReward = true;
      minion.statuses = { lifetime: { duration: 3, potency: 1, source: a.id } };
      s.actors[minion.id] = minion;
      emit(s, "summoned", a.id, [minion.id], {}, p);
      return true;
    }
    default:
      throw Error(`Unimplemented effect ${e.type}`);
  }
}
