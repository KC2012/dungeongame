import unittest,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
C=ROOT/'content'
def load(n):return json.loads((C/f'{n}.json').read_text())
class CatalogContract(unittest.TestCase):
 def test_validator(self):
  p=subprocess.run([sys.executable,str(ROOT/'tools'/'validate.py')],capture_output=True,text=True)
  self.assertEqual(p.returncode,0,p.stdout+p.stderr)
 def test_six_floors_unique_and_ordered(self):
  floors=load('floors');self.assertEqual([x['number'] for x in floors],list(range(1,7)))
  self.assertEqual(len({x['boss'] for x in floors}),6)
 def test_boss_alternatives(self):
  for f in load('floors'):
   self.assertGreaterEqual(len(f['alternateBoss']['operations']),2)
   self.assertLessEqual(f['alternateBoss']['goal'],len(f['alternateBoss']['operations']))
 def test_achievement_events_have_emitters(self):
  a=load('achievements');events={x['id']:x for x in load('achievement_events')}
  for x in a:
   e=x['condition']['eventType'];self.assertIn(e,events)
   self.assertTrue(events[e]['emitterRequired'])
   self.assertTrue(events[e]['testRequired'])
 def test_abilities_are_not_stubs(self):
  for a in load('abilities'):
   self.assertLessEqual(a['apCost'],3)
   self.assertTrue(all('type' in x and 'target' in x for x in a['effects']))
 def test_broker_cannot_infinite_money(self):
  a={x['id']:x for x in load('abilities')}
  for name in ('claim_credit','counteroffer','demand_discount'):
   self.assertEqual(a[name]['usageLimit'],'once_per_floor')
   self.assertEqual(a[name]['context'],'safe_room')
 def test_ingredients_and_sponsor_items_exist(self):
  its={x['id'] for x in load('items')}
  for r in load('recipes'):
   self.assertIn(r['outputItem'],its)
   self.assertTrue(set(r['ingredients']).issubset(its))
  for s in load('sponsors'):self.assertIn(s['signatureItem'],its)
 def test_room_structure(self):
  for r in load('rooms'):
   self.assertEqual(len(r['layout']),9)
   self.assertTrue(all(len(row)==9 for row in r['layout']))
 def test_no_zero_power_active_effect(self):
  for item in load('items'):
   for effect in item['effects']:
    self.assertGreater(effect['magnitude'],0,(item['id'],effect))
 def test_class_and_adaptation_supply(self):
  self.assertGreaterEqual(len(load('professions')),8)
  self.assertGreaterEqual(len(load('adaptations')),6)
 def test_saved_manifest_matches(self):
  m=load('manifest')
  for k,v in m['catalogs'].items():self.assertEqual(len(load(k)),v)
if __name__=='__main__':unittest.main(verbosity=2)
