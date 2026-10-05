// 숙련·계승·AP·직업 숙련·경험치 배율·보스 기술
import { newState, act, tick, stats, snapshot, expMultiplier, normalizeStats, victoryMastery, duel, TRAINING, combatFxFromLog, combatFxBatch, apCapacity, apUsed, canUse, effectiveSkill, skillRankDeltas, skillMasteryLevel, masteryMilestonesFor, validLoadout, skillLevel, maxSkillLevel, inherited, trimLoadout, SKILLS, FISH, hitChance, xpNeeded, JOBS, JOB_TREES, assert, test } from './harness.mjs';
test('SP and mastery reach identical growth levels, never stacking or locking',()=>{
 const sk=SKILLS.find(x=>x.id==='pierce');assert.equal(effectiveSkill(sk,1).cost,4);
 assert.deepEqual(effectiveSkill(sk,3,0),effectiveSkill(sk,1,2));assert.deepEqual(effectiveSkill(sk,3,2),effectiveSkill(sk,1,2));
 assert.deepEqual(effectiveSkill(sk,3,3),effectiveSkill(sk,1,3));assert.equal(skillLevel(sk,3,3),3);
 assert.ok(skillRankDeltas(sk,1).some(x=>x.label==='장착 AP'&&x.to==='AP 3'));
 const s=newState(0);s.level=25;s.job='harpoon';s.learned.pierce=1;s.skillPractice.pierce=sk.masteryMilestones[1];s.sp=4;
 act(s,{type:'learn',id:'pierce'},0);assert.equal(s.sp,3);assert.equal(skillLevel(sk,s.learned.pierce,2),3);
 s.skillPractice.pierce=sk.masteryMilestones[3];assert.equal(skillLevel(sk,s.learned.pierce,4),4);assert.throws(()=>act(s,{type:'learn',id:'pierce'},0));
});
test('222 jobs distribute tier 1 and 2 skills into one or two each',()=>{
 assert.equal(JOBS.length,260);assert.equal(SKILLS.length,510);assert.equal(JOB_TREES.length,7);
 for(const job of JOBS)assert.ok(JOB_TREES.some(t=>t.id===job.tree),job.id);
 for(const job of JOBS.filter(j=>(j.tier===1||j.tier===2)&&!j.fullKit)){
  const owned=SKILLS.filter(sk=>sk.job===job.id&&!sk.song);assert.ok(owned.length>=1&&owned.length<=2,job.id+': '+owned.length);
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
test('Bone growth boundaries flip penalties and AP exactly at 2500/25000/125000 wins',()=>{
 const bone=SKILLS.find(sk=>sk.id==='boneLegacy');assert.deepEqual(masteryMilestonesFor(bone),[2500,25000,125000]);
 for(const [wins,lv,cost] of [[0,0,6],[2499,0,6],[2500,1,6],[24999,1,6],[25000,2,2],[124999,2,2],[125000,3,-3]]){
  const natural=skillMasteryLevel(wins,bone.masteryMilestones);assert.equal(natural,lv);
  const fx=effectiveSkill(bone,1,natural);assert.equal(fx.cost,cost);if(lv<2)assert.ok(fx.bonus.hp<0&&fx.bonus.defense<0);else assert.ok(fx.bonus.hp>0&&fx.bonus.defense>0);
 }
 assert.deepEqual(effectiveSkill(bone,4,0),effectiveSkill(bone,1,3));assert.equal(maxSkillLevel(bone),3);
});
test('Negative AP works independent of priority and cannot be removed to overflow AP',()=>{
 const s=newState(0);s.level=30;s.learned={hook:1,pierce:1,focus:1,boneLegacy:1};s.skillInheritances={pierce:true,focus:true};s.skillPractice.boneLegacy=125000;
 s.skills=['hook','pierce','focus','boneLegacy'];assert.equal(apUsed(s),5);assert.equal(validLoadout(s,s.skills),true);
 trimLoadout(s);assert.equal(s.skills.length,4);assert.throws(()=>act(s,{type:'skill',id:'boneLegacy'},0));assert.equal(s.skills.length,4);
 act(s,{type:'skill',id:'pierce'},0);act(s,{type:'skill',id:'boneLegacy'},0);assert.ok(apUsed(s)<=apCapacity(s));
});
test('SP inheritance, growth and practice survive reincarnation',()=>{
 const s=newState(0);s.level=30;s.learned.pierce=3;s.skillSpent.pierce=3;s.skillInheritances.pierce=true;s.skillPractice.pierce=100;s.sp=2;
 act(s,{type:'rebirth'},1);assert.equal(s.skillInheritances.pierce,true);assert.equal(s.learned.pierce,3);assert.equal(s.skillPractice.pierce,100);assert.equal(s.sp,2);
 assert.equal(s.level,1);assert.equal(canUse(s,'pierce'),true,'inherited skills ignore the level requirement after rebirth');
});
test('Level ups grant native skills but no SP',()=>{
 const s=newState(0);s.running=true;s.exp=xpNeeded(1)+xpNeeded(2);s.enemy={id:'minnow',name:'target',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};
 tick(s,()=>.5);assert.equal(s.level,3);assert.equal(s.sp,0);assert.equal(s.learned.splash,undefined,'v26.1 물보라 삭제');
});
test('Combat feedback preserves both actors, healing target and follow-up misses',()=>{
 const logs=[
 {id:10,type:'battle',text:'나 · 선풍 [치명타] → 150 물리 피해 · 20 회복 · 추가타 50 · 추가타 2 빗나감'},
 {id:11,type:'battle',text:'몬스터 · 기본 공격 → 8 물리 피해 · 침묵 중'},
 {id:12,type:'battle',text:'나: 기절로 행동 불가.'}];
 const batch=combatFxBatch(logs,9,'나');assert.equal(batch.length,3);assert.deepEqual(batch.map(f=>f.actor),['player','enemy','player']);
 assert.deepEqual(batch[0].hits.map(h=>h.value),[100,50,0]);assert.equal(batch[0].kind,'physical');assert.equal(batch[0].target,'enemy');assert.equal(batch[0].healing,20);assert.equal(batch[0].hits[0].critical,true);
 assert.equal(batch[1].basic,true);assert.equal(batch[1].kind,'physical');assert.equal(batch[2].target,'player');assert.equal(batch[2].kind,'stun');assert.ok(batch[1].delay>batch[0].delay);
 assert.equal(combatFxBatch(logs,12,'나').length,0);assert.equal(combatFxBatch(Array.from({length:80},(_,i)=>({...logs[1],id:i})),0,'나').length,6);
 const heal=combatFxFromLog({id:90,type:'battle',text:'나 · 마나 리커버리 → 80 마법 피해 · 25 회복'},'나');assert.equal(heal.target,'enemy');assert.equal(heal.healing,25);
});
test('PvP snapshots use the same purchased or mastered active levels',()=>{
 const s=newState(0);s.level=25;s.learned.hook=3;s.skills=['hook'];const paid=snapshot(s);
 s.learned.hook=1;s.skillPractice.hook=masteryMilestonesFor(SKILLS.find(sk=>sk.id==='hook'))[1];const practiced=snapshot(s);
 assert.deepEqual(paid.stats,practiced.stats);assert.deepEqual(duel(paid,TRAINING[0],true,()=>.1),duel(practiced,TRAINING[0],true,()=>.1));
});

test('Experience bonus is additive, visible and included only for usable equipped skills',()=>{
 const s=newState(0);s.level=25;s.job='voyageScribe';s.rebirths=2;s.permanent.exp=3;s.learned.voyageReview=1;s.skills=['voyageReview'];
 assert.ok(Math.abs(stats(s).expBonus-1.21)<1e-9);/* v27.89 새싹 ×2.6 제외 */assert.ok(Math.abs(expMultiplier(s)/2.6-2.21)<1e-9);
 s.skills=[];assert.ok(Math.abs(expMultiplier(s)/2.6-2.13)<1e-9);
 s.job='fisher';s.skills=['voyageReview'];assert.ok(Math.abs(expMultiplier(s)/2.6-2.1)<1e-9);
 s.skillInheritances.voyageReview=true;assert.ok(Math.abs(expMultiplier(s)/2.6-2.18)<1e-9);
 assert.equal(normalizeStats({hp:1,attack:1,defense:0,crit:0}).expBonus,0);
});
test('Experience payout uses the same bonus displayed on the character',()=>{
 const s=newState(0);s.level=25;s.job='voyageScribe';s.learned.voyageReview=1;s.skills=['voyageReview'];s.running=true;s.hp=stats(s).hp;
 s.enemy={id:'minnow',name:'test',hp:1,maxHp:1,attack:0,defense:0,exp:100,gold:1,boss:false,stun:0};
 const expected=Math.floor(100*expMultiplier(s));tick(s,()=>.5);assert.equal(s.exp,expected);assert.equal(expected,333,'111 × 새싹의 축복 ×3(환생 0회)');
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

test('Bone mastery relieves only the current job\'s negative multipliers',()=>{
 const jobHpFactor=st=>{const trace={};stats(st,trace);return (trace.hp||[]).filter(t=>t.source==='job'&&t.factor!==undefined).reduce((x,t)=>x*t.factor,1);};
 const s=newState(0);s.level=40;s.job='skeleton';s.learned.boneLegacy=1;s.skills=['boneLegacy'];
 const hp=JOBS.find(j=>j.id==='skeleton').hp;assert.ok(hp<1);
 for(const [wins,relief] of [[0,0],[2500,.15],[25000,.5],[125000,1]]){s.skillPractice.boneLegacy=wins;assert.ok(Math.abs(jobHpFactor(s)-(1-(1-hp)*(1-relief)))<1e-9,String(wins));}
 // 장착하지 않으면 숙련만으로는 회복하지 않습니다.
 s.skills=[];assert.ok(Math.abs(jobHpFactor(s)-hp)<1e-9);
});

test('v24 per-rebirth passives grow with rebirths up to the cap', () => {
 const s = newState(0); s.level = 60; s.job = 'samsaraArchivist'; s.learned.karmaRecord = 1; s.skills = ['karmaRecord'];
 // 환생 기억 배율도 환생마다 커지므로 스킬에서 온 마법 공격만 비교합니다.
 const at = n => { s.rebirths = n; const trace = {}; stats(s, trace); return (trace.magic || []).filter(t => t.source === 'skills').reduce((x, t) => x + t.delta, 0); };
 const r0 = at(0), r10 = at(10), r30 = at(30), r60 = at(60);
 assert.ok(r10 > r0 && r30 > r10); assert.equal(r60, r30, 'rebirths beyond the cap add nothing');
});

test('v24 late-bloomer passives start expensive and pay off at 10k/100k/500k mastery (v27.95 5th-tier x25)', () => {
 const sk = SKILLS.find(x => x.id === 'abyssalPatience');
 assert.deepEqual(masteryMilestonesFor(sk), [10000, 100000, 500000].map(n => n * 25));
 const costs = [0, 1, 2, 3].map(lv => effectiveSkill(sk, 1, lv).cost), atk = [0, 1, 2, 3].map(lv => effectiveSkill(sk, 1, lv).bonus.attack);
 assert.deepEqual(costs, [8, 7, 5, 2]);
 for (let i = 1; i < 4; i++) assert.ok(atk[i] > atk[i - 1] * 1.8, `level ${i} pays off`);
 for (const id of ['abyssalPatience', 'tideOfAges', 'reefOfEons', 'aeonsInsight']) assert.equal(maxSkillLevel(SKILLS.find(x => x.id === id)), 3, id);
});

const STATUS_TUNING_CAPS = (await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/balance')).STATUS_TUNING.earlyStatusMultiplierCap;
test('v24.1 status rules: support skills are status-only; early damage+stun/silence skills are multiplier-capped', () => {
 for (const sk of SKILLS.filter(x => x.statusOnly && !x.restoreAll)) assert.ok(sk.statusTurns > 0 && sk.chance <= .3 && sk.cooldown >= sk.statusTurns, sk.id);
 const caps = STATUS_TUNING_CAPS;
 for (const sk of SKILLS.filter(x => x.type === 'active' && !x.statusOnly && caps[x.effect] !== undefined)) {
  const tier = JOBS.find(j => j.id === sk.job)?.tier ?? 0;
  if (tier <= 2) assert.ok(sk.multiplier <= caps[sk.effect] + 1e-9, `${sk.id} ×${sk.multiplier}`);
 }
 assert.equal(SKILLS.find(x => x.id === 'wave').effect, 'stun'); assert.ok(SKILLS.find(x => x.id === 'wave').multiplier <= caps.stun);
 assert.equal(SKILLS.find(x => x.id === 'meteor').effect, 'stun'); assert.ok(SKILLS.find(x => x.id === 'meteor').multiplier > caps.stun, 'tier 3 keeps its damage');
});

test('v24 loadout priority moves only among skills of the same type', () => {
 const s = newState(0); s.skills = ['hook', 'focus', 'breath', 'pierce'];
 act(s, { type: 'skillUp', id: 'breath' }, 0); assert.deepEqual(s.skills, ['breath', 'focus', 'hook', 'pierce'], 'active jumps over the passive to the previous active');
 act(s, { type: 'skillUp', id: 'breath' }, 0); assert.deepEqual(s.skills, ['breath', 'focus', 'hook', 'pierce'], 'first active stays first');
});

const H95 = await import('./harness.mjs');
test('v27.95 mastery inflation: tier 3+ job/skill requirements scale up, tier 1-2 stay, old inheritance is kept', () => {
 const { JOBS: J, PROGRESSION: P, jobMasteryTarget: target, masteryMilestonesFor: ms, inherited: inh, migrateState: migrate, newState: fresh, act: doAct } = H95;
 assert.deepEqual(P.jobMasteryTierScale, [1, 1, 1, 3, 15, 50]); assert.deepEqual(P.skillMasteryTierScale, [1, 1, 1, 3, 10, 25]);
 assert.equal(target('harpoon'), 180, 'tier 1 unchanged'); assert.equal(target('whaler'), 1200, 'tier 2 unchanged'); assert.equal(target('krakenSlayer'), 27000, 'tier 3 x3');
 for (const j of J.filter(j => j.tier === 4)) assert.ok([300000, 450000].includes(target(j)), j.id);
 for (const j of J.filter(j => j.tier === 5)) { assert.equal(target(j), 1500000, j.id); if (j.parent) assert.ok(j.mastery >= target(j.parent), `${j.id} needs the parent mastered`); }
 const t5 = SKILLS.find(x => J.find(j => j.id === x.job)?.tier === 5 && ms(x).length === 4);
 assert.deepEqual(ms(t5), [4000, 18000, 60000, 150000].map(n => n * 25));
 // 옛 기준(4,000)은 넘겼지만 새 기준(100,000)에 못 미친 스킬은 계승을 유지하고, 그보다 낮은 스킬은 새 기준을 따릅니다.
 const low = SKILLS.find(x => x !== t5 && J.find(j => j.id === x.job)?.tier === 5 && ms(x)[0] === 100000);
 const s = fresh(0); delete s.masteryRescaled; s.skillPractice = { [t5.id]: 5000, [low.id]: 3000 };
 assert.ok(!inh(s, t5.id)); migrate(s); assert.ok(inh(s, t5.id), 'kept'); assert.ok(!inh(s, low.id), 'below the old bar');
 const again = s.logs.length; migrate(s); assert.equal(s.logs.length, again, 'runs once');
 s.level = 30; doAct(s, { type: 'rebirth' }, 0); assert.ok(inh(s, t5.id), 'survives rebirth');
 const n = fresh(0); n.skillPractice = { [t5.id]: 5000 }; migrate(n); assert.ok(!inh(n, t5.id), 'new saves use the new bar');
});

test('v3.5 skill simple view: growth passives show their current count/rebirth stats and list the rules under 기타', () => {
 const { passiveGrowthBonus: growth, skillExtraNotes: notes, newState: fresh } = H95;
 const sk = SKILLS.find(x => x.id === 'voyageReview'), s = fresh(0);
 assert.deepEqual(growth(s, sk), {}, 'no kills yet');
 s.book = { [H95.FISH[0].id]: 1e6 }; s.job = sk.job; s.learned[sk.id] = 1;
 const g = growth(s, sk); assert.ok(g.attack > 0 && g.magic > 0, JSON.stringify(g));
 // 처치 500마다 +1, 최대 10회(능력치 계산 stats.ts와 같은 식).
 assert.deepEqual(g, { attack: 10, magic: 10 });
 assert.equal(notes(sk).length, 1); assert.match(notes(sk)[0], /누적 처치 500마다/);
 assert.match(notes(SKILLS.find(x => x.id === 'chronicleStudy'))[0], /^환생마다/, 'per 1 reads as 마다');
 assert.deepEqual(notes(SKILLS.find(x => x.type === 'active')), []);
});
