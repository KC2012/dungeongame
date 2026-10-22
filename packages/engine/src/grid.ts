import type { Point, State, Tile } from "./types";
export const distance = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const neighbors = (p: Point): Point[] => [
  { x: p.x, y: p.y - 1 },
  { x: p.x + 1, y: p.y },
  { x: p.x, y: p.y + 1 },
  { x: p.x - 1, y: p.y },
];
export function tile(
  s: Pick<State, "width" | "height" | "tiles">,
  p: Point,
): Tile | undefined {
  return p.x >= 0 && p.y >= 0 && p.x < s.width && p.y < s.height
    ? s.tiles[p.y * s.width + p.x]
    : undefined;
}
export const walkable = (
  s: Pick<State, "width" | "height" | "tiles">,
  p: Point,
) => {
  const t = tile(s, p);
  return (
    !!t &&
    t.kind !== "wall" &&
    t.kind !== "pit" &&
    (t.kind !== "door" || !!t.open)
  );
};
export const traversable = (
  s: Pick<State, "width" | "height" | "tiles">,
  p: Point,
) => {
  const t = tile(s, p);
  return !!t && t.kind !== "wall" && t.kind !== "pit" && !t.locked;
};
export function los(
  s: Pick<State, "width" | "height" | "tiles">,
  a: Point,
  b: Point,
): boolean {
  let x = a.x,
    y = a.y;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    nx = Math.abs(dx),
    ny = Math.abs(dy),
    sx = Math.sign(dx),
    sy = Math.sign(dy);
  let ix = 0,
    iy = 0;
  const blocked = (p: Point) => {
    const t = tile(s, p);
    return (
      !t ||
      t.kind === "wall" ||
      (t.kind === "door" && !t.open) ||
      (t.hazards.smoke?.intensity ?? 0) >= 2
    );
  };
  while (ix < nx || iy < ny) {
    const cross = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
    if (cross === 0) {
      if (blocked({ x: x + sx, y }) && blocked({ x, y: y + sy })) return false;
      x += sx;
      y += sy;
      ix++;
      iy++;
    } else if (cross < 0) {
      x += sx;
      ix++;
    } else {
      y += sy;
      iy++;
    }
    if (x === b.x && y === b.y) return true;
    if (blocked({ x, y })) return false;
  }
  return true;
}
export function path(
  s: Pick<State, "width" | "height" | "tiles">,
  a: Point,
  b: Point,
  allowDoors = true,
  occupied: Point[] = [],
): Point[] {
  const { width, height, tiles } = s,
    size = width * height;
  if (
    !Number.isInteger(a.x) ||
    !Number.isInteger(a.y) ||
    !Number.isInteger(b.x) ||
    !Number.isInteger(b.y) ||
    a.x < 0 ||
    a.y < 0 ||
    b.x < 0 ||
    b.y < 0 ||
    a.x >= width ||
    b.x >= width ||
    a.y >= height ||
    b.y >= height
  )
    return [];
  const start = a.y * width + a.x,
    end = b.y * width + b.x;
  if (start === end) return [];
  const blocked = new Uint8Array(size);
  for (const p of occupied)
    if (p.x >= 0 && p.y >= 0 && p.x < width && p.y < height)
      blocked[p.y * width + p.x] = 1;
  const parent = new Int32Array(size);
  parent.fill(-2);
  parent[start] = -1;
  const queue = new Int32Array(size);
  queue[0] = start;
  let head = 0,
    tail = 1;
  const visit = (next: number, prev: number) => {
    if (next < 0 || next >= size || parent[next] !== -2 || blocked[next])
      return;
    const t = tiles[next];
    if (
      t.kind === "wall" ||
      t.kind === "pit" ||
      t.locked ||
      (!allowDoors && t.kind === "door" && !t.open)
    )
      return;
    parent[next] = prev;
    queue[tail++] = next;
  };
  while (head < tail) {
    const i = queue[head++];
    if (i === end) {
      const result: Point[] = [];
      let n = i;
      while (n !== start) {
        result.push({ x: n % width, y: Math.floor(n / width) });
        n = parent[n];
      }
      return result.reverse();
    }
    const x = i % width;
    visit(i - width, i);
    if (x < width - 1) visit(i + 1, i);
    visit(i + width, i);
    if (x > 0) visit(i - 1, i);
  }
  return [];
}
