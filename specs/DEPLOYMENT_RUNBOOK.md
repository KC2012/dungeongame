# Private test deployment runbook — for implementation phase

## Goal
The hosting friend runs a small Node.js server. Up to three others (four total) use ordinary desktop browsers over HTTPS without installing the game. No persistent paid online service is required for the first private test; stable long-term availability is out of scope.

## Implementation requirement
`npm run host` starts the server and serves the built client from the same HTTP origin, with Colyseus WebSocket upgrades on the same port (no hard-coded localhost in production client). It prints a readable LAN/localhost URL; a `share` helper can print instructions for a Cloudflare Quick Tunnel rather than attempting unauthorized external actions.

## Local run
1. Owner installs a current LTS Node.js release supported by the pinned dependencies.
2. Owner runs `npm ci && npm run build && npm run host` and opens localhost URL.
3. Create a lobby, pick 1–4 characters, confirm deterministic round works across browser tabs before remote use.

## Remote private testing
1. Install `cloudflared` on the host PC from official Cloudflare docs: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
2. With the Node server running on e.g. `http://localhost:PORT`, run `cloudflared tunnel --url http://localhost:PORT` with the actual PORT from configuration.
3. Cloudflare generates a temporary HTTPS `trycloudflare.com` URL; give invited friends that link plus lobby invite secret. Test actual WebSocket upgrade and room state, not merely page load.
4. Keep host PC, game server and tunnel running throughout the game. If tunnel URL changes, send a new public URL; saved run and room identifier on host disk remain the same.
5. Stop tunnel to end outside access, or stop server to pause session. Remote browser cannot continue independently without the server.

## Troubleshooting
- Loads website but cannot join: inspect WSS path/proxy upgrade, origin header, firewall and Colyseus config; never fall back to insecure hard-coded WS silently.
- Lobby dies when browser host tab closes: bug; server must own room.
- Server stops: run checkpoint recovery from disk and retain runId; do not auto-create a new run.
- Tunnel changes URL: friends rejoin on new link with saved session token or use explicit resume ID.
- Quick Tunnels are for testing/development; limited guarantees. For frequent sessions, consider a named tunnel or stable host and verify relevant pricing before commitment. Don't assume production-grade privacy from obscurity of URL alone.
