# Local alpha delivery

Version/tag: `v0.1.1-local-alpha`. This is a local source-and-build delivery, with no public release, push, tunnel or deployment.

The zip at `/workspace/artifacts/the-crawl-0.1.1-local-alpha.zip` contains committed source, pinned package-lock.json, content/specs, test tools/reports, dependency notices and `dist/client` plus `dist/server.js`. Its neighboring `.sha256` verifies archive bytes. No node_modules, private checkpoints, session tokens, cache or Git history is packaged.

After extracting, enter the `dungeongame` directory, use Node 22 or newer, run `npm ci --omit=dev` and `npm run host`. This starts the included compiled build on loopback port 2567. For development or rebuilding, install all dependencies with `npm ci`, then use `npm run dev` or `npm run build`. Commands must run from this directory. See HOSTING.md for private invitation, LAN configuration, controls and save identity limits.

The compile process has no paid credential. Exact archive SHA-256 and source commit appear alongside the artifact; normal rebuilds may produce different archive metadata while preserving executable behavior. The local tag identifies the committed source snapshot; the compiled build is tested from that source, and the artifact manifest records its hashes.

LOCAL_ALPHA limits are material. Read ACCEPTANCE_REPORT.md and ISSUES.md before inviting friends. In particular, the 16.23-second load-test timing outlier is retained, and local four-browser checks do not establish separate-internet reliability or human balance/accessibility acceptance.

Reusable cloud configuration: the tested install script and host/start/readiness instructions are saved as an environment draft. This does not mean a new cloud snapshot was published. Environment settings own review/publication; no public game deployment is involved.

Windows 0.1.0 users can use `the-crawl-windows-fix.zip`: stop the host, extract the patch, and copy its contents into the existing game folder, replacing files. Restart with `npm run host`; no dependency reinstall is needed. The previous GitHub download filename is maintained as an alias to the fixed full archive so old links no longer distribute the Windows bug. The original version remains in Git history.
