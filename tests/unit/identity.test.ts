import { it, expect } from "vitest";
import { catalog } from "../../packages/content/src/index";
import { enemyIdentity, itemOpportunity } from "../../apps/client/src/identity";
it("each catalog enemy has a named tactical role and distinct role glyph", () => {
  const roles = new Map<string, string>();
  for (const m of [...catalog.monsters, ...catalog.bosses]) {
    const role = enemyIdentity(m);
    expect(role.name.length).toBeGreaterThan(3);
    expect(role.plan.length).toBeGreaterThan(20);
    roles.set(m.ai, role.glyph);
  }
  expect(new Set(roles.values()).size).toBe(roles.size);
});
it("memorable existing tools get accurate opportunity hints without changing the catalog", () => {
  for (const trait of [
    "conductive",
    "breach",
    "pull",
    "push",
    "freeze",
    "ignite",
    "wet",
  ]) {
    const item = catalog.items.find((v) => v.trait === trait)!;
    expect(item).toBeTruthy();
    expect(itemOpportunity(item).length).toBeGreaterThan(20);
  }
  expect(
    itemOpportunity({ id: "x", name: "x", description: "", trait: "unknown" }),
  ).toBe("");
});
