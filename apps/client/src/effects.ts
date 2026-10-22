import Phaser from "phaser";
import type { Point } from "../../../packages/engine/src/types";
import type { VisualCue } from "./presentation";

/** A bounded, interruptible local timeline; authority and input never wait for it. */
export class WorldEffects {
  private active: {
    cue: VisualCue;
    born: number;
    text?: Phaser.GameObjects.Text;
  }[] = [];
  private g: Phaser.GameObjects.Graphics;
  reducedMotion = false;
  total = 0;
  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(20);
  }
  clear() {
    this.active.forEach((v) => v.text?.destroy());
    this.active = [];
    this.g.clear();
  }
  enqueue(cues: VisualCue[]) {
    const moving = new Set(
      cues.filter((c) => c.kind === "move").map((c) => c.actorId),
    );
    this.active = this.active.filter((v) => {
      const keep = v.cue.kind !== "move" || !moving.has(v.cue.actorId);
      if (!keep) v.text?.destroy();
      return keep;
    });
    for (const cue of cues) {
      if (this.active.length >= 160) this.active.shift()?.text?.destroy();
      const text = cue.label
        ? this.scene.add
            .text(0, 0, cue.label, {
              fontFamily: "monospace",
              fontSize: "7px",
              color: "#" + cue.color.toString(16).padStart(6, "0"),
              backgroundColor: "#111914",
              padding: { x: 2, y: 1 },
            })
            .setOrigin(0.5, 1)
            .setDepth(21)
            .setVisible(false)
        : undefined;
      this.active.push({ cue, born: this.scene.time.now, text });
      this.total++;
    }
  }
  position(id: string, fallback: Point): Point {
    if (this.reducedMotion) return fallback;
    const motions = this.active.filter(
      (v) => v.cue.kind === "move" && v.cue.actorId === id,
    );
    const motion =
      motions.find(
        (v) => this.scene.time.now < v.born + v.cue.delay + v.cue.duration,
      ) ?? motions.at(-1);
    if (!motion?.cue.from) {
      const impact = this.active.find(
        (v) =>
          v.cue.kind === "impact" &&
          v.cue.actorId === id &&
          this.scene.time.now - v.born - v.cue.delay >= 0 &&
          this.scene.time.now - v.born - v.cue.delay < 180,
      );
      return impact
        ? {
            x:
              fallback.x +
              Math.sin((this.scene.time.now - impact.born) * 0.035) * 0.055,
            y: fallback.y,
          }
        : fallback;
    }
    const t = Phaser.Math.Clamp(
      (this.scene.time.now - motion.born - motion.cue.delay) /
        motion.cue.duration,
      0,
      1,
    );
    return {
      x: Phaser.Math.Linear(motion.cue.from.x, motion.cue.at.x, t),
      y: Phaser.Math.Linear(motion.cue.from.y, motion.cue.at.y, t),
    };
  }
  update() {
    const now = this.scene.time.now,
      g = this.g;
    g.clear();
    this.active = this.active.filter((v) => {
      const age = now - v.born - (this.reducedMotion ? 0 : v.cue.delay);
      if (age > v.cue.duration) {
        v.text?.destroy();
        return false;
      }
      if (age < 0) return true;
      const c = v.cue,
        p = Math.min(1, age / c.duration),
        x = c.at.x * 16 + 8,
        y = c.at.y * 16 + 8;
      const travel = this.reducedMotion ? 1 : Math.min(1, age / 200);
      g.lineStyle(1, c.color, 1 - p * 0.5);
      if (c.kind === "arc" && c.from) {
        const fx = c.from.x * 16 + 8,
          fy = c.from.y * 16 + 8;
        const tx = Phaser.Math.Linear(fx, x, travel),
          ty = Phaser.Math.Linear(fy, y, travel);
        g.lineBetween(fx, fy, tx, ty);
        g.fillStyle(c.color);
        g.fillRect(tx - 1, ty - 1, 3, 3);
      } else if (c.kind === "move" && c.from) {
        if (!this.reducedMotion)
          g.lineBetween(c.from.x * 16 + 8, c.from.y * 16 + 8, x, y);
      } else if (c.kind === "strike") {
        if (c.from) g.lineBetween(c.from.x * 16 + 8, c.from.y * 16 + 8, x, y);
        g.lineBetween(x - 5, y + 5, x + 5, y - 5);
      } else if (c.kind === "burst") {
        if (c.radius)
          for (let dy = -c.radius; dy <= c.radius; dy++)
            for (let dx = -c.radius; dx <= c.radius; dx++)
              if (Math.abs(dx) + Math.abs(dy) <= c.radius)
                g.strokeRect(x + dx * 16 - 8, y + dy * 16 - 8, 16, 16);
        const r = this.reducedMotion ? 10 : 4 + Math.min(age / 30, 12);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          g.lineBetween(
            x + Math.cos(a) * 4,
            y + Math.sin(a) * 4,
            x + Math.cos(a) * r,
            y + Math.sin(a) * r,
          );
        }
      } else if (c.kind === "impact") {
        g.strokeRect(x - 6, y - 6, 12, 12);
        g.lineBetween(x - 4, y - 4, x + 4, y + 4);
      } else if (c.kind === "arc") {
        g.lineBetween(x - 6, y - 4, x, y);
        g.lineBetween(x, y, x - 2, y + 4);
        g.lineBetween(x - 2, y + 4, x + 6, y + 2);
      } else if (c.kind === "ring")
        g.strokeCircle(x, y, this.reducedMotion ? 8 : 5 + p * 7);
      // Spread dense feedback into three stable lanes. Reduced motion keeps text stationary.
      v.text
        ?.setVisible(true)
        .setPosition(
          x,
          y -
            10 -
            (c.kind === "text" ? 10 : 0) -
            (this.reducedMotion ? 0 : p * 8),
        );
      return true;
    });
  }
  get count() {
    return this.active.length;
  }
}
