import { test, expect } from "@playwright/test";
test("first-run movement and supplies teach through the real Floor 1 and persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#title-guidance").selectOption("on");
  await page.locator("#seed").fill("1234");
  await page
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Begin the run", exact: true })
    .click();
  await expect(page.locator("#guidance")).toHaveAttribute(
    "data-lesson",
    "move",
  );
  await page.locator("#map").focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#guidance")).toHaveAttribute(
    "data-lesson",
    "interact",
  );
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#header-info")).toContainText("Round 2");
  await page.getByRole("button", { name: /Open supplies/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("concourse.guidance.v1")!).done,
      ),
    )
    .toContain("interact");
  await page.screenshot({ path: "docs/alpha3/first-run-supplies.png" });
  await page.reload();
  await page
    .getByRole("button", { name: "Reconnect / resume saved run", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("concourse.guidance.v1")!).done,
    ),
  ).toContain("move");
});
test("Guidance off persists and reset restores the new-player path", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#title-guidance").selectOption("off");
  await page.reload();
  await expect(page.locator("#title-guidance")).toHaveValue("off");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset guidance progress", exact: true })
    .click();
  await expect(page.locator("#title-guidance")).toHaveValue("on");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("concourse.guidance.v1")!).done,
    ),
  ).toEqual([]);
});
