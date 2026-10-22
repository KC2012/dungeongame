# Alpha 3 audit and baseline

Alpha 2 preserved at alpha2-known-good / v0.2.0-local-alpha, commit e31bf5450dd43470080884c134c27e7346d1c9ee. Dedicated development branch: alpha3/make-the-game-understandable. User brief: BRIEF.md.

Before implementation: 547 tests / 14 files passed, 11 Python tests passed, 448 records passed validation, typecheck/build passed, 11 existing browser tests passed. Actual baseline logs: /tmp/crawl-a3-baseline-tests.json and /tmp/crawl-a3-baseline-browser.log. Existing client-bundle warning remains. No user changes were present.

Findings:
- Map: 16px cells at 2x; most objects distinguished by abstract single letters; weak terrain/material identity; too much surrounding floor and fog.
- First run: no persisted guidance or Floor 1 teaching sequence; full action toolbar from the start.
- Controls: movement keys silently become cursor keys in action modes. Hover overwrites selected inspection. Pointer conversion relies on stale canvas/camera bounds after layout/scroll. Attack preview ignores queued endpoint. Queue lists verbs without consequences/cost per step.
- Explanation: no compact causal turn recap; failures often generic; generator water/electric toggle not explained before use; log exposes internal hook names.
- UI: large permanent sidebar and nested scroll areas compete with the map; important choices are focused but not announced when earned.
- Presentation: effects exist and consume authority events, but electrical networks lack explicit connections and source/timing cues remain weak. Sound is one generic tone on action submission.

Implementation order: A3.1 readable assets/camera/pointer; A3.2 persistent context guidance and opt-in guided first floor; A3.3 projected plan and progressive/context UI; A3.4 precise outcomes/environment/telegraphs; A3.5 moments/semantic audio; A3.6 integrated first-run regression walkthrough and polish. Preserve full controls through Advanced/Guidance off; no content expansion. Human ten-minute comprehension must remain an unverified acceptance item until a human playtest occurs.
