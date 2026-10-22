import type { State, Tile } from "./types";
/** Optional first-floor teaching arrangement. Uses existing actors/items/material rules, never client-local simulation. */
export function guidedFirstFloor(s: State) {
  if (s.floor !== 1 || s.counters.guidedFloor !== 1) return;
  const at = (x: number, y: number) => s.tiles[y * s.width + x];
  // Arrival stays quiet; the first encounter has one existing forgiving pursuer.
  for (let y = 5; y <= 11; y++)
    for (let x = 19; x <= 25; x++) {
      const t = at(x, y);
      t.kind = "floor";
      t.hazards = {};
      t.tags = [];
      t.cover = 0;
    }
  for (const id of Object.keys(s.actors))
    if (id.startsWith("f1_e1_") && id !== "f1_e1_0") delete s.actors[id];
  const first = s.actors.f1_e1_0;
  if (first) {
    first.catalogId = "turnstile_rat";
    first.name = "Turnstile Rat";
    first.x = 21;
    first.y = 10;
    const members = Object.values(s.actors).filter(
      (a) => a.kind === "crawler" && !a.dead,
    ).length;
    first.hp = first.maxHP = Math.ceil(8 * (1 + 0.32 * (members - 1)));
    first.stats.armor = 0;
    first.tags = ["organic"];
  }
  at(22, 9).cover = 2;
  at(24, 9).cover = 2;
  const supplies = s.objects.find((o) => o.id === "cache_0");
  if (supplies) supplies.name = "Arrival supplies";
  // The next real encounter teaches wet conduction. Water itself is harmless; the source starts off.
  const relay = s.objects.find((o) => o.id === "generator_2");
  if (relay) {
    relay.x = 36;
    relay.y = 9;
    relay.powered = false;
    relay.name = "Flooded relay";
  }
  for (let y = 5; y <= 11; y++)
    for (let x = 33; x <= 39; x++) {
      const t = at(x, y);
      t.kind = "floor";
      t.hazards = {};
      t.cover = 0;
      t.tags = ["scene:flooded_relay"];
    }
  for (const [x, y] of [
    [35, 9],
    [36, 9],
    [37, 9],
    [35, 10],
    [36, 10],
    [37, 10],
    [38, 9],
  ]) {
    const t = at(x, y);
    t.tags.push("wet", "liquid", "conductive");
    t.hazards.water = {
      intensity: 1,
      duration: 999,
      damage: 0,
      source: "world",
      persistent: true,
    };
  }
  const sentry = s.actors.f1_e2_0;
  if (sentry) {
    sentry.catalogId = "queue_warden";
    sentry.name = "Queue Warden";
    sentry.x = 35;
    sentry.y = 10;
    sentry.tags = ["metal"];
    sentry.stats.armor = 2;
    sentry.hp = sentry.maxHP = 15;
  }
  at(34, 8).cover = 2;
  at(35, 10).cover = 1;
  // No object is moved onto a wall and the ordinary central route stays dry.
  for (const o of s.objects) {
    const t = at(o.x, o.y);
    if (t.kind === "wall") t.kind = "floor";
  }
}
