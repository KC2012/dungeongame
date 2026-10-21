import type { State, HazardIntent, Element, Point } from "./types";
import { tile, neighbors, distance,walkable,same } from "./grid";
import { emit } from "./events";
import { hurt, status } from "./combat";
const order: Record<string, number> = {
  blast: 0,
  water: 1,
  fire: 2,
  shock: 3,
  acid: 4,
  cold: 5,
  poison: 6,
  smoke: 7,
  physical: 8,
  force: 9,
  psychic: 10,
};
export function enqueue(
  s: State,
  p: Point,
  element: Element,
  intensity: number,
  source: string,
  damage = 0,
  duration = 2,
) {
  s.deferredEvents.push({
    ...p,
    element,
    intensity: Math.max(1, Math.min(3, intensity)),
    source,
    damage,
    duration,
    step: 0,
  });
}
export function environment(s: State): void {
  let queue = s.deferredEvents;
  s.deferredEvents = [];
  let processed = 0;
  const seen = new Set<string>(),
    exposed = new Set<string>(),
    conducted = new Map<string, Set<number>>();
  for (let step = 0; step < 4 && queue.length; step++) {
    const next: HazardIntent[] = [];
    queue.sort(
      (a, b) =>
        a.y * s.width + a.x - (b.y * s.width + b.x) ||
        order[a.element] - order[b.element] ||
        a.source.localeCompare(b.source),
    );
    for (let qi = 0; qi < queue.length; qi++) {
      const e = queue[qi];
      if (processed >= 500) {
        s.deferredEvents.push(...queue.slice(qi), ...next);
        emit(s, "environment_budget", "", [], {
          processed,
          deferred: s.deferredEvents.length,
        });
        return;
      }
      const index = e.y * s.width + e.x,
        key = `${index}:${e.element}:${e.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      processed++;
      const t = tile(s, e);
      if (!t) continue;
      if (t.kind === "wall" && e.element !== "blast") continue;
      if (e.element === "blast") {
        t.hp -= Math.max(4, e.damage);
        for(const object of s.objects.filter(o=>o.kind==='machine'&&distance(o,e)<=1)){object.hp=Math.max(0,object.hp-(e.damage||6));if(!object.hp)object.powered=false;}
        if (t.kind === "wall" && t.hp <= 0) {
          t.kind = "rubble";
          t.tags = [];
          emit(s, "wall_break", e.source, [], {}, e);
          emit(s, "breach_route", e.source, [], {}, e);
        }
        for (const a of Object.values(s.actors).filter(
          (a) => !a.dead && distance(a, e) <= 1,
        ))
          if (!exposed.has(`${a.id}:blast`)) {
            exposed.add(`${a.id}:blast`);
            hurt(s, a, e.damage || 6, "blast", e.source, true);
          }
        continue;
      }
      if (e.element === "water") {
        if (t.hazards.fire) {
          t.hazards.fire.intensity -= 2;
          if (t.hazards.fire.intensity <= 0) delete t.hazards.fire;
          t.hazards.smoke = {
            intensity: 2,
            duration: 1,
            damage: 0,
            source: e.source,
          };
          emit(s, "extinguish_chain", e.source, [], {}, e);
        }
        if (t.hazards.acid) {
          t.hazards.acid.intensity = Math.max(0, t.hazards.acid.intensity - 1);
          if (t.hazards.acid.intensity === 0) delete t.hazards.acid;
        }
        if (!t.tags.includes("wet")) t.tags.push("wet", "liquid");
        const machine = s.objects.find(
          (o) =>
            o.x === e.x && o.y === e.y && o.kind === "machine" && o.powered,
        );
        if (machine) {
          machine.powered = false;
          machine.disabled = 2;
          next.push({ ...e, element: "shock", damage: 6 });
          emit(s, "short_circuit", e.source, [], { machine: machine.id }, e);
        }
        if (step === 0) emit(s, "flood_room", e.source, [], {}, e);
      }
      if (e.element === "fire") {
        if (t.tags.includes("gas") || t.hazards.poison) {
          delete t.hazards.poison;
          t.tags = t.tags.filter((x) => x !== "gas");
          next.push({ ...e, element: "blast", damage: 8 });
          emit(s, "gas_ignition", e.source, [], {}, e);
        }
        if (t.tags.includes("ice")) {
          t.tags = t.tags.filter((x) => x !== "ice");
          delete t.hazards.cold;
        }
        if (t.tags.includes("volatile")) {
          t.tags = t.tags.filter((x) => x !== "volatile");
          next.push({ ...e, element: "blast", damage: 10 });
          emit(s, "explosion_chain", e.source, [], {}, e);
        }
      }
      if (e.element === "cold" && t.tags.includes("wet")) {
        if (!t.tags.includes("ice")) t.tags.push("ice");
        emit(s, "freeze", e.source, [], {}, e);
      }
      if (e.element === "acid" && t.tags.includes("corrodible")) {
        t.hp -= e.intensity;
        if (t.hp <= 0) t.kind = "rubble";
      }
      if (
        e.element === "shock" &&
        (t.tags.includes("wet") || t.tags.includes("conductive"))
      ) {
        const network = conducted.get(e.source) ?? new Set<number>();
        conducted.set(e.source, network);
        if (network.size >= 8 && !network.has(index)) continue;
        network.add(index);
        if (network.size === 2)
          emit(s, "shock_chain", e.source, [], { tiles: 2 }, e);
        if (network.size < 8)
          for (const n of neighbors(e)) {
            const nt = tile(s, n);
            if (
              nt &&
              (nt.tags.includes("wet") || nt.tags.includes("conductive"))
            )
              next.push({ ...e, ...n });
          }
      }
      const h = t.hazards[e.element];
      t.hazards[e.element] = {
        intensity: Math.max(h?.intensity ?? 0, e.intensity),
        duration: Math.max(h?.duration ?? 0, e.duration),
        damage:
          e.damage ||
          (e.element === "shock"
            ? 4 + e.intensity * 2
            : e.element === "fire"
              ? 2
              : e.element === "poison"
                ? 2
                : e.element === "acid"
                  ? 3
                  : 0),
        source: e.source,
      };
      if (
        step < 3 &&
        ((e.element === "fire" &&
          e.intensity >= 2 &&
          t.tags.includes("flammable")) ||
          (e.element === "water" && e.intensity >= 2) ||
          (e.element === "smoke" && e.intensity >= 2))
      ) {
        for (const n of neighbors(e)) {
          const nt = tile(s, n);
          if (
            nt &&
            nt.kind !== "wall" &&
            (e.element !== "fire" || nt.tags.includes("flammable")) &&
            (e.element !== "water" || nt.elevation <= t.elevation)
          )
            next.push({ ...e, ...n });
        }
      }
    }
    queue = next;
  }
  if (queue.length) {
    s.deferredEvents.push(...queue);
    emit(s, "environment_deferred", "", [], { count: queue.length });
  }
  for (const a of Object.values(s.actors).filter((a) => !a.dead)) {
    const t = tile(s, a);
    if (!t) continue;
    for (const [element, h] of Object.entries(t.hazards)) {
      const key = `${a.id}:${element}`;
      if (exposed.has(key)) continue;
      exposed.add(key);
      if (
        h.damage &&
        a.kind === "crawler" &&
        ["glue_trap", "crusher_plate", "spiked_grate", "trapdoor_pit"].includes(
          h.source,
        )
      )
        emit(s, "trap_trigger_self", a.id, [], { hazard: h.source }, a);
      if(h.source==='conveyor_belt'||h.source==='magnetic_pulse'&&(a.tags.includes('metal')||a.equipment.armor==='steel_wrap')){const next={x:a.x+1,y:a.y};if(walkable(s,next)&&!Object.values(s.actors).some(v=>!v.dead&&same(v,next))){a.x=next.x;a.y=next.y;emit(s,'conveyor',h.source,[a.id],{},next);}}
      if(h.source==='glue_trap')status(a,'chilled',2,1,h.source);
      if(h.source==='crusher_plate'&&s.round%2===1)continue;
      if (h.damage) {
        hurt(s, a, h.damage, element as Element, h.source, true);
        if (element === "fire") status(a, "burning", 2, 3, h.source);
        if (element === "poison") status(a, "poisoned", 3, 2, h.source);
        if (element === "acid" && h.intensity >= 2)
          status(a, "corroded", 2, 2, h.source);
        if (element === "cold" && h.intensity >= 2)
          status(a, "chilled", 1, 1, h.source);
        if (element === "shock" && (t.tags.includes("wet") || h.intensity >= 2))
          status(a, "stunned", 1, 1, h.source);
      }
    }
    if (t.trap && a.kind === "enemy") {
      hurt(s, a, t.trap.damage, "physical", t.trap.owner, true);
      if (a.dead && t.kind === "door")
        emit(s, "door_trap_kill", t.trap.owner, [a.id], {}, a);
      status(a, "chilled", 1, 1, t.trap.owner);
      delete t.trap;
    }
  }
  for (const t of s.tiles)
    for (const [el, h] of Object.entries(t.hazards))
      if (!h.persistent && --h.duration <= 0) {
        delete t.hazards[el];
        if (el === "cold") t.tags = t.tags.filter((x) => x !== "ice");
      }
}
