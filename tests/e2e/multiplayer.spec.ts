import { test, expect, type Page } from "@playwright/test";
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
  await a.keyboard.press("2");
  await a.keyboard.press("ArrowRight");
  await expect(a.locator("#inspector")).toContainText("max range");
  await expect(a.locator("#inspector")).toContainText("LOS");
  await a.keyboard.press("1");
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
    JSON.parse(
      readFileSync(
        (process.env.E2E_DATA_DIR ?? ".data/e2e") +
          "/" +
          session.runId +
          ".json",
        "utf8",
      ),
    ).data.game;
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
    await expect
      .poll(async () =>
        Number(await a.locator("#app").getAttribute("data-revision")),
      )
      .toBeGreaterThanOrEqual(revision);
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
  for (const width of [1280, 1920]) {
    await a.setViewportSize({ width, height: width === 1280 ? 720 : 1080 });
    // The local crawler's gold outline must stay on the canvas after resize.
    await expect
      .poll(() =>
        a.locator("canvas").evaluate((canvas) => {
          const c = canvas as HTMLCanvasElement;
          const pixels = c
            .getContext("2d")!
            .getImageData(0, 0, c.width, c.height).data;
          let gold = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i] === 255 &&
              pixels[i + 1] === 219 &&
              pixels[i + 2] === 135
            )
              gold++;
          return gold;
        }),
      )
      .toBeGreaterThan(32);
  }
  await a.screenshot({ path: "test-results/dungeon-four-1920.png" });
  for (const context of contexts) await context.close();
});

test("active tools offer a use action as well as equipment", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#background").selectOption("courier_clerk");
  await page.locator("#seed").fill("1234");
  await page
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Begin the run", exact: true })
    .click();
  await page.locator("canvas").waitFor();
  await page.keyboard.press("i");
  const tool = page
    .locator("article.item")
    .filter({ has: page.getByRole("heading", { name: /^Ink Stamp/ }) });
  await expect(
    tool.getByRole("button", { name: "Equip", exact: true }),
  ).toBeVisible();
  await tool.getByRole("button", { name: "Use / target", exact: true }).click();
  await expect(page.locator("#drawer")).not.toHaveClass(/open/);
  await expect(page.getByRole("alert")).toContainText("Choose a target");
});

// Change only transport delivery in this fixture: the client and authority are real.
async function controlledTransport(page: Page) {
  await page.addInitScript(() => {
    const state = {
      sockets: [] as WebSocket[],
      dropNextAction: false,
      dropped: 0,
    };
    (window as any).__transportTest = state;
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        state.sockets.push(this);
      }
      override send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        const text =
          typeof data === "string"
            ? data
            : data instanceof Blob
              ? ""
              : new TextDecoder().decode(data as ArrayBufferView);
        if (state.dropNextAction && text.includes("ACTION")) {
          state.dropNextAction = false;
          state.dropped++;
          return;
        }
        super.send(data);
      }
    };
  });
}
async function startSolo(page: Page) {
  await page.goto("/");
  await page.locator("#seed").fill("1234");
  await page
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Begin the run", exact: true })
    .click();
  await page.locator("canvas").waitFor();
  await page.locator("#map").focus();
}
test("a dropped socket with an unacknowledged action reconnects and accepts new authoritative input", async ({
  page,
}) => {
  await controlledTransport(page);
  await startSolo(page);
  const actor = await page.evaluate(
    () => JSON.parse(localStorage.getItem("concourse.session")!).actorId,
  );
  await page.evaluate(() => {
    (window as any).__transportTest.dropNextAction = true;
  });
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() => page.evaluate(() => (window as any).__transportTest.dropped))
    .toBe(1);
  await page.evaluate(() => {
    const sockets = (window as any).__transportTest.sockets as WebSocket[];
    sockets[sockets.length - 1].close(
      3001,
      "controlled transport interruption",
    );
  });
  await expect(page.locator("#app")).toHaveAttribute(
    "data-connection",
    "offline",
  );
  await expect(page.locator("#app")).toHaveAttribute(
    "data-connection",
    "connected",
    { timeout: 15000 },
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("concourse.session")!).actorId,
    ),
  ).toBe(actor);
  const before = Number(
    await page.locator("#app").getAttribute("data-revision"),
  );
  await page.locator("#map").focus();
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () =>
      Number(await page.locator("#app").getAttribute("data-revision")),
    )
    .toBeGreaterThan(before);
  await expect(page.locator("#header-info")).toContainText("Round 1");
});
test("an unacknowledged action is retried once with the same nonce", async ({
  page,
}) => {
  await controlledTransport(page);
  await startSolo(page);
  await page.evaluate(() => {
    (window as any).__transportTest.dropNextAction = true;
  });
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() => page.evaluate(() => (window as any).__transportTest.dropped))
    .toBe(1);
  await expect(page.locator("#header-info")).toContainText("Round 0");
  await expect(page.locator("#header-info")).toContainText("Round 1", {
    timeout: 15000,
  });
  await expect(page.locator("#app")).toHaveAttribute("data-pending", "0");
  // A second watchdog interval must not execute the original action again.
  await page.waitForTimeout(5500);
  await expect(page.locator("#header-info")).toContainText("Round 1");
});

test("crawler development separates permanent choices and retains exact item mechanics", async ({
  page,
}) => {
  await startSolo(page);
  await page.keyboard.press("c");
  await expect(
    page.getByRole("heading", { name: "Rewrite your contract." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "01 · Your profession" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "02 · Your adaptation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose Breaker", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Unlocks/).first()).toBeVisible();
  await page.screenshot({ path: "docs/alpha2/a23-crawler-development.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
  await expect(page.locator("#drawer")).toContainText("weight");
});

test("Producer mute and reduced motion persist while precise gameplay interfaces remain available", async ({
  page,
}) => {
  await startSolo(page);
  await expect(page.locator("#audience-meter")).toContainText("AUDIENCE");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Producer commentary").uncheck();
  await page
    .getByLabel("Reduced motion · stationary feedback, no travel")
    .check();
  await page.keyboard.press("Escape");
  await expect(page.locator("#producer-line")).toContainText(
    "Commentary muted",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("concourse.settings")!).reducedMotion,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Producer commentary")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page.keyboard.press("f");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#inspector")).toContainText("Inspector");
});

test("map focus enlarges the dungeon and expert panels remain accessible by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSolo(page);
  const width = await page.locator("canvas").evaluate((c) => c.clientWidth);
  await expect(page.locator("#log-panel")).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Map focus", exact: true }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-map-focus", "true");
  await expect
    .poll(() => page.locator("canvas").evaluate((c) => c.clientWidth))
    .toBeGreaterThan(width + 150);
  await page.screenshot({ path: "docs/alpha2/a25-map-focus-1280.png" });
  await page.locator("#map").focus();
  await page.keyboard.press("f");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#app")).toHaveAttribute("data-map-focus", "false");
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#target-readout")).not.toBeEmpty();
  await page.locator("#log-panel summary").click();
  await expect(page.locator("#log")).toBeVisible();
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1080 });
    await page.evaluate(() => {
      const side = document.querySelector<HTMLElement>(".side");
      if (side) side.scrollTop = 0;
    });
    await page.screenshot({ path: `docs/alpha2/a25-dungeon-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("presentation does not hold up confirmed input or replay effects on resume", async ({
  page,
}) => {
  await startSolo(page);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#header-info")).toContainText("Round 2");
  await expect(page.locator("#app")).toHaveAttribute("data-pending", "0");
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-visual-cues"))
    .not.toBe("0");
  await page.reload();
  await page
    .getByRole("button", { name: "Reconnect / resume saved run", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-visual-cues", "0");
  await expect(page.locator("#header-info")).toContainText("Round 2");
});
