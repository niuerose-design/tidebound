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
test('115 jobs distribute tier 1 and 2 skills into one or two each',()=>{
 assert.equal(JOBS.length,115);assert.equal(SKILLS.length,186);assert.equal(JOB_TREES.length,6);
 for(const job of JOBS)assert.ok(JOB_TREES.some(t=>t.id===job.tree),job.id);
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
