/** Original 16×16 pixel assets. Integer rectangles only; generated once, no network/art dependencies. */
export const palette = {
  ".": "",
  k: "#0d171e",
  s: "#253640",
  m: "#536873",
  l: "#8fa7ac",
  w: "#d9e9df",
  y: "#f3d58b",
  o: "#c78b46",
  r: "#c85d51",
  d: "#743e3b",
  b: "#447b9a",
  c: "#75d5df",
  g: "#8eaf69",
  p: "#a88ac1",
  a: "#c4d16a",
  f: "#ee934d",
  i: "#a4dce4",
} as const;
export type Ink = keyof typeof palette;
export const spriteNames = [
  "crawler",
  "rat",
  "gunner",
  "sentry",
  "flanker",
  "hazard",
  "summoner",
  "support",
  "charger",
  "skirmisher",
  "boss1",
  "boss2",
  "boss3",
  "boss4",
  "boss5",
  "boss6",
  "cache",
  "cacheOpen",
  "machine",
  "machineOff",
  "terminal",
  "device",
  "deviceDone",
  "stairs",
  "safe",
  "secret",
  "barrel",
  "cover",
  "water",
  "oil",
  "gas",
  "fire",
  "shock",
  "ice",
  "acid",
  "smoke",
  "pit",
  "rubble",
  "trap",
] as const;
export type SpriteName = (typeof spriteNames)[number];
export function spritePixels(name: SpriteName): Ink[][] {
  const p = Array.from({ length: 16 }, () => Array<Ink>(16).fill("."));
  const rect = (x: number, y: number, w: number, h: number, c: Ink) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (p[yy]?.[xx] !== undefined) p[yy][xx] = c;
  };
  const box = (x: number, y: number, w: number, h: number, c: Ink) => {
    rect(x, y, w, h, "k");
    rect(x + 1, y + 1, w - 2, h - 2, c);
  };
  const actor = (body: Ink) => {
    rect(4, 13, 3, 2, "k");
    rect(9, 13, 3, 2, "k");
    box(4, 6, 8, 7, body);
    rect(2, 7, 2, 5, body);
    rect(12, 7, 2, 5, body);
    box(4, 1, 8, 6, body);
    rect(5, 3, 6, 2, "c");
  };
  if (name === "crawler") {
    actor("o");
    rect(5, 1, 6, 1, "y");
    rect(2, 7, 2, 2, "y");
    rect(12, 7, 2, 2, "y");
    rect(6, 8, 4, 3, "m");
    rect(12, 10, 3, 3, "l");
  } else if (name === "rat") {
    box(3, 7, 10, 6, "d");
    rect(2, 9, 2, 3, "r");
    rect(11, 6, 3, 4, "r");
    rect(12, 7, 1, 1, "y");
    rect(1, 11, 3, 1, "l");
    for (const x of [4, 10]) rect(x, 12, 2, 3, "k");
    rect(3, 6, 2, 2, "r");
  } else if (name === "gunner") {
    rect(1, 4, 14, 2, "m");
    rect(2, 3, 3, 1, "l");
    rect(11, 3, 3, 1, "l");
    box(4, 5, 8, 7, "s");
    rect(5, 7, 6, 2, "r");
    rect(7, 11, 2, 4, "l");
    rect(10, 10, 5, 2, "l");
    rect(3, 13, 3, 1, "c");
    rect(10, 13, 3, 1, "c");
  } else if (name === "sentry") {
    actor("m");
    box(1, 6, 7, 9, "s");
    rect(2, 7, 5, 2, "l");
    rect(3, 10, 3, 3, "r");
    rect(12, 5, 2, 8, "l");
    rect(11, 4, 4, 2, "k");
  } else if (["flanker", "charger", "skirmisher"].includes(name)) {
    actor("d");
    rect(4, 2, 8, 2, "r");
    if (name === "charger") {
      rect(1, 3, 3, 7, "r");
      rect(12, 3, 3, 7, "r");
      rect(5, 9, 6, 2, "l");
    } else {
      rect(1, 10, 3, 3, "l");
      rect(12, 10, 3, 3, "l");
      if (name === "skirmisher") rect(11, 7, 5, 2, "y");
      else rect(1, 7, 2, 6, "w");
    }
  } else if (name === "support") {
    actor("p");
    rect(6, 7, 4, 6, "w");
    rect(5, 9, 6, 2, "w");
    rect(7, 8, 2, 4, "r");
    rect(6, 9, 4, 2, "r");
  } else if (name === "hazard" || name === "summoner") {
    actor(name === "hazard" ? "g" : "p");
    rect(0, 6, 4, 7, name === "hazard" ? "a" : "p");
    rect(12, 6, 4, 7, name === "hazard" ? "a" : "p");
    if (name === "summoner") {
      rect(3, 0, 2, 3, "p");
      rect(11, 0, 2, 3, "p");
      rect(7, 0, 2, 2, "w");
    } else {
      rect(1, 8, 2, 3, "k");
      rect(13, 8, 2, 3, "k");
    }
  } else if (name.startsWith("boss")) {
    const n = Number(name.at(-1));
    box(3, 1, 10, 13, n === 3 ? "g" : n === 6 ? "b" : "d");
    rect(0, 5, 4, 9, "m");
    rect(12, 5, 4, 9, "m");
    rect(5, 4, 6, 2, "y");
    rect(6, 8, 4, 4, n === 6 ? "c" : "r");
    rect(3, 14, 4, 2, "k");
    rect(9, 14, 4, 2, "k");
    if (n === 1) rect(1, 8, 6, 6, "l");
    if (n === 2) {
      rect(0, 12, 2, 4, "y");
      rect(14, 12, 2, 4, "y");
    }
    if (n === 3) {
      rect(0, 2, 6, 3, "g");
      rect(10, 2, 6, 3, "g");
    }
    if (n === 4) {
      rect(0, 0, 16, 2, "l");
      rect(7, 1, 2, 4, "k");
    }
    if (n === 5) rect(1, 9, 5, 5, "w");
    if (n === 6) {
      rect(0, 1, 2, 6, "c");
      rect(14, 1, 2, 6, "c");
      rect(7, 0, 2, 3, "c");
    }
  } else if (name === "cache" || name === "cacheOpen") {
    box(2, 5, 12, 9, "o");
    rect(3, 6, 10, 2, "y");
    rect(3, 10, 10, 1, "d");
    rect(7, 8, 2, 4, "l");
    if (name === "cacheOpen") {
      box(2, 1, 12, 5, "o");
      rect(4, 6, 8, 3, "k");
      rect(6, 7, 4, 1, "y");
    }
  } else if (name === "machine" || name === "machineOff") {
    box(2, 3, 12, 11, "m");
    rect(3, 2, 10, 2, "l");
    rect(5, 0, 2, 3, "s");
    rect(4, 5, 6, 5, "k");
    rect(5, 6, 4, 3, name === "machine" ? "c" : "s");
    for (let y = 5; y <= 11; y += 2) rect(11, y, 2, 1, "k");
    rect(3, 12, 2, 2, "k");
    rect(11, 12, 2, 2, "k");
    rect(6, 12, 3, 1, name === "machine" ? "y" : "r");
  } else if (
    name === "terminal" ||
    name === "device" ||
    name === "deviceDone"
  ) {
    box(3, 1, 10, 10, "s");
    rect(
      4,
      2,
      8,
      6,
      name === "device" ? "p" : name === "deviceDone" ? "s" : "b",
    );
    rect(5, 3, 5, 1, "w");
    rect(5, 5, 3, 1, "c");
    rect(6, 11, 4, 2, "m");
    box(2, 12, 12, 3, "m");
    rect(4, 13, 7, 1, "l");
    if (name === "device") rect(0, 4, 2, 8, "p");
  } else if (name === "stairs") {
    for (let i = 0; i < 5; i++) {
      rect(2 + i, 2 + i * 2, 12 - i * 2, 2, "s");
      rect(2 + i, 2 + i * 2, 12 - i * 2, 1, "l");
    }
    rect(6, 13, 4, 2, "y");
  } else if (name === "safe") {
    box(1, 1, 14, 14, "s");
    box(3, 3, 10, 12, "g");
    rect(7, 4, 2, 6, "w");
    rect(5, 6, 6, 2, "w");
    rect(5, 12, 6, 3, "k");
  } else if (name === "secret") {
    box(3, 3, 10, 11, "s");
    rect(4, 4, 8, 2, "l");
    rect(5, 8, 6, 1, "p");
    rect(7, 9, 2, 3, "y");
  } else if (name === "barrel") {
    box(4, 1, 8, 14, "r");
    rect(3, 3, 10, 2, "k");
    rect(3, 11, 10, 2, "k");
    rect(5, 6, 6, 4, "y");
    rect(7, 6, 2, 3, "k");
    rect(7, 10, 2, 1, "k");
  } else if (name === "cover") {
    box(1, 7, 8, 8, "m");
    box(8, 5, 7, 10, "s");
    rect(2, 9, 6, 1, "l");
    rect(9, 7, 5, 1, "l");
  } else if (name === "water" || name === "oil" || name === "acid") {
    rect(0, 0, 16, 16, name === "water" ? "b" : name === "acid" ? "g" : "k");
    for (let y = 2; y < 16; y += 4) {
      rect(
        (y * 3) % 7,
        y,
        6,
        1,
        name === "water" ? "c" : name === "acid" ? "a" : "p",
      );
      rect(10, y + 1, 3, 1, name === "oil" ? "b" : "l");
    }
  } else if (name === "gas" || name === "smoke") {
    for (const [x, y, w, h] of [
      [2, 3, 8, 5],
      [6, 6, 8, 6],
      [0, 9, 8, 5],
    ]) {
      rect(x, y, w, h, name === "gas" ? "p" : "m");
      rect(x + 1, y, w - 2, 1, name === "gas" ? "l" : "s");
    }
  } else if (name === "fire") {
    for (let i = 0; i < 4; i++) {
      rect(2 + i * 3, 5 - (i % 2) * 3, 3, 10, "r");
      rect(3 + i * 3, 7 - (i % 2) * 3, 1, 7, "f");
    }
    rect(5, 10, 6, 5, "y");
  } else if (name === "shock") {
    for (let i = 0; i < 6; i++) {
      rect(10 - i, 1 + i, 3, 2, "y");
      rect(5 + i, 8 + i, 2, 2, "w");
    }
  } else if (name === "ice") {
    rect(0, 0, 16, 16, "b");
    for (let i = 1; i < 15; i++) {
      rect(i, 15 - i, 1, 1, "w");
      rect(i, i, 1, 1, "c");
    }
    rect(2, 2, 6, 1, "i");
    rect(10, 12, 4, 1, "i");
  } else if (name === "pit") {
    rect(0, 0, 16, 16, "s");
    rect(1, 2, 14, 13, "k");
    rect(2, 2, 12, 1, "m");
    rect(3, 4, 10, 1, "s");
    rect(5, 6, 6, 1, "s");
  } else if (name === "rubble") {
    for (const [x, y] of [
      [2, 3],
      [8, 7],
      [4, 11],
      [11, 2],
    ]) {
      rect(x, y, 4, 3, "m");
      rect(x, y, 3, 1, "l");
    }
  } else if (name === "trap") {
    rect(1, 4, 14, 8, "m");
    for (let x = 2; x < 14; x += 3) {
      rect(x, 2, 1, 12, "l");
      rect(x, 6, 1, 2, "r");
    }
  }
  return p;
}
