import { random } from "./random";
import { deriveEvents } from "./director";
import type { State, Actor, Point, GameEvent } from "./types";
import { catalog } from "../../content/src/index";
export function emit(
  s: State,
  type: string,
  actorId = "",
  targetIds: string[] = [],
  payload: Record<string, any> = {},
  tile?: Point,
  tags: string[] = [],
): GameEvent {
  const e: GameEvent = {
    eventId: s.nextEventId++,
    runId: s.runId,
    round: s.round,
    actorId,
    targetIds,
    payload,
    tile: tile ? { x: tile.x, y: tile.y } : undefined,
    type,
    tags,
    encounterId: `${s.floor}:${tile ? (s.tiles[tile.y * s.width + tile.x]?.room ?? 0) : 0}`,
  };
  s.events.push(e);
  return e;
}
export function reject(s: State, a: Actor, reason: string) {
  emit(s, "action_rejected", a.id, [], { reason });
}
export function award(s: State, from: number) {
  deriveEvents(s, from);
  const events = s.events.filter((e) => e.eventId >= from);
  for (const e of events) {
    for (const a of catalog.achievements.filter(
      (a) => a.condition.eventType === e.type,
    )) {
      const key = a.id + ":" + (a.scope === "run" ? "run" : e.encounterId);
      const countKey = key + ":count";
      s.counters[countKey] = (s.counters[countKey] ?? 0) + 1;
      if (
        s.counters[countKey] < (a.condition.minCount ?? 1) ||
        s.achievementKeys.includes(key)
      )
        continue;
      s.achievementKeys.push(key);
      if (!s.achievements.includes(a.id)) s.achievements.push(a.id);
      if (a.rewardPool) {
        const actors = Object.values(s.actors)
          .filter((v) => v.kind === "crawler" && !v.dead && !v.downed)
          .sort(
            (a, b) =>
              (s.counters["assignedRewards:" + a.id] ?? 0) -
              (s.counters["assignedRewards:" + b.id] ?? 0),
          );
        const tier = Math.min(
          4,
          Math.ceil(s.floor / 2) + (a.rewardPool === "major" ? 1 : 0),
        );
        const pool = catalog.items.filter(
          (e) => e.tier === tier && e.kind !== "material",
        );
        if (actors.length && pool.length) {
          const recipient = actors[0];
          s.rewards.push({
            id: "achievement:" + key,
            item: pool[random(s, "loot", pool.length)].id,
            turn: recipient.id,
            claimed: false,
          });
          s.counters["assignedRewards:" + recipient.id] =
            (s.counters["assignedRewards:" + recipient.id] ?? 0) + 1;
        }
      }
      const before = s.audience;
      s.audience = Math.min(100, s.audience + a.audienceDelta);
      emit(s, "achievement", e.actorId, e.targetIds, {
        id: a.id,
        message: a.message,
        audienceDelta: a.audienceDelta,
      });
      for (const threshold of [25, 50, 75])
        if (before < threshold && s.audience >= threshold) {
          const thresholdEvent = emit(s, "audience_threshold", e.actorId, [], {
            threshold,
          });
          events.push(thresholdEvent);
          const available = catalog.events.filter(
            (o) =>
              o.availableFromFloor <= s.floor &&
              !s.offers.includes(o.id) &&
              !s.resolvedOffers.includes(o.id),
          );
          const offer = available[random(s, "director", available.length)];
          if (offer) s.offers.push(offer.id);
        }
    }
    for (const sponsor of catalog.sponsors.filter(
      (x) => x.conditionEvent === e.type && x.offerFloor <= s.floor,
    )) {
      const key = `sponsor:${sponsor.id}:${s.floor}`;
      if (!s.transactions.includes(key)) {
        s.transactions.push(key);
        if (s.counters.sponsorPenalty > 0) {
          s.counters.sponsorPenalty--;
          emit(s, "sponsor_refused", e.actorId, [], { sponsor: sponsor.name });
          continue;
        }
        s.overflow.push({
          id: sponsor.signatureItem,
          count: 1,
          durability: 12,
        });
        emit(s, "sponsor_gift", e.actorId, [], {
          sponsor: sponsor.name,
          item: sponsor.signatureItem,
        });
      }
    }
  }
  if (s.events.length > 800) s.events = s.events.slice(-800);
}
