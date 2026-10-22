import type { State, Point } from "../../../packages/engine/src/types";
import { neighbors, tile } from "../../../packages/engine/src/grid";
/** Restrained known-network estimate only; never examines hidden tiles or applies outcomes. */
export function knownConduction(s: State, start: Point): Point[] {
  const first = tile(s, start);
  if (!first?.explored) return [];
  if (!first.tags.includes("wet") && !first.tags.includes("conductive"))
    return [start];
  const points = [start],
    seen = new Set([`${start.x}:${start.y}`]);
  for (let i = 0; i < points.length && points.length < 8; i++)
    for (const p of neighbors(points[i])) {
      const t = tile(s, p),
        key = `${p.x}:${p.y}`;
      if (
        t?.explored &&
        t.kind !== "wall" &&
        (t.tags.includes("wet") || t.tags.includes("conductive")) &&
        !seen.has(key) &&
        points.length < 8
      ) {
        points.push(p);
        seen.add(key);
      }
    }
  return points;
}
