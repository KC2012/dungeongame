"""Collect the exact installed dependency notices for the local source/build archive."""
from pathlib import Path
import json, subprocess
root = Path(__file__).resolve().parents[1]
result = subprocess.run(['npm', 'ls', '--parseable', '--all'], cwd=root, text=True, capture_output=True, check=True)
sections = ['# Third-party notices\n\nThese notices describe the installed pinned open-source dependencies. The project itself remains private; no license for its original source or assets is inferred from a dependency license.\n']
seen = set()
for raw in sorted(result.stdout.splitlines()):
    folder = Path(raw).resolve()
    if not folder.is_relative_to(root / 'node_modules') or not (folder / 'package.json').is_file():
        continue
    package = json.loads((folder / 'package.json').read_text())
    key = (package['name'], package['version'])
    if key in seen:
        continue
    seen.add(key)
    sections.append(f"\n## {key[0]} {key[1]}\n\nDeclared license: {package.get('license', 'see package notice')}\n")
    notices = [p for p in sorted(folder.iterdir()) if p.is_file() and (p.name.upper().startswith('LICENSE') or p.name.upper().startswith('COPYING') or p.name.upper().startswith('NOTICE'))]
    for notice in notices:
        sections.append('\n' + notice.name + '\n\n```text\n' + notice.read_text(errors='replace').rstrip() + '\n```\n')
(root / 'docs' / 'THIRD_PARTY_NOTICES.md').write_text('\n'.join(sections))
print(f'Collected installed notices for {len(seen)} dependency versions.')
