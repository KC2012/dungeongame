"""Authoring utility: materializes human-authored design records into catalog JSON. This is not the game engine."""
from pathlib import Path
import json,re
P=Path(__file__).resolve().parents[1]/'content'
P.mkdir(exist_ok=True)
def slug(x):return re.sub(r'[^a-z0-9]+','_',x.lower()).strip('_')
def save(name,entries):
    assert len(set(x['id'] for x in entries))==len(entries),(name,'duplicate IDs')
    (P/f'{name}.json').write_text(json.dumps(entries,indent=2,ensure_ascii=False)+'\n')
    print(name,len(entries))
def record(name,description,**kw):return dict(id=slug(name),name=name,description=description,**kw)

backgrounds=[]
for name,stat1,stat2,stat3,item,bonus,desc in [
('Night Custodian','Wit','Nerve','Might','mop_pole','hazard_sense','Read the building before it kills you.'),
('Delivery Rider','Finesse','Nerve','Wit','courier_satchel','quick_step','Carry vital objects through bad situations.'),
('Kitchen Worker','Might','Wit','Finesse','cleaver','fire_tolerance','Improvised chemistry and sharp corners.'),
('Street Mechanic','Wit','Might','Nerve','wrench','machine_tinker','Machines are negotiable.'),
('School Librarian','Wit','Nerve','Might','index_cards','catalog_memory','Find a key among impossible data.'),
('Volunteer Medic','Nerve','Wit','Might','first_aid_pack','field_stabilize','Keep a group alive under pressure.'),
('Courier Clerk','Finesse','Wit','Might','ink_stamp','document_forgery','Paper can be stronger than armor.'),
('Construction Worker','Might','Nerve','Finesse','crowbar','wall_reader','A wall is a suggestion.'),
('Stage Magician','Finesse','Wit','Might','flash_pellet','misdirection','The audience watches the wrong hand.'),
('Community Gardener','Nerve','Wit','Finesse','spore_pouch','toxins_knowledge','Biology adapts to everything.'),
('Parking Attendant','Nerve','Finesse','Wit','reflective_vest','traffic_sense','Control movement through bad geometry.'),
('Repair Apprentice','Wit','Finesse','Nerve','repair_tape','rapid_repair','Make broken things useful again.')]:
    backgrounds.append(record(name,desc,attributeMods={stat1:2,stat2:1,stat3:-1},starterItem=slug(item),trait=bonus))
save('backgrounds',backgrounds)

professions=[]
for name,role,passive,desc in [
('Breaker','frontline','guard_armor','Absorb attacks and open walls without surrendering position.'),
('Circuiter','control','conductive_mastery','Wire traps, switch devices and route electricity.'),
('Field Surgeon','support','triage_efficiency','Trade personal damage for surviving allies.'),
('Saboteur','traps','trap_efficiency','Turn hazardous equipment into tactical infrastructure.'),
('Broker','utility','bargain_instinct','Secure better deals and coordinate special rewards.'),
('Vanguard','movement','momentum','Relocate faster and draw aggro safely.'),
('Synthesist','alchemy','reaction_affinity','Combine chemicals into dangerous area control.'),
('Signal Thief','stealth','broadcast_spoof','Mislead sensors and exploit the Director systems.')]:
    professions.append(record(name,desc,role=role,passive=passive,unlockFloor=3))
save('professions',professions)

adaptations=[]
for name,positive,negative,desc in [
('Ceramic Skin',{'armor':3},{'speed':-1},'Endure blows at the cost of agility.'),
('Gill Lungs',{'waterCost':-1,'poisonResist':2},{'fireResist':-1},'Move through liquid and survive chemical vapors.'),
('Copper Veins',{'shockResist':4,'deviceRange':1},{'coldResist':-2},'Channel current and reach machinery at a distance.'),
('Lightframe',{'speed':1,'dodge':10},{'armor':-1},'Slip around threats with a brittle skeleton.'),
('Fungal Network',{'poisonResist':4,'regeneration':1},{'fireResist':-3},'Regenerate slowly; extreme vulnerability to flame.'),
('Extra Hands',{'interactionAPDiscount':1,'carrySlots':2},{'maxFocus':-2},'Manipulate objects faster while sacrificing concentration.')]:
    adaptations.append(record(name,desc,bonus=positive,drawback=negative,unlockFloor=3))
save('adaptations',adaptations)

# 10 common + six dedicated techniques per class = 58, each tied to an actual effect primitive
ability_rows=[
('Basic Guard','general','shield',2,'self',1,0,'Reduce next incoming hit by shielding.'),
('Snap Strike','general','damage',4,'enemy',1,1,'An inexpensive light attack.'),
('Hard Shove','general','push',1,'enemy',2,1,'Move target one tile toward hazards.'),
('Inspect Weakness','general','reveal',1,'enemy',1,5,'Reveal target resistances and armor.'),
('Emergency Bandage','general','heal',6,'ally',2,1,'Patch up an adjacent fighter.'),
('Careful Aim','general','apply_status',1,'self',1,0,'Grant aimed status for one attack.'),
('Sprint Burst','general','dash',2,'self',2,0,'Move quickly to reachable tile.'),
('Throw Debris','general','damage',3,'enemy',1,4,'A cheap ranged improvised attack.'),
('Mark Target','general','apply_status',1,'enemy',1,5,'Expose a foe to allied attacks.'),
('Wipe Corrosion','general','cleanse',1,'ally',1,1,'Remove one detrimental status.'),
]
class_specs={
'Breaker': [('Shield Wall','shield',4,'party',2,2),('Crack Masonry','destroy_tile',3,'tile',2,1),('Anchor Stance','guard',3,'self',1,0),('Hammer Fall','damage',10,'enemy',3,1),('Bodyguard','shield',6,'ally',2,2),('Breach Line','push',2,'enemy',2,2)],
'Circuiter':[('Arc Tap','damage',6,'enemy',2,5),('Bridge Contact','spawn_hazard',2,'tile',2,4),('Breaker Trip','disable_machine',1,'tile',1,4),('Chain Spark','damage',5,'area',3,4),('Remote Switch','hack',2,'tile',2,5),('Insulate Crew','shield',4,'party',3,3)],
'Field Surgeon':[('Stabilize','revive',1,'ally',2,1),('Medic Kit','heal',10,'ally',2,1),('Clear Toxin','cleanse',2,'ally',1,2),('Rapid Triage','heal',6,'party',3,2),('Adrenal Surge','modify_stat',2,'ally',2,2),('Last Reserves','shield',8,'ally',3,3)],
'Saboteur':[('Wire Snare','set_trap',1,'tile',2,3),('Bolt Charge','spawn_hazard',2,'tile',2,3),('Rig Explosive','spawn_hazard',3,'tile',3,2),('Disarm Fast','disable_machine',1,'tile',1,1),('Jury Rig Cover','create_cover',1,'tile',2,1),('Minefield','set_trap',3,'area',3,4)],
'Broker':[('Demand Discount','trade',1,'self',1,0),('Counteroffer','modify_audience',3,'party',2,0),('Claim Credit','gain_resource',4,'party',2,0),('Favor Owed','shield',4,'party',2,0),('Paper Shield','apply_status',1,'enemy',2,4),('Audit Trail','reveal',3,'area',1,6)],
'Vanguard':[('Forward Rush','dash',3,'self',2,0),('Shield Push','push',2,'enemy',2,1),('Intercept','shield',5,'ally',2,2),('Momentum Hit','damage',9,'enemy',2,1),('Hold Passage','taunt',2,'area',1,2),('Rapid Retreat','teleport',3,'self',3,3)],
'Synthesist':[('Acid Vial','spawn_hazard',2,'tile',2,4),('Frost Flask','spawn_hazard',2,'tile',2,4),('Cinder Mist','spawn_hazard',2,'tile',2,4),('Foam Barrier','create_cover',1,'tile',2,3),('Neutralize','cleanse',2,'area',2,2),('Compound Bloom','spawn_hazard',3,'area',3,4)],
'Signal Thief':[('False Reading','apply_status',1,'enemy',1,4),('Hack Door','hack',2,'tile',1,3),('Silent Step','apply_status',1,'self',1,0),('Ghost Ping','taunt',1,'tile',1,5),('Rewire Feed','disable_machine',2,'tile',2,5),('Signal Eclipse','reveal',3,'area',2,5)]}
for profession,rows in class_specs.items():
    for name,typ,mag,target,ap,rng in rows:ability_rows.append((name,slug(profession),typ,mag,target,ap,rng,f'{profession} technique that applies {typ.replace("_"," ")} to change the encounter.'))
abilities=[]
for name,cls,typ,mag,target,ap,rng,desc in ability_rows:
    status=None; elem=None
    if name in ('Careful Aim',):status='aimed'
    if name in ('Mark Target','Paper Shield'):status='exposed'
    if name in ('Silent Step','False Reading'):status='hidden' if name=='Silent Step' else 'confused'
    if name=='Frost Flask':elem='cold'
    if name=='Cinder Mist':elem='fire'
    if name in ('Arc Tap','Chain Spark','Bridge Contact'):elem='shock'
    if name in ('Acid Vial','Compound Bloom'):elem='acid'
    if name in ('Rig Explosive','Bolt Charge'):elem='blast'
    effect={'type':typ,'magnitude':mag,'target':target}
    if status:effect['status']=status
    if elem:effect['element']=elem
    abilities.append(record(name,desc,profession=cls,apCost=ap,range=rng,focusCost=(1 if name in ('Emergency Bandage','Wipe Corrosion','Sprint Burst') else 0) if cls=='general' else (1 if ap==1 else 2),cooldown=1 if mag>=9 else 0,usageLimit='once_per_floor' if name in ('Claim Credit','Counteroffer','Demand Discount','Favor Owed') else 'none',context='safe_room' if name in ('Claim Credit','Counteroffer','Demand Discount') else 'dungeon',effects=[effect]))
save('abilities',abilities)

# 92 equipment entries; each individually named + functionality. Every entry typed as weapon, armor, trinket, consumable, tool or material.
item_specs={
'weapon': [
('Mop Pole','physical',4,1,'reach'),('Cleaver','physical',6,1,'bleed'),('Crowbar','physical',5,1,'breach'),('Wrench','physical',5,1,'machine'),
('Pipe Spear','physical',6,2,'reach'),('Staple Gun','physical',4,5,'pin'),('Nailgun','physical',6,4,'pin'),('Slug Thrower','physical',8,6,'loud'),
('Ceramic Knife','physical',5,1,'armor_pierce'),('Forklift Hook','physical',7,2,'pull'),('Arc Rod','shock',5,2,'conductive'),('Coil Pistol','shock',7,5,'battery'),
('Acid Projector','acid',5,4,'corrode'),('Flare Spitter','fire',5,4,'ignite'),('Cryo Sprayer','cold',4,3,'freeze'),('Glass Hammer','physical',10,1,'fragile'),
('Saw Disk','physical',7,5,'ricochet'),('Smoke Cannon','poison',3,4,'cloud'),('Rail Driver','physical',11,7,'line'),('Magnetic Harpoon','physical',5,5,'pull'),
('Thermal Drill','fire',9,1,'breach'),('Pulse Carbine','shock',8,6,'stun'),('Corrosive Injector','acid',8,1,'corrode'),('Compressor Fist','physical',7,1,'push')],
'armor': [
('Work Apron','physical',1,0,'fire_ward'),('Reflective Vest','physical',1,0,'visibility'),('Padded Coveralls','physical',2,0,'poison_ward'),('Rubber Suit','shock',2,0,'insulating'),('Ceramic Plate','physical',4,0,'heavy'),('Steel Wrap','physical',3,0,'metal'),('Spore Jacket','poison',2,0,'regrowth'),('Insulated Carapace','shock',3,0,'insulating'),('Fire Blanket Armor','fire',2,0,'fire_ward'),('Cold Cell Shell','cold',3,0,'cold_ward'),('Magnetic Harness','physical',2,0,'knockback_resist'),('Riot Shield','physical',3,0,'offhand')],
'trinket': [('Copper Coin','shock',0,0,'conductive'),('Lucky Pencil','psychic',0,0,'accuracy'),('Blink Timer','physical',0,0,'dodge'),('Siren Pin','psychic',0,0,'taunt'),('Anchor Bracelet','physical',0,0,'braced'),('Receipt Charm','psychic',0,0,'discount'),('Heat Sink','fire',0,0,'fire_ward'),('Toxin Filter','poison',0,0,'poison_ward'),('Pocket Relay','shock',0,0,'machine'),('Audience Lens','psychic',0,0,'spotlight'),('Thief Knot','physical',0,0,'stealth'),('Rescue Whistle','psychic',0,0,'revival')],
'consumable':[('First Aid Pack','heal',9,0,'healing'),('Shock Cell','shock',6,3,'wet_chain'),('Acid Ampoule','acid',6,3,'corrode'),('Fire Flask','fire',6,3,'ignite'),('Cold Ampoule','cold',5,3,'freeze'),('Smoke Pellet','smoke',0,3,'conceal'),('Flash Pellet','psychic',0,3,'stun'),('Foam Canister','physical',0,3,'cover'),('Stamina Ration','heal',4,0,'focus'),('Wound Seal','heal',7,0,'wound'),('Antidote','poison',0,0,'cleanse'),('Battery Bundle','shock',0,0,'resource'),('Blast Brick','blast',9,3,'breach'),('Distress Beacon','psychic',0,0,'revival'),('Neutralizer Salts','acid',0,0,'cleanse'),('Oil Flask','fire',0,3,'flammable'),('Water Bladder','water',0,3,'wet'),('Glue Charge','physical',0,3,'slow'),('Signal Jammer','psychic',0,3,'hack'),('Bandage Roll','heal',4,0,'healing')],
'tool':[('Courier Satchel','physical',0,0,'capacity'),('Ink Stamp','psychic',0,0,'document'),('Index Cards','psychic',0,0,'reveal'),('Spore Pouch','poison',0,3,'cloud'),('Repair Tape','physical',0,1,'repair'),('Portable Bench','physical',0,0,'craft'),('Wire Cutter','physical',0,1,'disarm'),('Lock Pick','physical',0,1,'unlock'),('Pressure Gauge','water',0,1,'inspect'),('Circuit Tester','shock',0,1,'inspect'),('Thermal Lantern','fire',0,0,'light'),('Foldable Ladder','physical',0,1,'shortcut')],
'material':[('Scrap Metal','physical',0,0,'craft'),('Circuit Shard','shock',0,0,'craft'),('Catalyst Paste','acid',0,0,'craft'),('Sterile Cloth','heal',0,0,'craft'),('Fuel Gel','fire',0,0,'craft'),('Glacial Salt','cold',0,0,'craft'),('Conductive Wire','shock',0,0,'craft'),('Filter Membrane','poison',0,0,'craft'),('Badge Fragment','physical',0,0,'quest'),('Transit Pass','physical',0,0,'quest'),('Debt Ledger','psychic',0,0,'quest'),('Signal Coil','shock',0,0,'quest')]
}
items=[]
for kind,rows in item_specs.items():
  for name,element,power,rng,trait in rows:
    effect_type='damage' if kind=='weapon' else 'modify_stat' if kind in ('armor','trinket') else 'gain_resource' if kind=='material' else 'heal' if element=='heal' else 'spawn_hazard' if kind=='consumable' and element not in ('psychic','physical') else 'reveal' if kind=='tool' else 'apply_status'
    effect={'type':effect_type,'magnitude':(max(1,power) if kind in ('armor','trinket','material','tool') else power),'target':'enemy' if kind=='weapon' else 'self' if kind in ('armor','trinket','material') else 'tile' if kind=='consumable' else 'self'}
    if element in ('fire','shock','acid','cold','poison','water','blast','smoke','physical','psychic'):effect['element']=element
    if element=='heal':effect={'type':'heal','magnitude':power,'target':'self'}
    if kind=='tool':
        tool_map={'capacity':('modify_stat',2),'document':('hack',2),'reveal':('reveal',3),'cloud':('spawn_hazard',2),'repair':('repair_object',3),'craft':('enable_crafting',1),'disarm':('disable_machine',2),'unlock':('hack',2),'inspect':('reveal',4),'light':('reveal',5),'shortcut':('create_cover',1)}
        ef,m=tool_map.get(trait,('reveal',2));effect={'type':ef,'magnitude':m,'target':'self' if ef in ('modify_stat','gain_resource','heal','reveal') else 'tile'}
    if kind=='consumable':
        overrides={'cover':'create_cover','breach':'destroy_tile','cleanse':'cleanse','resource':'gain_resource','revival':'revive','slow':'set_trap','hack':'hack','flammable':'spawn_hazard','wet':'spawn_hazard','stun':'apply_status','focus':'gain_resource','wound':'cleanse'}
        if trait in overrides:effect={'type':overrides[trait],'magnitude':max(1,power),'target':'ally' if trait in ('cleanse','revival') else 'tile' if trait in ('cover','breach','slow','wet','flammable','hack') else 'self','element':'physical' if element=='heal' else element} 
    item=record(name,f'{name} is a {kind} whose key behavior is {trait.replace("_"," ")}.',kind=kind,slot='offhand' if name=='Riot Shield' else kind if kind in ('weapon','armor','trinket') else 'inventory',tier=1+len(items)%6,weight=1 if kind not in ('weapon','armor') else 2 if kind=='weapon' else 3,basePrice=3+len(items)%28,range=rng,power=power,trait=trait,effects=[effect])
    if kind=='weapon':item['accuracy']=(-5 if power>=10 else 5 if power<=5 else 0)
    if kind=='consumable':item['stack']=3;item['consumedOnUse']=True
    if kind in ('armor','trinket'):
        item['statModifier']= {'armor':max(1,power),'trinket':0}[kind]
        item['passiveTag']=trait
    if kind=='material':item['effectOnUse']='crafting_component_only'
    if kind=='tool':item['useCost']=1
    if kind=='material':effect={'type':'craft_component','magnitude':1,'target':'self'};item['effects']=[effect]
    if kind=='consumable' and effect.get('magnitude',0)==0:effect['magnitude']=1;item['effects']=[effect]
    items.append(item)
save('items',items)

# Enemies with deliberate behavior diversity and vulnerabilities; floor-specific availability
monster_defs=[
(1,'Turnstile Rat','seek_melee',8,0,'organic'),(1,'Ticket Louse','skirmisher',7,0,'organic'),(1,'Queue Warden','guard_post',15,2,'metal'),(1,'Ink Drone','seek_ranged',9,1,'powered'),(1,'Mop Mimic','charger',13,0,'wet'),
(2,'Sorting Spider','hazard_placer',12,1,'metal'),(2,'Bottle Golem','seek_melee',20,2,'fragile'),(2,'Belt Runner','flanker',11,0,'powered'),(2,'Acid Mote','skirmisher',8,0,'corrodible'),(2,'Forklift Shade','charger',18,1,'metal'),
(3,'Catalog Leech','support',14,1,'organic'),(3,'Lab Assistant','seek_ranged',14,1,'organic'),(3,'Glass Strider','flanker',14,0,'fragile'),(3,'Molt Stalker','charger',19,1,'organic'),(3,'Reagent Blob','hazard_placer',16,0,'acidic'),
(4,'Track Skimmer','flanker',18,1,'powered'),(4,'Signal Sentry','seek_ranged',16,2,'metal'),(4,'Platform Crawler','seek_melee',24,2,'metal'),(4,'Conductor Swarm','summoner',13,0,'conductive'),(4,'Switchback Hound','charger',17,1,'organic'),
(5,'Debt Wisp','support',20,0,'psychic'),(5,'Ledger Butcher','seek_melee',27,3,'organic'),(5,'Auctioneer Drone','seek_ranged',20,2,'powered'),(5,'Repo Mantis','flanker',24,1,'metal'),(5,'Interest Shade','hazard_placer',21,1,'psychic'),
(6,'Signal Parasite','skirmisher',22,0,'powered'),(6,'Coil Sentinel','guard_post',30,3,'metal'),(6,'Broadcast Specter','support',20,1,'psychic'),(6,'Uplink Hunter','charger',28,2,'powered'),(6,'Stagehand Brute','seek_melee',31,3,'organic')]
monsters=[]
for floor,name,ai,hp,arm,tag in monster_defs:
   weakness={'metal':'acid','powered':'shock','fragile':'physical','organic':'poison','wet':'cold','conductive':'shock','acidic':'cold','psychic':'psychic','corrodible':'acid'}[tag]
   monsters.append(record(name,f'A floor {floor} {ai.replace("_"," ")} threat; reacts notably to {weakness}.',floor=floor,ai=ai,hp=hp,armor=arm,sight=6+floor//2,attackPower=3+floor*2,attackElement='physical' if floor<3 else ['physical','shock','acid','cold','poison','psychic'][floor-1],tags=[tag],weakness=weakness,telegraph=f'Its next {ai.replace("_"," ")} action is outlined before resolution.'))
save('monsters',monsters)

boss_defs=[
(1,'The Compliance Marshal','Shields the gate and summons ink drones','Submit stamped self-termination form','shock'),
(2,'Pallet King','Conveyor crush and scrap barriers','Feed reactor three correctly classified objects','acid'),
(3,'The Specimen Curator','Cage segments lock tiles','Disable three restraint generators','fire'),
(4,'Schedule Warden','Train path telegraph then sweep','Reprogram dispatch table to remove warden','shock'),
(5,'The Receivables Choir','Linked nodes siphon Focus','Present two evidence records to invalidate contract','psychic'),
(6,'The Signal Engine','Three-stage transmitter bombardment','Reroute three cables and authenticate kill switch','shock')]
bosses=[]
for floor,name,att,alt,element in boss_defs:
  bosses.append(record(name,f'Floor {floor} guardian: {att}. Alternative: {alt}.',floor=floor,hp=70+25*floor,armor=1+floor//2,ai='boss_script',telegraphRounds=1,attackElement=element,phases=[{'thresholdPercent':100,'telegraph':att,'effect':{'type':'spawn_hazard','element':element,'magnitude':1+floor//2,'target':'area'}},{'thresholdPercent':60,'telegraph':f'{name} charges a wide attack.','effect':{'type':'damage','element':element,'magnitude':5+floor,'target':'area'}},{'thresholdPercent':25,'telegraph':f'{name} exposes its core for one round.','effect':{'type':'apply_status','status':'exposed','magnitude':1,'target':'self'}}],alternateVictory={'method':slug(alt),'requirements':3 if floor not in (1,4,5) else 2,'description':alt},counterplay=['cover','disable_machine','timing'],combatVictory=True))
save('bosses',bosses)

# Hazards list: concrete elemental and industrial hazards
hazard_rows=[
('Open Flame','fire','flammable',2,2),('Oil Slick','fire','flammable',0,3),('Steam Vent','fire','opaque',2,1),('Live Wire','shock','conductive',5,2),('Pooled Water','water','wet',0,4),('Battery Puddle','shock','wet',4,2),('Acid Spill','acid','corrodible',3,3),('Corrosive Fog','acid','gas',2,2),('Freeze Tile','cold','ice',2,3),('Frost Spray','cold','wet',2,2),('Poison Mushroom','poison','organic',2,3),('Toxic Canister','poison','volatile',4,1),('Explosive Barrel','blast','volatile',8,1),('Crusher Plate','physical','structural',7,1),('Spiked Grate','physical','solid',4,0),('Conveyor Belt','force','powered',0,4),('Rotating Saw','physical','powered',6,1),('Electrical Door','shock','powered',5,2),('Smoke Screen','smoke','opaque',0,2),('Static Cloud','shock','gas',2,2),('Crumbling Ceiling','physical','structural',7,1),('Magnetic Pulse','force','metal',2,1),('Trapdoor Pit','physical','structural',9,0),('Glue Trap','physical','fragile',0,3),('Shock Coil','shock','powered',4,3)]
hazards=[]
for name,element,material,dmg,dur in hazard_rows:
    hazards.append(record(name,f'{name}: {element} hazard with {material} interaction.',element=element,materialTags=[material],tickDamage=dmg,duration=dur,intensity=2 if dmg>=4 else 1,propagation='connected' if material in ('wet','conductive','flammable') else 'local',telegraph=f'{name} clearly marks affected tile(s).'))
save('hazards',hazards)

# Original achievement set based on game events, not novel names/messages
achievement_rows=[
('Improvised Conductor','shock_chain',8),('Unlicensed Electrician','short_circuit',5),('It Was Load Bearing','wall_break',6),('Safer Through Paperwork','alternate_boss',8),('Minimal Violence','pacify_encounter',7),('A Clean Escape','no_damage_room',5),('A Terrible First Impression','first_death',2),('Company Property','explosion_chain',5),('No Refunds','failed_trade',2),('We Can Fix This','revive_ally',5),
('Not a Door','breach_route',5),('Audit Complete','objective_hack',6),('Liquid Assets','flood_room',4),('Unplanned Ventilation','gas_ignition',5),('Training Issue','trap_trigger_self',2),('Friendly Warning','ally_saved',5),('Poorly Timed Bravery','guard_ally',4),('Refund Denied','vendor_refused',2),('Exceptional Paper Trail','evidence_complete',6),('Conductive Friendship','shock_ally_saved',5),
('Full Circuit','shock_multi_target',6),('Bureaucratic Shortcut','scanner_bypass',6),('Technically Correct','objective_exploit',5),('Certified Difficult','hard_check_success',4),('Ghost in the Receipts','stealth_vault',6),('Found the Off Switch','machine_disable',4),('Human Firewall','shield_multi_ally',5),('Thirty Second Plan','quick_plan',2),('Last Cast','zero_focus_victory',3),('First Bloodless Boss','boss_noncombat',8),
('Physics Has Spoken','push_hazard_kill',7),('Glass Economies','fragile_enemy_shatter',3),('Do Not Drink','poison_self',2),('Substandard Wiring','shock_machine',4),('Better Than A Map','secret_discovery',3),('Everything Is A Tool','improvised_weapon_kill',5),('Union Break','support_enemy_defeat',3),('Too Many Buttons','device_combo',5),('Consolation Prize','loot_low_rarity',1),('Chairman Of Chaos','audience_threshold',5),
('Return To Sender','projectile_deflected',4),('Line Is Closed','door_trap_kill',5),('Borrowed Time','revive_final_round',6),('Clean Sweep','room_zero_damage',5),('Flameless Firefighter','extinguish_chain',3),('Second Opinion','multiple_checks',3),('Double Entry','trade_twice',2),('Locksmith Rebellion','locked_path_bypass',5),('Frictionless Solution','slide_enemy',4),('Supervisor Warning','boss_telegraph_avoid',4),
('Bad Chemistry','acid_fire_chain',5),('Making A Splash','water_push',4),('All According To Form','multi_key_objective',3),('Absurd Overtime','long_encounter_survival',3),('Final Accounting','finish_floor_six',10),('We Are Not Leaving','all_survive',10),('One Chair Empty','survive_with_casualty',8),('A Very Small Audience','solo_win',8),('Committee Of Four','four_player_win',8),('Actual Teamwork','four_unique_assists',7)]
achievements=[]
for i,(name,event,score) in enumerate(achievement_rows):
  achievements.append(record(name,f'Awarded when the {event.replace("_"," ")} event occurs for the first time in its eligible scope.',condition={'eventType':event,'minCount':1,'requiredCondition':'verified_server_event'},scope='run' if i>=50 else 'encounter',audienceDelta=score,rewardPool='major' if score>=8 else 'minor',message=f'{name}. The Producer claims this outcome was always part of the plan.'))
save('achievements',achievements)

# Room layouts: meaningful 9x9 spatial grammar with appropriate obstacles; socket positions are centered on edges
layouts=[
['####+####','#...c...#','#.......#','#...o...#','+.......+','#.......#','#...~...#','#...c...#','####+####'],
['####+####','#.#...#.#','#...o...#','#.#...#.#','+...^...+','#.#...#.#','#...c...#','#.#...#.#','####+####'],
['####+####','#.......#','#.ccc...#','#..~~...#','+..~o~..+','#..~~...#','#...ccc.#','#.......#','####+####'],
['####+####','#.......#','#.##.##.#','#.#...#.#','+.#.o.#.+','#.#...#.#','#.##.##.#','#.......#','####+####'],
['####+####','#.......#','#.#..c..#','#.#.....#','+...o...+','#.....#.#','#..c..#.#','#.......#','####+####'],
['####+####','#...^...#','#...^...#','#..ccc..#','+...o...+','#..ccc..#','#...^...#','#...^...#','####+####'],
['####+####','#..c.c..#','#.......#','#..o.o..#','+...c...+','#..o.o..#','#.......#','#..c.c..#','####+####'],
['####+####','#.......#','#..~~~..#','#..~^~..#','+..~o~..+','#..~^~..#','#..~~~..#','#.......#','####+####'],
]
room_themes={1:['Orientation Booth','Queue Maze','Broken Elevator','Employee Break Room','Stamp Counter','Leaking Generator','Turnstile Depot'],2:['Compressor Channel','Glass Sorting','Scrap Bazaar','Conveyor Spur','Waste Acid Tank','Reactor Sorting','Crate Chute'],3:['Mutagen Display','Broken Exhibit','Symmetry Hall','Cold Sample Room','Adaptation Booth','Specimen Corridor','Reagent Theater'],4:['Overpass Platform','Switchyard','Control Booth','Substation North','Substation South','Ticket Gantry','Rail Signal'],5:['Ledger Vault','Negotiation Pit','Auction Balcony','Collections Hall','Data Exchange','Legal Archive','Contract Cage'],6:['Relay Orchard','Signal Tunnel','Control Theater','Power Coupler','Dead Air Gallery','Transmission Vault','Final Uplink']}
rooms=[]
for floor,names in room_themes.items():
  for j,name in enumerate(names):
    lay=layouts[(j+floor-1)%len(layouts)]
    rooms.append(record(name,f'Floor {floor} spatial prefab with {"hazards" if j%2 else "cover and devices"}; includes alternative use of its objects.',floor=floor,layout=lay,sockets=['N','E','S','W'],weight=1+j%3,features=['cover' if j%2==0 else 'hazard','machine' if j%3==0 else 'loot','shortcut' if j%4==0 else 'ambush'],encounterBudget=1+j%4))
save('rooms',rooms)

# Contracts / offer events with known risks and rewards
promo_events=[
('Conditional Mercy','heal','elite_next_floor'),('Sponsor Trial','item','hazard_next_room'),('Aisle Closure','credits','blocked_shortcut'),('Shuttle Detour','secret','extra_encounter'),('Unclaimed Reward','talent','wound'),('Unusual Overtime','credits','extra_wave'),('Safety Inspection','heal','loss_of_time'),('Recycling Bonus','craft_material','acid_storm'),('Missing Forms','key','suspicion'),('Black Market Day','discount','reputation'),('Exhibit Gamble','adaptation_hint','extra_mutant'),('Noisy Advertisement','credits','ambush'),('Audience Vote','minor_loot','random_mod'),('Dispatch Emergency','shortcut','shock_pulse'),('Flicker Discount','shield','darkness'),('Wage Garnishment','rare_loot','lose_credits'),('Credit Insurance','medkit','shop_tax'),('Sincere Apology','heal','audience_loss'),('Show Stopper','major_loot','elite_next_floor'),('Secret Audit','evidence','hazard_next_room'),('Volatile Dividend','blast_item','self_damage'),('Faulty Antidote','antidote','poison_cloud'),('Extra Intermission','full_focus','spawn_reinforcements'),('Crowd Favorite','unlock','hard_boss'),('Final Sponsorship','final_cache','extra_boss_phase')]
events=[]
for flooridx,(name,reward,risk) in enumerate(promo_events):
  events.append(record(name,f'A clearly optional bargain: gain {reward.replace("_"," ")} by accepting {risk.replace("_"," ")}.',availableFromFloor=1+flooridx//5,trigger='safe_room_offer',choices=[{'id':'accept','label':f'Accept: {reward.replace("_"," ")}', 'reward':reward,'risk':risk},{'id':'decline','label':'Decline','reward':'none','risk':'none'}],oncePerRun=True))
save('events',events)

sponsors=[]
for name,focus,benefit,condition in [
('Quiet Committee','rescue','first_aid_pack','revive_ally'),('Unreliable Foundry','explosions','blast_brick','explosion_chain'),('Transit Union','movement','courier_satchel','quick_plan'),('Anonymous Accountant','objectives','ink_stamp','objective_hack'),('Glass Benefactors','critical','ceramic_knife','fragile_enemy_shatter'),('Underwriters Collective','defense','riot_shield','guard_ally'),('Tea And Toxins','alchemy','acid_ampoule','acid_fire_chain'),('Signal Minority','stealth','signal_jammer','stealth_vault')]:
  sponsors.append(record(name,f'Sponsor faction favoring {focus}, gifting occasional {benefit.replace("_"," ")}.',focus=focus,signatureItem=benefit,conditionEvent=condition,offerFloor=2,reputationStart=0))
save('sponsors',sponsors)

recipes=[]
for name,ingredients,output in [
('Patch Kit',['sterile_cloth','scrap_metal'],'first_aid_pack'),('Charge Pack',['circuit_shard','conductive_wire'],'shock_cell'),('Solvent Flask',['catalyst_paste','filter_membrane'],'acid_ampoule'),('Flare Mix',['fuel_gel','sterile_cloth'],'fire_flask'),('Freeze Flask',['glacial_salt','water_bladder'],'cold_ampoule'),('Blast Charge',['fuel_gel','circuit_shard'],'blast_brick'),('Quick Seal',['sterile_cloth','catalyst_paste'],'wound_seal'),('Improvised Cover',['scrap_metal','repair_tape'],'foam_canister'),('Smoke Blend',['filter_membrane','fuel_gel'],'smoke_pellet'),('Cleanser',['glacial_salt','filter_membrane'],'neutralizer_salts')]:
  recipes.append(record(name,f'Combine {" + ".join(ingredients)} into {output}.',ingredients={x:1 for x in ingredients},outputItem=output,outputCount=1,craftAP=2))
save('recipes',recipes)

manifest={'schemaVersion':1,'contentVersion':'1.0.0-preproduction','catalogs':{p.stem:len(json.loads(p.read_text())) for p in P.glob('*.json') if p.stem!='manifest'},'notes':'Human-authored proposed balance; every record must be given working engine behavior.'}
(P/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
