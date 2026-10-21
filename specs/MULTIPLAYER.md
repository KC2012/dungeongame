# Multiplayer and recovery protocol

## Topology
- Standalone Node server (Colyseus) holds authoritative `GameState`. Browser-only clients render derived view state and submit intentions. No client writes authoritative state, RNG or inventory.
- Room size 1–4; random 6-character uppercase join code maps to internal unguessable room ID; join code is **not security**. Also generate a 128-bit invitation secret embedded in URL fragment and sent via explicit join authorization. Validate on server; redact token from logs.
- Anonymous cosmetic display name only (max 24, sanitized). No email/accounts needed. Host is the first room participant; can delegate host. For close friends, optional room password.
- Recommended private test hosting: Node on host's PC and temporary Cloudflare tunnel URL; players use HTTPS link and WSS socket through same origin. Test tunnel websocket path, CORS, proxy headers, body limits. Free Quick Tunnel not guaranteed availability/reliability.

## Messages (all schema-validated)
Client→Server:
`HELLO {protocolVersion,sessionToken}`, `JOIN {inviteSecret,name,portrait}`, `READY {round,ready:boolean}`, `SUBMIT_PLAN {runId,round,nonce,actions}`, `PICK_REWARD {draftId,itemId|pass}`, `LEVEL_CHOICE {offerId,choiceId}`, `CHAT_PING {tile}`, `REQUEST_SNAPSHOT {knownRevision}`, `HOST_FORCE_READY {round}`.
Server→Client:
`WELCOME {slot,sessionToken,serverVersion}`, `STATE_SNAPSHOT {revision,checksum,visibleState}`, `ROUND_COMMITTED {revision,round,events,checksum}`, `PLAN_REJECTED {nonce,reason}`, `PLAYER_STATUS {online,ready,downed}`, `CHOICE_OFFER`, `LOBBY_UPDATE`, `ERROR`, `RUN_COMPLETE`.

## Guarantees
- Each accepted plan uses `(actorId,round,nonce)` idempotency key. Duplicate packets acknowledged but not applied twice.
- Server validates every action against current state **at resolve time**, not client's cached estimate. Reject stale rounds with `PLAN_REJECTED` plus snapshot link, never apply stale action to future round.
- Server event log order is stable; all RNG draws from a seeded generator stored in run state. Never `Math.random()` inside reducer.
- Client may display optimistic planned path, never speculative HP/inventory changes as confirmed.
- Spectator sees only authorized room and contributes no commands.
- Unrelated room state cannot leak (isolation tests). Join requests are rate-limited, no global public directory.

## Disconnects
- Keep player's server entity alive. Reconnect with session token within 24h while room persists restores exact slot, pending plan and choice state. Distinguish `rejoin` from duplicate live client takeover; revoke old socket on takeover.
- If player goes offline during planning, after 30s set default `GUARD` or WAIT in unspent AP; no irreversible automatic pathing toward hazards. Host can `FORCE READY` after 45s. If everyone disconnects, pause simulation and persist checkpoint; do not run turns unattended.
- On server restart, restore from most recent atomic checkpoint and append journal; use monotonic revision and idempotent event sequence to prevent duplicate loot/rewards.
- When a dead player reconnects, spectator mode preserved.
- Host departure: designate longest-connected living player as new host; on host's **server process** going down, game pauses for all. Host migration is role migration, NOT automatic transfer of server authority to another computer.

## Durability
- Atomic filesystem snapshots (`write temp`, `fsync`, `rename`) at every round boundary and saferoom, plus append-only small event journal. Store under configurable local data dir and rotate backups (last 3). Use schemaVersion + contentVersion + checksum.
- On corrupt snapshot try previous checkpoint, report if rollback occurred; never silently start new game. On incompatible schema, disable load and offer backup export before migration.
- Export/import run via host admin action only; verify archive max size and version; ban path traversal.

## Security and privacy
- Treat nickname/chat-pings/invite info as untrusted. No chat in v1; pings are canned symbols. No remote JS execution, runtime eval or mod upload.
- Whitelist origin where practical, rate-limit events by slot, cap packet 32KB, cap plans to 4 actions, validate IDs/inventory counts/types, never trust client-side save.
- Keep logs local by default, no telemetry or third-party analytic SDK.

## Protocol example
`SUBMIT_PLAN {runId:'r1',round:12,nonce:4,actions:[{type:'MOVE',to:{x:5,y:6},cost:1},{type:'ATTACK',targetId:'m23',cost:2}]}`
Server verifies slot ownership+visibility/AP/path; multiple players submitting identical plans cannot create duplicate mutations. Broadcast event delta only once after resolution, with 64-bit or cryptographic checksum of canonical state JSON.

## Release smoke test
Start server; open 4 independent private-window clients via remote URL; join, ready, commit one round, disconnect one, reconnect, compare all visible revision/hash; restart server and resume; quit host client and verify host-role transfer; stop **server** and ensure all clients show paused/reconnect, not imaginary live play.
