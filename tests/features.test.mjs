// 도감·능력치 추적·항해 기록·회복·장기 목표·능력치 포인트
import { newState, act, tick, victoryHeal, encounterSource, stats, goalProgress, goalSuggestions, DUNGEONS, JOBS, assert, rng, test } from './harness.mjs';
test('Codex: crossing several thresholds claims all pending ranks once; claim-all spans species',()=>{
 const s=newState(0),g=s.gold;s.book.minnow=10000;s.book.carp=500;act(s,{type:'claimAllBooks'},0);
 assert.equal(s.bookClaims.minnow,4);assert.equal(s.bookClaims.carp,undefined,'v27.81 ranks without SP have nothing to claim');assert.equal(s.sp,1);assert.equal(s.gold,g,'v27.81 no gold from the codex');
 assert.throws(()=>act(s,{type:'claimAllBooks'},0));assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 // v27.81 SP가 없는 1~3단계만 채운 몬스터는 받을 것이 없습니다(옛 'codex rewards are SP only' 테스트를 합침).
 const t=newState(0);t.book.minnow=9999;assert.throws(()=>act(t,{type:'claimBook',id:'minnow'},0));
});
test('Stat trace: per-source deltas sum to the final value and do not change the result',()=>{
 const s=newState(0);s.level=60;s.rebirths=4;s.attributes.str=40;s.attributes.vit=30;s.attributes.luk=20;s.permanent.hp=5;s.permanent.attack=7;s.permanent.guard=3;s.permanent.gold=2;s.book.minnow=600;
 // v27.81 성향 능력치가 없어져 도감 기여는 장소 테마(네온 수로 체력·공격·방어 +2%)로 확인합니다.
 for(const id of ['starKoi','prismRay','voidGuppy','abyssManta','novaManta'])s.book[id]=50;
 s.equipment.rod={id:'t',slot:'rod',rarity:2,power:30,level:20,name:'t',enhance:3};
 const plain=stats(s),trace={},traced=stats(s,trace);assert.deepEqual(traced,plain);
 for(const [k,v] of Object.entries(traced)){const sum=(trace[k]||[]).reduce((a,x)=>a+x.delta,0);assert.ok(Math.abs(sum-v)<1e-6,`${k}: ${sum} vs ${v}`);}
 assert.ok(trace.hp.some(x=>x.source==='research'&&x.factor>1));assert.ok(trace.hp.some(x=>x.source==='rebirth'));assert.ok(trace.attack.some(x=>x.source==='book'));assert.ok(trace.attack.some(x=>x.source==='equipment')||trace.magic.some(x=>x.source==='equipment')||Object.values(trace).flat().some(x=>x.source==='equipment'));
});
test('Voyage log: unlocks once, survives rebirth, silent backfill for old saves; tutorial has no rewards',()=>{
 const s=newState(0);act(s,{type:'start'},0);tick(s,rng);assert.ok(s.voyage['stage:brook']>=0);assert.equal(s.logs.filter(l=>l.text.includes('항해 기록')).length,0,'v25.13: visits are recorded silently');
 for(let i=0;i<5;i++)tick(s,rng);assert.ok(s.voyage['stage:brook']>=0);
 const old=newState(0);delete old.voyage;delete old.tutorial;old.clears.grotto=2;old.rebirths=1;old.abyssBest=30;act(old,{type:'pause'},0);
 assert.equal(old.voyage['dungeon:grotto'],-1);assert.equal(old.voyage['abyss:25'],-1);assert.equal(old.voyage['abyss:50'],undefined);assert.ok(!old.logs.some(l=>l.text.includes('항해 기록')));assert.equal(old.tutorial,undefined);
 const r=newState(0);r.level=60;r.voyage={'stage:reef':12};const before={sp:r.sp,gold:r.gold};act(r,{type:'tutorial',id:'skip'},0);assert.equal(r.tutorial.skipped,true);assert.equal(r.sp,before.sp);assert.equal(r.gold,before.gold);
 act(r,{type:'rebirth'},0);assert.equal(r.voyage['stage:reef'],12);assert.ok(r.voyage['rebirth:1']>=0);assert.equal(r.tutorial.skipped,true);
});
test('Recovery v27.8: 20% after a win minus 1%p per sea tier (min 5%), 8% in dungeons; first aid is free at Lv.2 and gives hp regen',()=>{
 const s=newState(0);assert.equal((s.learned.firstAid||0),0);s.level=2;act(s,{type:'sync'},0);assert.equal(s.learned.firstAid,1);assert.equal(s.sp,0);
 s.rebirths=5; // v27.89 환생 5회 미만은 새싹 생존 보조(처치 후 회복 +5%p)가 붙어 기본 규칙은 5회로 봅니다.
 const max=stats(s).hp;s.skills=[];assert.equal(victoryHeal(s),Math.floor(max*.2));const regen0=stats(s).hpRegen;s.skills=['firstAid'];assert.equal(victoryHeal(s),Math.floor(stats(s).hp*.2),'first aid no longer adds victory heal');assert.ok(stats(s).hpRegen>regen0,'first aid gives hp regen');
 s.skills=[];s.tide=10;assert.equal(victoryHeal(s),Math.floor(max*.1));s.tide=30;assert.equal(victoryHeal(s),Math.floor(max*.05),'floor 5%');s.tide=0;
 s.dungeon={id:'grotto',wave:0};assert.equal(victoryHeal(s),Math.floor(max*.08));
 const src=encounterSource.slice(encounterSource.indexOf('function reward('));const end=src.indexOf('\nexport function ');assert.equal(((end<0?src:src.slice(0,end)).match(/victoryHeal\(/g)||[]).length,1);
});
test('Long-term goals: dungeon steps, one-time achievement notice, suggestions only what is open now',()=>{
 const s=newState(0);act(s,{type:'growthGoal',id:'grotto',value:'dungeon'},0);let p=goalProgress(s);assert.equal(p.max,3);assert.equal(p.value,0);
 s.level=60;s.clears.grotto=1;s.bossResearchClaims.grotto=true;act(s,{type:'sync'},0);assert.equal(goalProgress(s).done,true);assert.equal(s.growthGoal.notified,true);
 act(s,{type:'sync'},0);assert.equal(s.logs.filter(l=>l.text.startsWith('장기 목표 달성')).length,1);
 const f=newState(0);const g=goalSuggestions(f);assert.equal(g.job,undefined);assert.equal(g.dungeon,undefined);
 for(const d of DUNGEONS){const x=newState(0);x.level=d.level;x.rebirths=d.rebirth;const sug=goalSuggestions(x).dungeon;if(sug)assert.ok(x.level>=sug.level&&x.rebirths>=sug.rebirth);}
});
test('v27.73 job goal: set from the job sheet, progress counts met requirements, entering the job marks it done once, "none" clears, unknown job refused',()=>{
 const s=newState(0);act(s,{type:'growthGoal',id:'whaler',value:'job'},0);assert.deepEqual(s.growthGoal,{kind:'job',id:'whaler'});
 let p=goalProgress(s);assert.ok(p.title.endsWith(' 전직'),p.title);assert.equal(p.view,'classes');assert.equal(p.done,false);assert.ok(p.value<p.max&&p.detail.length>0);
 s.level=30;s.rebirths=1;Object.assign(s.attributes,{str:30,dex:30,int:30,vit:30,wis:30,luk:30});s.jobMastery[JOBS.find(j=>j.id==='whaler').parent]=75;p=goalProgress(s);assert.equal(p.value,p.max,'all requirements met');
 act(s,{type:'job',id:'whaler'},0);assert.equal(s.job,'whaler');assert.equal(goalProgress(s).done,true);assert.equal(s.growthGoal.notified,true);
 assert.equal(s.logs.filter(l=>l.text.startsWith('장기 목표 달성')).length,1);
 act(s,{type:'growthGoal',id:'none'},0);assert.equal(s.growthGoal,null);
 assert.throws(()=>act(s,{type:'growthGoal',id:'nope',value:'job'},0),/성장 목표/);
});
test('Stat points: 5 per level, old saves get the difference once, max button spends all',()=>{
 const s=newState(0);assert.equal(s.statRate,5);const old=newState(0);old.level=21;old.statPoints=10;old.attributes.str=70;delete old.statRate;act(old,{type:'pause'},0);assert.equal(old.statPoints,30);assert.equal(old.statRate,5);act(old,{type:'pause'},0);assert.equal(old.statPoints,30);
 act(old,{type:'attribute',id:'vit',value:'max'},0);assert.equal(old.statPoints,0);assert.equal(old.attributes.vit,30);assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'max'},0));assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'7'},0));
});

test('v27.72 tutorial: 21 steps, completed steps are recorded and never regress, veterans are backfilled silently', async () => {
    const { TUTORIAL_STEPS, tutorialProgress, tutorialEarly, tutorialStepDone, nextTutorialStep, syncTutorial } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/guidance');
    // v3.17 21단계(중후반 8단계 추가).
    assert.equal(TUTORIAL_STEPS.length, 21); assert.deepEqual(TUTORIAL_STEPS.map(x => x.id), ['catch', 'attribute', 'skill', 'stage', 'dungeon', 'job', 'enhance', 'book', 'achievement', 'altar', 'research', 'rebirth', 'tide', 'habitat', 'star', 'relic', 'abyss', 'cosmetics', 'duel', 'guild', 'raid']);
    const s = newState(0); s.tutorial = { done: {} }; assert.equal(tutorialEarly(s), true); assert.equal(tutorialProgress(s), 1, 'starter skill counts as equipped'); assert.deepEqual(s.tutorial, { done: {} });
    s.clears = { grotto: 1 }; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'dungeon')));
    // 강화한 장비를 팔아도 ‘장비 강화’는 기록으로 남습니다.
    s.inventory.push({ id: 'e1', slot: 'rod', rarity: 0, power: 3, level: 1, name: 'rod', enhance: 1 }); act(s, { type: 'pause' }, 0);
    assert.ok(s.tutorial.done.enhance > 0 && s.tutorial.done.dungeon > 0 && s.tutorial.done.skill > 0, 'met steps are recorded on sync');
    s.inventory = s.inventory.filter(i => i.id !== 'e1'); assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'enhance')), 'selling the enhanced item keeps the step done');
    s.stage = 'bay'; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'stage'))); s.job = 'physical'; assert.equal(tutorialEarly(s), false);
    s.altar = { offers: 1 }; assert.ok(tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'altar')));
    // 환생하면 환생 전 단계는 모두 완료, 난이도 단계만 남습니다. 기록은 환생 뒤에도 유지됩니다.
    const r = newState(0); r.tutorial = { done: {} }; r.level = 60; act(r, { type: 'rebirth' }, 0); assert.equal(tutorialEarly(r), false, 'rebirth completes the early steps');
    assert.equal(nextTutorialStep(r).id, 'tide'); assert.equal(tutorialProgress(r), 12); r.tide = 1; act(r, { type: 'pause' }, 0); assert.equal(nextTutorialStep(r).id, 'habitat', 'v3.17 mid-game steps follow'); r.tide = 0; assert.equal(tutorialProgress(r), 13, 'lowering the tide keeps the step');
    // 개편 전 세이브: 환생 경험이 있으면 모두 채우고(안내 없음), 환생 전이면 지금 조건으로만 채웁니다.
    const vet = newState(0); vet.tutorial = {}; vet.rebirths = 3; syncTutorial(vet); assert.equal(tutorialProgress(vet), 21);
    const fresh = newState(0); fresh.tutorial = {}; fresh.kills = 5; syncTutorial(fresh); assert.deepEqual(Object.keys(fresh.tutorial.done).sort(), ['catch', 'skill']);
    const none = newState(0); delete none.tutorial; syncTutorial(none); assert.equal(none.tutorial, undefined, 'saves without a tutorial object stay without one');
});

test('v26.8 registerItemAll registers one weakest unlocked item per missing slot/rarity and skips locked/relic', () => {
    const s = newState(0);
    s.inventory.push({ id: 'r0a', slot: 'rod', rarity: 0, power: 9, level: 1, name: 'strong rod' }, { id: 'r0b', slot: 'rod', rarity: 0, power: 3, level: 1, name: 'weak rod' }, { id: 'c1', slot: 'coat', rarity: 1, power: 5, level: 1, name: 'coat', locked: true }, { id: 'm2', slot: 'charm', rarity: 2, power: 5, level: 1, name: 'relic charm', relic: true }, { id: 'm0', slot: 'charm', rarity: 0, power: 2, level: 1, name: 'charm' });
    act(s, { type: 'registerItemAll' }, 0);
    assert.deepEqual(Object.keys(s.itemBook).sort(), ['charm:0', 'rod:0']); assert.deepEqual(s.inventory.map(x => x.id).sort(), ['c1', 'm2', 'r0a'], 'weakest rod consumed, locked/relic kept');
    assert.throws(() => act(s, { type: 'registerItemAll' }, 0), /미등록 장비가 가방에 없습니다/);
});
