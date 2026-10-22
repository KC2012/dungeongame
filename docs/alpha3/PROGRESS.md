# Alpha 3 implementation record

## A3.1 — visual language

Original 16×16 pixel recipes in apps/client/src/assets.ts generate 39 distinct crawler/enemy/guardian/object/material sprites once per Phaser scene. Asset sheet: sprite-sheet.svg, reproducible with npx tsx tools/export-sprites.ts. Objects no longer use single letters as their primary identity. Closer default 3x camera with local tactical framing, quiet fog, distinct doors/cover/pits/fragile walls and sprites for hazards. Zoom retained. Pointer conversion now uses live client-space canvas bounds and refreshed camera matrices; tested for layout/scroll/scale changes.

Validation: 549 tests passed (547 baseline + asset/pointer tests), typecheck/build passed, all 11 existing browser tests passed (53s). No simulation changes. Human visual-recognition acceptance is still unmeasured.
