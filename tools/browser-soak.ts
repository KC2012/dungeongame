import { chromium, type Browser } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const seconds = Number(process.env.BROWSER_SOAK_SECONDS ?? 1800);
const reportPath =
  process.env.BROWSER_SOAK_OUTPUT ?? "docs/browser-soak-report.json";
const dir = mkdtempSync(join(tmpdir(), "crawl-browser-"));
let host: ChildProcess | undefined;
let output = "";
const errors: string[] = [];
let browser: Browser | undefined;
try {
  host = spawn("node", ["dist/server.js"], {
    env: { ...process.env, DATA_DIR: dir, PORT: "2581" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  host.stdout?.on("data", (c) => (output += String(c)));
  host.stderr?.on("data", (c) => (output += String(c)));
  const deadline = Date.now() + 30000;
  while (!output.includes("listening on port") && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 100));
  if (!output.includes("listening on port")) throw Error("Host startup failed");
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const contexts = await Promise.all(
    [0, 1, 2, 3].map(() =>
      browser!.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  for (const p of pages) p.on("pageerror", (e) => errors.push(e.message));
  const root = "http://127.0.0.1:2581";
  await pages[0].goto(root);
  await pages[0].locator("#seed").fill("1234");
  await pages[0]
    .getByRole("button", { name: "Create private room", exact: true })
    .click();
  await pages[0].getByText("Your crew · 1/4").waitFor();
  const invitation = pages[0].url();
  for (let i = 1; i < 4; i++) {
    await pages[i].goto(invitation);
    await pages[i]
      .getByRole("button", { name: "Join room", exact: true })
      .click();
    await pages[i].getByText("Your crew · " + (i + 1) + "/4").waitFor();
  }
  await pages[0]
    .getByRole("button", { name: "Begin the run", exact: true })
    .click();
  await pages[0].locator("canvas").waitFor();
  const clients = await Promise.all(
    pages.map((p, i) => contexts[i].newCDPSession(p)),
  );
  const sample = async () => {
    const heap = [];
    for (const c of clients) {
      await c.send("HeapProfiler.collectGarbage");
      heap.push((await c.send("Runtime.getHeapUsage")).usedSize / 1048576);
    }
    return heap;
  };
  const initial = await sample();
  await pages[0].locator("#map").focus();
  await pages[0].keyboard.press("ArrowUp");
  await pages[0].waitForTimeout(1000);
  const start = Date.now(),
    samples: any[] = [];
  let cycles = 0,
    lastMinute = -1;
  const keys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
  let lastRevision = 0;
  while (Date.now() - start < seconds * 1000) {
    const before = Number(
      await pages[0].locator("#app").getAttribute("data-revision"),
    );
    await pages[0].keyboard.press(keys[cycles % 4]);
    await pages[0].waitForFunction(
      (revision) =>
        Number(document.querySelector("#app")?.getAttribute("data-revision")) >
        revision,
      before,
      { timeout: 30000 },
    );
    await pages[0].waitForTimeout(500);
    cycles++;
    const minute = Math.floor((Date.now() - start) / 60000);
    if (minute !== lastMinute) {
      lastMinute = minute;
      const heaps = await sample();
      const revision = Number(
        await pages[0].locator("#app").getAttribute("data-revision"),
      );
      if (revision <= lastRevision && cycles > 1) {
        const info = await pages[0].evaluate(() => ({
          header: document.querySelector("#header-info")?.textContent,
          metadata: { ...document.querySelector<HTMLElement>("#app")!.dataset },
          activeElement: document.activeElement?.tagName,
          toast: document.querySelector(".toast")?.textContent,
        }));
        const session = await pages[0].evaluate(() =>
          JSON.parse(localStorage.getItem("concourse.session")!),
        );
        let serverState;
        try {
          const saved = JSON.parse(
            readFileSync(join(dir, session.runId + ".json"), "utf8"),
          ).data;
          const a = saved.game.actors[session.actorId];
          serverState = {
            revision: saved.game.revision,
            round: saved.game.round,
            phase: saved.game.phase,
            actor: { x: a.x, y: a.y, hp: a.hp },
            nonce: saved.sessions.find(
              (s: any) => s.actorId === session.actorId,
            )?.nonce,
          };
        } catch {}
        writeFileSync(
          "docs/browser-soak-failure.json",
          JSON.stringify(
            {
              elapsedSeconds: (Date.now() - start) / 1000,
              cycles,
              info,
              serverState,
              errors,
              serverOutput: output.slice(-2000),
            },
            null,
            2,
          ) + "\n",
        );
        throw Error(
          "Authoritative state stopped advancing; see docs/browser-soak-failure.json",
        );
      }
      lastRevision = revision;
      samples.push({
        elapsedSeconds: (Date.now() - start) / 1000,
        heapMiB: heaps,
        revision,
      });
      writeFileSync(
        reportPath,
        JSON.stringify(
          {
            complete: false,
            seconds,
            cycles,
            initialHeapMiB: initial,
            samples,
            errors,
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        `Browser soak ${minute} min / ${seconds / 60}: revision ${revision}, heap ${heaps.map((v) => v.toFixed(1)).join("/")} MiB`,
      );
    }
    if (errors.length) throw Error(errors[0]);
  }
  const final = await sample();
  if (final.some((n, i) => n > initial[i] * 2 + 40))
    throw Error("Renderer heap grew beyond the test bound");
  const revisions = await Promise.all(
    pages.map((p) => p.locator("#app").getAttribute("data-revision")),
  );
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        complete: true,
        seconds,
        elapsedSeconds: (Date.now() - start) / 1000,
        players: 4,
        cycles,
        initialHeapMiB: initial,
        finalHeapMiB: final,
        samples,
        errors,
        finalRevisions: revisions,
        qualification:
          "Four independent local Chromium contexts; active server-confirmed keyboard exploration and snapshot rendering. Not a remote network or human balance test.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Browser soak complete: ${seconds}s, ${cycles} actions, zero browser errors`,
  );
} finally {
  await browser?.close();
  if (host && host.exitCode === null) {
    host.kill("SIGTERM");
    await new Promise((r) => host!.once("exit", r));
  }
  rmSync(dir, { recursive: true, force: true });
}
