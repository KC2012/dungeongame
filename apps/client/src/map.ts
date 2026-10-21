import Phaser from "phaser";
import type { State, Actor, Point } from "../../../packages/engine/src/types";
export class DungeonScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[] = [];
  snapshot?: State;
  actorId = "";
  target?: Point;
  queued: Point[] = [];
  choose: (p: Point) => void = () => {};
  zoom = 2;
  constructor() {
    super("dungeon");
  }
  create() {
    this.graphics = this.add.graphics();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.choose({ x: Math.floor(w.x / 16), y: Math.floor(w.y / 16) });
    });
    this.input.on(
      "wheel",
      (_p: unknown, _g: unknown, _dx: number, dy: number) => {
        this.zoom = Phaser.Math.Clamp(
          this.zoom + (dy < 0 ? 0.25 : -0.25),
          1,
          4,
        );
        this.paint();
      },
    );
    this.paint();
  }
  setState(s: State, id: string, target: Point | undefined, queued: Point[]) {
    this.snapshot = s;
    this.actorId = id;
    this.target = target;
    this.queued = queued;
    this.paint();
  }
  paint() {
    if (!this.graphics || !this.snapshot) return;
    const s = this.snapshot,
      g = this.graphics;
    g.clear();
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    const label = (x: number, y: number, v: string, color = "#e9dfb5") => {
      this.texts.push(
        this.add
          .text(x * 16 + 8, y * 16 + 8, v, {
            fontFamily: "monospace",
            fontSize: "10px",
            color,
          })
          .setOrigin(0.5),
      );
    };
    const colors = [0x89735a, 0x748c70, 0x7e81a1, 0x768d99, 0x9b796b, 0x989274];
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const t = s.tiles[y * s.width + x];
        if (!t.explored) {
          g.fillStyle(0x0c110f);
          g.fillRect(x * 16, y * 16, 16, 16);
          continue;
        }
        g.fillStyle(
          t.kind === "wall"
            ? 0x45483c
            : t.kind === "rubble"
              ? 0x555044
              : 0x252d25,
        );
        g.fillRect(x * 16, y * 16, 16, 16);
        if (t.kind === "wall") {
          g.fillStyle(0x5b5c4b);
          g.fillRect(x * 16 + 1, y * 16 + 1, 14, 3);
          g.lineStyle(1, 0x30382b);
          g.strokeRect(x * 16, y * 16, 16, 16);
        } else {
          g.fillStyle(0x313c2d);
          g.fillRect(x * 16 + ((x + y) % 3) + 3, y * 16 + 13, 3, 1);
        }
        if (t.cover) {
          g.fillStyle(0x777963);
          g.fillRect(x * 16 + 3, y * 16 + 5, 10, 7);
          label(x, y, "=");
        }
        if (t.kind === "door") {
          g.fillStyle(0xa88e5e);
          g.fillRect(x * 16 + 1, y * 16 + 2, t.open ? 3 : 13, 12);
        }
        for (const [el, h] of Object.entries(t.hazards)) {
          const c: Record<string, number> = {
            water: 0x547e97,
            shock: 0xe4cd67,
            fire: 0xc48151,
            acid: 0x98ab64,
            poison: 0x9082ad,
            cold: 0x8cbfc1,
            smoke: 0x888c80,
          };
          g.fillStyle(c[el] ?? 0x999966, 0.6);
          g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
          label(
            x,
            y,
            (
              {
                water: "~",
                shock: "Z",
                fire: "!",
                acid: "A",
                poison: "P",
                cold: "*",
                smoke: "S",
              } as Record<string, string>
            )[el] ?? "!",
          );
        }
        if (t.trap) label(x, y, "^");
      }
    for (const o of s.objects) {
      if (!s.tiles[o.y * s.width + o.x]?.explored) continue;
      g.fillStyle(
        o.done
          ? 0x465347
          : {
              objective: 0xc2ac74,
              alternate: 0x9b9ac9,
              safe: 0x8eae8a,
              exit: 0xcbc7a0,
              cache: 0xa98a5a,
              machine: 0x7b9da1,
              secret: 0x77876a,
            }[o.kind],
      );
      g.fillRect(o.x * 16 + 3, o.y * 16 + 3, 10, 10);
      label(
        o.x,
        o.y,
        {
          objective: "?",
          alternate: "#",
          safe: "+",
          exit: ">",
          cache: "$",
          machine: "O",
          secret: "*",
        }[o.kind],
        "#151b15",
      );
    }
    for (const a of Object.values(s.actors)) {
      for (const p of a.telegraph) {
        if (!s.tiles[p.y * s.width + p.x]?.explored) continue;
        g.lineStyle(1, 0xf0aa73);
        g.strokeRect(p.x * 16 + 1, p.y * 16 + 1, 14, 14);
        label(p.x, p.y, "!", "#ffd7a1");
      }
      if (a.dead) continue;
      const party = Object.values(s.actors).filter((v) => v.kind === "crawler");
      g.fillStyle(
        a.kind === "crawler"
          ? colors[party.indexOf(a) % 4]
          : a.tags.includes("boss")
            ? 0xc69b78
            : 0xa76859,
      );
      g.fillRect(a.x * 16 + 4, a.y * 16 + 2, 8, 5);
      g.fillRect(a.x * 16 + 3, a.y * 16 + 7, 10, 6);
      g.fillRect(a.x * 16 + 4, a.y * 16 + 13, 3, 2);
      g.fillRect(a.x * 16 + 9, a.y * 16 + 13, 3, 2);
      g.fillStyle(0x171e17);
      g.fillRect(a.x * 16 + 5, a.y * 16 + 4, 2, 2);
      g.fillRect(a.x * 16 + 9, a.y * 16 + 4, 2, 2);
      g.fillStyle(0x364533);
      g.fillRect(a.x * 16 + 1, a.y * 16, 14, 1);
      g.fillStyle(0xc6d197);
      g.fillRect(a.x * 16 + 1, a.y * 16, (14 * a.hp) / a.maxHP, 1);
      if (a.downed) label(a.x, a.y, "+", "#ffce92");
      if (a.id === this.actorId) {
        g.lineStyle(1, 0xffdb87);
        g.strokeRect(a.x * 16, a.y * 16, 16, 16);
      }
    }
    for (const p of this.queued) {
      g.lineStyle(1, 0xa5cc94);
      g.strokeRect(p.x * 16 + 3, p.y * 16 + 3, 10, 10);
    }
    if (this.target) {
      g.lineStyle(1, 0xf7e2a8);
      g.strokeRect(this.target.x * 16, this.target.y * 16, 16, 16);
    }
    const a =
      s.actors[this.actorId] ??
      Object.values(s.actors).find((a) => a.kind === "crawler" && !a.dead);
    if (a) {
      this.cameras.main.setBounds(0, 0, s.width * 16, s.height * 16);
      this.cameras.main.setZoom(this.zoom);
      this.cameras.main.centerOn(a.x * 16 + 8, a.y * 16 + 8);
    }
  }
}
