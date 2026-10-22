import { test, expect } from "@playwright/test";
test("real Phaser renders confirmed movement, combat and chain effects without changing state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5179/tests/fixtures/presentation.html");
  await expect
    .poll(() => page.evaluate(() => (window as any).fixture?.ready))
    .toBe(true);
  const run = async (kind: string) =>
    page.evaluate((k) => (window as any).fixture.run(k), kind);
  const move = await run("move");
  expect(move.after).toBe(move.checksum);
  expect(move.cues).toBeGreaterThan(0);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-active-effects",
    /^[1-9]/,
  );
  const attack = await run("attack");
  expect(attack.after).toBe(attack.checksum);
  expect(attack.cues).toBeGreaterThan(move.cues);
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/alpha2/a21-combat.png" });
  await run("environment");
  await run("boss");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "docs/alpha2/a21-chain-telegraph.png" });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).fixture.scene.effects.count),
    )
    .toBe(0);
  const before = await page.locator("canvas").getAttribute("data-visual-cues");
  await page.evaluate(() => {
    const f = (window as any).fixture;
    f.scene.setState(f.state, "a", undefined, []);
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visual-cues",
    before!,
  );
  await page.evaluate(() => {
    (window as any).fixture.scene.reducedMotion = true;
  });
  await run("down");
  await page.waitForTimeout(100);
  await page.screenshot({ path: "docs/alpha2/a21-reduced-motion-down.png" });
  await run("roster");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/alpha2/a23-enemy-roles.png" });
  await run("scenario");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/alpha2/a22-flooded-relay.png" });
  expect(errors).toEqual([]);
});
