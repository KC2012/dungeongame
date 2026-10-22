import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { path, distance, los } from "../../packages/engine/src/grid";
import type { State, Point } from "../../packages/engine/src/types";
async function clickWorld(page: Page, p: Point) {
  const canvas = page.locator("canvas"),
    rect = (await canvas.boundingBox())!,
    view = JSON.parse((await canvas.getAttribute("data-viewport"))!);
  const x =
    rect.x +
    ((p.x * 16 + 8 - view.origin.x) * view.zoom * rect.width) / view.width;
  const y =
    rect.y +
    ((p.y * 16 + 8 - view.origin.y) * view.zoom * rect.height) / view.height;
  await page.mouse.move(x, y);
  await page.waitForTimeout(60);
  await page.mouse.click(x, y);
}
for (const seed of [1234, 264461152])
  test(`guided real first combat and wet-relay lesson, seed ${seed}`, async ({
    page,
  }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.locator("#seed").fill(String(seed));
    await page.locator("#background").selectOption("night_custodian");
    await page
      .getByRole("button", { name: "Create private room", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Begin the run", exact: true })
      .click();
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("concourse.session")!),
    );
    const load = (): State =>
      JSON.parse(
        readFileSync(
          `${process.env.E2E_DATA_DIR ?? ".data/e2e"}/${session.runId}.json`,
          "utf8",
        ),
      ).data.game;
    const wait = async (revision: number) =>
      expect.poll(() => load().revision).toBeGreaterThan(revision);
    async function step(p: Point) {
      const s = load(),
        a = s.actors[session.actorId];
      await page.locator("#map").focus();
      await page.keyboard.press(
        p.x > a.x
          ? "ArrowRight"
          : p.x < a.x
            ? "ArrowLeft"
            : p.y > a.y
              ? "ArrowDown"
              : "ArrowUp",
      );
      if (s.phase !== "PLANNING") await wait(s.revision);
    }
    async function ready() {
      const s = load();
      await page
        .getByRole("button", { name: "Ready [R]", exact: true })
        .click();
      await wait(s.revision);
      if (!s.actors.f1_e1_0.dead && load().actors.f1_e1_0.dead) {
        await expect(page.locator("#round-recap")).toContainText("Rat");
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `docs/alpha3/first-combat-${seed}.png` });
      }
    }
    async function navigate(goal: Point, max = 100, preferGoal = false) {
      for (let i = 0; i < max; i++) {
        const s = load(),
          a = s.actors[session.actorId];
        expect(a.dead).toBe(false);
        expect(a.downed).toBe(0);
        if (distance(a, goal) <= 1) return;
        if (s.phase === "PLANNING") {
          const enemies = Object.values(s.actors)
              .filter(
                (v) =>
                  v.kind === "enemy" &&
                  !v.dead &&
                  distance(a, v) <= 8 &&
                  los(s, a, v),
              )
              .sort((x, y) => distance(a, x) - distance(a, y)),
            enemy = enemies[0];
          if (
            !preferGoal &&
            enemy &&
            distance(a, enemy) <= 1 &&
            los(s, a, enemy)
          ) {
            await clickWorld(page, enemy);
            await expect(page.locator(".plan-steps")).toContainText("Attack");
          } else {
            const to = preferGoal ? goal : (enemy ?? goal),
              route = path(
                s,
                a,
                to,
                true,
                Object.values(s.actors).filter(
                  (v) => v.id !== a.id && !v.dead && v.id !== enemy?.id,
                ),
              );
            expect(route.length).toBeGreaterThan(0);
            await step(route[0]);
          }
          await ready();
        } else {
          const route = path(
            s,
            a,
            goal,
            true,
            Object.values(s.actors).filter((v) => v.id !== a.id && !v.dead),
          );
          expect(route.length).toBeGreaterThan(0);
          await step(route[0]);
        }
      }
      throw Error("walkthrough did not reach the encounter");
    }
    await page.getByRole("button", { name: /Open supplies/ }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("concourse.guidance.v1") ?? '{"done":[]}',
            ).done,
        ),
      )
      .toContain("loot");
    await navigate({ x: 22, y: 8 });
    // Finish the first actual pursuer encounter through displayed attack plans and Ready.
    for (let i = 0; i < 20 && !load().actors.f1_e1_0.dead; i++) {
      const s = load(),
        a = s.actors[session.actorId],
        e = s.actors.f1_e1_0;
      if (s.phase !== "PLANNING") {
        await navigate(e, 30);
        continue;
      }
      if (distance(a, e) <= 1 && los(s, a, e)) await clickWorld(page, e);
      else {
        const route = path(
          s,
          a,
          e,
          true,
          Object.values(s.actors).filter(
            (v) => v.id !== a.id && !v.dead && v.id !== e.id,
          ),
        );
        expect(route.length).toBeGreaterThan(0);
        await step(route[0]);
      }
      await ready();
    }
    expect(load().actors.f1_e1_0.dead).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("concourse.guidance.v1") ?? '{"done":[]}',
            ).done,
        ),
      )
      .toContain("round");
    const relay = load().objects.find((o) => o.id === "generator_2")!;
    await navigate(relay, 130, true);
    const before = load();
    await clickWorld(page, relay);
    if (before.phase === "PLANNING") {
      await page.getByRole("button", { name: /^Guard/ }).click();
      await ready();
    } else await wait(before.revision);
    const after = load();
    expect(after.events.some((e) => e.type === "shock_chain")).toBe(true);
    expect(
      after.events.some(
        (e) =>
          e.type === "damage" &&
          e.targetIds.includes("f1_e2_0") &&
          e.payload.element === "shock",
      ),
    ).toBe(true);
    await expect(page.locator("#round-recap")).toContainText(
      /Electricity|electricity/,
    );
    expect(
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("concourse.guidance.v1") ?? '{"done":[]}',
          ).done,
      ),
    ).toContain("environment");
    await expect(page.locator("#moment")).not.toContainText("THREAT DETECTED");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/alpha3/wet-relay-${seed}.png` });
    await page
      .getByRole("button", { name: "All outcomes / history", exact: true })
      .click();
    await expect(page.locator("#drawer")).toContainText("connected tiles");
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });
