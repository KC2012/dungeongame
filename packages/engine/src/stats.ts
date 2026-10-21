import {
  entry,
  traitModifiers,
  backgroundModifiers,
  professionModifiers,
} from "../../content/src/index";
import type { Actor, State, Stack } from "./types";
export function modifiers(a: Actor): Record<string, number> {
  const m: Record<string, number> = {};
  const add = (v: Record<string, number>) => {
    for (const [k, n] of Object.entries(v)) m[k] = (m[k] ?? 0) + n;
  };
  if (a.kind === "crawler") {
    const bg = entry("backgrounds", a.catalogId);
    add(backgroundModifiers[bg.trait]);
    if (a.profession)
      add(professionModifiers[entry("professions", a.profession).passive]);
    if (a.adaptation) {
      const ad = entry("adaptations", a.adaptation);
      add(ad.bonus);
      add(ad.drawback);
    }
    for (const id of Object.values(a.equipment)) {
      const e = entry("items", id);
      add(traitModifiers[e.trait]);
      if (e.kind === "armor") m.armor = (m.armor ?? 0) + e.power;
    }
    for (const stack of a.inventory) {
      const e = entry("items", stack.id);
      if (
        e.kind === "tool" &&
        !Object.values(a.equipment).includes(e.id) &&
        [
          "capacity",
          "light",
          "inspect",
          "craft",
          "unlock",
          "document",
          "repair",
          "disarm",
        ].includes(e.trait)
      )
        add(traitModifiers[e.trait]);
    }
    for (const t of a.talents) add({ [t]: 1 });
  }
  for (const [k, v] of Object.entries(a.statuses))
    if (k.startsWith("stat:")) m[k.slice(5)] = (m[k.slice(5)] ?? 0) + v.potency;
  return m;
}
export function stat(a: Actor, key: string): number {
  return (a.stats[key] ?? 0) + (modifiers(a)[key] ?? 0);
}
export function weight(a: Actor): number {
  return a.inventory.reduce(
    (n, s) => n + entry("items", s.id).weight * s.count,
    0,
  );
}
export function canCarry(a: Actor, id: string, count = 1): boolean {
  const e = entry("items", id);
  const existing = a.inventory.find((s) => s.id === id);
  return a.inventory.length < 10 + stat(a, "carrySlots") ||
    (!!existing && existing.count + count <= (e.stack ?? 1))
    ? weight(a) + e.weight * count <=
        10 + 3 * stat(a, "Might") + stat(a, "capacity")
    : false;
}
export function give(
  s: State,
  a: Actor,
  id: string,
  count = 1,
  overflow = false,
): boolean {
  if (!canCarry(a, id, count)) {
    if (overflow) s.overflow.push({ id, count, durability: 12 });
    return false;
  }
  const st = a.inventory.find(
    (i) => i.id === id && i.count + count <= (entry("items", id).stack ?? 1),
  );
  if (st) st.count += count;
  else a.inventory.push({ id, count, durability: 12 });
  return true;
}
export function consume(a: Actor, id: string, count = 1): boolean {
  const st = a.inventory.find((i) => i.id === id);
  if (!st || st.count < count) return false;
  st.count -= count;
  if (st.count === 0) {
    a.inventory.splice(a.inventory.indexOf(st), 1);
    for (const k of Object.keys(a.equipment))
      if (a.equipment[k] === id) delete a.equipment[k];
  }
  return true;
}
export function living(s: State): Actor[] {
  return Object.values(s.actors).filter(
    (a) => a.kind === "crawler" && !a.dead && !a.downed,
  );
}
