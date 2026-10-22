/** Authored situations assembled with existing tile/material mechanics. No new effect vocabulary. */
export const scenarios = [
  {
    id: "flooded_relay",
    name: "Flooded relay",
    glyph: "~Z",
    situation:
      "A powered relay stands in standing water. The dry service walk still reaches the cache.",
    possibilities:
      "Disable the relay, energize the water, or draw enemies onto the wet floor.",
    // Seven by seven interior; + is dry service cross, M is existing machine, $ is existing cache.
    layout: [
      ".......",
      ".......",
      "...+...",
      "..$+...",
      "...+~~~",
      "...+~M~",
      "...+...",
    ],
  },
  {
    id: "volatile_stores",
    name: "Volatile stores",
    glyph: "!!",
    situation:
      "Leaking fuel and a volatile container surround a still-powered loading machine.",
    possibilities:
      "Ignite the stores from cover, disable machinery, or take the dry route to the supplies.",
    layout: [
      ".......",
      ".oo....",
      "...+...",
      "..$+...",
      "...+vv.",
      "...+vM.",
      "...+...",
    ],
  },
  {
    id: "barricaded_checkpoint",
    name: "Abandoned checkpoint",
    glyph: "==",
    situation:
      "A broken firing line overlooks abandoned supplies. Its walls are brittle and its cover remains usable.",
    possibilities:
      "Use the barricades, break a side wall, flank along the service walk, or recover the supplies.",
    layout: [
      ".##....",
      ".......",
      "...+...",
      "..$+...",
      ".==+==.",
      "...+.M.",
      "...+...",
    ],
  },
  {
    id: "sealed_spill",
    name: "Sealed spill",
    glyph: "PA",
    situation:
      "A chemical spill is trapped behind a damaged partition. A clear route leads past it.",
    possibilities:
      "Breach the partition, ignite the combustible vapor, dilute the acid, or leave it sealed.",
    layout: [
      "....pp.",
      "....##.",
      "...+...",
      "..$+...",
      "...+aa.",
      "...+.M.",
      "...+...",
    ],
  },
] as const;
export function scenarioAt(seed: number, floor: number, room: number) {
  return scenarios[
    (((Math.trunc(seed) + floor * 7 + room * 3) % scenarios.length) +
      scenarios.length) %
      scenarios.length
  ];
}
