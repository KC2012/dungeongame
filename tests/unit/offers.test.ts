import { it, expect } from "vitest";
import { catalog, validateCatalog } from "../../packages/content/src/index";
import {
  newGame,
  addCrawler,
  begin,
  perform,
  hash,
  clone,
  generateFloor,
} from "../../packages/engine/src/index";
import { enterRiskRoom } from "../../packages/engine/src/offers";
for (const offer of catalog.events)
  it(`optional bargain ${offer.id} applies its authored reward and risk once`, () => {
    const s = newGame(14);
    const a = addCrawler(s, "a", "A", "street_mechanic");
    s.floor = 6;
    begin(s);
    s.phase = "SAFE_ROOM";
    a.x = 8;
    a.y = 35;
    a.hp = 10;
    a.focus = 0;
    s.audience = 60;
    s.credits = 100;
    s.offers = [offer.id];
    const before = hash(s);
    expect(
      perform(s, a, { type: "OFFER", id: offer.id, choice: "accept" }),
    ).toBe(true);
    expect(hash(s)).not.toBe(before);
    expect(s.resolvedOffers).toContain(offer.id);
    expect(
      s.events.some(
        (e) =>
          e.type === "bargain" &&
          e.payload.reward === offer.choices[0].reward &&
          e.payload.risk === offer.choices[0].risk,
      ),
    ).toBe(true);
    const stable = hash(s);
    expect(
      perform(s, a, { type: "OFFER", id: offer.id, choice: "accept" }),
    ).toBe(false);
    expect(hash(s)).toBe(stable);
  });
it("declining an offer has no hidden cost or benefit", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  s.phase = "SAFE_ROOM";
  s.offers = ["conditional_mercy"];
  const values = {
    hp: a.hp,
    credits: s.credits,
    audience: s.audience,
    inventory: clone(a.inventory),
  };
  expect(
    perform(s, a, {
      type: "OFFER",
      id: "conditional_mercy",
      choice: "decline",
    }),
  ).toBe(true);
  expect({
    hp: a.hp,
    credits: s.credits,
    audience: s.audience,
    inventory: a.inventory,
  }).toEqual(values);
  expect(s.risks).toEqual([]);
});
it("a next-room contract creates a visible hazard away from arrival", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  s.risks = ["acid_storm"];
  a.x = 22;
  a.y = 8;
  enterRiskRoom(s, a);
  expect(s.risks).not.toContain("acid_storm");
  expect(s.events.some((e) => e.type === "risk_telegraph")).toBe(true);
  expect(
    Object.values(s.tiles[a.y * s.width + a.x].hazards).some(
      (h) => h.damage > 0,
    ),
  ).toBe(false);
});
it("an elite next-floor contract increases encounter count", () => {
  const s = newGame(9);
  addCrawler(s, "a", "A", "night_custodian");
  s.floor = 2;
  const baseline = clone(s);
  generateFloor(baseline);
  s.risks = ["elite_next_floor"];
  generateFloor(s);
  expect(
    Object.values(s.actors).filter((a) => a.kind === "enemy"),
  ).toHaveLength(
    Object.values(baseline.actors).filter((a) => a.kind === "enemy").length + 5,
  );
});
for (const [kind, key, value, reason] of [
  ["monsters", "ai", "unsupported", "unknown AI"],
  ["abilities", "profession", "missing", "profession"],
  ["items", "trait", "nonsense", "unknown trait"],
  ["hazards", "materialTags", ["not_a_material"], "unknown material"],
] as const)
  it(`loader rejects unsupported ${kind}:${key}`, () => {
    const data = clone(catalog);
    data[kind][0][key] = value;
    expect(validateCatalog(data).some((e) => e.includes(reason))).toBe(true);
  });
it("loader rejects disconnected authored prefab exits", () => {
  const data = clone(catalog);
  data.rooms[0].layout = [
    "####+####",
    "#########",
    "#########",
    "#########",
    "+...o...+",
    "#########",
    "#########",
    "#########",
    "####+####",
  ];
  expect(
    validateCatalog(data).some((e) => e.includes("room connectivity")),
  ).toBe(true);
});
