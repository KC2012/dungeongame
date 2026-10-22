import type { Point } from "../../../packages/engine/src/types";
/** Client coordinates -> backing canvas -> current camera. Re-read bounds on every event (scroll/layout/DPR). */
export function pointerTile(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  size: { width: number; height: number },
  world: (x: number, y: number) => Point,
): Point | undefined {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    clientX < rect.left ||
    clientY < rect.top ||
    clientX >= rect.left + rect.width ||
    clientY >= rect.top + rect.height
  )
    return;
  const p = world(
    ((clientX - rect.left) * size.width) / rect.width,
    ((clientY - rect.top) * size.height) / rect.height,
  );
  return { x: Math.floor(p.x / 16), y: Math.floor(p.y / 16) };
}
