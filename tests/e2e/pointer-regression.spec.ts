import { test, expect } from "@playwright/test";
test("hover previews preserve camera geometry and pinned inspection survives zoom, scroll and resize", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#seed").fill("1234");
  await page
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Begin the run", exact: true })
    .click();
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1080 });
    await page.locator("#map").focus();
    await page.keyboard.press("Escape");
    await page.keyboard.press("f");
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 100));
    await expect
      .poll(() => page.locator("canvas").getAttribute("data-viewport"))
      .not.toBeNull();
    await page.waitForTimeout(100);
    const canvas = page.locator("canvas"),
      rect = (await canvas.boundingBox())!,
      view = JSON.parse((await canvas.getAttribute("data-viewport"))!);
    const p = { x: 7, y: 8 };
    const x =
        rect.x +
        ((p.x * 16 + 8 - view.origin.x) * view.zoom * rect.width) / view.width,
      y =
        rect.y +
        ((p.y * 16 + 8 - view.origin.y) * view.zoom * rect.height) /
          view.height;
    await page.mouse.move(x, y);
    await expect(page.locator("#target-intent")).toContainText("Supply crate");
    const hovered = (await canvas.boundingBox())!;
    expect(hovered).toEqual(rect);
    await page.mouse.click(x, y);
    await expect(page.locator("#inspector")).toContainText("7, 8");
    await page.mouse.move(x + view.zoom * 16, y);
    await expect(page.locator("#inspector")).toContainText("7, 8");
    await page.screenshot({
      path: `docs/alpha3/pinned-inspection-${width}.png`,
    });
  }
});
