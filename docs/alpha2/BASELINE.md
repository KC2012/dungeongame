# Alpha 1 baseline imported for Alpha 2

Original delivery ZIP retained at /workspace/attachments/d73a1f55-91d5-4e76-ab94-f6e2f21d6602/dungeongame.zip.
SHA-256: 813a85f055b8f33e9ee78e0a93feeb2f948941e2eb86f3abec6de3366116749a.
Its unchanged extracted copy is /workspace/alpha2-import/dungeongame, including original saves and bundled outputs. Saves are deliberately not copied into the development checkout.

Imported source version: package.json 0.1.1 (delivery documentation still calls it 0.1.0). The original delivery manifest references ae41b47; that history was not included in the ZIP. The local baseline tag records the actual imported source, without inventing the missing history.

Before presentation changes, on 2026-10-21 Pacific:
- npm ci: passed, frozen lockfile, Node 24.19.0.
- npm test -- --reporter=default --reporter=json --outputFile=/tmp/crawl-alpha1-tests.json: 529 tests / 10 files passed, no skips, 29.49s.
- npm run build: passed; existing large-client-bundle warning.
- npm run validate:content: all 448 records passed.
- Python unittest discovery: 11 passed, jsonschema installed.
- npm run e2e: all 6 passed, 34s, system Chromium; two/four-client authority, reconnection, nonce recovery, tool use, keyboard/viewport tests.
- Screenshot: alpha1-baseline.png captured from this run.

No tunnel, publication, remote deployment, paid service or purchase.
