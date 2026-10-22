# THE CRAWL — ALPHA 3: MAKE THE GAME UNDERSTANDABLE

Alpha 1 built the underlying game.

Alpha 2 added substantial depth, presentation work, environmental content, and additional playable material.

The game is now mechanically deep and contains many interesting systems, but playtesting has identified the most important remaining problem:

**THE CRAWL is too difficult for a new player to understand.**

The game is more interesting than it appears because much of its information is hidden behind an extremely minimal visual language, small abstract map symbols, Inspector text, logs, panels, and a large number of controls presented simultaneously.

A new player frequently has to answer:

**"What am I looking at?"**

before they can answer:

**"What should I do?"**

Alpha 3 must solve this.

This is not primarily a content-expansion milestone.

This is not a simulation rewrite.

This is a major **visual communication, onboarding, interaction-design, and interface pass.**

The target is:

> **A player who has never read the manual should be able to start THE CRAWL and understand its fundamental gameplay within approximately ten minutes.**

The deeper systems should remain deep. The game should become easier to understand, not mechanically shallow.

---

# 1. PRESERVE THE GAME UNDERNEATH

Do not simplify away the systems that make THE CRAWL interesting.

Preserve:

- deterministic tactical simulation;
- 3-AP planning;
- simultaneous multiplayer planning;
- authoritative server;
- environmental interactions;
- material simulation;
- statuses;
- equipment;
- inventory;
- abilities;
- Audience/Producer;
- procedural generation;
- alternate boss solutions;
- professions;
- adaptations;
- progression;
- crafting;
- downing/wounds/death;
- multiplayer;
- saves/reconnect;
- existing Alpha 2 content.

Create a dedicated Alpha 3 branch and preserve Alpha 2 as a known-good baseline.

Run the complete existing test suite before making changes.

The purpose of Alpha 3 is to expose these systems better, not remove them.

---

# 2. CHANGE THE VISUAL PHILOSOPHY

The current ultra-minimal, terminal-like visual presentation is no longer sufficient for the complexity of the game.

Do not treat the current abstract map style as sacred.

Retain the game's:

- retro character;
- dark industrial atmosphere;
- restrained palette;
- top-down tactical presentation;
- utilitarian dystopian aesthetic.

But move toward a more readable **pixel-art tactical roguelite** presentation.

The player should be able to identify important world objects primarily by looking at them rather than reading labels or opening the Inspector.

Introduce a coherent sprite/tile language for at minimum:

- player crawlers;
- enemy archetypes;
- bosses;
- walls;
- floors;
- doors;
- crates/caches;
- machinery;
- terminals;
- boss devices;
- stairs/descent;
- saferooms;
- objectives;
- loot;
- barrels;
- water;
- oil;
- gas;
- fire;
- electricity;
- ice;
- acid;
- smoke;
- pits;
- cover;
- destructible structures;
- other major environmental hazards already implemented.

Use simple, consistent pixel graphics rather than detailed artwork.

Clarity is more important than graphical sophistication.

A player, enemy, barrel, generator, door and objective should not look like variations of similarly weighted abstract glyphs.

---

# 3. INCREASE MAP READABILITY

The current map attempts to display too much dungeon at once, making important actors and objects physically small.

Reassess tile size, default zoom and camera framing.

It is acceptable — and probably preferable — for the player to see **less of the dungeon at once if what they see is substantially easier to understand.**

The player's immediate tactical surroundings matter more than showing the maximum possible floor area.

Implement camera behavior that keeps the crawler and relevant tactical area readable.

Preserve zoom controls.

Use fog of war and darkness to frame the playable area rather than leaving enormous visually empty regions competing for screen space.

---

# 4. ESTABLISH A STRICT VISUAL HIERARCHY

Use presentation consistently.

General principle:

**Brightness communicates importance.  
Saturation communicates urgency.  
Motion communicates change.**

The exact implementation may vary, but the hierarchy should make the following immediately distinguishable:

1. the player's crawler;
2. hostile actors;
3. immediate threats and telegraphs;
4. objectives;
5. interactable objects;
6. loot;
7. environmental opportunities/hazards;
8. ordinary terrain;
9. background/unexplored space.

Do not make everything glow.

Do not solve readability by highlighting every object equally.

The player's eye should naturally find the important information.

---

# 5. BUILD A REAL FIRST-RUN ONBOARDING EXPERIENCE

This is one of the highest-priority Alpha 3 requirements.

Do not rely on the existing manual.

Do not begin by explaining every system in text.

Do not create a separate boring tutorial disconnected from the real game.

Instead, make **Floor 1 itself teach THE CRAWL through play.**

The first-run experience should progressively introduce mechanics as they become relevant.

The exact procedural implementation can vary, but the intended learning sequence is approximately:

## Step 1 — Movement

Start in a visually quiet environment.

Initially teach only:

**MOVE — WASD / arrows / click**

Let the player move.

Then remove/minimize the instruction.

## Step 2 — Interaction

Present an obvious interactable such as a crate, cache, door, or simple machine.

Visually distinguish it.

When the player approaches, teach interaction contextually.

Let the player perform the interaction.

## Step 3 — First enemy

Introduce one understandable, forgiving enemy.

When combat begins, clearly communicate the transition:

**THREAT DETECTED**

Introduce:

- 3 AP;
- Move;
- Attack;
- Action Plan;
- Ready.

Do not introduce every advanced tactical control simultaneously.

Let the player plan and resolve a simple tactical round.

## Step 4 — Defense

Create a situation where defensive play becomes relevant.

Introduce Guard.

Introduce Dodge when an enemy telegraph makes Dodge meaningful.

Introduce Overwatch later when a ranged tactical situation makes its purpose understandable.

## Step 5 — Cover

Present an encounter where cover is visually obvious.

Show how cover changes an attack preview.

Teach through the actual tactical situation rather than a detached explanation.

## Step 6 — Environment

Create or strongly favor an early encounter demonstrating the central systemic idea of THE CRAWL.

Example:

- visible water;
- electrical source;
- enemy positioned in or near water.

Provide a subtle visual preview or contextual hint.

Something like:

**THE DUNGEON OBEYS PHYSICAL RULES.**

Let the player discover the interaction.

When electricity reaches water:

- visibly propagate electricity;
- visibly affect the enemy;
- clearly show STUNNED/damage;
- show Audience response;
- optionally trigger a concise Producer reaction.

The player should learn through experience:

**The room itself is a weapon.**

This is one of the most important lessons in the entire game.

## Step 7 — Inventory

After obtaining the first meaningful item, draw attention to Inventory.

Do not teach Inventory before there is something worth examining.

## Step 8 — Character / progression

Introduce Character when the player levels or receives a meaningful character-development decision.

## Step 9 — Objective / boss machinery

Only after the player understands ordinary exploration and combat should Floor 1 explicitly teach:

- floor objective;
- boss;
- boss device;
- alternate systemic resolution.

By the end of Floor 1, the player should understand the basic gameplay loop without having read external documentation.

---

# 6. PROGRESSIVE DISCLOSURE OF CONTROLS

The current Action Plan presents too many concepts simultaneously to a new player.

Implement progressive disclosure.

A first-time player's command interface might conceptually evolve from:

**MOVE**

to:

**MOVE | ATTACK | READY**

then:

**MOVE | ATTACK | GUARD | READY**

and eventually reveal:

- Dodge;
- Overwatch;
- Inventory;
- Character;
- Abilities;
- other relevant actions.

Do not permanently remove advanced controls.

Experienced players must be able to access the complete interface.

Provide a mechanism such as:

- tutorial progression;
- contextual activation;
- an Advanced Controls expansion;
- or an experienced-player/tutorial-off setting.

Once the player understands the game, the full tactical command set should remain readily available.

The goal is not fewer mechanics.

The goal is **complexity arriving when the player has context for it.**

---

# 7. REDUCE PERMANENT UI CHROME

The current screen dedicates substantial permanent space to:

- Crew;
- Inspector;
- Transmission Log;
- Nearby Actions;
- objective information;
- controls;
- other textual panels.

These are individually useful but collectively compete with the dungeon.

Rework the gameplay layout around:

**MAP FIRST. INTERFACE SECOND.**

The dungeon should occupy substantially more of the player's visual attention.

Make information contextual where appropriate.

For example:

### Exploration

Prioritize map, immediate objective, crawler state and nearby interactions.

### Targeting

Surface target statistics, range, LOS, cover, hit chance and relevant status information.

### Inventory

Give Inventory the space it needs when opened.

### Character development

Give Character/progression its own focused presentation.

### Inspector

Keep exact Inspector functionality available for expert use, but it should not be required to identify ordinary world objects.

### Transmission Log

Preserve complete combat history but consider collapsing it into a smaller recent-event feed with expandable history.

Players should not need to constantly read the log to understand normal gameplay.

---

# 8. MAKE ACTIONS SELF-EXPLANATORY

Every important action should visibly communicate:

**WHAT ACTED → WHAT HAPPENED → WHAT CHANGED.**

Examples:

Crawler fires.

Projectile/tracer travels.

Enemy receives visible impact.

Damage appears.

Enemy recoils.

Status appears if relevant.

Or:

Electrical source activates.

Electricity visibly propagates through connected water.

Affected targets react.

Damage/status feedback appears.

Audience reacts if appropriate.

Or:

Explosion occurs.

Blast radius is visible.

Objects react.

Enemy is thrown.

Wall breaks.

Resulting hazard becomes visible.

Avoid unexplained instantaneous state changes.

The Transmission Log should provide precision and history, not substitute for visual cause-and-effect.

---

# 9. ENVIRONMENTAL INTERACTIONS SHOULD BE DISCOVERABLE

Do not require players to memorize the manual's interaction matrix.

Use visual cues to communicate physical properties.

Examples:

- water should visibly look wet;
- oil should visibly differ from water;
- gas should have visible presence;
- conductive machinery should look powered;
- explosive objects should be recognizable;
- brittle walls should visually differ from permanent walls;
- electrified water should visibly crackle;
- burning material should visibly burn;
- frozen water should visibly become ice;
- corroded metal should visibly change;
- steam/smoke should visibly obscure space.

When targeting an environmental interaction, consider restrained previews showing likely propagation or affected tiles.

Do not reveal every consequence automatically.

Preserve experimentation and discovery.

But give the player enough visual information to form hypotheses.

---

# 10. IMPROVE ENEMY READABILITY

Important enemy archetypes should become recognizable without Inspector text.

Use:

- silhouettes;
- sprite proportions;
- equipment;
- movement;
- telegraphs;
- effects;
- consistent visual motifs.

The player should eventually recognize enemies and think:

- keep that one away;
- that one calls reinforcements;
- that one is dangerous near water;
- that one explodes;
- attack that one from another direction;
- interrupt that one.

Visual identity and mechanical identity should reinforce one another.

---

# 11. MAKE TELEGRAPHS EXTREMELY CLEAR

Dangerous enemy and boss actions must be understandable visually.

Telegraphs should show:

- source;
- affected area;
- timing;
- direction where relevant;
- urgency.

A player should not have to read Inspector text to understand that standing on a particular tile next round is dangerous.

Telegraphs should remain stylistically appropriate but may use stronger contrast than ordinary world elements.

---

# 12. MAKE IMPORTANT MOMENTS FEEL IMPORTANT

Some events deserve presentation changes.

Examples:

- first combat;
- level-up;
- Profession selection;
- Adaptation selection;
- Audience threshold;
- Producer bargain;
- rare loot;
- boss introduction;
- boss phase transition;
- alternate boss solution;
- crawler downed;
- crawler death;
- floor completion;
- descent;
- victory.

These do not require long cutscenes.

A short framing change, sound cue, animation, transmission, title card, or focused panel can be enough.

Profession and Adaptation selection in particular should feel like major character-development moments rather than ordinary settings menus.

---

# 13. PRODUCER AND AUDIENCE SHOULD HELP TEACH THE GAME

Use the existing Producer personality selectively as part of onboarding.

The Producer can reinforce discoveries without becoming a tutorial narrator.

Example after the player's first successful environmental chain reaction:

**PRODUCER // LIVE**

**Finally. Someone read the room.**

**AUDIENCE +8**

This communicates both personality and mechanical feedback.

Keep Producer messages concise.

Do not constantly interrupt gameplay.

---

# 14. AUDIO SHOULD SUPPORT COMPREHENSION

Where the existing browser implementation permits it without paid services or external dependencies, improve lightweight audio feedback.

Important categories should have distinguishable cues:

- movement;
- attack;
- miss;
- hit;
- critical;
- damage;
- environmental electricity;
- fire;
- explosion;
- objective completion;
- danger/telegraph;
- level-up;
- Audience gain;
- Producer transmission;
- boss transition;
- crawler downed/death.

Audio should reinforce information rather than merely add noise.

Preserve the ability to disable sound.

---

# 15. FIRST-RUN VS EXPERIENCED PLAY

Do not force extensive onboarding on every run.

Persist tutorial progress locally/profile-side as appropriate.

Provide a clear option to:

**Tutorial / Guidance: ON / OFF / RESET**

An experienced player should be able to begin with the full interface and no introductory guidance.

A new player should receive progressive onboarding.

Reset allows testing and replaying the onboarding experience.

---

# 16. ZERO-KNOWLEDGE PLAYTEST STANDARD

Alpha 3 should be evaluated from the perspective of someone who has:

- never read THE CRAWL manual;
- never seen the design documents;
- never used the Inspector;
- never been told the environmental interaction rules;
- never played Alpha 1 or Alpha 2.

During internal playtesting, repeatedly ask:

**Can I understand this from what the game is showing me?**

If the answer is:

> "Yes, because the Transmission Log says..."

that is probably still a presentation failure.

If the answer is:

> "Yes, because I can see what happened..."

that is success.

---

# 17. DO NOT EXPAND CONTENT DURING THIS MILESTONE

This requirement is important.

Do not spend Alpha 3 primarily adding:

- more items;
- more enemies;
- more recipes;
- more environmental systems;
- more floors;
- more Producer events;
- more professions;
- more adaptations;
- unrelated mechanics.

There is already enough game to solve the current problem.

Existing content may be modified when necessary to improve readability, onboarding or visual identity.

Alpha 3 succeeds by making existing depth accessible.

---

# 18. IMPLEMENTATION PRIORITY

Work in this order:

## A3.1 — Visual language
Replace abstract map representation with readable sprites/tiles and improve scale/camera/hierarchy.

## A3.2 — First-run onboarding
Make Floor 1 progressively teach movement, interaction, tactical planning, combat, defense, cover, environmental manipulation, inventory and objectives.

## A3.3 — Progressive UI
Reduce initial controls, contextualize information, reclaim screen space for the dungeon and preserve advanced information on demand.

## A3.4 — Cause and effect
Ensure combat, environmental interactions, statuses, telegraphs and object manipulation visually communicate what occurred.

## A3.5 — Important moments
Improve presentation of progression, Producer/Audience, bosses, floor transitions and other significant events.

## A3.6 — Zero-knowledge playtest and polish
Run repeated first-run tests, identify points of confusion, fix them, and then perform a cohesive presentation pass.

Do not superficially implement all six stages merely to mark them complete.

Solve each problem meaningfully before proceeding.

---

# 19. ENGINEERING REQUIREMENTS

Preserve deterministic/server-authoritative simulation.

Presentation must consume authoritative events rather than determine outcomes.

Preserve multiplayer correctness.

Preserve save/reconnect behavior.

Preserve seeded reproducibility where applicable.

Run existing regression tests throughout development.

Add tests for:

- onboarding state;
- tutorial persistence/reset;
- progressive UI state;
- relevant presentation-event mapping;
- any changes to Floor 1 generation;
- any simulation-facing modifications.

Do not publicly deploy.

Do not spend money.

Do not introduce paid dependencies or services.

Do not remove working systems merely because presenting them is difficult.

---

# 20. ALPHA 3 ACCEPTANCE CRITERIA

Do not declare Alpha 3 complete merely because the UI looks different.

It is complete when the following are substantially true:

### Visual recognition
A new player can visually distinguish the crawler, enemies, interactables, hazards, objectives, loot and important terrain without routinely consulting Inspector.

### Basic controls
A new player learns movement, tactical planning, attacking and Ready through play.

### Tactical understanding
A new player understands the 3-AP planning loop after the first meaningful combat encounter.

### Environmental understanding
Floor 1 demonstrates that the dungeon's physical environment can be manipulated tactically.

### Cause and effect
Important actions visibly communicate what caused what.

### Interface
The map is the dominant gameplay surface rather than being surrounded by equally dominant information panels.

### Complexity
Advanced systems remain available without being dumped on the player immediately.

### Independence
A player should not need the external manual to understand how to begin playing.

### Depth
Experienced players retain access to the precision and systems that made Alpha 1/2 interesting.

The intended result is:

> **Easy to begin. Deep to master.**

THE CRAWL should no longer feel like a sophisticated simulation viewed through a developer console.

It should feel like a world whose rules the player gradually learns by inhabiting it.

---

# FINAL DELIVERABLE

When the implementation is complete:

1. provide the exact Alpha 3 branch and final commit;
2. summarize changes by A3 milestone;
3. report all automated test results;
4. document any known regressions or unfinished areas;
5. describe the final first-run onboarding sequence;
6. identify visual assets and how they are generated/stored;
7. provide launch instructions;
8. provide a focused manual playtest checklist specifically for a first-time player;
9. state candidly which parts still rely too heavily on text or prior knowledge;
10. do not merge or publicly deploy without approval.

Begin by auditing the current Alpha 2 implementation against this specification, then implement the Alpha 3 pass autonomously.

Do not stop at an audit, plan, mockup, or partial visual prototype unless there is a genuine blocker.

The priority is a **working, playable Alpha 3 build**.