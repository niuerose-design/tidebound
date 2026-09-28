import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=await mkdtemp(join(tmpdir(),'tidebound-tests-'));
async function compile(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='server')continue;const src=join(dir,e.name),dst=join(out,src);if(e.isDirectory()){await mkdir(dst,{recursive:true});await compile(src)}else if(e.name.endsWith('.ts')){const text=await readFile(src,'utf8');const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${p}.js${q}`);await writeFile(dst.replace(/\.ts$/,'.js'),js)}}}
await mkdir(join(out,'game'));await writeFile(join(out,'package.json'),'{"type":"module"}');await compile('game');
const {newState,act,advance,tick}=await import(pathToFileURL(join(out,'game/systems/engine.js')).href);
const {stats,snapshot,expMultiplier,normalizeStats}=await import(pathToFileURL(join(out,'game/systems/stats.js')).href);
const {victoryMastery}=await import(pathToFileURL(join(out,'game/systems/mastery.js')).href);
const {visibleStatuses}=await import(pathToFileURL(join(out,'game/systems/combat-status.js')).href);
const {duel,TRAINING}=await import(pathToFileURL(join(out,'game/systems/duel.js')).href);
const {strike,fighterSpeed}=await import(pathToFileURL(join(out,'game/systems/combat.js')).href);
const {combatFxFromLog,combatFxBatch}=await import(pathToFileURL(join(out,'game/systems/combat-feedback.js')).href);
const {migrateState}=await import(pathToFileURL(join(out,'game/systems/migrations.js')).href);
const {apCapacity,apUsed,canUse,canChangeJob,effectiveSkill,skillRankDeltas,skillMasteryLevel,skillMasteryHint,masteryMilestonesFor,jobRequirements,validLoadout,skillLevel,maxSkillLevel,inherited,trimLoadout,jobMasteryTarget,jobCombatMultiplier}=await import(pathToFileURL(join(out,'game/systems/progression.js')).href);
const {skillGrowthStages,skillEffectLines}=await import(pathToFileURL(join(out,'game/systems/skill-description.js')).href);
const {SKILLS}=await import(pathToFileURL(join(out,'game/data/skills.js')).href);
const {STAGES,FISH,DUNGEONS}=await import(pathToFileURL(join(out,'game/data/world.js')).href);
const {profile}=await import(pathToFileURL(join(out,'game/data/encounters.js')).href);
const {shopCost,gambleCost,shopPreview}=await import(pathToFileURL(join(out,'game/systems/commerce.js')).href);
const {itemStats,enhanceCost,bulkItems}=await import(pathToFileURL(join(out,'game/systems/equipment.js')).href);
const {goldMultiplier,dungeonGoldMultiplier,dropRate,hitChance}=await import(pathToFileURL(join(out,'game/systems/stats.js')).href);
const {rebirthLevel,rebirthReward,tierReward}=await import(pathToFileURL(join(out,'game/systems/meta.js')).href);
const metaMod=await import(pathToFileURL(join(out,'game/systems/meta.js')).href);
const longTerm=await import(pathToFileURL(join(out,'game/data/long-term.js')).href);
const {xpNeeded}=await import(pathToFileURL(join(out,'game/data/balance.js')).href);
const {PROGRESSION}=await import(pathToFileURL(join(out,'game/data/progression.js')).href);
const {JOBS,JOB_TREES}=await import(pathToFileURL(join(out,'game/data/classes.js')).href);
let seed=44;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name)};
test('Fresh state, stage and job restrictions',()=>{const s=newState(0);assert.equal(s.hp,stats(s).hp);assert.throws(()=>act(s,{type:'stage',id:'moon'},0));assert.throws(()=>act(s,{type:'job',id:'harpoon'},0));assert.throws(()=>act(s,{type:'skill',id:'pierce'},0));});
test('Server elapsed time, capped offline progress, no repeated rewards',()=>{const s=newState(0);act(s,{type:'start'},0);advance(s,86_400_000,rng);assert.equal(s.turn,43200);assert.ok(s.kills>100);const serialized=JSON.stringify(s);advance(s,86_400_000,rng);assert.equal(JSON.stringify(s),serialized);assert.ok(s.inventory.length<=60);assert.ok(s.hp>=0&&s.hp<=stats(s).hp);});
test('Pause does not accumulate rewards',()=>{const s=newState(0);advance(s,600000,rng);assert.equal(s.kills,0);act(s,{type:'start'},600000);advance(s,602000,rng);assert.equal(s.turn,1)});
test('Job skills are free and SP cannot buy an unvisited job skill',()=>{
 const s=newState(0);s.level=25;s.sp=10;s.attributes.str=30;s.attributes.dex=20;
 act(s,{type:'job',id:'harpoon'},0);assert.equal(s.learned.pierce,1);assert.equal(s.sp,10);assert.equal(canUse(s,'pierce'),true);
 act(s,{type:'skill',id:'pierce'},0);assert.equal(apUsed(s),6);
 assert.throws(()=>act(s,{type:'learn',id:'wave'},0));assert.throws(()=>act(s,{type:'inheritSkill',id:'wave'},0));assert.equal(s.sp,10);
 act(s,{type:'job',id:'fisher'},0);assert.equal(canUse(s,'pierce'),false);assert.ok(!s.skills.includes('pierce'));
 const target=masteryMilestonesFor(SKILLS.find(x=>x.id==='pierce'))[0];s.skillPractice.pierce=target-1;assert.equal(canUse(s,'pierce'),false);
 s.skillPractice.pierce=target;assert.equal(canUse(s,'pierce'),true);act(s,{type:'skill',id:'pierce'},0);
 for(const id of STAGES[0].fish)s.book[id]=PROGRESSION.fishComplete;assert.equal(apCapacity(s),7);
});
test('Advanced jobs require attributes and predecessor mastery, with safe combat transition',()=>{const s=newState(0);s.level=25;s.attributes.str=30;s.attributes.dex=10;assert.equal(canChangeJob(s,'whaler'),false);s.jobMastery.harpoon=75;assert.equal(canChangeJob(s,'whaler'),true);act(s,{type:'job',id:'whaler'},0);act(s,{type:'resetAttributes'},0);assert.equal(canChangeJob(s,'whaler'),true);s.running=true;s.enemy={id:'minnow',name:'입질',hp:20,maxHp:20,attack:1,defense:1,exp:1,gold:1,boss:false,stun:0};act(s,{type:'job',id:'fisher'},1234);assert.equal(s.job,'fisher');assert.equal(s.running,false);assert.equal(s.enemy,null);assert.equal(s.lastTick,1234);});
test('SP levels do not replace real mastery in advanced job requirements',()=>{
 const s=newState(0);s.level=40;s.rebirths=2;s.attributes={str:60,dex:45,int:10,vit:10,wis:10,luk:10};
 s.jobMastery.whaler=150;s.jobMastery.harpoon=150;s.learned.whaleStrike=5;
 const targets=masteryMilestonesFor(SKILLS.find(x=>x.id==='whaleStrike'));s.skillPractice.whaleStrike=targets.at(-1)-1;
 assert.equal(canChangeJob(s,'krakenSlayer'),false);s.skillPractice.whaleStrike=targets.at(-1);assert.equal(canChangeJob(s,'krakenSlayer'),true);
 assert.ok(jobRequirements(s,JOBS.find(x=>x.id==='krakenSlayer')).some(x=>x.label.includes('거경 관통 숙련 4단계')));
});
test('Stat and SP refunds cannot create points or erase acquired skills',()=>{
 const s=newState(0);const attack=stats(s).attack;act(s,{type:'attribute',id:'str'},0);assert.equal(stats(s).attack,attack+2);
 act(s,{type:'resetAttributes'},0);act(s,{type:'resetAttributes'},0);assert.equal(s.statPoints,4);s.sp=3;
 act(s,{type:'learn',id:'hook'},0);assert.equal(s.sp,2);assert.equal(s.skillSpent.hook,1);act(s,{type:'resetSkills'},0);act(s,{type:'resetSkills'},0);assert.equal(s.sp,3);assert.equal(s.learned.hook,1);
 assert.throws(()=>act(s,{type:'attribute',id:'str',value:'-1'},0));
});
test('SP is only earned once at 10000 catches; early codex rewards are gold',()=>{
 const s=newState(0);assert.equal(s.sp,0);s.book.minnow=50;act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.sp,0);assert.equal(s.gold,300);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.book.minnow=9999;act(s,{type:'claimBook',id:'minnow'},0);act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.sp,0);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.book.minnow=10000;act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.sp,1);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.inventory.push({id:'book-item',slot:'rod',rarity:1,power:5,level:1,name:'test'});act(s,{type:'registerItem',id:'book-item'},0);assert.equal(s.itemBook['rod:1'],true);assert.equal(s.inventory.length,0);assert.throws(()=>act(s,{type:'registerItem',id:'book-item'},0));
});
test('Saves from before v8 restart fresh, keep only the name, and are idempotent',()=>{const s=newState(0);s.version=7;s.name='오래된 낚시꾼';s.level=60;s.gold=99999;s.pearls=500;s.upgrades={attack:30};s.rebirths=4;migrateState(s,5000);const fresh=newState(5000);fresh.name='오래된 낚시꾼';assert.deepEqual(s,fresh);assert.equal(s.version,8);assert.equal(s.upgrades,undefined);const saved=JSON.stringify(s);migrateState(s,9000);assert.equal(JSON.stringify(s),saved);const v1=newState(0);v1.version=1;delete v1.guild;migrateState(v1,0);assert.equal(v1.version,8);assert.ok(v1.guild);});
test('Equipment swapping preserves item counts and sale is single-use',()=>{const s=newState(0);s.inventory.push({id:'test',name:'Test',slot:'rod',rarity:2,power:20,level:1});act(s,{type:'equip',id:'test'},0);assert.equal(s.equipment.rod.id,'test');assert.equal(s.inventory.length,1);act(s,{type:'sell',id:'starter'},0);assert.throws(()=>act(s,{type:'sell',id:'starter'},0));assert.equal(s.inventory.length,0)});
test('Gold training is removed: the upgrade action is rejected and research still costs pearls',()=>{const s=newState(0);const gold=s.gold;assert.throws(()=>act(s,{type:'upgrade',id:'attack'},0));assert.equal(s.gold,gold);assert.equal(s.upgrades,undefined);assert.throws(()=>act(s,{type:'permanent',id:'attack'},0));});
test('Rebirth resets run while preserving permanent progression',()=>{const s=newState(0);s.level=30;s.job='harpoon';s.gold=999;s.book={minnow:50};s.permanent.attack=2;s.pearls=1;s.clears.grotto=1;s.skills=['pierce'];act(s,{type:'rebirth'},100);assert.equal(s.level,1);assert.equal(s.job,'fisher');assert.equal(s.gold,100);assert.equal(s.pearls,4);assert.equal(s.rebirths,1);assert.equal(s.book.minnow,50);assert.equal(s.permanent.attack,2);assert.equal(s.clears.grotto,1);assert.deepEqual(s.skills,['hook']);assert.equal(s.hp,stats(s).hp)});
test('Dungeon completion and first-clear pearl only once',()=>{const s=newState(0);s.level=40;s.permanent.attack=40;s.permanent.hp=40;act(s,{type:'dungeon',id:'grotto'},0);for(let i=0;i<100&&s.running;i++)tick(s,rng);assert.equal(s.clears.grotto,1);assert.equal(s.pearls,1);assert.equal(s.dungeon,null);assert.equal(s.running,false);act(s,{type:'dungeon',id:'grotto'},0);for(let i=0;i<100&&s.running;i++)tick(s,rng);assert.equal(s.clears.grotto,2);assert.equal(s.pearls,1)});
test('PvP is isolated from PvE, bounded and deterministic',()=>{const s=newState(0),before=JSON.stringify(s);let fixed=()=>.9;const result=duel(snapshot(s),TRAINING[0],true,fixed);assert.equal(JSON.stringify(s),before);assert.ok(result.turns<=80);assert.equal(result.ratingChange,0);assert.deepEqual(result,duel(snapshot(s),TRAINING[0],true,fixed));assert.ok(result.logs.length>0)});
test('Stun skips enemy action and cooldown prevents instant repeated proc',()=>{const st={hp:1000,attack:10,defense:0,crit:0};const a={name:'A',stats:st,hp:1000,skills:['splash'],cooldowns:{},stun:0},b={name:'B',stats:st,hp:1000,skills:[],cooldowns:{},stun:0};assert.match(strike(a,b,()=>0),/물보라/);assert.equal(b.stun,1);assert.match(strike(b,a,()=>0),/행동 불가/);assert.equal(a.hp,1000);assert.match(strike(a,b,()=>0),/기본 공격/)});
test('Mana budget, magic defense, accuracy and damage over time',()=>{const make=(extra={})=>({name:'test',stats:{hp:1000,attack:20,magic:100,defense:0,resist:0,crit:0,mana:20,manaRegen:0,...extra},hp:1000,skills:['arcane'],cooldowns:{},stun:0,mana:20,effects:{}});let a=make(),b=make({defense:1000});assert.match(strike(a,b,()=>0),/마법/);assert.equal(b.hp,845);assert.equal(a.mana,10);a=make();a.mana=0;assert.match(strike(a,make(),()=>0),/기본 공격/);assert.match(strike(make(),make(),()=>.999),/빗나감/);a=make();a.hp=5;a.effects={dot:{damage:10,turns:1,name:'출혈'}};b=make();assert.match(strike(a,b,()=>0),/쓰러짐/);assert.equal(a.hp,0);assert.equal(b.hp,1000);});
test('Silence blocks active skills but keeps basic attacks',()=>{const st={hp:1000,attack:20,magic:100,defense:0,resist:0,crit:0,mana:30,manaRegen:0};const caster={name:'Caster',stats:st,hp:1000,skills:['hushCurrent'],cooldowns:{},stun:0,mana:30,effects:{}};const target={name:'Target',stats:st,hp:1000,skills:['splash'],cooldowns:{},stun:0,mana:30,effects:{}};assert.match(strike(caster,target,()=>0),/침묵 2턴/);assert.equal(target.effects.silence,2);const before=caster.hp;const log=strike(target,caster,()=>0);assert.match(log,/침묵 중/);assert.match(log,/기본 공격/);assert.doesNotMatch(log,/물보라/);assert.ok(caster.hp<before);assert.equal(target.cooldowns.splash,undefined);});
test('Slow and haste change round priority without adding actions',()=>{const st={hp:1000,attack:10,defense:0,crit:0,speed:20};const normal={name:'normal',stats:st,hp:1000,skills:[],cooldowns:{},stun:0,effects:{}};const slow={...normal,name:'slow',effects:{slow:3}};const haste={...normal,name:'haste',effects:{haste:3}};assert.ok(fighterSpeed(slow)<fighterSpeed(normal));assert.ok(fighterSpeed(haste)>fighterSpeed(normal));assert.equal(Math.round(fighterSpeed(slow)),13);assert.equal(Math.round(fighterSpeed(haste)),27);});
test('Extra attacks are data-driven and capped',()=>{const st={hp:1000,attack:70,defense:0,crit:0,mana:40,manaRegen:0};const a={name:'연타자',stats:st,hp:1000,skills:['twinHook'],cooldowns:{},stun:0,mana:40,effects:{}};const b={name:'표적',stats:st,hp:1000,skills:[],cooldowns:{},stun:0,mana:40,effects:{}};const log=strike(a,b,()=>0);assert.match(log,/쌍갈고리/);assert.match(log,/추가타/);assert.ok(b.hp<900);assert.ok(SKILLS.find(x=>x.id==='tentacleBarrage').extraAttacks<=2);});
test('Economy jobs change rewards without forcing combat stats',()=>{const s=newState(0);s.level=25;s.job='tideSurveyor';s.learned.chartedCurrents=1;s.skills=['hook','chartedCurrents'];const survey=stats(s);assert.ok(survey.dropBonus>=.03);assert.ok(survey.goldBonus>=.04);assert.ok(dropRate(s)>.20);s.job='pearlBroker';s.rebirths=1;s.learned.pearlLedger=1;s.skills=['hook','pearlLedger'];const pearls=stats(s).rebirthBonus;assert.equal(pearls,1);assert.equal(rebirthReward(s,pearls),Math.floor(s.level/10)+s.rebirths+1);s.job='salvageMerchant';s.learned.salvageContract=1;s.skills=['hook','salvageContract'];assert.ok(dungeonGoldMultiplier(s)>1);});
test('Rare fish, dungeon bosses and monster-derived skills are present',()=>{assert.ok(FISH.length>=35);assert.ok(FISH.some(f=>f.rarity==='rare'&&f.spawnWeight&&f.spawnWeight<1));assert.ok(FISH.some(f=>f.boss));assert.ok(DUNGEONS.length>=7);assert.ok(DUNGEONS.every(d=>d.bossFish));assert.ok(profile('grottoWarden').skills.includes('electricBite'));assert.ok(profile('abyssSovereign').skills.includes('tentacleBarrage'));});

test('Shop preview equals purchased item and overspending is rejected',()=>{const s=newState(0);const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'buy',id:'magic'},0));assert.equal(JSON.stringify(s),before);s.gold=10000;const expected=itemStats(shopPreview(s,'magic')),cost=shopCost(s);act(s,{type:'buy',id:'magic'},0);assert.deepEqual(itemStats(s.inventory[0]),expected);assert.equal(s.gold,10000-cost);assert.ok(expected.magic>expected.attack);const id=s.inventory[0].id;act(s,{type:'equip',id},0);assert.equal(s.equipment.rod.id,id);});
test('Appraisal probability boundaries and full bag rejection',()=>{for(const [roll,rarity] of [[0,1],[.549,1],[.55,2],[.949,2],[.95,3]]){const s=newState(0);s.gold=10000;const cost=gambleCost(s);act(s,{type:'gamble',id:'physical'},0,()=>roll);assert.equal(s.inventory[0].rarity,rarity);assert.equal(s.gold,10000-cost);}const s=newState(0);s.gold=9999;s.inventory=Array.from({length:60},(_,i)=>({...shopPreview(s,'coat'),id:String(i)}));const old=s.gold;assert.throws(()=>act(s,{type:'buy',id:'coat'},0));assert.equal(s.gold,old);});
test('Equipment enhancement changes real stats and caps at ten',()=>{const s=newState(0);s.gold=1e9;const item=s.equipment.rod;const cost=enhanceCost(item),before=itemStats(item).attack;act(s,{type:'enhance',id:item.id},0);assert.equal(s.gold,1e9-cost);assert.ok(Math.abs(itemStats(item).attack-before*1.15)<1e-8);for(let i=1;i<10;i++)act(s,{type:'enhance',id:item.id},0);const gold=s.gold;assert.throws(()=>act(s,{type:'enhance',id:item.id},0));assert.equal(s.gold,gold);});
test('Bulk sale respects exact rarity, locks and relics',()=>{const s=newState(0);s.inventory=[{...shopPreview(s,'coat'),id:'a'},{...shopPreview(s,'coat'),id:'b',locked:true},{...shopPreview(s,'coat'),id:'c',relic:'test'},{...shopPreview(s,'coat'),id:'d',rarity:2}];assert.equal(bulkItems(s,1).length,1);const gold=s.gold;act(s,{type:'sellRarity',id:'1'},0);assert.equal(s.gold,gold+15);assert.deepEqual(s.inventory.map(i=>i.id),['b','c','d']);assert.throws(()=>act(s,{type:'sell',id:'b'},0));assert.throws(()=>act(s,{type:'registerItem',id:'c'},0));});
test('Rebirth unlocks, research and relic persistence',()=>{const s=newState(0);s.pearls=100;s.level=30;assert.throws(()=>act(s,{type:'buyRelic',id:'memoryRod'},0));act(s,{type:'rebirth'},0);assert.equal(apCapacity(s),7);assert.equal(rebirthLevel(s),35);assert.equal(expMultiplier({...s,lifeBonus:null}),1.25);assert.equal(expMultiplier(s),1.875);act(s,{type:'permanent',id:'ap'},0);assert.equal(apCapacity(s),8);act(s,{type:'buyRelic',id:'memoryRod'},0);const relic=s.inventory[0];act(s,{type:'equip',id:relic.id},0);s.gold=10000;act(s,{type:'enhance',id:relic.id},0);s.permanent.starting=2;s.level=35;act(s,{type:'rebirth'},0);assert.equal(s.equipment.rod.relic,'memoryRod');assert.equal(s.equipment.rod.enhance,1);assert.equal(s.gold,1100);assert.equal(apCapacity(s),9);assert.throws(()=>act(s,{type:'buyRelic',id:'memoryRod'},0));s.level=100;s.rebirths=100;assert.equal(rebirthLevel(s),60);assert.ok(xpNeeded(60)<xpNeeded(30)*5);});
test('Rebirth skills still require their job; temple relic and research caps work',()=>{
 const s=newState(0);s.level=30;s.sp=100;s.pearls=1000;assert.throws(()=>act(s,{type:'learn',id:'soulHook'},0));s.rebirths=1;assert.throws(()=>act(s,{type:'learn',id:'soulHook'},0));
 s.attributes.str=20;s.attributes.wis=20;act(s,{type:'job',id:'rebirthFisher'},0);assert.equal(s.learned.soulHook,1);assert.equal(s.sp,100);
 s.clears.temple=1;const pearls=s.pearls;act(s,{type:'buyRelic',id:'memoryRod'},0);assert.equal(s.pearls,pearls);s.permanent.ap=12;assert.throws(()=>act(s,{type:'permanent',id:'ap'},0));assert.equal(s.pearls,pearls);
});
test('Gold and experience multipliers match actual combat payouts',()=>{const s=newState(0);s.rebirths=2;s.permanent.gold=2;s.permanent.exp=1;s.level=20;s.running=true;s.enemy={id:'minnow',name:'target',hp:1,maxHp:1,attack:0,defense:0,exp:10,gold:100,boss:false,stun:0};const gold=s.gold,exp=s.exp,mult=goldMultiplier(s);tick(s,()=>.5);assert.equal(s.gold-gold,Math.floor(100*mult));assert.equal(s.exp-exp,17);assert.ok(s.logs.some(l=>l.text.includes(`+${Math.floor(100*mult)} G`)));});
test('Tide scaling and endless depths advance only on full clear',()=>{const s=newState(0);assert.throws(()=>act(s,{type:'tide',id:'1'},0));s.rebirths=3;act(s,{type:'tide',id:'2'},0);s.running=true;tick(s,()=>.5);assert.ok(s.enemy.maxHp>50);s.level=100;s.permanent.attack=4000;s.permanent.hp=4000;act(s,{type:'dungeon',id:'abyss'},0);assert.equal(s.dungeon.depth,1);assert.throws(()=>act(s,{type:'tide',id:'1'},0));for(let i=0;i<20&&s.running;i++)tick(s,()=>.5);assert.equal(s.abyssBest,1);assert.equal(s.pearls,1);act(s,{type:'dungeon',id:'abyss'},0);assert.equal(s.dungeon.depth,2);act(s,{type:'leaveDungeon'},0);assert.equal(s.abyssBest,1);assert.equal(s.pearls,1);act(s,{type:'dungeon',id:'abyss'},0);for(let i=0;i<20&&s.running;i++)tick(s,()=>.5);assert.equal(s.abyssBest,2);assert.equal(s.pearls,2);});
test('Accuracy and evasion use the displayed formula',()=>{assert.ok(Math.abs(hitChance({accuracy:.94},{evasion:.14})-.8)<1e-9);assert.ok(Math.abs(hitChance({accuracy:.94},{evasion:.24})-.7)<1e-9);assert.equal(hitChance({accuracy:2},{evasion:0}),.995);assert.equal(hitChance({accuracy:.1},{evasion:.8}),.01);});
test('Guild creation, rename, treasury research and reincarnation persistence',()=>{const s=newState(0);assert.throws(()=>act(s,{type:'guildJoin',value:'심해개척단'},0));s.gold=10000;s.level=20;act(s,{type:'guildJoin',value:'파도연합'},0);assert.equal(s.gold,9000);act(s,{type:'guildRename',value:'푸른파도'},0);assert.equal(s.guild.name,'푸른파도');assert.equal(s.gold,8500);act(s,{type:'guildDonate',id:'1000'},0);assert.equal(s.guild.treasury,1000);const attack=stats(s).attack;act(s,{type:'guildResearch',id:'might'},0);assert.equal(s.guild.research.might,1);assert.ok(stats(s).attack>attack);s.guild.missionKills=100;act(s,{type:'guildClaim',id:'kills'},0);assert.equal(s.guild.medals,3);assert.equal(snapshot(s).guild,'푸른파도');s.level=30;s.gold=10000;const saved=JSON.stringify(s.guild);act(s,{type:'rebirth'},0);assert.equal(JSON.stringify(s.guild),saved);});
test('Guild raid cooldown and gold cannot be bypassed',()=>{const s=newState(0);s.gold=10000;act(s,{type:'guildJoin',value:'레이드'},0);s.guild.treasury=100000;s.level=100;s.permanent.attack=200;act(s,{type:'guildRaid'},1000);assert.equal(s.guild.lastRaid,1000);assert.throws(()=>act(s,{type:'guildRaid'},1001));assert.ok(s.guild.treasury<100000);});
test('SP and mastery reach identical growth levels, never stacking or locking',()=>{
 const sk=SKILLS.find(x=>x.id==='pierce');assert.equal(effectiveSkill(sk,1).cost,4);
 assert.deepEqual(effectiveSkill(sk,3,0),effectiveSkill(sk,1,2));assert.deepEqual(effectiveSkill(sk,3,2),effectiveSkill(sk,1,2));
 assert.deepEqual(effectiveSkill(sk,3,3),effectiveSkill(sk,1,3));assert.equal(skillLevel(sk,3,3),3);
 assert.ok(skillRankDeltas(sk,1).some(x=>x.label==='장착 AP'&&x.to==='AP 3'));
 const s=newState(0);s.level=25;s.job='harpoon';s.learned.pierce=1;s.skillPractice.pierce=sk.masteryMilestones[1];s.sp=4;
 act(s,{type:'learn',id:'pierce'},0);assert.equal(s.sp,3);assert.equal(skillLevel(sk,s.learned.pierce,2),3);
 s.skillPractice.pierce=sk.masteryMilestones[3];assert.equal(skillLevel(sk,s.learned.pierce,4),4);assert.throws(()=>act(s,{type:'learn',id:'pierce'},0));
});
test('69 jobs distribute tier 1 and 2 skills into one or two each',()=>{
 assert.equal(JOBS.length,69);assert.equal(SKILLS.length,103);assert.equal(JOB_TREES.length,4);
 for(const job of JOBS.filter(j=>j.tier===1||j.tier===2)){
  const owned=SKILLS.filter(sk=>sk.job===job.id);assert.ok(owned.length>=1&&owned.length<=2,job.id+': '+owned.length);
 }
 assert.equal(SKILLS.find(sk=>sk.id==='hushCurrent').job,'stillwaterBinder');
 for(const sk of SKILLS){
  assert.ok(!sk.job||JOBS.some(j=>j.id===sk.job),sk.id);const ms=masteryMilestonesFor(sk);
  assert.ok(ms.every((n,i)=>Number.isInteger(n)&&n>0&&(i===0||n>ms[i-1])),sk.id);
  if(sk.levelEffects)assert.equal(sk.levelEffects.length,ms.length+1);
 }
});
test('Data reset returns a clean run while preserving the chosen name',()=>{const s=newState(0);s.name='푸른 파도';s.level=31;s.gold=9999;s.rebirths=2;s.rating=1470;s.wins=8;s.losses=3;s.book.minnow=40;s.running=false;act(s,{type:'resetData'},1234);assert.equal(s.name,'푸른 파도');assert.equal(s.level,1);assert.equal(s.gold,100);assert.equal(s.rebirths,0);assert.equal(s.rating,1000);assert.equal(s.wins,0);assert.equal(s.losses,0);assert.deepEqual(s.book,{});assert.deepEqual(s.skills,['hook']);assert.equal(s.lastTick,1234);});
test('Async duel snapshot exposes accuracy and evasion used by both sides',()=>{const s=newState(0);s.attributes.dex=25;const snap=snapshot(s),opponent={...TRAINING[0],stats:{...TRAINING[0].stats,accuracy:.8,evasion:.2}};const result=duel(snap,opponent,true,()=>.5);assert.equal(result.playerAccuracy,snap.stats.accuracy);assert.equal(result.opponentEvasion,.2);assert.equal(result.playerHitChance,hitChance(snap.stats,opponent.stats));assert.equal(result.opponentHitChance,hitChance(opponent.stats,snap.stats));});

test('SP inheritance is separate, costs one, and refund preserves natural inheritance',()=>{
 const s=newState(0);s.level=25;s.attributes.str=30;s.attributes.dex=20;s.sp=5;
 act(s,{type:'job',id:'harpoon'},0);act(s,{type:'learn',id:'pierce'},0);assert.equal(s.sp,4);assert.equal(inherited(s,'pierce'),false);
 act(s,{type:'job',id:'fisher'},0);assert.equal(canUse(s,'pierce'),false);act(s,{type:'inheritSkill',id:'pierce'},0);
 assert.equal(s.sp,3);assert.equal(canUse(s,'pierce'),true);assert.equal(s.skillPractice.pierce||0,0);
 assert.throws(()=>act(s,{type:'inheritSkill',id:'pierce'},0));act(s,{type:'resetSkills'},0);assert.equal(s.sp,5);assert.equal(s.learned.pierce,1);assert.equal(canUse(s,'pierce'),false);
 act(s,{type:'inheritSkill',id:'pierce'},0);s.skillPractice.pierce=masteryMilestonesFor(SKILLS.find(sk=>sk.id==='pierce'))[0];act(s,{type:'resetSkills'},0);
 assert.equal(s.sp,5);assert.equal(canUse(s,'pierce'),true);
});
test('Bone growth boundaries flip penalties and AP exactly at 1000/10000/50000 wins',()=>{
 const bone=SKILLS.find(sk=>sk.id==='boneLegacy');assert.deepEqual(masteryMilestonesFor(bone),[1000,10000,50000]);
 for(const [wins,lv,cost] of [[0,0,6],[999,0,6],[1000,1,6],[9999,1,6],[10000,2,2],[49999,2,2],[50000,3,-3]]){
  const natural=skillMasteryLevel(wins,bone.masteryMilestones);assert.equal(natural,lv);
  const fx=effectiveSkill(bone,1,natural);assert.equal(fx.cost,cost);if(lv<2)assert.ok(fx.bonus.hp<0&&fx.bonus.defense<0);else assert.ok(fx.bonus.hp>0&&fx.bonus.defense>0);
 }
 assert.deepEqual(effectiveSkill(bone,4,0),effectiveSkill(bone,1,3));assert.equal(maxSkillLevel(bone),3);
});
test('Negative AP works independent of priority and cannot be removed to overflow AP',()=>{
 const s=newState(0);s.level=30;s.learned={hook:1,pierce:1,focus:1,boneLegacy:1};s.skillInheritances={pierce:true,focus:true};s.skillPractice.boneLegacy=50000;
 s.skills=['hook','pierce','focus','boneLegacy'];assert.equal(apUsed(s),5);assert.equal(validLoadout(s,s.skills),true);
 trimLoadout(s);assert.equal(s.skills.length,4);assert.throws(()=>act(s,{type:'skill',id:'boneLegacy'},0));assert.equal(s.skills.length,4);
 act(s,{type:'skill',id:'pierce'},0);act(s,{type:'skill',id:'boneLegacy'},0);assert.ok(apUsed(s)<=apCapacity(s));
});
test('SP inheritance, growth and practice survive reincarnation',()=>{
 const s=newState(0);s.level=30;s.learned.pierce=3;s.skillSpent.pierce=3;s.skillInheritances.pierce=true;s.skillPractice.pierce=100;s.sp=2;
 act(s,{type:'rebirth'},1);assert.equal(s.skillInheritances.pierce,true);assert.equal(s.learned.pierce,3);assert.equal(s.skillPractice.pierce,100);assert.equal(s.sp,2);assert.equal(canUse(s,'pierce'),false);
 s.level=10;assert.equal(canUse(s,'pierce'),true);
});
test('Level ups grant native skills but no SP',()=>{
 const s=newState(0);s.running=true;s.exp=xpNeeded(1)+xpNeeded(2);s.enemy={id:'minnow',name:'target',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};
 tick(s,()=>.5);assert.equal(s.level,3);assert.equal(s.sp,0);assert.equal(s.learned.splash,1);
});
test('Combat feedback preserves both actors, healing target and follow-up misses',()=>{
 const logs=[
 {id:10,type:'battle',text:'나 · 쌍갈고리 [치명타] → 150 물리 피해 · 20 회복 · 추가타 50 · 추가타 2 빗나감'},
 {id:11,type:'battle',text:'물고기 · 기본 공격 → 8 물리 피해 · 침묵 중'},
 {id:12,type:'battle',text:'나: 기절로 행동 불가.'}];
 const batch=combatFxBatch(logs,9,'나');assert.equal(batch.length,3);assert.deepEqual(batch.map(f=>f.actor),['player','enemy','player']);
 assert.deepEqual(batch[0].hits.map(h=>h.value),[100,50,0]);assert.equal(batch[0].kind,'physical');assert.equal(batch[0].target,'enemy');assert.equal(batch[0].healing,20);assert.equal(batch[0].hits[0].critical,true);
 assert.equal(batch[1].basic,true);assert.equal(batch[1].kind,'physical');assert.equal(batch[2].target,'player');assert.equal(batch[2].kind,'stun');assert.ok(batch[1].delay>batch[0].delay);
 assert.equal(combatFxBatch(logs,12,'나').length,0);assert.equal(combatFxBatch(Array.from({length:80},(_,i)=>({...logs[1],id:i})),0,'나').length,6);
 const heal=combatFxFromLog({id:90,type:'battle',text:'나 · 생명의 조류 → 80 마법 피해 · 25 회복'},'나');assert.equal(heal.target,'enemy');assert.equal(heal.healing,25);
});
test('PvP snapshots use the same purchased or mastered active levels',()=>{
 const s=newState(0);s.level=25;s.learned.hook=3;s.skills=['hook'];const paid=snapshot(s);
 s.learned.hook=1;s.skillPractice.hook=masteryMilestonesFor(SKILLS.find(sk=>sk.id==='hook'))[1];const practiced=snapshot(s);
 assert.deepEqual(paid.stats,practiced.stats);assert.deepEqual(duel(paid,TRAINING[0],true,()=>.1),duel(practiced,TRAINING[0],true,()=>.1));
});

test('Experience bonus is additive, visible and included only for usable equipped skills',()=>{
 const s=newState(0);s.level=25;s.job='voyageScribe';s.rebirths=2;s.permanent.exp=3;s.learned.voyageReview=1;s.skills=['voyageReview'];
 assert.ok(Math.abs(stats(s).expBonus-1.21)<1e-9);assert.ok(Math.abs(expMultiplier(s)-2.21)<1e-9);
 s.skills=[];assert.ok(Math.abs(expMultiplier(s)-2.13)<1e-9);
 s.job='fisher';s.skills=['voyageReview'];assert.ok(Math.abs(expMultiplier(s)-2.1)<1e-9);
 s.skillInheritances.voyageReview=true;assert.ok(Math.abs(expMultiplier(s)-2.18)<1e-9);
 assert.equal(normalizeStats({hp:1,attack:1,defense:0,crit:0}).expBonus,0);
});
test('Experience payout uses the same bonus displayed on the character',()=>{
 const s=newState(0);s.level=25;s.job='voyageScribe';s.learned.voyageReview=1;s.skills=['voyageReview'];s.running=true;s.hp=stats(s).hp;
 s.enemy={id:'minnow',name:'test',hp:1,maxHp:1,attack:0,defense:0,exp:100,gold:1,boss:false,stun:0};
 const expected=Math.floor(100*expMultiplier(s));tick(s,()=>.5);assert.equal(s.exp,expected);assert.equal(expected,111);
});
test('Mastery bonuses match boss and species, use the strongest one and cap at ten',()=>{
 const s=newState(0);s.level=50;s.rebirths=1;s.job='bossNaturalist';s.learned.titanFieldNotes=1;s.skills=['titanFieldNotes'];
 assert.equal(victoryMastery(s,{id:'minnow',boss:false}).amount,1);
 assert.equal(victoryMastery(s,{id:'minnow',boss:true}).amount,3);
 assert.equal(victoryMastery(s,{id:'grottoWarden',boss:false}).amount,3);
 s.learned.serpentFolklore=5;s.skillInheritances.serpentFolklore=true;s.skills.push('serpentFolklore');
 assert.equal(victoryMastery(s,{id:'grottoWarden',boss:true}).amount,10);
 assert.equal(victoryMastery(s,{id:'eel',boss:false}).amount,10);
 assert.equal(victoryMastery(s,{id:'perch',boss:false}).amount,1);
 s.skills=[];assert.equal(victoryMastery(s,{id:'grottoWarden',boss:true}).amount,1);
});
test('A bonus victory advances job and equipped skills once but codex by only one',()=>{
 const s=newState(0);s.level=25;s.job='bossNaturalist';s.learned.titanFieldNotes=1;s.skills=['hook','titanFieldNotes'];s.running=true;s.hp=stats(s).hp;
 s.enemy={id:'grottoWarden',name:'test boss',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:true,stun:0};
 tick(s,()=>.5);assert.equal(s.jobMastery.bossNaturalist,3);assert.equal(s.skillPractice.hook,3);assert.equal(s.skillPractice.titanFieldNotes,3);assert.equal(s.book.grottoWarden,1);assert.equal(s.kills,1);assert.equal(s.sp,0);
 tick(s,()=>.5);assert.equal(s.book.grottoWarden,1);
});
test('A mastery level earned by this victory does not retroactively multiply its reward',()=>{
 const s=newState(0);s.level=25;s.job='bossNaturalist';s.learned.titanFieldNotes=1;s.skillPractice.titanFieldNotes=999;s.skills=['titanFieldNotes'];s.running=true;s.hp=stats(s).hp;
 s.enemy={id:'grottoWarden',name:'test boss',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:true,stun:0};
 tick(s,()=>.5);assert.equal(s.skillPractice.titanFieldNotes,1002);assert.equal(s.jobMastery.bossNaturalist,3);assert.equal(victoryMastery(s,{id:'grottoWarden',boss:true}).amount,4);
});
test('Boss techniques unlock at native job mastery and SP cannot skip first acquisition',()=>{
 const s=newState(0);s.level=40;s.job='echoTamer';s.jobMastery.echoTamer=5999;s.sp=20;s.skills=['hook'];
 assert.throws(()=>act(s,{type:'learn',id:'sovereignSilence'},0));assert.throws(()=>act(s,{type:'inheritSkill',id:'sovereignSilence'},0));assert.equal(s.learned.sovereignSilence,undefined);
 s.running=true;s.hp=stats(s).hp;s.enemy={id:'minnow',name:'test',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};
 tick(s,()=>.5);assert.equal(s.jobMastery.echoTamer,6000);assert.equal(s.learned.sovereignSilence,1);assert.equal(s.sp,20);assert.equal(s.skillPractice.sovereignSilence||0,0);assert.equal(canUse(s,'sovereignSilence'),true);
 act(s,{type:'inheritSkill',id:'sovereignSilence'},0);assert.equal(s.sp,19);
 s.job='abyssMimic';s.rebirths=1;s.jobMastery.abyssMimic=19999;act(s,{type:'pause'},0);assert.equal(s.learned.borrowedTentacles,undefined);
 s.jobMastery.abyssMimic=20000;act(s,{type:'pause'},0);assert.equal(s.learned.borrowedTentacles,1);
});
test('Research skill conditions and boss origins reference actual game data',()=>{
 for(const sk of SKILLS){if(sk.masteryGain){assert.equal(sk.masteryGain.bonusByLevel.length,maxSkillLevel(sk)+1);for(const id of sk.masteryGain.enemyIds||[])assert.ok(FISH.some(f=>f.id===id));}if(sk.unlockJobMastery)assert.ok(sk.job&&sk.sourceEnemySkill);}
 assert.equal(new Set(JOBS.map(j=>j.id)).size,JOBS.length);assert.equal(new Set(SKILLS.map(j=>j.id)).size,SKILLS.length);
 for(const job of JOBS){const seen=new Set();let node=job;while(node.parent){assert.ok(!seen.has(node.id));seen.add(node.id);node=JOBS.find(j=>j.id===node.parent);assert.ok(node);}}
});
test('Name statuses include bleed, show consumed stun and target haste at its actor',()=>{
 const stun=combatFxFromLog({id:1,type:'battle',text:'나: 기절로 행동 불가.'},'나');
 assert.equal(visibleStatuses({},0,[stun],'player')[0].label,'기절함');assert.equal(visibleStatuses({},0,[stun],'enemy').length,0);
 assert.equal(visibleStatuses({dot:{turns:2,damage:1,name:'출혈'},silence:2},1,[stun],'player').length,3);
 const haste=combatFxFromLog({id:2,type:'battle',text:'적 · 광폭 순환 → 10 물리 피해 · 가속 3턴'},'나');
 assert.equal(visibleStatuses({},0,[haste],'enemy')[0].id,'haste');assert.equal(visibleStatuses({},0,[haste],'player').length,0);
});

test('Category appraisal rolls rod style and rarity separately, charging once',()=>{
 for(const [styleRoll,style] of [[0,'physical'],[.499,'physical'],[.5,'magic'],[.999,'magic']]){
  const s=newState(0);s.gold=10000;const rolls=[styleRoll,.95,.2];act(s,{type:'gamble',id:'rod'},0,()=>rolls.shift()??0);
  assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].slot,'rod');assert.equal(s.inventory[0].style,style);assert.equal(s.inventory[0].rarity,3);assert.equal(s.gold,10000-gambleCost(s));
 }
 for(const slot of ['coat','charm']){const s=newState(0);s.gold=10000;act(s,{type:'gamble',id:slot},0,()=>.55);assert.equal(s.inventory[0].slot,slot);assert.equal(s.inventory[0].rarity,2);}
 const s=newState(0);s.gold=10000;const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'gamble',id:'unknown'},0));assert.equal(JSON.stringify(s),before);
});
test('Job mastery strengthens only the currently selected job and never its penalties',()=>{
 const s=newState(0);s.level=50;s.permanent.attack=100;s.skills=[];s.job='harpoon';const base=stats(s);
 s.jobMastery.tide=jobMasteryTarget('tide');assert.deepEqual(stats(s),base);
 s.jobMastery.harpoon=jobMasteryTarget('harpoon');assert.ok(stats(s).attack>base.attack);
 s.job='fisher';assert.deepEqual(stats(s),stats({...s,jobMastery:{}}));
 const penaltyJob=JOBS.find(j=>j.hp<1);assert.equal(jobCombatMultiplier(penaltyJob,penaltyJob.hp,true),penaltyJob.hp);
});
test('Growth descriptions expose real bone penalties, negative AP and farming stages',()=>{
 const bone=skillGrowthStages(SKILLS.find(sk=>sk.id==='boneLegacy'));
 assert.deepEqual(bone.map(r=>[r.practice,r.effective.cost,r.effective.bonus.hp,r.effective.bonus.defense]),[[0,6,-60,-8],[1000,6,-40,-5],[10000,2,40,5],[50000,-3,180,18]]);
 const loot=skillGrowthStages(SKILLS.find(sk=>sk.id==='rareSense'));assert.ok(loot[0].effects.includes('장비 드롭 보너스 +5%p'));assert.ok(loot.at(-1).effects.includes('골드 획득 보너스 +8.8%'));
 const study=skillGrowthStages(SKILLS.find(sk=>sk.id==='titanFieldNotes'));assert.match(study[0].effects.join(' '),/모든 보스 승리 시 숙련 ×3/);assert.match(study.at(-1).effects.join(' '),/숙련 ×8/);
});
test('Active descriptions show maximum-resource scaling, statuses and additional hits',()=>{
 const voidLance=skillGrowthStages(SKILLS.find(sk=>sk.id==='voidLance'));assert.match(voidLance[0].effects.join(' '),/최대 마나 × 0.3/);
 const oath=skillGrowthStages(SKILLS.find(sk=>sk.id==='oath'));assert.match(oath[0].effects[0],/물리·마법 공격 중 높은 값/);
 const hush=skillGrowthStages(SKILLS.find(sk=>sk.id==='hushCurrent'));assert.match(hush[0].effects.join(' '),/침묵 2턴/);
 const twin=skillGrowthStages(SKILLS.find(sk=>sk.id==='twinHook'));assert.match(twin[0].effects.join(' '),/추가 공격/);
 for(const sk of SKILLS){const rows=skillGrowthStages(sk);assert.equal(rows.length,maxSkillLevel(sk)+1);assert.ok(rows.every(r=>r.effects.length&&Number.isFinite(r.effective.cost)));}
});

test('Abyss pearls scale with depth and milestone SP is granted once and survives rebirth',()=>{
 const {abyssPearls,ABYSS_SP_MILESTONES}=longTerm;
 assert.deepEqual([1,5,9,10,15,25,50].map(abyssPearls),[1,3,1,6,6,9,18]);
 const clearNext=(s)=>{act(s,{type:'dungeon',id:'abyss'},s.lastTick);let t=s.lastTick;for(let i=0;i<4000&&s.dungeon;i++){t+=2000;advance(s,t,rng);}assert.equal(s.dungeon,null);};
 const s=newState(0);s.level=60;s.rebirths=3;s.permanent.attack=3000;s.permanent.hp=3000;s.permanent.guard=1000;s.abyssBest=9;s.sp=0;s.hp=stats(s).hp;s.mana=stats(s).mana;
 const pearls=s.pearls;clearNext(s);
 assert.equal(s.abyssBest,10);assert.equal(s.pearls-pearls,6);assert.equal(s.sp,1);assert.deepEqual(s.abyssMilestones,[10]);
 s.abyssBest=24;s.hp=stats(s).hp;clearNext(s);assert.equal(s.sp,2);assert.deepEqual(s.abyssMilestones,[10,25]);
 s.abyssMilestones.push(50);s.abyssBest=49;s.hp=stats(s).hp;clearNext(s);assert.equal(s.sp,2,'already-claimed milestone pays nothing');
 s.level=100;act(s,{type:'rebirth'},s.lastTick);assert.deepEqual(s.abyssMilestones,[10,25,50]);
 assert.deepEqual(ABYSS_SP_MILESTONES,[10,25,50,100]);
});

test('Rebirth timing: deep voyage pearls and mastery, tailwind experience',()=>{
 const meta=metaMod;
 const s=newState(0);s.rebirths=6;assert.equal(meta.rebirthLevel(s),60);
 for(const [lv,extra] of [[60,0],[70,2],[80,10],[90,22],[100,40]]){s.level=lv;assert.equal(meta.deepVoyagePearls(s),extra);}
 s.level=65;assert.equal(meta.nextLifeBonus(s),'tailwind');s.level=66;assert.equal(meta.nextLifeBonus(s),null);s.level=100;assert.equal(meta.nextLifeBonus(s),'deep');
 const pearls=s.pearls,expected=meta.rebirthReward(s,stats(s).rebirthBonus||0);act(s,{type:'rebirth'},0);
 assert.equal(s.pearls-pearls,expected);assert.equal(s.lifeBonus,'deep');
 assert.equal(victoryMastery(s,{id:'minnow',boss:false}).amount,2);
 const f=newState(0);f.rebirths=6;f.level=60;act(f,{type:'rebirth'},0);assert.equal(f.lifeBonus,'tailwind');
 const plain=newState(0);plain.rebirths=7;plain.level=f.level;
 assert.ok(Math.abs(expMultiplier(f)/expMultiplier({...f,lifeBonus:null})-1.5)<1e-9);
 f.level=meta.rebirthLevel(f);assert.equal(expMultiplier(f),expMultiplier({...f,lifeBonus:null}),'tailwind ends at the rebirth level');
 assert.equal(victoryMastery(f,{id:'minnow',boss:false}).amount,1);
 const m=newState(0);m.rebirths=6;m.level=80;act(m,{type:'rebirth'},0);assert.equal(m.lifeBonus,null);
});

test('Dungeon repeat runs until its stop condition, then resumes idle fishing',()=>{
 const strong=()=>{const s=newState(0);s.level=60;s.rebirths=3;s.permanent.attack=3000;s.permanent.hp=3000;s.permanent.guard=1000;s.hp=stats(s).hp;s.mana=stats(s).mana;return s;};
 const run=(s,limit=20000)=>{let t=s.lastTick;for(let i=0;i<limit&&s.dungeon;i++){t+=2000;advance(s,t,rng);}};
 const first=[...DUNGEONS].sort((a,b)=>a.level-b.level)[0];
 const s=strong();act(s,{type:'dungeon',id:first.id,value:'5'},0);assert.equal(s.dungeon.repeat.left,4);run(s);
 assert.equal(s.clears[first.id],5);assert.equal(s.dungeon,null);assert.equal(s.running,true,'idle fishing resumes');
 const once=strong();act(once,{type:'dungeon',id:first.id},0);assert.equal(once.dungeon.repeat,undefined);run(once);assert.equal(once.clears[first.id],1);assert.equal(once.running,false,'single run keeps old behaviour');
 const a=strong();a.abyssBest=3;act(a,{type:'dungeon',id:'abyss',value:'deeper:5'},0);assert.equal(a.dungeon.repeat.until,8);run(a);assert.equal(a.abyssBest,8);assert.equal(a.running,true);
 const w=newState(0);w.level=60;w.rebirths=3;w.abyssBest=40;w.hp=stats(w).hp;act(w,{type:'dungeon',id:'abyss',value:'fail'},0);run(w,100000);
 assert.equal(w.dungeon,null);assert.equal(w.abyssBest,40);assert.equal(w.running,true,'failure falls back to fishing');
 assert.throws(()=>act(strong(),{type:'dungeon',id:first.id,value:'0'},0));
});

console.log(`${passed} gameplay tests passed.`);await rm(out,{recursive:true,force:true});

