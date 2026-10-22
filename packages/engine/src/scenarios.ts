import { scenarioAt } from "../../content/src/scenarios";
import type { Point, State } from "./types";
/** Small off-route situations; never replace a spawn, objective, machine, cache or central walk. */
export function authorSituation(s: State, room: number, base: Point) {
  const scenario = scenarioAt(s.seed, s.floor, room);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const p = { x: base.x + x + 1, y: base.y + y + 1 },
        t = s.tiles[p.y * s.width + p.x],
        ch = scenario.layout[y][x];
      if (!t || t.room !== room) continue;
      if (!t.tags.includes("scene:" + scenario.id))
        t.tags.push("scene:" + scenario.id);
      if (ch === "." || ch === "+" || ch === "M" || ch === "$") continue;
      if (
        s.objects.some((o) => o.x === p.x && o.y === p.y) ||
        Object.values(s.actors).some((a) => a.x === p.x && a.y === p.y)
      )
        continue;
      // Central cross is reserved by the base grammar.
      if (x === 3 || y === 3) continue;
      t.kind = ch === "#" ? "wall" : "floor";
      if (ch === "#") {
        t.hp = 4;
        t.tags.push("solid", "structural", "fragile");
        continue;
      }
      if (ch === "=") {
        t.cover = 2;
        continue;
      }
      if (ch === "v") {
        t.tags.push("volatile", "flammable");
        continue;
      }
      if (ch === "o") {
        t.tags.push("flammable");
        continue;
      }
      const el =
        ch === "~"
          ? "water"
          : ch === "p"
            ? "poison"
            : ch === "a"
              ? "acid"
              : undefined;
      if (!el) continue;
      if (el === "water") t.tags.push("wet", "liquid", "conductive");
      if (el === "poison") t.tags.push("gas");
      t.hazards[el] = {
        intensity: 1,
        duration: 999,
        damage: el === "water" ? 0 : 2,
        source: "world",
        persistent: true,
      };
    }
}
