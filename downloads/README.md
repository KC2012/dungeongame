# THE CRAWL — complete Alpha 3 download

Download **THE-CRAWL-Alpha-3-Complete.zip** using GitHub's **Download raw file** button on its file page. This is a normal repository download, not an expiring chat attachment. The archive is 7,487,057 bytes and contains the complete game source, matching compiled client/server, all content/tests/specs/documentation, screenshot evidence and an optional Git history bundle. It excludes private saves/session credentials, node_modules and caches.

Source: `alpha3/make-the-game-understandable`, commit **de6e6504f0af19518e430fc0e1da566f1fafe6f1**, local tag `v0.3.0-local-alpha`. This `delivery/alpha3-download` branch adds packaging only; it does not merge into main or deploy a server. The bundled history preserves the development branch and baseline refs. Only this dedicated delivery branch is pushed; the source branch/tag remain available locally and through the bundle/ancestor history.

Extract into a new folder. Open a terminal inside `dungeongame`, use Node.js 22+, then run:

```sh
npm ci --omit=dev
npm run host
```

Open your local game on port 2567. Stop an older host first. Start a new private room with Guidance On; seeds 1234 and 264461152 with Night Custodian were exercised in production-browser walkthroughs. See START-HERE.txt and docs/ALPHA3.md inside the ZIP for controls, rebuilding, screenshots, limitations, test evidence and a first-time human checklist. Reset guidance **before** creating a new room to replay the teaching layout.

Checks: 565 npm tests, 18 browser scenarios, 11 Python tests, 448 content records, typecheck/build and two explicitly assisted six-floor campaigns passed. A separate fresh-extraction production-only install/browser smoke passed; see alpha3-package-smoke.json. Human zero-knowledge comprehension, WAN and new endurance/accessibility/balance qualification remain unverified. This is a playable local candidate, not a certified release candidate.

The adjacent checksum and delivery manifest verify archive bytes and exact source/build identity. Existing GitHub validation workflows are skipped for this packaging-only push to avoid launching extra remote jobs; reported results are the local checks actually run.
