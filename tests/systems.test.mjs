// 세이브·장비·환생·던전·결투·전투 판정·경제·길드
import { newState, act, tick, stats, snapshot, expMultiplier, duel, TRAINING, bossSnapshot, BOSS_OPPONENTS, strike, SKILL_FORMULA as BALANCE_FORMULA, fighterSpeed, migrateState, apCapacity, SKILLS, FISH, DUNGEONS, profile, shopCost, gambleCost, shopPreview, itemStats, enhanceCost, bulkItems, goldMultiplier, dungeonGoldMultiplier, dropRate, hitChance, rebirthLevel, rebirthReward, xpNeeded, assert, rng, test, effectiveSkill, BALANCE } from './harness.mjs';
test('Saves from before v8 restart fresh, keep only the name, and are idempotent',()=>{const s=newState(0);s.version=7;s.name='오래된 모험가';s.level=60;s.gold=99999;s.pearls=500;s.upgrades={attack:30};s.rebirths=4;migrateState(s,5000);const fresh=newState(5000);fresh.name='오래된 모험가';assert.deepEqual(s,fresh);assert.equal(s.version,8);assert.equal(s.upgrades,undefined);const saved=JSON.stringify(s);migrateState(s,9000);assert.equal(JSON.stringify(s),saved);const v1=newState(0);v1.version=1;delete v1.guild;migrateState(v1,0);assert.equal(v1.version,8);assert.ok(v1.guild);});
test('Equipment swapping preserves item counts and sale is single-use',()=>{const s=newState(0);s.inventory.push({id:'test',name:'Test',slot:'rod',rarity:2,power:20,level:1});act(s,{type:'equip',id:'test'},0);assert.equal(s.equipment.rod.id,'test');assert.equal(s.inventory.length,1);act(s,{type:'sell',id:'starter'},0);assert.throws(()=>act(s,{type:'sell',id:'starter'},0));assert.equal(s.inventory.length,0)});
test('Gold training is removed: the upgrade action is rejected and research still costs pearls',()=>{const s=newState(0);const gold=s.gold;assert.throws(()=>act(s,{type:'upgrade',id:'attack'},0));assert.equal(s.gold,gold);assert.equal(s.upgrades,undefined);assert.throws(()=>act(s,{type:'permanent',id:'attack'},0));});
test('Rebirth resets run while preserving permanent progression',()=>{const s=newState(0);s.level=30;s.job='harpoon';s.gold=999;s.book={minnow:50};s.permanent.attack=2;s.pearls=1;s.clears.grotto=1;s.skills=['pierce'];act(s,{type:'rebirth'},100);assert.equal(s.level,1);assert.equal(s.job,'fisher');assert.equal(s.gold,100);assert.equal(s.pearls,4);assert.equal(s.rebirths,1);assert.equal(s.book.minnow,50);assert.equal(s.permanent.attack,2);assert.equal(s.clears.grotto,1);assert.deepEqual(s.skills,['hook']);assert.equal(s.hp,stats(s).hp)});
test('Dungeon completion and first-clear pearl only once',()=>{const s=newState(0);s.level=40;s.permanent.attack=40;s.permanent.hp=40;act(s,{type:'dungeon',id:'grotto'},0);for(let i=0;i<100&&s.running;i++)tick(s,rng);assert.equal(s.clears.grotto,1);assert.equal(s.pearls,3,'first clear 1 + 오늘의 목표(조수의 동굴 1회) 세계석 2');assert.equal(s.dungeon,null);assert.equal(s.running,false);act(s,{type:'dungeon',id:'grotto'},0);for(let i=0;i<100&&s.running;i++)tick(s,rng);assert.equal(s.clears.grotto,2);assert.equal(s.pearls,3)});
test('PvP is isolated from PvE, bounded and deterministic',()=>{const s=newState(0),before=JSON.stringify(s);let fixed=()=>.9;const result=duel(snapshot(s),TRAINING[0],true,fixed);assert.equal(JSON.stringify(s),before);assert.ok(result.turns<=80);assert.equal(result.ratingChange,0);assert.deepEqual(result,duel(snapshot(s),TRAINING[0],true,fixed));assert.ok(result.logs.length>0)});
test('Status-only stun deals no damage, skips enemy actions, and cooldown prevents instant repeated proc',()=>{const st={hp:1000,attack:10,defense:0,crit:0};const a={name:'A',stats:st,hp:1000,skills:['anchor'],cooldowns:{},stun:0},b={name:'B',stats:st,hp:1000,skills:[],cooldowns:{},stun:0};assert.match(strike(a,b,()=>0),/파워 스트라이크/);assert.equal(b.stun,2);assert.equal(b.hp,1000);assert.match(strike(b,a,()=>0),/행동 불가/);assert.equal(a.hp,1000);assert.match(strike(a,b,()=>0),/기본 공격/)});
test('Mana budget, magic defense, accuracy and damage over time',()=>{const cost=effectiveSkill(SKILLS.find(x=>x.id==='arcane'),1).manaCost;assert.ok(cost>0);const make=(extra={})=>({name:'test',stats:{hp:1000,attack:20,magic:100,defense:0,resist:0,crit:0,mana:cost*2,manaRegen:0,...extra},hp:1000,skills:['arcane'],cooldowns:{},stun:0,mana:cost*2,effects:{}});let a=make(),b=make({defense:1000});assert.match(strike(a,b,()=>0),/마법/);assert.equal(b.hp,845);assert.equal(a.mana,cost);a=make();a.mana=0;assert.match(strike(a,make(),()=>0),/기본 공격/);assert.match(strike(make(),make(),()=>.999),/빗나감/);a=make();a.hp=5;a.effects={dot:{damage:10,turns:1,name:'출혈'}};b=make();assert.match(strike(a,b,()=>0),/쓰러짐/);assert.equal(a.hp,0);assert.equal(b.hp,1000);});
test('Silence blocks active skills but keeps basic attacks',()=>{const st={hp:1000,attack:20,magic:100,defense:0,resist:0,crit:0,mana:1000,manaRegen:0};const caster={name:'Caster',stats:st,hp:1000,skills:['hushCurrent'],cooldowns:{},stun:0,mana:1000,effects:{}};const target={name:'Target',stats:st,hp:1000,skills:['splash'],cooldowns:{},stun:0,mana:1000,effects:{}};assert.match(strike(caster,target,()=>0),/침묵 4턴/);assert.equal(target.effects.silence,4);assert.equal(target.hp,1000);const before=caster.hp;const log=strike(target,caster,()=>0);assert.match(log,/침묵 중/);assert.match(log,/기본 공격/);assert.doesNotMatch(log,/물보라/);assert.ok(caster.hp<before);assert.equal(target.cooldowns.splash,undefined);});
test('Slow and haste change round priority without adding actions',()=>{const st={hp:1000,attack:10,defense:0,crit:0,speed:20};const normal={name:'normal',stats:st,hp:1000,skills:[],cooldowns:{},stun:0,effects:{}};const slow={...normal,name:'slow',effects:{slow:3}};const haste={...normal,name:'haste',effects:{haste:3}};assert.ok(fighterSpeed(slow)<fighterSpeed(normal));assert.ok(fighterSpeed(haste)>fighterSpeed(normal));assert.equal(Math.round(fighterSpeed(slow)),13);assert.equal(Math.round(fighterSpeed(haste)),27);});
test('Extra attacks are data-driven and capped',()=>{const st={hp:1000,attack:70,defense:0,crit:0,mana:1000,manaRegen:0};const a={name:'연타자',stats:st,hp:1000,skills:['twinHook'],cooldowns:{},stun:0,mana:1000,effects:{}};const b={name:'표적',stats:st,hp:1000,skills:[],cooldowns:{},stun:0,mana:1000,effects:{}};const log=strike(a,b,()=>0);assert.match(log,/선풍/);assert.match(log,/추가타/);assert.ok(b.hp<900);assert.ok(SKILLS.find(x=>x.id==='tentacleBarrage').extraAttacks<=2);});
test('Economy jobs change rewards without forcing combat stats',()=>{const s=newState(0);s.level=25;s.job='tideSurveyor';s.learned.chartedCurrents=1;s.skills=['hook','chartedCurrents'];const survey=stats(s);assert.ok(survey.dropBonus>=.03);assert.ok(survey.goldBonus>=.04);assert.ok(dropRate(s)>1.2*BALANCE.dropChance&&dropRate(s)<=BALANCE.dropChanceCap);s.job='pearlBroker';s.rebirths=1;s.learned.pearlLedger=1;s.skills=['hook','pearlLedger'];const pearls=stats(s).rebirthBonus;assert.equal(pearls,1);assert.equal(rebirthReward(s,pearls),Math.floor(s.level/10)+s.rebirths+1);s.job='salvageMerchant';s.learned.salvageContract=1;s.skills=['hook','salvageContract'];assert.ok(dungeonGoldMultiplier(s)>1);});
test('Rare fish, dungeon bosses and monster-derived skills are present',()=>{assert.ok(FISH.length>=35);assert.ok(FISH.some(f=>f.rarity==='rare'&&f.spawnWeight&&f.spawnWeight<1));assert.ok(FISH.some(f=>f.boss));assert.ok(DUNGEONS.length>=7);assert.ok(DUNGEONS.every(d=>d.bossFish));assert.ok(profile('grottoWarden').skills.includes('electricBite'));assert.ok(profile('abyssSovereign').skills.includes('tentacleBarrage'));});

test('Shop preview equals purchased item and overspending is rejected',()=>{const s=newState(0);const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'buy',id:'magic'},0));assert.equal(JSON.stringify(s),before);s.gold=10000;const expected=itemStats(shopPreview(s,'magic')),cost=shopCost(s);act(s,{type:'buy',id:'magic'},0);assert.deepEqual(itemStats(s.inventory[0]),expected);assert.equal(s.gold,10000-cost);assert.ok(expected.magic>expected.attack);const id=s.inventory[0].id;act(s,{type:'equip',id},0);assert.equal(s.equipment.rod.id,id);});
test('Appraisal probability boundaries and full bag rejection',()=>{for(const [roll,rarity] of [[0,1],[.549,1],[.55,2],[.879,2],[.88,3],[.969,3],[.97,4],[.994,4],[.995,5],[.998,5],[.999,6]]){const s=newState(0);s.gold=10000;const cost=gambleCost(s);act(s,{type:'gamble',id:'physical'},0,()=>roll);assert.equal(s.inventory[0].rarity,rarity);assert.equal(s.inventory[0].affixes.length,rarity,'options = rarity');assert.equal(s.gold,10000-cost);}const s=newState(0);s.gold=9999;s.inventory=Array.from({length:60},(_,i)=>({...shopPreview(s,'coat'),id:String(i)}));const old=s.gold;assert.throws(()=>act(s,{type:'buy',id:'coat'},0));assert.equal(s.gold,old);});
test('Equipment enhancement changes real stats and caps at ten',()=>{const s=newState(0);s.gold=1e9;const item=s.equipment.rod;const cost=enhanceCost(item),before=itemStats(item).attack;act(s,{type:'enhance',id:item.id},0);assert.equal(s.gold,1e9-cost);assert.ok(Math.abs(itemStats(item).attack-before*1.1)<1e-8);for(let i=1;i<10;i++)act(s,{type:'enhance',id:item.id},0);const gold=s.gold;assert.throws(()=>act(s,{type:'enhance',id:item.id},0));assert.equal(s.gold,gold);});
test('Bulk sale respects exact rarity, locks and relics',()=>{const s=newState(0);s.inventory=[{...shopPreview(s,'coat'),id:'a'},{...shopPreview(s,'coat'),id:'b',locked:true},{...shopPreview(s,'coat'),id:'c',relic:'test'},{...shopPreview(s,'coat'),id:'d',rarity:2}];assert.equal(bulkItems(s,1).length,1);const gold=s.gold;act(s,{type:'sellRarity',id:'1'},0);assert.equal(s.gold,gold+42,'v25.7 sale: Lv.1 rare = 6 fish × 7 G');assert.deepEqual(s.inventory.map(i=>i.id),['b','c','d']);assert.throws(()=>act(s,{type:'sell',id:'b'},0));assert.throws(()=>act(s,{type:'registerItem',id:'c'},0));});
test('Rebirth unlocks, research and relic persistence',()=>{const s=newState(0);s.pearls=100;s.level=30;assert.throws(()=>act(s,{type:'buyRelic',id:'memoryRod'},0));act(s,{type:'rebirth'},0);assert.equal(apCapacity(s),7);assert.equal(rebirthLevel(s),35);/* v27.89 환생 1회 새싹의 축복 ×2.8 */assert.ok(Math.abs(expMultiplier({...s,lifeBonus:null})-1.25*2.8)<1e-9);assert.ok(Math.abs(expMultiplier(s)-1.875*2.8)<1e-9);act(s,{type:'permanent',id:'ap'},0);assert.equal(apCapacity(s),8);act(s,{type:'buyRelic',id:'memoryRod'},0);const relic=s.inventory[0];act(s,{type:'equip',id:relic.id},0);s.gold=10000;act(s,{type:'enhance',id:relic.id},0);s.permanent.starting=2;s.level=35;act(s,{type:'rebirth'},0);assert.equal(s.equipment.rod.relic,'memoryRod');assert.equal(s.equipment.rod.enhance,1);assert.equal(s.gold,100);assert.equal(s.level,5,'v27.60 legacy rank 2 starts at Lv.5');assert.equal(s.statPoints,newState(0).statPoints+20,'4 levels of stat points');assert.equal(apCapacity(s),9);assert.throws(()=>act(s,{type:'buyRelic',id:'memoryRod'},0));s.level=100;s.rebirths=100;assert.equal(rebirthLevel(s),100);s.rebirths=46;assert.equal(rebirthLevel(s),100);s.rebirths=40;assert.equal(rebirthLevel(s),94);assert.ok(xpNeeded(60)<xpNeeded(30)*5);});
test('Rebirth skills still require their job; temple relic and research caps work',()=>{
 const s=newState(0);s.level=30;s.sp=100;s.pearls=1000;assert.throws(()=>act(s,{type:'learn',id:'soulHook'},0));s.rebirths=1;assert.throws(()=>act(s,{type:'learn',id:'soulHook'},0));
 s.attributes.str=20;s.attributes.wis=20;s.rebirthDoor='rebirthFisher';act(s,{type:'job',id:'rebirthFisher'},0);assert.equal(s.learned.soulHook,1);assert.equal(s.sp,100);
 s.clears.temple=1;act(s,{type:'sync'},0);const pearls=s.pearls;act(s,{type:'buyRelic',id:'memoryRod'},0);assert.equal(s.pearls,pearls);s.permanent.ap=12;assert.throws(()=>act(s,{type:'permanent',id:'ap'},0));assert.equal(s.pearls,pearls);
});
test('Gold and experience multipliers match actual combat payouts',()=>{const s=newState(0);s.rebirths=2;s.permanent.gold=2;s.permanent.exp=1;s.level=20;s.running=true;s.enemy={id:'minnow',name:'target',hp:1,maxHp:1,attack:0,defense:0,exp:10,gold:100,boss:false,stun:0};const gold=s.gold,exp=s.exp,mult=goldMultiplier(s);tick(s,()=>.5);assert.equal(s.gold-gold,Math.floor(100*mult));assert.equal(s.exp-exp,Math.floor(10*1.7*2.6),'v27.89 환생 2회 새싹의 축복 ×2.6');assert.ok(s.logs.some(l=>l.text.includes(`+${Math.floor(100*mult)} G`)));});
test('Tide scaling and endless depths advance only on full clear',()=>{const s=newState(0);assert.throws(()=>act(s,{type:'tide',id:'1'},0));s.rebirths=3;act(s,{type:'tide',id:'2'},0);s.running=true;tick(s,()=>.5);assert.ok(s.enemy.maxHp>50);s.level=100;s.permanent.attack=400000;s.permanent.hp=400000;act(s,{type:'dungeon',id:'abyss'},0);assert.equal(s.dungeon.depth,1);assert.throws(()=>act(s,{type:'tide',id:'1'},0));for(let i=0;i<20&&s.running;i++)tick(s,()=>.5);assert.equal(s.abyssBest,1);assert.equal(s.pearls,1);act(s,{type:'dungeon',id:'abyss'},0);assert.equal(s.dungeon.depth,2);act(s,{type:'leaveDungeon'},0);assert.equal(s.abyssBest,1);assert.equal(s.pearls,1);act(s,{type:'dungeon',id:'abyss'},0);for(let i=0;i<20&&s.running;i++)tick(s,()=>.5);assert.equal(s.abyssBest,2);assert.equal(s.pearls,2);});
test('Accuracy and evasion use the displayed formula',()=>{assert.ok(Math.abs(hitChance({accuracy:.94},{evasion:.14})-.8)<1e-9);assert.ok(Math.abs(hitChance({accuracy:.94},{evasion:.24})-.7)<1e-9);assert.equal(hitChance({accuracy:2},{evasion:0}),.995);assert.equal(hitChance({accuracy:.1},{evasion:.8}),.01);});
test('v25.11 guild: single-player guild actions are retired, old records stay and grant nothing, ranking shows the shared guild name',()=>{const s=newState(0);s.gold=10000;s.level=20;for(const type of ['guildJoin','guildRename','guildDonate'])assert.throws(()=>act(s,{type,id:'1000',value:'파도연합'},0),/길드 화면/);assert.equal(s.gold,10000);const noGold=x=>JSON.stringify({...x,goldPower:0}),before=noGold(stats(s));s.guild.name='푸른파도';s.guild.level=20;s.guild.contribution=190000;s.guild.research={might:10,bastion:10,treasury:10,scouting:10};assert.equal(noGold(stats(s)),before,'old guild records grant nothing');for(const type of ['guildResearch','guildClaim','guildRaid'])assert.throws(()=>act(s,{type,id:'might'},0));assert.equal(snapshot(s).guild,'','legacy name is not the shared guild');s.guildMember={id:'g1',name:'심해개척단',leader:true,syncedAt:0};assert.equal(snapshot(s).guild,'심해개척단');s.level=30;const saved=JSON.stringify(s.guild);act(s,{type:'rebirth'},0);assert.equal(JSON.stringify(s.guild),saved);assert.equal(s.guildMember.name,'심해개척단','membership cache survives rebirth');});
test('v24 monsters can land critical hits; bosses and swift predators crit more', async () => {
 const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();
 const { enemyStats } = await load('data/encounters'); const { MONSTER_TUNING } = await load('data/balance');
 const carp = FISH.find(f => f.id === 'carp'), minnow = FISH.find(f => f.id === 'minnow');
 const normal = enemyStats(carp), boss = enemyStats(carp, true), swift = enemyStats(minnow);
 assert.ok(normal.crit >= MONSTER_TUNING.critBase); assert.ok(boss.crit > normal.crit); assert.ok(swift.crit > enemyStats({ ...minnow, id: 'carp' }).crit);
 for (const f of FISH) assert.ok(enemyStats(f).crit <= MONSTER_TUNING.critCap + MONSTER_TUNING.critSwift + 1e-9, f.id);
 // 몬스터의 치명타도 전투에서 실제로 터집니다.
 const st = { hp: 1000, attack: 100, defense: 0, crit: 1 }, a = { name: 'foe', stats: st, hp: 1000, skills: [], cooldowns: {}, stun: 0 }, b = { name: 'me', stats: { ...st, crit: 0 }, hp: 1000, skills: [], cooldowns: {}, stun: 0 };
 assert.match(strike(a, b, () => 0), /치명타/);
});

test('v24.1 a status already on the target is not re-applied: the skill is skipped for the next one', () => {
 const st = { hp: 1000, attack: 50, magic: 50, defense: 0, resist: 0, crit: 0, mana: 1000, manaRegen: 0, accuracy: 5 };
 const a = { name: 'A', stats: st, hp: 1000, mana: 1000, skills: ['meteor', 'hook'], cooldowns: {}, stun: 0, effects: {}, ranks: { meteor: 1, hook: 1 } };
 const b = { name: 'B', stats: st, hp: 1000, skills: [], cooldowns: {}, stun: 2, effects: {} };
 const log = strike(a, b, () => 0); assert.doesNotMatch(log, /블레이징 익스팅션/); assert.match(log, /달팽이 세마리/);
});
test('v24.1 immunity: after a stun wears off the target cannot be stunned again for a while', () => {
 const st = { hp: 1e6, attack: 10, defense: 0, crit: 0, accuracy: 5, mana: 1000, manaRegen: 0 };
 const a = { name: 'A', stats: st, hp: 1e6, mana: 1000, skills: ['meteor'], cooldowns: {}, stun: 0, effects: {}, ranks: { meteor: 1 } };
 const b = { name: 'B', stats: st, hp: 1e6, skills: [], cooldowns: {}, stun: 1, effects: {} };
 strike(b, a, () => 0); assert.equal(b.stun, 0); assert.equal(b.effects.immune.stun, 2, 'stun ends → immune');
 const log = strike(a, b, () => 0); assert.match(log, /기절 면역/); assert.equal(b.stun, 0, 'damage lands, stun does not');
 strike(b, a, () => 0); assert.equal(b.effects.immune.stun, 1); strike(b, a, () => 0); assert.equal(b.effects.immune, undefined, 'immunity expires');
 // 상태이상 전용 기술은 면역 중인 상대에게 쓰지 않습니다.
 const c = { name: 'C', stats: st, hp: 1e6, mana: 1000, skills: ['anchor'], cooldowns: {}, stun: 0, effects: {}, ranks: { anchor: 1 } };
 const d = { name: 'D', stats: st, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: { immune: { stun: 1 } } };
 assert.doesNotMatch(strike(c, d, () => 0), /물보라/);
});
test('HP regen: constitution adds per-action HP recovery that never exceeds max HP', () => {
    const s = newState(0); const before = stats(s).hpRegen; s.attributes.vit += 10;
    assert.equal(stats(s).hpRegen, before + 3, '체질 1마다 +0.3, 소수점 버림');
    const st = { hp: 1000, attack: 0, magic: 0, defense: 0, resist: 0, crit: 0, mana: 100, manaRegen: 0, hpRegen: 50 };
    const a = { name: 'A', stats: st, hp: 100, skills: [], cooldowns: {}, stun: 0, mana: 100, effects: {} };
    const b = { name: 'B', stats: { ...st, hpRegen: 0 }, hp: 1000, skills: [], cooldowns: {}, stun: 0, mana: 100, effects: {} };
    const events = []; strike(a, b, () => 0, events); assert.equal(a.hp, 150); assert.equal(events[0].regen, 50);
    a.hp = 980; strike(a, b, () => 0); assert.equal(a.hp, 1000, 'capped at max HP');
    const bHp = b.hp; strike(b, a, () => 0); assert.equal(b.hp, bHp, 'no regen without the stat');
});
test('Training opponents: dungeon bosses fight with their dungeon stats and enemy skills, never touching rating or state', () => {
    assert.ok(BOSS_OPPONENTS.length >= 5 && BOSS_OPPONENTS.every(f => f.boss));
    const boss = bossSnapshot('grottoWarden'); assert.ok(boss); assert.equal(boss.job, 'boss'); assert.ok(boss.stats.hp > 1000 && boss.skills.length > 0 && boss.power > 0);
    assert.equal(bossSnapshot('minnow'), null, 'only bosses');
    const s = newState(0); s.level = 30; s.attributes.str = 60; s.attributes.vit = 40; const before = JSON.stringify(s);
    let seed = 3; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const r = duel(snapshot(s), boss, true, rng);
    assert.equal(r.training, true); assert.equal(r.ratingChange, 0); assert.equal(r.opponent, boss.name); assert.ok(r.turns > 0 && r.logs.length > 0);
    assert.equal(JSON.stringify(s), before, 'training never changes the save');
});
test('Logs carry the turn they were written in and duels return structured rounds alongside text', () => {
    const s = newState(0); s.running = true; let seed = 5; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 6; i++) tick(s, rng);
    const battle = s.logs.filter(l => l.type === 'battle'); assert.ok(battle.length >= 2);
    assert.ok(battle.every(l => Number.isInteger(l.turn) && l.turn >= 1 && l.turn <= s.turn), 'every battle log has its turn');
    const r = duel(snapshot(s), TRAINING[0], true, () => .3);
    assert.equal(r.rounds.length, r.logs.length); assert.ok(r.rounds.every((x, i) => r.logs[i].startsWith(`${x.turn}턴 · `) && x.event.actor));
});
test('v25.2 arcane fish strike with magic damage against resist; magic jobs gain an arcane strike ratio by tier', () => {
    const st = { hp: 1000, attack: 100, magic: 200, defense: 0, resist: 0, crit: 0, mana: 100, manaRegen: 0, accuracy: 5, evasion: 0 };
    const target = () => ({ name: 'T', stats: { ...st, defense: 100, resist: 0 }, hp: 1000, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 100 });
    const physical = { name: 'fish', stats: st, hp: 1000, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 100 }, arcane = { ...physical, magicBasic: true };
    const a = target(), b = target(); const evs = [];
    strike(physical, a, () => .5); strike(arcane, b, () => .5, evs);
    assert.equal(a.hp, 1000 - Math.round(100 * 100 / 300), 'physical basic vs defense');
    assert.equal(b.hp, 1000 - 200, 'arcane basic uses the magic stat and ignores physical defense'); assert.equal(evs[0].damageType, 'magic');
    assert.ok(profile('starKoi').magicBasic && !profile('shark').magicBasic);
    const s = newState(0); s.level = 60; s.job = 'sage'; s.unlockedJobs = ['fisher', 'sage'];
    assert.equal(stats(s).arcaneRatioBonus, BALANCE_FORMULA.arcaneRatioByTier[4]); s.job = 'harpoon'; assert.equal(stats(s).arcaneRatioBonus, 0, 'physical jobs get none');
});

test('v27 tidal fish deal split basic attacks (half physical, half magic defense) and enemy skills cover all damage types', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { profile, ENEMY_SKILLS } = await mods.load('data/encounters'); const { strike } = await mods.load('systems/combat');
    assert.ok(profile('perch').splitBasic && !profile('carp').splitBasic);
    assert.deepEqual(['physical', 'magic', 'split'].map(t => ENEMY_SKILLS.some(sk => (sk.damageType || 'physical') === t && !sk.statusOnly)), [true, true, true]);
    const st = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 100, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const foe = (extra) => ({ name: 'fish', stats: st, hp: 1000, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 100, ...extra });
    const armoredOnly = (hp) => ({ name: 'p', stats: { ...st, defense: 200, resist: 0 }, hp, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const a = armoredOnly(1e6), b = armoredOnly(1e6); const r = () => 0;
    strike(foe({}), a, r); strike(foe({ splitBasic: true }), b, r);
    const physicalDamage = 1e6 - a.hp, splitDamage = 1e6 - b.hp;
    assert.ok(splitDamage > physicalDamage * 2, `split basic ignores half of the physical-only defense: ${splitDamage} vs ${physicalDamage}`);
});
