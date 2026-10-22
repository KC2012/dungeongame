import type {
  State,
  Actor,
  Action,
  Point,
} from "../../../packages/engine/src/types";
import { actionCost, stat } from "../../../packages/engine/src/index";
import { entry } from "../../../packages/content/src/index";
import {
  distance,
  los,
  path,
  tile,
  walkable,
} from "../../../packages/engine/src/grid";
import { accuracy } from "../../../packages/engine/src/combat";
export function weaponFacts(a: Actor) {
  const w = a.equipment.weapon ? entry("items", a.equipment.weapon) : undefined;
  return {
    name: w?.name ?? "Unarmed",
    range: (w?.range ?? 1) + (w?.range === 1 ? stat(a, "reach") : 0),
    accuracy: w?.accuracy ?? 0,
    damage: w?.power ?? 2,
  };
}
/** Only projects local movement/AP. It does not run attacks, roll RNG, or predict enemy/player decisions. */
export function projectPlan(s: State, id: string, actions: Action[]) {
  const actor = { ...s.actors[id] };
  const view = { ...s, tiles: [...s.tiles] };
  let spent = 0;
  const budget = actor.statuses.stunned ? 2 : 3;
  const steps = [
    ...actions.filter((c) => c.type === "MOVE"),
    ...actions.filter((c) => c.type !== "MOVE"),
  ].map((c) => {
    const cost = actionCost(view, actor, c);
    spent += cost;
    if (c.type === "MOVE" && c.x !== undefined && c.y !== undefined) {
      const p = { x: c.x, y: c.y };
      if (distance(actor, p) === 1 && walkable(view, p)) {
        actor.x = p.x;
        actor.y = p.y;
      } else if (distance(actor, p) === 1) {
        const t = tile(view, p);
        if (t?.kind === "door" && !t.open && !t.locked)
          view.tiles[p.y * view.width + p.x] = { ...t, open: true };
      }
    }
    const target = c.target ? s.actors[c.target] : undefined;
    const label =
      c.type === "MOVE"
        ? `Move to ${c.x}, ${c.y}`
        : c.type === "ATTACK"
          ? `Attack ${target?.name ?? "structure"}`
          : c.type === "INTERACT"
            ? `Use ${s.objects.find((o) => o.id === c.id || o.id === c.target)?.name ?? "object"}`
            : c.type === "GUARD"
              ? `Guard · +${2 + stat(actor, "guard")} armor`
              : c.type === "ABILITY" && c.id
                ? entry("abilities", c.id).name
                : c.type === "USE" && c.id
                  ? entry("items", c.id).name
                  : c.type.toLowerCase().replaceAll("_", " ");
    return { action: c, cost, label };
  });
  return {
    view,
    actor,
    spent,
    budget,
    remaining: Math.max(0, budget - spent),
    steps,
  };
}
export function attackPreview(s: State, a: Actor, target: Actor) {
  const w = weaponFacts(a),
    d = distance(a, target),
    clear = los(s, a, target),
    cover = tile(s, target)?.cover ?? 0;
  return {
    ...w,
    distance: d,
    clear,
    cover,
    cost: actionCost(s, a, { type: "ATTACK", target: target.id }),
    chance:
      d <= w.range && clear
        ? accuracy(
            a,
            target,
            w.accuracy,
            cover,
            Math.max(0, d - Math.max(1, w.range - 2)),
          )
        : undefined,
    problem:
      target.kind === "crawler"
        ? "Direct attacks on allies are unavailable."
        : d > w.range
          ? `Out of reach: ${d} tiles away; ${w.name} reaches ${w.range}.`
          : !clear
            ? "Line of sight is blocked."
            : undefined,
  };
}
function knownMap(s: State) {
  return {
    ...s,
    tiles: s.tiles.map((t) =>
      t.explored ? t : { ...t, kind: "wall" as const },
    ),
  };
}
export function movementPath(s: State, from: Point, to: Point, id: string) {
  const route = path(
    knownMap(s),
    from,
    to,
    true,
    Object.values(s.actors).filter((a) => a.id !== id && !a.dead),
  );
  return route.flatMap((p) => {
    const t = tile(s, p);
    return t?.kind === "door" && !t.open && !t.locked ? [p, p] : [p];
  });
}
export function approachAttack(
  s: State,
  id: string,
  queue: Action[],
  target: Actor,
): { actions: Action[]; problem?: string } {
  const plan = projectPlan(s, id, queue),
    preview = attackPreview(plan.view, plan.actor, target),
    attack: Action = { type: "ATTACK", target: target.id };
  if (target.kind === "crawler")
    return { actions: [], problem: preview.problem };
  if (!preview.problem)
    return plan.remaining >= preview.cost
      ? { actions: [attack] }
      : {
          actions: [],
          problem: `Attack needs ${preview.cost} AP; only ${plan.remaining} remain.`,
        };
  const options: { actions: Action[]; cost: number }[] = [];
  for (let y = target.y - preview.range; y <= target.y + preview.range; y++)
    for (let x = target.x - preview.range; x <= target.x + preview.range; x++) {
      const p = { x, y };
      if (
        distance(p, target) > preview.range ||
        !tile(s, p)?.explored ||
        !walkable(s, p) ||
        !los(s, p, target)
      )
        continue;
      const steps = movementPath(plan.view, plan.actor, p, id);
      if (!steps.length) continue;
      const moves = steps.map((p) => ({ type: "MOVE", ...p }) as Action);
      const projected = projectPlan(s, id, [...queue, ...moves, attack]);
      options.push({
        actions: [...moves, attack],
        cost: projected.spent - plan.spent,
      });
    }
  options.sort(
    (a, b) => a.cost - b.cost || a.actions.length - b.actions.length,
  );
  const best = options[0];
  if (!best)
    return {
      actions: [],
      problem: "No known clear approach. Explore or open a route first.",
    };
  if (best.cost > plan.remaining)
    return {
      actions: [],
      problem: `Approach + attack needs ${best.cost} AP (${best.cost - preview.cost} movement + ${preview.cost} attack); only ${plan.remaining} remain. Move closer this round.`,
    };
  if (queue.length + best.actions.length > 4)
    return {
      actions: [],
      problem: "This plan already has four actions. Undo a step first.",
    };
  return { actions: best.actions };
}
