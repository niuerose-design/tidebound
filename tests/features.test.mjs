// 도감·능력치 추적·항해 기록·회복·장기 목표·능력치 포인트
import { newState, act, tick, victoryHeal, encounterSource, stats, migrateState, assert, rng, test } from './harness.mjs';
test('Codex: crossing several thresholds claims all pending ranks once; claim-all spans species',()=>{
 const s=newState(0),g=s.gold;s.book.minnow=10000;s.book.carp=500;act(s,{type:'claimAllBooks'},0);
 assert.equal(s.bookClaims.minnow,4);assert.equal(s.bookClaims.carp,undefined,'v27.81 ranks without SP have nothing to claim');assert.equal(s.sp,1);assert.equal(s.gold,g,'v27.81 no gold from the codex');
 assert.throws(()=>act(s,{type:'claimAllBooks'},0));assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 // v27.81 SP가 없는 1~3단계만 채운 몬스터는 받을 것이 없습니다(옛 'codex rewards are SP only' 테스트를 합침).
 const t=newState(0);t.book.minnow=9999;assert.throws(()=>act(t,{type:'claimBook',id:'minnow'},0));
});
test('Stat trace: per-source deltas sum to the final value and do not change the result',()=>{
 const s=newState(0);s.level=60;s.rebirths=4;s.attributes.str=40;s.attributes.vit=30;s.attributes.luk=20;s.permanent.hp=5;s.permanent.attack=7;s.permanent.guard=3;s.permanent.gold=2;s.book.minnow=600;
 // v3.38 도감 기여는 지역 연구 1단계 첫 보너스(커닝시티: 체력·공격·방어 +2%)로 확인합니다(지역 몬스터 전부 처치 50회).
 for(const id of ['starKoi','prismRay','voidGuppy','abyssManta','novaManta','ventCrab','glassSquid','sulfurEel','blindShark','cinderAngler','ventLeviathan'])s.book[id]=50;
 s.equipment.rod={id:'t',slot:'rod',rarity:2,power:30,level:20,name:'t',enhance:3};
 const plain=stats(s),trace={},traced=stats(s,trace);assert.deepEqual(traced,plain);
 for(const [k,v] of Object.entries(traced)){const sum=(trace[k]||[]).reduce((a,x)=>a+x.delta,0);assert.ok(Math.abs(sum-v)<1e-6,`${k}: ${sum} vs ${v}`);}
 assert.ok(trace.hp.some(x=>x.source==='research'&&x.factor>1));assert.ok(trace.hp.some(x=>x.source==='rebirth'));assert.ok(trace.attack.some(x=>x.source==='book'));assert.ok(Object.values(trace).flat().some(x=>x.source==='equipment'));
});
test('Stage visits: recorded silently for plain stages only, survive rebirth; tutorial skip grants nothing',()=>{
 const s=newState(0);act(s,{type:'start'},0);tick(s,rng);assert.ok(s.voyage['stage:brook']>=0);assert.equal(s.logs.filter(l=>l.text.includes('항해 기록')).length,0,'v25.13: visits are recorded silently');
 const h=newState(0);h.rebirths=2;h.level=60;act(h,{type:'stage',id:'lithSwarm'},0);act(h,{type:'start'},0);tick(h,rng);assert.equal(h.voyage['stage:lithSwarm'],undefined,'habitats are not plain stages');
 const r=newState(0);r.level=60;r.voyage={'stage:reef':12};const before={sp:r.sp,gold:r.gold};act(r,{type:'tutorial',id:'skip'},0);assert.equal(r.tutorial.skipped,true);assert.equal(r.sp,before.sp);assert.equal(r.gold,before.gold);
 act(r,{type:'rebirth'},0);assert.equal(r.voyage['stage:reef'],12);assert.equal(r.tutorial.skipped,true);
});
test('Recovery v27.8: 20% after a win minus 1%p per sea tier (min 5%), 8% in dungeons; first aid is free at Lv.2 and gives hp regen',()=>{
 const s=newState(0);assert.equal((s.learned.firstAid||0),0);s.level=2;act(s,{type:'sync'},0);assert.equal(s.learned.firstAid,1);assert.equal(s.sp,0);
 s.rebirths=5; // v27.89 환생 5회 미만은 새싹 생존 보조(처치 후 회복 +5%p)가 붙어 기본 규칙은 5회로 봅니다.
 const max=stats(s).hp;s.skills=[];assert.equal(victoryHeal(s),Math.floor(max*.2));const regen0=stats(s).hpRegen;s.skills=['firstAid'];assert.equal(victoryHeal(s),Math.floor(stats(s).hp*.2),'first aid no longer adds victory heal');assert.ok(stats(s).hpRegen>regen0,'first aid gives hp regen');
 s.skills=[];s.tide=10;assert.equal(victoryHeal(s),Math.floor(max*.1));s.tide=30;assert.equal(victoryHeal(s),Math.floor(max*.05),'floor 5%');s.tide=0;
 s.dungeon={id:'grotto',wave:0};assert.equal(victoryHeal(s),Math.floor(max*.08));
 const src=encounterSource.slice(encounterSource.indexOf('function reward('));const end=src.indexOf('\nexport function ');assert.equal(((end<0?src:src.slice(0,end)).match(/victoryHeal\(/g)||[]).length,1);
});
test('removed features: their actions are refused and old saves drop the leftover fields',()=>{
 // v3.37 문 알림 설정(doorNotice) · v3.38 성장 목표(growthGoal)
 for(const a of [{type:'growthGoal',id:'whaler',value:'job'},{type:'doorNotice',value:'off'}])assert.throws(()=>act(newState(0),a,0),/지원하지 않는/,a.type);
 // v3.36 개인 길드 기록 · v3.37 문 알림 끄기 · v3.38 성장 목표 · v3.60 뒤 정리: 무리 규모 선택·생 보너스·애드가드 공개 항목
 const s=newState(0);Object.assign(s,{growthGoal:{kind:'job',id:'whaler'},guild:{name:'',level:3},hideDoorNotice:true,swarm:100,lifeBonus:'tailwind',privacy:{show:['job']}});migrateState(s,0);
 for(const key of ['growthGoal','guild','hideDoorNotice','swarm','lifeBonus','privacy'])assert.equal(key in s,false,key);
});
test('v3.38 AP sources: the breakdown sums to the cap and abyss floors no longer give AP',async()=>{
 const P=await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
 const s=newState(0);s.rebirths=5;s.permanent.ap=3;s.abyssMilestones=[30,60,90];const src=P.apSources(s);
 assert.equal(src.reduce((a,x)=>a+x.value,0),P.apCapacity(s));assert.equal(src.find(x=>x.id==='rebirth').value,5);assert.equal(src.some(x=>/무릉/.test(x.label)),false);
 const t=newState(0);t.abyssMilestones=[30,60,90];assert.equal(P.apCapacity(t),P.apCapacity(newState(0)),'abyss milestones add nothing');
});
test('v3.38 place AP moves to region achievements once: old saves keep their AP; honor steps give titles and skip the achievement bonus',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),P=await L.load('systems/progression'),A=await L.load('data/achievements'),T=await L.load('data/titles'),W=await L.load('data/world');
 const o=newState(0);o.version=8;delete o.placeApMoved;for(const st of W.BASE_STAGES.slice(0,5))for(const id of st.fish)o.book[id]=50;
 migrateState(o,0);assert.equal(o.placeApMoved,true);for(const n of [1,2,3,4,5])assert.equal(o.achievementClaims[`regions:${n}`],true);
 assert.equal(P.apSources(o).find(x=>x.id==='achievement').value>=5,true);assert.equal(P.apSources(o).some(x=>x.id==='places'),false);
 const before=JSON.stringify(o.achievementClaims);migrateState(o,0);assert.equal(JSON.stringify(o.achievementClaims),before,'once');
 assert.equal(A.achievementById('regions:2').honor,true);assert.equal(A.achievementById('regions:4').honor,undefined);
 assert.equal(A.achievementTotals({achievementClaims:{'regions:2':true,'regions:3':true}}).count,0,'honor steps do not raise the bonus');
 assert.ok(T.TITLES.some(t=>t.achievement==='regions:13'));
 const v=newState(0);v.version=8;delete v.placeApMoved;v.rebirths=5;v.achievements={'rebirths:5':50};for(const st of W.BASE_STAGES.slice(0,3))for(const id of st.fish)v.book[id]=50;migrateState(v,0);assert.equal(T.displayTitle({...v,title:undefined}),T.displayTitle({achievements:{'rebirths:5':50},rebirths:5,title:undefined}),'auto title is not replaced by the backfilled honor titles');
});
test('v3.39 news: first look only marks, then onyx/ascension/tier-5/abyss 50s/22-star/general rank make one line each, once a day per kind',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),N=await L.load('systems/news'),R=await L.load('data/rank'),C=await L.load('data/classes'),O=await L.load('data/onyx');
 const s=newState(0);assert.deepEqual(N.collectNews(s,0),[]);assert.ok(s.newsMark);assert.deepEqual(N.collectNews(s,0),[],'nothing new');
 const boss=O.ONYX_BOSSES[0];s.inventory.push({id:'o',slot:'charm',rarity:6,power:1,level:1,name:boss.accessory.name,onyx:boss.id});
 s.ascension=1;s.unlockedJobs.push(C.JOBS.find(j=>j.tier===5).id);s.abyssBest=104;s.inventory.push({id:'x',slot:'rod',rarity:1,power:1,level:1,name:'x',enhance:22});
 const g=R.RANKS.findIndex(r=>r.group==='장성');s.rank={exp:R.RANK_CUMULATIVE[g],perks:{}};
 const ev=N.collectNews(s,0);assert.deepEqual(ev.map(e=>e.kind).sort(),['abyss','ascend','general','onyx','star22','tier5']);
 assert.ok(ev.find(e=>e.kind==='abyss').text('철수').includes('무릉도장 100층'));assert.ok(ev.find(e=>e.kind==='onyx').text('영희').startsWith('영희가 칠흑 장신구'));
 s.abyssBest=150;assert.deepEqual(N.collectNews(s,0),[],'same kind once a day');s.abyssBest=200;assert.equal(N.collectNews(s,86_400_000*2).length,1,'next day again');
 s.abyssBest=0;assert.deepEqual(N.collectNews(s,86_400_000*5),[],'a lower best (after ascension) never announces');
});
test('v3.38 first-clear SP is an achievement; old boss-research claims move over as claimed (no double SP)',()=>{
 const s=newState(0);s.clears.grotto=1;act(s,{type:'sync'},0);assert.ok(s.achievements['firstClear:grotto']!==undefined);const sp=s.sp;act(s,{type:'claimAchievement',id:'firstClear:grotto'},0);assert.equal(s.sp,sp+1);
 assert.throws(()=>act(s,{type:'bossResearch',id:'grotto'},0),/지원하지 않는/);
 const o=newState(0);o.clears.temple=1;o.bossResearchClaims={temple:true};migrateState(o,0);assert.equal(o.achievementClaims['firstClear:temple'],true);assert.equal('bossResearchClaims' in o,false);
 const before=o.sp;act(o,{type:'sync'},0);assert.equal(o.sp,before);
});
test('Stat points: 5 per level, old saves get the difference once, max button spends all',()=>{
 const s=newState(0);assert.equal(s.statRate,5);const old=newState(0);old.level=21;old.statPoints=10;old.attributes.str=70;delete old.statRate;act(old,{type:'pause'},0);assert.equal(old.statPoints,30);assert.equal(old.statRate,5);act(old,{type:'pause'},0);assert.equal(old.statPoints,30);
 act(old,{type:'attribute',id:'vit',value:'max'},0);assert.equal(old.statPoints,0);assert.equal(old.attributes.vit,30);assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'max'},0));assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'7'},0));
});

test('v27.72 tutorial: 13 steps (v3.38), completed steps are recorded and never regress, veterans are backfilled silently', async () => {
    const { TUTORIAL_STEPS, tutorialProgress, tutorialStepDone, nextTutorialStep, syncTutorial } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/guidance');
    // v3.38 환생 전 12단계 + 사냥터 난이도(중후반 8단계는 안내 팁으로).
    assert.equal(TUTORIAL_STEPS.length, 13); assert.deepEqual(TUTORIAL_STEPS.map(x => x.id), ['catch', 'attribute', 'skill', 'stage', 'dungeon', 'job', 'enhance', 'book', 'achievement', 'altar', 'research', 'rebirth', 'tide']);
    const s = newState(0); s.tutorial = { done: {} }; assert.equal(tutorialProgress(s), 1, 'starter skill counts as equipped'); assert.deepEqual(s.tutorial, { done: {} });
    s.clears = { grotto: 1 }; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'dungeon')));
    // 강화한 장비를 팔아도 ‘장비 강화’는 기록으로 남습니다.
    s.inventory.push({ id: 'e1', slot: 'rod', rarity: 0, power: 3, level: 1, name: 'rod', enhance: 1 }); act(s, { type: 'pause' }, 0);
    assert.ok(s.tutorial.done.enhance > 0 && s.tutorial.done.dungeon > 0 && s.tutorial.done.skill > 0, 'met steps are recorded on sync');
    s.inventory = s.inventory.filter(i => i.id !== 'e1'); assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'enhance')), 'selling the enhanced item keeps the step done');
    s.stage = 'bay'; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'stage'))); s.job = 'physical';
    s.altar = { offers: 1 }; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'altar')));
    // 환생하면 환생 전 단계는 모두 완료, 난이도 단계만 남습니다. 기록은 환생 뒤에도 유지됩니다.
    const r = newState(0); r.tutorial = { done: {} }; r.level = 60; act(r, { type: 'rebirth' }, 0); assert.ok(tutorialStepDone(r, TUTORIAL_STEPS.find(x => x.id === 'job')), 'rebirth completes the early steps');
    assert.equal(nextTutorialStep(r).id, 'tide'); assert.equal(tutorialProgress(r), 12); r.tide = 1; act(r, { type: 'pause' }, 0); assert.equal(nextTutorialStep(r), undefined, 'tide is the last step'); r.tide = 0; assert.equal(tutorialProgress(r), 13, 'lowering the tide keeps the step');
    // 개편 전 세이브: 환생 경험이 있으면 모두 채우고(안내 없음), 환생 전이면 지금 조건으로만 채웁니다.
    const vet = newState(0); vet.tutorial = {}; vet.rebirths = 3; syncTutorial(vet); assert.equal(tutorialProgress(vet), 13);
    const fresh = newState(0); fresh.tutorial = {}; fresh.kills = 5; syncTutorial(fresh); assert.deepEqual(Object.keys(fresh.tutorial.done).sort(), ['catch', 'skill']);
    const none = newState(0); delete none.tutorial; syncTutorial(none); assert.equal(none.tutorial, undefined, 'saves without a tutorial object stay without one');
});

test('v26.8 registerItemAll registers one weakest unlocked item per missing slot/rarity and skips locked/relic', () => {
    const s = newState(0);
    s.itemBook = {}; // v3.58 새 세이브는 ‘일반’ 4칸이 미리 등록되어 있어 비우고 시험합니다.
    s.inventory.push({ id: 'r0a', slot: 'rod', rarity: 0, power: 9, level: 1, name: 'strong rod' }, { id: 'r0b', slot: 'rod', rarity: 0, power: 3, level: 1, name: 'weak rod' }, { id: 'c1', slot: 'coat', rarity: 1, power: 5, level: 1, name: 'coat', locked: true }, { id: 'm2', slot: 'charm', rarity: 2, power: 5, level: 1, name: 'relic charm', relic: true }, { id: 'm0', slot: 'charm', rarity: 0, power: 2, level: 1, name: 'charm' });
    act(s, { type: 'registerItemAll' }, 0);
    assert.deepEqual(Object.keys(s.itemBook).sort(), ['charm:0', 'rod:0']); assert.deepEqual(s.inventory.map(x => x.id).sort(), ['c1', 'm2', 'r0a'], 'weakest rod consumed, locked/relic kept');
    assert.throws(() => act(s, { type: 'registerItemAll' }, 0), /미등록 장비가 가방에 없습니다/);
});
