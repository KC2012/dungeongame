#!/usr/bin/env python3
"""Built-in integrity checks + optional jsonschema check, safe to run without other dependencies."""
import json,sys,hashlib,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'content'
errors=[]
required=['backgrounds','professions','adaptations','abilities','items','monsters','bosses','hazards','achievements','rooms','events','sponsors','recipes','floors','achievement_events']
def err(msg):errors.append(msg)
D={}
for name in required:
 p=folder/f'{name}.json'
 try: arr=json.loads(p.read_text(encoding='utf8'))
 except Exception as e:err(f'{name}: file read/JSON {e}');continue
 if not isinstance(arr,list) or not arr:err(f'{name}: must be nonempty list');continue
 D[name]=arr
 ids=[x.get('id') for x in arr]
 if len(set(ids))!=len(ids):err(f'{name}: repeated IDs')
 for x in arr:
  if any(not x.get(k) for k in ('id','name','description')):err(f'{name}: incomplete entry {x}')

allowed_types={'damage','heal','shield','guard','dash','push','pull','apply_status','spawn_hazard','destroy_tile','teleport','reveal','summon','gain_resource','modify_stat','cleanse','hack','taunt','set_trap','create_cover','grant_item','modify_audience','trade','revive','disable_machine','conjure_object','craft_component','enable_crafting','repair_object'}
valid_status={'burning','corroded','chilled','stunned','poisoned','confused','aimed','exposed','hidden'}
valid_elements={'physical','fire','shock','acid','cold','poison','psychic','water','blast','smoke','force'}
valid_ai={'seek_melee','seek_ranged','guard_post','flanker','hazard_placer','summoner','support','charger','skirmisher','boss_script'}
for name in ('items','abilities'):
 for x in D.get(name,[]):
  for ef in x.get('effects',[]):
   if ef.get('type') not in allowed_types:err(f'{name}:{x["id"]} unknown effect {ef.get("type")}')
   if 'status' in ef and ef['status'] not in valid_status:err(f'{name}:{x["id"]} unknown status {ef["status"]}')
   if 'element' in ef and ef['element'] not in valid_elements:err(f'{name}:{x["id"]} unknown element {ef["element"]}')
   if ef.get('target') not in ('self','ally','enemy','tile','area','party'):err(f'{name}:{x["id"]} invalid target')
  if not x.get('effects'):err(f'{name}:{x["id"]} inert effect list')
for x in D.get('monsters',[]):
 if x.get('ai') not in valid_ai:err(f'monster {x["id"]} unsupported ai')
 if x.get('weakness') not in valid_elements:err(f'monster {x["id"]} unsupported weakness')

# Validate 9x9 room path availability from each exit to central interact/cover/hazard.
def room_reachable(layout):
 good={(x,y) for y,row in enumerate(layout) for x,ch in enumerate(row) if ch not in ('#',)}
 st=(4,0)
 if st not in good:return False
 seen={st};q=[st]
 for x,y in q:
  for xx,yy in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
   if (xx,yy) in good and (xx,yy) not in seen:seen.add((xx,yy));q.append((xx,yy))
 return all(x in seen for x in [(4,8),(0,4),(8,4),(4,4)])
for r in D.get('rooms',[]):
 lay=r.get('layout',[])
 if len(lay)!=9 or any(len(row)!=9 or any(ch not in '#.+~^oc' for ch in row) for row in lay):err(f'room {r["id"]} malformed tiles');continue
 if not room_reachable(lay):err(f'room {r["id"]}: exits and center not connected')
 if not all(lay[y][x]=='+' for x,y in [(4,0),(4,8),(0,4),(8,4)]):err(f'room {r["id"]} no consistent doors')

ids={name:set(x['id'] for x in ls) for name,ls in D.items()}
for x in D.get('backgrounds',[]):
 if x.get('starterItem') not in ids.get('items',set()):err(f'background {x["id"]} starter item missing: {x.get("starterItem")}')
 if sum(x['attributeMods'].values())!=2:err(f'background {x["id"]} mods sum not 2')
for x in D.get('abilities',[]):
 if x.get('profession')!='general' and x.get('profession') not in ids.get('professions',set()):err(f'ability {x["id"]} profession not found')
for x in D.get('sponsors',[]):
 if x.get('signatureItem') not in ids.get('items',set()):err(f'sponsor {x["id"]} item not found: {x.get("signatureItem")}')
for x in D.get('recipes',[]):
 if x.get('outputItem') not in ids.get('items',set()):err(f'recipe {x["id"]} output item absent')
 for src in x.get('ingredients',{}):
  if src not in ids.get('items',set()):err(f'recipe {x["id"]} ingredient missing {src}')
for e in D.get('achievement_events',[]):
 if e.get('achievement') not in ids.get('achievements',set()):err(f'achievement event {e["id"]} missing achievement')
 if e.get('family') not in ('combatDamage','physicalWorld','actorState','objective','lootEconomy','exploration','meta'):err(f'achievement event {e["id"]} unsupported family')
for a in D.get('achievements',[]):
 if a.get('condition',{}).get('eventType') not in ids.get('achievement_events',set()):err(f'achievement {a["id"]} unregistered event type')
for x in D.get('floors',[]):
 n=x['number']
 if x.get('boss') not in ids.get('bosses',set()):err(f'floor {n} boss missing')
 if x.get('alternateBoss',{}).get('goal',0)>len(x.get('alternateBoss',{}).get('operations',[])):err(f'floor {n} alternate boss incomplete')
 if x.get('requiredObjective',{}).get('goal',0)>len(x.get('requiredObjective',{}).get('sources',[])):err(f'floor {n} objective impossible')
 for hz in x.get('environment',[]):
  if hz not in ids.get('hazards',set()):err(f'floor {n} missing hazard {hz}')
 if not set(x.get('requiredRoomTags',[])).issubset({t for r in D.get('rooms',[]) if r['floor']==n for t in r.get('features',[])}):err(f'floor {n} missing room feature tags')
for b in D.get('bosses',[]):
 if b.get('ai') not in valid_ai:err(f'boss {b["id"]} unsupported ai')
for name in required:
 if name in D:
  # Existing JSONSchema reference is intentionally reusable; validate generic and specialized forms
  try:
   import jsonschema
   schema=json.loads((root/'schemas'/'entries.schema.json').read_text())
   typ={'items':'item','abilities':'ability','monsters':'monster','achievements':'achievement','rooms':'room','floors':'floor'}.get(name,'entry')
   validator=jsonschema.Draft7Validator({**schema,'$ref':f'#/definitions/{typ}'})
   for x in D[name]:
    for e in validator.iter_errors(x):err(f'{name}:{x.get("id")}: schema {e.message}')
  except ImportError:pass

manifestfile=folder/'manifest.json'
manifest=json.loads(manifestfile.read_text()) if manifestfile.exists() else {}
for name in required:
 if name in D and manifest.get('catalogs',{}).get(name)!=len(D[name]):err(f'manifest count mismatch: {name}')

for k in sorted(D): print(f'{k:<14} {len(D[k]):>3}')
print(f'TOTAL ENTRIES: {sum(map(len,D.values()))}')
if errors:
 print('\nVALIDATION FAILED:')
 for msg in errors:print(' -',msg)
 sys.exit(1)
print('VALIDATION PASSED (structure + references + local room connectivity).')
