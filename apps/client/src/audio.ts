import type { GameEvent, State } from "../../../packages/engine/src/types";
export type SoundKind =
  | "move"
  | "attack"
  | "miss"
  | "hit"
  | "critical"
  | "hurt"
  | "electricity"
  | "fire"
  | "explosion"
  | "objective"
  | "danger"
  | "level"
  | "audience"
  | "producer"
  | "boss"
  | "loss";
export const soundRecipes: Record<
  SoundKind,
  {
    frequencies: number[];
    duration: number;
    wave: OscillatorType;
    priority: number;
  }
> = {
  move: {
    frequencies: [130, 90],
    duration: 0.04,
    wave: "triangle",
    priority: 1,
  },
  attack: {
    frequencies: [380, 160],
    duration: 0.07,
    wave: "sawtooth",
    priority: 3,
  },
  miss: { frequencies: [520, 240], duration: 0.09, wave: "sine", priority: 4 },
  hit: {
    frequencies: [180, 70],
    duration: 0.08,
    wave: "triangle",
    priority: 5,
  },
  critical: {
    frequencies: [660, 990, 1320],
    duration: 0.15,
    wave: "triangle",
    priority: 8,
  },
  hurt: {
    frequencies: [220, 110],
    duration: 0.13,
    wave: "sawtooth",
    priority: 8,
  },
  electricity: {
    frequencies: [1000, 1400, 800],
    duration: 0.13,
    wave: "square",
    priority: 6,
  },
  fire: {
    frequencies: [140, 190, 100],
    duration: 0.13,
    wave: "sawtooth",
    priority: 3,
  },
  explosion: {
    frequencies: [90, 45, 28],
    duration: 0.25,
    wave: "sawtooth",
    priority: 8,
  },
  objective: {
    frequencies: [523, 659, 784],
    duration: 0.22,
    wave: "sine",
    priority: 7,
  },
  danger: {
    frequencies: [330, 440, 330],
    duration: 0.22,
    wave: "triangle",
    priority: 9,
  },
  level: {
    frequencies: [440, 554, 659, 880],
    duration: 0.3,
    wave: "sine",
    priority: 9,
  },
  audience: {
    frequencies: [660, 880],
    duration: 0.12,
    wave: "sine",
    priority: 4,
  },
  producer: {
    frequencies: [740, 700],
    duration: 0.04,
    wave: "sine",
    priority: 2,
  },
  boss: {
    frequencies: [110, 165, 220],
    duration: 0.3,
    wave: "triangle",
    priority: 9,
  },
  loss: {
    frequencies: [220, 110, 55],
    duration: 0.4,
    wave: "triangle",
    priority: 10,
  },
};
export function resolutionSounds(events: GameEvent[], id: string): SoundKind[] {
  const kinds = new Set<SoundKind>();
  for (const e of events) {
    if (e.type === "move" && e.actorId === id) kinds.add("move");
    if (e.type === "cast") kinds.add("attack");
    if (e.type === "miss") kinds.add("miss");
    if (e.type === "hit") kinds.add(e.payload.crit ? "critical" : "hit");
    if (e.type === "damage" && e.targetIds.includes(id)) kinds.add("hurt");
    if (["shock_chain", "short_circuit"].includes(e.type))
      kinds.add("electricity");
    if (e.type === "gas_ignition" || e.type === "explosion_chain")
      kinds.add("explosion");
    if (e.type === "damage" && e.payload.element === "fire") kinds.add("fire");
    if (e.type === "objective") kinds.add("objective");
    if (e.type === "telegraph") kinds.add("danger");
    if (e.type === "level_up") kinds.add("level");
    if (e.type === "achievement" && e.payload.audienceDelta > 0)
      kinds.add("audience");
    if (["boss_combat", "alternate_boss"].includes(e.type)) kinds.add("boss");
    if (["downed", "first_death", "party_wipe"].includes(e.type))
      kinds.add("loss");
  }
  return [...kinds]
    .sort((a, b) => soundRecipes[b].priority - soundRecipes[a].priority)
    .slice(0, 3);
}
/** Browser-only, user-gesture unlocked, quiet bounded cues from confirmed outcomes. */
export class SoundBus {
  enabled = false;
  context?: AudioContext;
  previous?: State;
  lastAt = -Infinity;
  played = 0;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {}
  }
  play(kind: SoundKind, offset = 0) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== "running") return;
    const recipe = soundRecipes[kind],
      start = ctx.currentTime + offset,
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = recipe.wave;
    recipe.frequencies.forEach((f, i) =>
      osc.frequency.setValueAtTime(
        f,
        start + (i * recipe.duration) / recipe.frequencies.length,
      ),
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.018, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + recipe.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + recipe.duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    this.played++;
  }
  accept(next: State, id: string) {
    const old = this.previous;
    if (old && old.runId === next.runId && next.revision <= old.revision)
      return;
    this.previous = next;
    if (!old || old.runId !== next.runId) return;
    const now = performance.now();
    if (now - this.lastAt < 100) return;
    const kinds = resolutionSounds(
      next.events.filter((e) => e.eventId >= old.nextEventId),
      id,
    );
    kinds.forEach((kind, i) => this.play(kind, i * 0.09));
    if (kinds.length) this.lastAt = now;
  }
}
