# Playing and developing locally

The Concourse is an original six-floor tactical co-op game in an unofficial private fan setting. This build is **LOCAL_ALPHA**, not a certified release candidate. All art is generated pixel geometry and all playable cast and writing are original. No paid service or remote AI is required.

## Prerequisites and commands

Use Node.js 22 or newer (validated here with Node 24.19.0), npm, and Python 3 for the original catalog checks. Dependencies are pinned in package-lock.json.

From the repository root:

```sh
npm ci
npm run validate:content
npm test
npm run build
npm run host
```

The host listens on loopback port 2567 by default. Open the local host at that port in a desktop browser. `npm run dev` serves the same game with Vite development middleware; it does not start a separate authority server or a public tunnel. `PORT`, `HOST`, and `DATA_DIR` override the port, bind address, and checkpoint directory. Run commands from the repository root so the built client and save directory resolve correctly.

Create a private room, choose a name/background/suit, and copy the invitation using the lobby button. The six-character room code is not a secret. The invitation fragment is; share the full invitation only with your crew. The room starts with one to four players. Every browser connects to the same Colyseus server; solo is a room with one player.

To use another machine on a trusted LAN, deliberately bind the host to the desired interface using `HOST=0.0.0.0 npm run host`, permit the selected port in the host firewall, and use that machine's LAN address. Loopback cannot be reached from another computer. Do not use an unencrypted LAN connection for an untrusted network.

## Controls and loop

- WASD/arrows move. In exploration, the server confirms each action immediately. In combat, movement and actions enter a 3 AP queue. Terrain and statuses change costs; the displayed budget uses the engine's calculation.
- 1 selects movement, 2 attacks, 3 guards, I opens inventory, C opens character, F inspects, R toggles readiness, Escape cancels, and Space confirms the selected target. Movement keys always move; Shift + arrows aim the cursor. Escape also closes drawers when a settings field has focus.
- Mouse targeting and keyboard targeting share the inspector. Hover identifies tiles; F then click pins inspection until Escape. Clicking an enemy constructs an affordable approach + attack plan or explains the AP shortfall. Guidance On/Off/Reset and Advanced controls support new and experienced players; see ALPHA3.md. Read marked boss tiles before committing; hazards affect allies. Area actions warn when a crawler may be hit.
- Move adjacent to objects to see interaction buttons. A physical route is always available for required objectives. Hacking and disabling can operate the same devices. Optional locked maintenance routes accept keys, hacking, or structural damage.
- All living crawlers must gather near the saferoom before entering. Rest is limited per crawler/floor. Shop, craft, accept/decline disclosed bargains, and select profession/adaptation from floor 3 onward. Crew votes are required to descend.
- Gifts require recipient consent. Boss rewards follow a draft and can be passed. Overflow stays in the saferoom chest. Downed allies need an adjacent revival; dead crawlers spectate/ping, and teammates can recover their gear.
- Complete all six objectives and resolve each boss by combat or its ordered alternative devices. The final uplink is a three-stage objective. Final victory ends further tactical resolution.

## Saves and reconnect

The host writes versioned SHA-256 checked checkpoints under `.data/`, with fsync/rename, three backups, plans, nonces, RNG streams, and room credentials stored as hashes. The append-only journal records committed revisions. Never delete this directory to resolve a load failure.

The browser stores its invitation and session token in localStorage. After a live transport drop, the client attempts bounded automatic reconnection. Unacknowledged exploration input uses the original nonce for retry; no predicted movement is committed locally. If automatic recovery cannot reach the host, reload and choose **Reconnect / resume saved run**. After restarting the same host with the same DATA_DIR, the same button restores the checkpoint and the original crawler. Do not share the localStorage session token; it identifies that player's slot. A session takeover closes the older transport; it does not add a fifth crawler.

A corrupt checkpoint is preserved under a `.corrupt-<timestamp>` name when a valid backup is recovered; the UI reports the rollback. An unsupported save/catalog version fails closed rather than silently migrating or overwriting it. Back up the complete DATA_DIR before manual changes or upgrades. Retain the matching game build when archiving a run.

Disconnecting does not kill a crawler. After 30 seconds they guard while others continue. If all browsers disconnect, no simulation runs. The browser host role transfers to a connected player. The authority process never migrates into a browser. A crawler offline for five minutes can be parked near the saferoom by the host. Heartbeats prevent force-ready from treating an actively connected planner as idle.

The host's **Export save** button downloads a checksummed backup. The title screen can restore that backup as a new private run when this browser still holds the matching host session and its original host checkpoint is available. Import is limited to 8 MiB, validates identity/version/catalog/checksum, and preserves the original run. It is a controlled fork, not a transferable account or an arbitrary foreign-save importer. Keep the backup, browser session and host DATA_DIR private and backed up together.

Victories unlock cosmetic suit palettes for future rooms on the same host. They do not add permanent combat stats.

## Optional private remote testing

No remote tunnel was started or deployment performed for this build. An operator who separately chooses to test remotely may consult Cloudflare's official Quick Tunnel instructions and point a manually launched tunnel at the local host. This is an external action, not part of install/dev/host/share. Keep the host process and tunnel running; use HTTPS/WSS over an untrusted network. A changed tunnel address requires a new invitation URL while the host's saved run remains unchanged. Actual separate-internet and packet-loss testing remains outstanding.

## Validation and test artifacts

```sh
npm run typecheck
npm run validate:content
npm test
npm run build
npm run e2e
npm run coverage:content
npm run soak
npm run soak:browser
npx tsx tools/seed-sweep.ts
npx tsx tools/campaign.ts
```

Playwright uses system Chromium by default in this cloud machine; set `CHROMIUM_PATH` to a compatible executable elsewhere, or install the pinned Playwright Chromium from its official distribution and update the launch path. The test runner owns a fresh local production host on port 2570 with isolated `.data/e2e` checkpoints. `E2E_PORT` and `E2E_DATA_DIR` override these. It refuses to reuse an unknown running server. No public preview is needed.

The campaign is explicitly debug assisted unless `CAMPAIGN_ASSISTED=0`. See JSON reports in docs for exact fixtures and results; compilation coverage does not establish every acceptance gate. `SOAK_ROUNDS`, `GENERATION_SEEDS`, `CAMPAIGN_SEEDS`, and `CAMPAIGN_PLAYERS` set the corresponding run sizes. Preserve the report qualification when quoting a result.

The browser soak owns a separate local host on port 2581 and four Chromium contexts. Default duration is 1800 seconds; `BROWSER_SOAK_SECONDS` changes duration, `BROWSER_SOAK_PORT` selects an isolated port, and `BROWSER_SOAK_OUTPUT` chooses a report path. Short checks must use a different output path so they do not overwrite the full endurance evidence. A failed or `complete:false` report is not a passing soak.

For a restored cloud workspace, dependencies/build files can survive a snapshot; host processes do not. Start the documented command again and verify `/api/health`, then create a room or run the browser smoke. On this managed machine set `npm_config_cache=/workspace/.cache/npm` if the default home cache is not writable.
