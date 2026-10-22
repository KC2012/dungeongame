import Phaser from "phaser";
import type { State, Actor, Point } from "../../../packages/engine/src/types";
import { PresentationStream } from "./presentation";
import { WorldEffects } from "./effects";
import { entry } from "../../../packages/content/src/index";
import { enemyIdentity } from "./identity";
import { spriteNames, spritePixels, palette, type SpriteName } from "./assets";
import { pointerTile } from "./pointer";
import { scenarios } from "../../../packages/content/src/scenarios";
export class DungeonScene extends Phaser.Scene {
  stream = new PresentationStream();
  effects?: WorldEffects;
  reducedMotion = false;
  graphics!: Phaser.GameObjects.Graphics;
  overlay!: Phaser.GameObjects.Graphics;
  danger!: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[] = [];
  sprites: Phaser.GameObjects.Image[] = [];
  planned?: Point;
  pinned = false;
  opportunityTiles: Point[] = [];
  snapshot?: State;
  actorId = "";
  spectateId = "";
  target?: Point;
  queued: Point[] = [];
  choose: (p: Point) => void = () => {};
  hover: (p: Point) => void = () => {};
  previewRadius = 0;
  targetBlocked = false;
  targetLabel = "";
  aiming = false;
  zoom = 3;
  constructor() {
    super("dungeon");
  }
  create() {
    this.graphics = this.add.graphics();
    this.overlay = this.add.graphics().setDepth(9);
    this.danger = this.add.graphics().setDepth(4);
    this.effects = new WorldEffects(this);
    for (const name of spriteNames) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d")!;
      spritePixels(name).forEach((row, y) =>
        row.forEach((c, x) => {
          if (palette[c]) {
            ctx.fillStyle = palette[c];
            ctx.fillRect(x, y, 1, 1);
          }
        }),
      );
      if (!this.textures.exists("world:" + name))
        this.textures.addCanvas("world:" + name, canvas);
    }
    // Camera viewport dimensions change before this Scale event is dispatched.
    // Recenter immediately instead of waiting for another authority snapshot.
    const resize = () => this.paint();
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, resize),
    );
    const locate = (p: Phaser.Input.Pointer) => {
      // Camera matrices are refreshed before conversion, including immediately after zoom/resize.
      this.cameras.main.preRender();
      const e = p.event as MouseEvent;
      return pointerTile(
        e.clientX,
        e.clientY,
        this.game.canvas.getBoundingClientRect(),
        { width: this.scale.width, height: this.scale.height },
        (x, y) => this.cameras.main.getWorldPoint(x, y),
      );
    };
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const at = locate(p);
      if (at && !this.pinned) this.hover(at);
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const at = locate(p);
      if (at) this.choose(at);
    });
    this.input.on(
      "wheel",
      (_p: unknown, _g: unknown, _dx: number, dy: number) => {
        this.zoom = Phaser.Math.Clamp(
          this.zoom + (dy < 0 ? 0.25 : -0.25),
          1.5,
          5,
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
    const camera = this.cameras.main;
    const origin = camera.getWorldPoint(0, 0);
    const own = this.snapshot?.actors[this.actorId];
    canvas.dataset.viewport = JSON.stringify({
      width: camera.width,
      height: camera.height,
      zoom: camera.zoom,
      origin: { x: origin.x, y: origin.y },
      actor: own ? { x: own.x, y: own.y } : null,
    });
    canvas.dataset.visualCues = String(this.effects.total);
    canvas.dataset.activeEffects = String(this.effects.count);
  }
  paint() {
    if (!this.graphics || !this.snapshot) return;
    const s = this.snapshot,
      g = this.graphics;
    g.clear();
    const overlay = this.overlay;
    overlay.clear();
    this.danger.clear();
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    this.sprites.forEach((v) => v.destroy());
    this.sprites = [];
    const sprite = (
      name: SpriteName,
      x: number,
      y: number,
      depth = 2,
      alpha = 1,
    ) => {
      this.sprites.push(
        this.add
          .image(x * 16 + 8, y * 16 + 8, "world:" + name)
          .setDepth(depth)
          .setAlpha(alpha),
      );
    };
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
          .setOrigin(0.5)
          .setDepth(10),
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
          if (t.hp < 8) {
            g.lineStyle(1, 0xa5a088);
            g.lineBetween(x * 16 + 5, y * 16 + 5, x * 16 + 8, y * 16 + 9);
            g.lineBetween(x * 16 + 8, y * 16 + 9, x * 16 + 6, y * 16 + 13);
          }
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
        if (t.kind === "pit") sprite("pit", x, y);
        if (t.kind === "rubble") sprite("rubble", x, y);
        if (t.kind === "door") {
          g.fillStyle(t.locked ? 0x7e5140 : 0x617882);
          g.fillRect(x * 16 + 1, y * 16, 14, 16);
          g.fillStyle(0x17262b);
          g.fillRect(x * 16 + 3, y * 16 + 2, t.open ? 10 : 4, 14);
          if (!t.open) {
            g.fillStyle(0xbdab76);
            g.fillRect(x * 16 + 11, y * 16 + 7, 2, 2);
          }
        }
        if (
          t.tags.includes("flammable") &&
          !t.tags.includes("volatile") &&
          t.kind !== "wall"
        )
          sprite("oil", x, y, 1, 0.8);
        if (t.tags.includes("gas") && !t.hazards.poison)
          sprite("gas", x, y, 2, 0.55);
        for (const [element, h] of Object.entries(t.hazards)) {
          const name = (
            {
              water: "water",
              fire: "fire",
              shock: "shock",
              acid: "acid",
              poison: "gas",
              cold: "ice",
              smoke: "smoke",
            } as Record<string, SpriteName>
          )[element];
          if (name)
            sprite(
              name,
              x,
              y,
              element === "smoke" ? 6 : 2,
              h.disabled ? 0.2 : element === "water" ? 0.75 : 0.85,
            );
        }
        if (t.tags.includes("ice")) sprite("ice", x, y, 2, 0.8);
        if (t.tags.includes("volatile")) sprite("barrel", x, y, 3);
        if (t.cover) sprite("cover", x, y, 3);
        if (t.trap) sprite("trap", x, y, 2);
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
      const name: SpriteName = (
        {
          objective: "terminal",
          alternate: o.done ? "deviceDone" : "device",
          safe: "safe",
          exit: "stairs",
          cache: o.done ? "cacheOpen" : "cache",
          machine: o.powered && !o.disabled ? "machine" : "machineOff",
          secret: "secret",
        } as const
      )[o.kind];
      sprite(name, o.x, o.y, 3, o.done && o.kind !== "cache" ? 0.55 : 1);
      if (this.target?.x === o.x && this.target?.y === o.y)
        label(
          o.x,
          o.y - 0.8,
          o.kind === "machine"
            ? o.powered
              ? "POWERED RELAY"
              : "DISCHARGED RELAY"
            : o.kind === "cache"
              ? "SUPPLIES"
              : o.kind === "alternate"
                ? "BOSS DEVICE"
                : o.kind === "exit"
                  ? "DESCENT"
                  : o.kind.toUpperCase(),
        );
    }
    for (const actor of Object.values(s.actors)) {
      const a = {
        ...actor,
        ...(this.effects?.position(actor.id, actor) ?? actor),
      };
      for (const p of a.telegraph) {
        if (!s.tiles[p.y * s.width + p.x]?.explored) continue;
        this.danger.fillStyle(0xd46736, 0.35);
        this.danger.fillRect(p.x * 16, p.y * 16, 16, 16);
        this.danger.lineStyle(1, 0xffb77a);
        this.danger.strokeRect(p.x * 16 + 1, p.y * 16 + 1, 14, 14);
        this.danger.lineBetween(
          p.x * 16 + 2,
          p.y * 16 + 2,
          p.x * 16 + 14,
          p.y * 16 + 14,
        );
        this.danger.lineBetween(
          p.x * 16 + 14,
          p.y * 16 + 2,
          p.x * 16 + 2,
          p.y * 16 + 14,
        );
        label(p.x, p.y, "!", "#ffd7a1");
      }
      if (a.telegraph.length && a.tags.includes("boss")) {
        label(a.x, a.y - 1, "STRIKES NEXT ENEMY PHASE", "#ffd7a1");
        const p = a.telegraph[0];
        this.danger.lineStyle(1, 0xefb185, 0.7);
        this.danger.lineBetween(
          a.x * 16 + 8,
          a.y * 16 + 8,
          p.x * 16 + 8,
          p.y * 16 + 8,
        );
      }
      if (a.dead) {
        g.lineStyle(1, 0x8f8173);
        g.lineBetween(a.x * 16 + 4, a.y * 16 + 5, a.x * 16 + 12, a.y * 16 + 13);
        g.lineBetween(a.x * 16 + 12, a.y * 16 + 5, a.x * 16 + 4, a.y * 16 + 13);
        continue;
      }
      const identity =
        a.kind === "enemy"
          ? enemyIdentity(
              entry(
                a.tags.includes("boss") ? "bosses" : "monsters",
                a.catalogId,
              ),
            )
          : undefined;
      const name: SpriteName =
        a.kind !== "enemy"
          ? "crawler"
          : a.tags.includes("boss")
            ? (`boss${s.floor}` as SpriteName)
            : ((
                {
                  M: "rat",
                  R: "gunner",
                  G: "sentry",
                  F: "flanker",
                  H: "hazard",
                  S: "summoner",
                  "+": "support",
                  C: "charger",
                  K: "skirmisher",
                } as Record<string, SpriteName>
              )[identity!.glyph] ?? "rat");
      sprite(name, a.x, a.y, 5);
      g.fillStyle(0x26383d);
      g.fillRect(a.x * 16 + 2, a.y * 16 - 1, 12, 2);
      g.fillStyle(a.kind === "crawler" ? 0xc4dc9a : 0xce7467);
      g.fillRect(a.x * 16 + 2, a.y * 16 - 1, (12 * a.hp) / a.maxHP, 2);
      if (a.id === this.actorId) {
        g.fillStyle(0xf3d58b);
        g.fillTriangle(
          a.x * 16 + 5,
          a.y * 16 - 5,
          a.x * 16 + 11,
          a.y * 16 - 5,
          a.x * 16 + 8,
          a.y * 16 - 2,
        );
      }
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
      if (status)
        label(
          a.x,
          a.y - 0.8,
          Object.keys(a.statuses)
            .filter((k) => k !== "lifetime")
            .join(" · ")
            .toUpperCase(),
          "#c6e5dc",
        );
      if (a.shield || a.guard) {
        overlay.lineStyle(1, 0x9ec8db);
        overlay.strokeRect(a.x * 16 + 1, a.y * 16 + 2, 14, 13);
      }
      if (a.id === this.actorId) {
        overlay.lineStyle(1, 0xffdb87);
        overlay.strokeRect(a.x * 16, a.y * 16, 16, 16);
      }
    }
    for (const p of this.opportunityTiles) {
      this.danger.lineStyle(1, 0x87dbe3, 0.8);
      this.danger.strokeRect(p.x * 16 + 1, p.y * 16 + 1, 14, 14);
    }
    if (this.planned && this.queued.length) {
      sprite("crawler", this.planned.x, this.planned.y, 7, 0.4);
      label(this.planned.x, this.planned.y + 0.7, "PLAN", "#b5dbb4");
    }
    for (const p of this.queued) {
      overlay.lineStyle(1, 0xa5cc94);
      overlay.strokeRect(p.x * 16 + 3, p.y * 16 + 3, 10, 10);
    }
    if (this.target && this.previewRadius) {
      for (let y = -this.previewRadius; y <= this.previewRadius; y++)
        for (let x = -this.previewRadius; x <= this.previewRadius; x++) {
          if (Math.abs(x) + Math.abs(y) > this.previewRadius) continue;
          const px = this.target.x + x,
            py = this.target.y + y;
          if (!s.tiles[py * s.width + px]?.explored || px < 0 || px >= s.width)
            continue;
          overlay.lineStyle(1, 0xf0aa73);
          overlay.strokeRect(px * 16 + 1, py * 16 + 1, 14, 14);
        }
    }
    if (this.target) {
      const own = s.actors[this.actorId];
      if (this.aiming && own) {
        overlay.lineStyle(1, this.targetBlocked ? 0xd3856b : 0xb7c59b, 0.65);
        overlay.lineBetween(
          own.x * 16 + 8,
          own.y * 16 + 8,
          this.target.x * 16 + 8,
          this.target.y * 16 + 8,
        );
      }
      overlay.lineStyle(1, this.targetBlocked ? 0xe69a76 : 0xf7e2a8);
      if (this.targetLabel)
        label(
          this.target.x,
          this.target.y - 0.8,
          this.targetLabel,
          this.targetBlocked ? "#f0b49a" : "#d7e7b3",
        );
      overlay.strokeRect(this.target.x * 16, this.target.y * 16, 16, 16);
    }
    const own = s.actors[this.actorId];
    if (own && !own.dead) {
      overlay.lineStyle(1, 0xffdb87);
      overlay.strokeRect(own.x * 16, own.y * 16, 16, 16);
    }
    const a =
      own && !own.dead
        ? own
        : (s.actors[this.spectateId] ??
          Object.values(s.actors).find((a) => a.kind === "crawler" && !a.dead));
    if (a) {
      this.cameras.main.setBounds(
        -64,
        -64,
        s.width * 16 + 128,
        s.height * 16 + 128,
      );
      this.cameras.main.setZoom(this.zoom);
      const near = Object.values(s.actors).filter(
        (v) =>
          v.kind === "enemy" &&
          !v.dead &&
          Math.abs(v.x - a.x) + Math.abs(v.y - a.y) <= 6,
      );
      const focus = near.length
        ? {
            x:
              (a.x * 3 + near.reduce((n, v) => n + v.x, 0)) / (3 + near.length),
            y:
              (a.y * 3 + near.reduce((n, v) => n + v.y, 0)) / (3 + near.length),
          }
        : a;
      this.cameras.main.centerOn(focus.x * 16 + 8, focus.y * 16 + 8);
      this.cameras.main.preRender();
    }
  }
}
