import { it, expect } from "vitest";
import {
  spriteNames,
  spritePixels,
  palette,
} from "../../apps/client/src/assets";
import { pointerTile } from "../../apps/client/src/pointer";
it("generates distinct original pixel assets for actors, objects and materials", () => {
  const keys = new Set<string>();
  for (const name of spriteNames) {
    const p = spritePixels(name);
    expect(p).toHaveLength(16);
    expect(
      p.every((r) => r.length === 16 && r.every((c) => c in palette)),
    ).toBe(true);
    keys.add(JSON.stringify(p));
    expect(spritePixels(name)).toEqual(p);
  }
  expect(keys.size).toBe(spriteNames.length);
});
it("pointer conversion follows live scrolled/scaled canvas bounds and camera zoom", () => {
  const world = (x: number, y: number) => ({ x: x / 3 + 80, y: y / 3 + 48 });
  expect(
    pointerTile(
      250,
      220,
      { left: 100, top: 100, width: 600, height: 300 },
      { width: 600, height: 300 },
      world,
    ),
  ).toEqual({ x: 8, y: 5 });
  expect(
    pointerTile(
      400,
      260,
      { left: 100, top: 20, width: 1200, height: 600 },
      { width: 600, height: 300 },
      world,
    ),
  ).toEqual({ x: 8, y: 5 });
  expect(
    pointerTile(
      99,
      100,
      { left: 100, top: 100, width: 600, height: 300 },
      { width: 600, height: 300 },
      world,
    ),
  ).toBeUndefined();
});
