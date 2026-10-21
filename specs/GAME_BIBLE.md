# Game Bible — THE CRAWL (working name)

## High concept
Four strangers enter the **Concourse**, an original, previously unseen six-floor section of a world-scale televised survival dungeon, controlled locally by a bureaucratic entertainment subroutine called **The Producer**. This is an **unofficial private fan-setting interpretation** of the Dungeon Crawler Carl universe, not a retelling, a licensed expansion, or an attempt to reproduce canonical floors. Its labyrinth consists of six themed administrative zones. The contestants must reach and disable the final signal mast. The show rewards creativity, humiliates incompetence, and distorts events for ratings; behind the spectacle lies an internally consistent physical system players can master.

## Pillars (in priority order)
1. **Clever beats powerful:** traps, terrain, item interactions, cooperation, negotiation, and noncombat solutions should solve real encounters.
2. **Cruel but legible:** the game may be difficult and darkly funny, but fatal threats must communicate cause and counterplay.
3. **Distinct friends:** every crawler has meaningful abilities, gear and temporary spotlight without any mandatory class or composition.
4. **Story from systems:** a unique run is a chain of causally legible accidents, achievements, and tactical improvisations, not a random text generator.
5. **Fast shared sessions:** a cooperative turn advances decisively; no busywork, forced grinding, or hour-long inventory admin.

## Intended player fantasy
You are a disadvantaged participant in a disinterested theatrical machine. An improvised acid trap saves your crew; the Producer calls it a clerical error. Your class advances because you acted like a demolitions expert. A sponsor gives you a suspiciously generous gift. You win by coordinating, noticing rules, and taking calculated risks, not because the game lets you exploit bugs.

## Run loop
Lobby (create room / copy invite URL / nickname / cosmetic icon / background) → Arrival / short onboarding → Explore a generated wing → Find cache, interact, fight or bypass encounters → Complete a clear floor objective → Cross safe room threshold → Recover limited resources, craft/trade, choose class or talent, buy service → Descend → Final showdown → Epilogue and unlocks.

## Run structure
- 6 floors; each generated floor comprises 7–10 connected encounter rooms plus one entry, one saferoom, one boss or floor-objective room, and optional detours; maps between 45×45 and 80×80 tiles are *targets*, generation may adapt.
- Expected run for a practiced team: 75–120 minutes; a balance target to measure, not a promise. Supported pause/save at saferoom, tactical round boundary, and on server shutdown.
- Each floor has one clear mandatory objective; optional risk/reward branches; at least two non-identical solutions to each major boss encounter.
- Floor 1: teach basic commands, hazards, cooperation. Floor 2: modifiers and more severe environmental chains. Floor 3: class and body-path choice. Floor 4: vertical movement/transport networks abstracted on 2D grid. Floor 5: scarcity, contracts, political factions. Floor 6: showdown against the transmission engine; multiple victories, no endless loop.

## Character identity
Name, selectable icon/palette, mundane background, one aptitude, one flaw. No copyright-protected cast. Base statistics: Might, Finesse, Wit, Nerve. Starts human-equivalent, one mundane tool, two consumables based on background, simple clothing. Floor-3 **Adaptation** is a body alteration, *not* a canonical book race list. Floor-3 **Profession** supplies role-defining passives/abilities. Neither adaptation nor profession is a prerequisite to survival.

## Party identity
Parties share objective completion and key access, not inventories; consent-based trading in saferoom or adjacent tile. XP is team-wide, levels simultaneous. Kills never steal XP. Reward draft is round-robin with recipient able to pass, avoiding fast-click looting. Boss achievements are eligible for all contributors; individual achievements reward unique behavior.

## Failure / survival
When HP reaches zero: downed for three complete round resolutions, unable to act except request help; allied adjacent revive consumes a field kit or 2 AP to stabilize to 20% max HP once per floor per target, with 1 wound stack. A second downing before the next saferoom causes permanent death. A death is permanent to run completion; the dead player can freely spectate, ping, and read logs, but cannot take actions. If all living participants are permanently dead or downed beyond revive conditions, party defeat. More details and tie cases in MECHANICS.

## Producer voice
Wickedly funny but *not* abusive toward actual players. Avoid discriminatory slurs, sexual violence, real-world tragedy punchlines, or humiliating the user directly. The Producer insults **fictional contestants** using observational satire. The user can lower announcer frequency, disable voice/sounds, and enable reduced flashing. The Director never alters locked dice after a player submits a command.

## Content completeness rule
Unique entry counts in JSON files are the source of truth. Most content is crafted from small shared effect primitives.  A complete build cannot use inert menu options, placeholder combat effects, or duplicate reskinned items to claim completeness. Diversity measured by behavior and playtest, not only record counts.

## North-star demonstration
Player A floods a generator room; Player B throws a battery into standing water; Player C shoves a metal-clad miniboss into the circuit; Player D shields an ally from the arc. Deterministic events and clear log messages explain all effects. Achievement fires once, audience interest rises, and the next safe room offers a dangerous sponsor deal. This is a regression scenario, not just narrative.
