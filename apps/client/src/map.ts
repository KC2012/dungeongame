import Phaser from "phaser";
import type { State, Actor, Point } from "../../../packages/engine/src/types";
import { PresentationStream } from "./presentation";
import { WorldEffects } from "./effects";
import { scenarios } from "../../../packages/content/src/scenarios";
export class DungeonScene extends Phaser.Scene {
  stream = new PresentationStream();
  effects?: WorldEffects;
  reducedMotion = false;
  graphics!: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[] = [];
  snapshot?: State;
  actorId = "";
  spectateId = "";
  target?: Point;
  queued: Point[] = [];
  choose: (p: Point) => void = () => {};
  hover: (p: Point) => void = () => {};
  previewRadius = 0;
  zoom = 2;
  constructor() {
    super("dungeon");
  }
  create() {
    this.graphics = this.add.graphics();
    this.effects = new WorldEffects(this);
    // Camera viewport dimensions change before this Scale event is dispatched.
    // Recenter immediately instead of waiting for another authority snapshot.
    const resize = () => this.paint();
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, resize),
    );
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.hover({ x: Math.floor(w.x / 16), y: Math.floor(w.y / 16) });
    });
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
    const cues = this.stream.accept(s);
    if (
      this.snapshot &&
      (this.snapshot.floor !== s.floor || this.snapshot.runId !== s.runId)
    )
      this.effects?.clear();
    this.effects?.enqueue(cues);
    this.snapshot = s;
    this.actorId = id;
    this.target = target;
    this.queued = queued;
    this.paint();
  }
  update() {
    if (!this.effects) return;
    this.effects.reducedMotion = this.reducedMotion;
    // Paint interpolation only while a short movement cue is live.
    if (this.effects.count) this.paint();
    this.effects.update();
    const canvas = this.game.canvas;
    canvas.dataset.visualCues = String(this.effects.total);
    canvas.dataset.activeEffects = String(this.effects.count);
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
            stroke: "#121812",
            strokeThickness: 2,
          })
          .setOrigin(0.5),
      );
    };
    const colors = [
      0x89735a, 0x748c70, 0x7e81a1, 0x768d99, 0x9b796b, 0x989274, 0xd2ad55,
      0xa89acb,
    ];
    const theme = [
      { wall: 0x45483c, top: 0x5b5c4b, floor: 0x252d25, mark: 0x414b37 },
      { wall: 0x545043, top: 0x726b52, floor: 0x2d3025, mark: 0x5d6540 },
      { wall: 0x4c4655, top: 0x70647c, floor: 0x282530, mark: 0x4b5f4a },
      { wall: 0x414c54, top: 0x627984, floor: 0x222c31, mark: 0x4e6068 },
      { wall: 0x58483d, top: 0x7c6751, floor: 0x302621, mark: 0x66533d },
      { wall: 0x3d5553, top: 0x5c8276, floor: 0x1d302d, mark: 0x426b5c },
    ][s.floor - 1];
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
            ? theme.wall
            : t.kind === "rubble"
              ? 0x555044
              : theme.floor,
        );
        g.fillRect(x * 16, y * 16, 16, 16);
        if (t.kind === "wall") {
          g.fillStyle(theme.top);
          g.fillRect(x * 16 + 1, y * 16 + 1, 14, 3);
          g.lineStyle(1, 0x30382b);
          g.strokeRect(x * 16, y * 16, 16, 16);
        } else {
          g.fillStyle(theme.mark);
          g.fillRect(x * 16 + ((x + y) % 3) + 3, y * 16 + 13, 3, 1);
          if (s.floor === 4 && (x % 14 === 8 || y % 14 === 8)) {
            g.lineStyle(1, theme.mark);
            if (x % 14 === 8) {
              g.lineBetween(x * 16 + 4, y * 16, x * 16 + 4, y * 16 + 16);
              g.lineBetween(x * 16 + 11, y * 16, x * 16 + 11, y * 16 + 16);
            } else {
              g.lineBetween(x * 16, y * 16 + 4, x * 16 + 16, y * 16 + 4);
              g.lineBetween(x * 16, y * 16 + 11, x * 16 + 16, y * 16 + 11);
            }
          }
          if (s.floor === 6 && (x + y) % 3 === 0) {
            g.lineStyle(1, theme.mark);
            g.lineBetween(x * 16 + 3, y * 16 + 4, x * 16 + 11, y * 16 + 4);
            g.lineBetween(x * 16 + 11, y * 16 + 4, x * 16 + 11, y * 16 + 9);
          }
          if (s.floor === 3 && (x + y) % 4 === 0) {
            g.fillCircle(x * 16 + 4, y * 16 + 5, 2);
            g.fillCircle(x * 16 + 8, y * 16 + 3, 1);
          }
          if (s.floor === 5 && (x + y) % 3 === 0) {
            g.fillRect(x * 16 + 3, y * 16 + 3, 6, 1);
            g.fillRect(x * 16 + 3, y * 16 + 5, 4, 1);
          }
        }
        if (t.tags.includes("volatile")) {
          g.fillStyle(0xb5744f);
          g.fillRect(x * 16 + 4, y * 16 + 3, 8, 10);
          label(x, y, "!", "#ffdeb0");
        } else if (t.tags.includes("flammable")) {
          g.fillStyle(0x8c7950);
          g.fillRect(x * 16 + 3, y * 16 + 11, 10, 2);
        }
        if (t.tags.includes("gas") && !t.hazards.poison)
          label(x, y, "P", "#c4a3de");
        if (t.tags.includes("ice")) {
          g.lineStyle(1, 0xb1ebef);
          g.lineBetween(x * 16 + 2, y * 16 + 12, x * 16 + 12, y * 16 + 2);
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
    const named = new Set<number>();
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      if (!t.explored || named.has(t.room)) continue;
      const scenario = scenarios.find((v) => t.tags.includes("scene:" + v.id));
      if (!scenario) continue;
      named.add(t.room);
      const base = t.room === 2 ? { x: 36, y: 4 } : { x: 22, y: 32 };
      if (s.tiles[base.y * s.width + base.x]?.explored)
        label(base.x, base.y, scenario.name.toUpperCase(), "#c9c5a4");
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
      if (o.kind === "machine") {
        g.lineStyle(1, o.powered && !o.disabled ? 0xf7e77d : 0x688475);
        g.strokeRect(o.x * 16 + 1, o.y * 16 + 1, 14, 14);
      }
      label(
        o.x,
        o.y,
        {
          objective: "?",
          alternate: "#",
          safe: "+",
          exit: ">",
          cache: "$",
          machine: o.powered && !o.disabled ? "Z" : "−",
          secret: "*",
        }[o.kind],
        "#151b15",
      );
    }
    for (const actor of Object.values(s.actors)) {
      const a = {
        ...actor,
        ...(this.effects?.position(actor.id, actor) ?? actor),
      };
      for (const p of a.telegraph) {
        if (!s.tiles[p.y * s.width + p.x]?.explored) continue;
        g.fillStyle(0xd46736, 0.35);
        g.fillRect(p.x * 16, p.y * 16, 16, 16);
        g.lineStyle(1, 0xffb77a);
        g.strokeRect(p.x * 16 + 1, p.y * 16 + 1, 14, 14);
        g.lineBetween(p.x * 16 + 2, p.y * 16 + 2, p.x * 16 + 14, p.y * 16 + 14);
        g.lineBetween(p.x * 16 + 14, p.y * 16 + 2, p.x * 16 + 2, p.y * 16 + 14);
        label(p.x, p.y, "!", "#ffd7a1");
      }
      if (a.dead) {
        g.lineStyle(1, 0x8f8173);
        g.lineBetween(a.x * 16 + 4, a.y * 16 + 5, a.x * 16 + 12, a.y * 16 + 13);
        g.lineBetween(a.x * 16 + 12, a.y * 16 + 5, a.x * 16 + 4, a.y * 16 + 13);
        continue;
      }
      const party = Object.values(s.actors).filter((v) => v.kind === "crawler");
      const slot = party.findIndex((v) => v.id === a.id);
      g.fillStyle(
        a.kind === "crawler"
          ? colors[a.palette ?? slot % 4]
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
      label(
        a.x,
        a.y,
        a.kind === "crawler"
          ? String(slot + 1)
          : a.tags.includes("boss")
            ? "B"
            : "E",
      );
      if (a.downed) label(a.x, a.y, "+" + a.downed, "#ffce92");
      const glyphs: Record<string, string> = {
        burning: "!",
        stunned: "Z",
        poisoned: "P",
        chilled: "*",
        corroded: "A",
        exposed: "v",
        hidden: "?",
      };
      const status = Object.keys(a.statuses)
        .map((k) => glyphs[k] ?? "+")
        .join("");
      if (status) label(a.x, a.y - 0.65, status, "#c6e5dc");
      if (a.shield || a.guard) {
        g.lineStyle(1, 0x9ec8db);
        g.strokeRect(a.x * 16 + 1, a.y * 16 + 2, 14, 13);
      }
      if (a.id === this.actorId) {
        g.lineStyle(1, 0xffdb87);
        g.strokeRect(a.x * 16, a.y * 16, 16, 16);
      }
    }
    for (const p of this.queued) {
      g.lineStyle(1, 0xa5cc94);
      g.strokeRect(p.x * 16 + 3, p.y * 16 + 3, 10, 10);
    }
    if (this.target && this.previewRadius) {
      for (let y = -this.previewRadius; y <= this.previewRadius; y++)
        for (let x = -this.previewRadius; x <= this.previewRadius; x++) {
          if (Math.abs(x) + Math.abs(y) > this.previewRadius) continue;
          const px = this.target.x + x,
            py = this.target.y + y;
          if (!s.tiles[py * s.width + px]?.explored || px < 0 || px >= s.width)
            continue;
          g.lineStyle(1, 0xf0aa73);
          g.strokeRect(px * 16 + 1, py * 16 + 1, 14, 14);
        }
    }
    if (this.target) {
      g.lineStyle(1, 0xf7e2a8);
      g.strokeRect(this.target.x * 16, this.target.y * 16, 16, 16);
    }
    const own = s.actors[this.actorId];
    const a =
      own && !own.dead
        ? own
        : (s.actors[this.spectateId] ??
          Object.values(s.actors).find((a) => a.kind === "crawler" && !a.dead));
    if (a) {
      this.cameras.main.setBounds(0, 0, s.width * 16, s.height * 16);
      this.cameras.main.setZoom(this.zoom);
      this.cameras.main.centerOn(a.x * 16 + 8, a.y * 16 + 8);
    }
  }
}
