import { test, expect } from "@playwright/test";
test("two independent browsers join the same authoritative lobby and enter the dungeon", async ({
  browser,
}) => {
  const host = await browser.newContext(),
    guest = await browser.newContext();
  const a = await host.newPage(),
    b = await guest.newPage();
  const errors: string[] = [];
  a.on("pageerror", (e) => errors.push(e.message));
  b.on("pageerror", (e) => errors.push(e.message));
  await a.goto("/");
  await a.locator("#name").fill("Ada");
  await a.locator("#seed").fill("1234");
  await a
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await expect(a.getByText("Your crew · 1/4")).toBeVisible();
  const invite = a.url();
  await b.goto(invite);
  await b.locator("#name").fill("Bo");
  await b.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(a.getByText("Your crew · 2/4")).toBeVisible();
  await expect(b.getByText("Your crew · 2/4")).toBeVisible();
  await a.getByRole("button", { name: "Begin the run", exact: true }).click();
  await expect(a.locator("canvas")).toBeVisible();
  await expect(b.locator("canvas")).toBeVisible();
  await expect(a.locator("#party")).toContainText("Bo");
  await expect(b.locator("#party")).toContainText("Ada");
  await a.screenshot({ path: "test-results/dungeon-1280.png" });
  await a.keyboard.press("i");
  await expect(
    a.getByRole("heading", { name: "Inventory", exact: true }),
  ).toBeVisible();
  await a.keyboard.press("Escape");
  await a.keyboard.press("ArrowDown");
  await expect(a.locator("#header-info")).toContainText("Round 1");
  await expect(b.locator("#header-info")).toContainText("Round 1");
  expect(errors).toEqual([]);
  await host.close();
  await guest.close();
});
test("title and keyboard settings fit 1280 and 1920 viewports", async ({
  page,
}) => {
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1080 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Six floors/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByLabel("Text size")).toBeVisible();
    await page.getByLabel("Text size").selectOption("16");
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("four independent browsers commit a tactical round and reconnect to the same crawler", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1, 2, 3].map(() => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const a = pages[0];
  await a.goto("/");
  await a.locator("#seed").fill("1234");
  await a.locator("#name").fill("Crew 1");
  await a
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await expect(a.getByText("Your crew · 1/4")).toBeVisible();
  const invite = a.url();
  for (let i = 1; i < 4; i++) {
    await pages[i].goto(invite);
    await pages[i].locator("#name").fill("Crew " + (i + 1));
    await pages[i]
      .getByRole("button", { name: "Join room", exact: true })
      .click();
    await expect(
      pages[i].getByText("Your crew · " + (i + 1) + "/4"),
    ).toBeVisible();
  }
  await a.getByRole("button", { name: "Begin the run", exact: true }).click();
  await expect(a.locator("canvas")).toBeVisible();
  const session = await a.evaluate(() =>
    JSON.parse(localStorage.getItem("concourse.session")!),
  );
  const { readFileSync } = await import("node:fs");
  const { path, distance } = await import("../../packages/engine/src/grid");
  const load = () =>
    JSON.parse(readFileSync(".data/" + session.runId + ".json", "utf8")).data
      .game;
  for (let i = 0; i < 60; i++) {
    const state = load();
    if (state.phase === "PLANNING") break;
    const actor = state.actors[session.actorId];
    const target = Object.values(state.actors)
      .filter((v: any) => v.kind === "enemy" && !v.dead)
      .sort(
        (x: any, y: any) => distance(actor, x) - distance(actor, y),
      )[0] as any;
    const next = path(
      state,
      actor,
      target,
      true,
      Object.values(state.actors).filter(
        (v: any) => v.id !== actor.id && !v.dead && v.id !== target.id,
      ) as any,
    )[0];
    expect(next).toBeDefined();
    const key =
      next.x > actor.x
        ? "ArrowRight"
        : next.x < actor.x
          ? "ArrowLeft"
          : next.y > actor.y
            ? "ArrowDown"
            : "ArrowUp";
    const revision = state.revision;
    await a.locator("#map").focus();
    await a.keyboard.press(key);
    await expect.poll(() => load().revision).toBeGreaterThan(revision);
  }
  expect(load().phase).toBe("PLANNING");
  const before = load().round;
  for (const p of pages) {
    await p.getByRole("button", { name: "Guard [3]", exact: true }).click();
    await p.getByRole("button", { name: "Ready [R]", exact: true }).click();
  }
  await expect.poll(() => load().round).toBe(before + 1);
  for (const p of pages)
    await expect(p.locator("#header-info")).toContainText(
      "Round " + (before + 1),
    );
  const revisions = await Promise.all(
    pages.map((p) => p.locator("#app").getAttribute("data-checksum")),
  );
  expect(revisions.every(Boolean)).toBe(true);
  expect(new Set(revisions).size).toBe(1);
  const identity = await pages[3].evaluate(
    () => JSON.parse(localStorage.getItem("concourse.session")!).actorId,
  );
  await pages[3].reload();
  await pages[3]
    .getByRole("button", { name: "Reconnect / resume saved run", exact: true })
    .click();
  await expect(pages[3].locator("canvas")).toBeVisible();
  expect(
    await pages[3].evaluate(
      () => JSON.parse(localStorage.getItem("concourse.session")!).actorId,
    ),
  ).toBe(identity);
  await a.setViewportSize({ width: 1920, height: 1080 });
  await a.screenshot({ path: "test-results/dungeon-four-1920.png" });
  for (const context of contexts) await context.close();
});
