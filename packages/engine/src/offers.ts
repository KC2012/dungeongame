import type { State, Actor } from "./types";
import { catalog, entry } from "../../content/src/index";
import { give, stat } from "./stats";
import { hurt, status } from "./combat";
import { emit } from "./events";
import { tile, path } from "./grid";
import { makeActor } from "./generation";
export const rewardKinds = [
  "heal",
  "item",
  "credits",
  "secret",
  "talent",
  "craft_material",
  "key",
  "discount",
  "adaptation_hint",
  "minor_loot",
  "shortcut",
  "shield",
  "rare_loot",
  "medkit",
  "major_loot",
  "evidence",
  "blast_item",
  "antidote",
  "full_focus",
  "unlock",
  "final_cache",
];
export const riskKinds = [
  "elite_next_floor",
  "hazard_next_room",
  "blocked_shortcut",
  "extra_encounter",
  "wound",
  "extra_wave",
  "loss_of_time",
  "acid_storm",
  "suspicion",
  "reputation",
  "extra_mutant",
  "ambush",
  "random_mod",
  "shock_pulse",
  "darkness",
  "lose_credits",
  "shop_tax",
  "audience_loss",
  "self_damage",
  "poison_cloud",
  "spawn_reinforcements",
  "hard_boss",
  "extra_boss_phase",
];
export function applyOffer(s: State, a: Actor, reward: string, risk: string) {
  if (!rewardKinds.includes(reward) || !riskKinds.includes(risk))
    throw Error("Unknown offer contract");
  const itemRewards: Record<string, string> = {
    item: "first_aid_pack",
    craft_material: "scrap_metal",
    minor_loot: "lucky_pencil",
    rare_loot: "ceramic_plate",
    major_loot: "pulse_carbine",
    medkit: "first_aid_pack",
    blast_item: "blast_brick",
    antidote: "antidote",
    final_cache: "first_aid_pack",
    key: "badge_fragment",
    evidence: "debt_ledger",
  };
  if (itemRewards[reward]) {
    give(s, a, itemRewards[reward], 1, true);
    if (reward === "final_cache") {
      give(s, a, "shock_cell", 1, true);
      give(s, a, "bandage_roll", 1, true);
    }
  } else
    switch (reward) {
      case "heal":
        a.hp = Math.min(a.maxHP, a.hp + 12);
        break;
      case "credits":
        s.credits += 12;
        break;
      case "full_focus":
        a.focus = a.maxFocus;
        break;
      case "shield":
        status(a, "stat:openingShield", 999, 8, a.id);
        break;
      case "discount":
        status(a, "stat:discount", 999, 5, a.id);
        break;
      case "talent":
        a.offers = ["armor", "accuracy", "capacity"].filter(
          (v) => !a.talents.includes(v),
        );
        break;
      case "unlock":
        if (!s.unlocks.includes("producer_favorite"))
          s.unlocks.push("producer_favorite");
        break;
      case "secret": {
        const o = s.objects.find((o) => o.kind === "secret");
        if (o) tile(s, o)!.explored = true;
        emit(s, "intel", a.id, [], { reward });
        break;
      }
      case "adaptation_hint":
        emit(s, "intel", a.id, [], {
          reward,
          description: catalog.adaptations
            .map((v) => v.name + ": " + v.description)
            .join("; "),
        });
        s.xp += 5;
        break;
      case "shortcut": {
        const destination = s.objects.find((o) => o.kind === "exit")!;
        for (const p of path(s, a, destination)) tile(s, p)!.explored = true;
        emit(s, "locked_path_bypass", a.id, [], {}, a);
        break;
      }
    }
  switch (risk) {
    case "wound":
      a.wounds++;
      break;
    case "self_damage":
      hurt(s, a, 4, "physical", "offer");
      break;
    case "lose_credits":
      s.credits = Math.max(0, s.credits - 8);
      break;
    case "audience_loss":
      s.audience = Math.max(0, s.audience - 8);
      break;
    case "reputation":
      s.counters.sponsorPenalty = (s.counters.sponsorPenalty ?? 0) + 1;
      break;
    case "loss_of_time":
      s.turns += 10;
      s.round += 10;
      break;
    case "shop_tax":
      status(a, "stat:shopTax", 999, 20, a.id);
      break;
    case "darkness":
      s.risks.push("darkness");
      break;
    case "hard_boss": {
      const boss = Object.values(s.actors).find(
        (v) => v.tags.includes("boss") && !v.dead,
      );
      if (boss) {
        boss.hp += Math.ceil(boss.maxHP * 0.2);
        boss.maxHP = boss.hp;
      }
      break;
    }
    case "extra_boss_phase":
      s.counters.extraBossPhase = s.floor;
      break;
    case "blocked_shortcut":
      s.counters.blockedShortcut = s.floor + 1;
      break;
    default:
      s.risks.push(risk);
      break;
  }
  emit(s, "bargain", a.id, [], { reward, risk });
}
/** Risks are consumed on entry to the next non-safe room and announced before an enemy phase. */
export function enterRiskRoom(s: State, a: Actor) {
  const room = tile(s, a)?.room ?? -1;
  if (room < 0 || room === 0 || room === 6) return;
  const pending = s.risks.filter(
    (r) => r !== "darkness" && r !== "elite_next_floor",
  );
  for (const risk of pending) {
    if (
      [
        "extra_encounter",
        "extra_wave",
        "extra_mutant",
        "ambush",
        "spawn_reinforcements",
        "suspicion",
      ].includes(risk)
    ) {
      const monster = catalog.monsters.find((v) => v.floor === s.floor)!;
      const positions = s.tiles
        .map((t, i) => ({ t, x: i % s.width, y: Math.floor(i / s.width) }))
        .filter(
          (p) =>
            p.t.room === room &&
            p.t.kind === "floor" &&
            Math.abs(p.x - a.x) + Math.abs(p.y - a.y) >= 4 &&
            !Object.values(s.actors).some(
              (v) => !v.dead && v.x === p.x && v.y === p.y,
            ),
        );
      const p = positions[0];
      if (p) {
        const m = makeActor(
          "risk_" + s.nextEventId,
          monster.name + " · contract",
          "enemy",
          monster.id,
          p.x,
          p.y,
        );
        m.hp = m.maxHP = monster.hp;
        m.stats.armor = monster.armor;
        s.actors[m.id] = m;
        emit(
          s,
          "risk_telegraph",
          a.id,
          [m.id],
          {
            risk,
            message: "Contract reinforcement spotted before its first attack.",
          },
          p,
        );
      }
    } else if (
      [
        "hazard_next_room",
        "acid_storm",
        "shock_pulse",
        "poison_cloud",
      ].includes(risk)
    ) {
      const el =
        risk === "acid_storm"
          ? "acid"
          : risk === "shock_pulse"
            ? "shock"
            : "poison";
      const p = s.tiles
        .map((t, i) => ({ t, x: i % s.width, y: Math.floor(i / s.width) }))
        .find(
          (p) =>
            p.t.room === room &&
            p.t.kind === "floor" &&
            Math.abs(p.x - a.x) + Math.abs(p.y - a.y) >= 3,
        );
      if (p) {
        p.t.hazards[el] = {
          intensity: 2,
          duration: 3,
          damage: 3,
          source: "contract",
        };
        emit(
          s,
          "risk_telegraph",
          a.id,
          [],
          { risk, message: "Contract hazard marked. Avoid its labeled tiles." },
          p,
        );
      }
    } else if (risk === "random_mod")
      for (const enemy of Object.values(s.actors).filter(
        (v) => v.kind === "enemy" && !v.dead && tile(s, v)?.room === room,
      ))
        enemy.stats.armor = (enemy.stats.armor ?? 0) + 1;
    s.risks.splice(s.risks.indexOf(risk), 1);
  }
}
