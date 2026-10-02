// 도감·능력치 추적·항해 기록·회복·장기 목표·능력치 포인트
import { newState, act, tick, victoryHeal, encounterSource, stats, goalProgress, goalSuggestions, DUNGEONS, assert, rng, test } from './harness.mjs';
test('Codex: crossing several thresholds claims all pending ranks once; claim-all spans species',()=>{
 const s=newState(0),g=s.gold;s.book.minnow=10000;s.book.carp=500;act(s,{type:'claimAllBooks'},0);
 assert.equal(s.bookClaims.minnow,4);assert.equal(s.bookClaims.carp,2);assert.equal(s.sp,1);assert.equal(s.gold,g+200+1000+5000+15000+200+1000);
 assert.throws(()=>act(s,{type:'claimAllBooks'},0));assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
});
test('Stat trace: per-source deltas sum to the final value and do not change the result',()=>{
 const s=newState(0);s.level=60;s.rebirths=4;s.attributes.str=40;s.attributes.vit=30;s.attributes.luk=20;s.permanent.hp=5;s.permanent.attack=7;s.permanent.guard=3;s.permanent.gold=2;s.book.minnow=600;
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
test('Recovery: 8% after a win (4% in dungeons); first aid is free at Lv.2 and adds 4% once per win',()=>{
 const s=newState(0);assert.equal((s.learned.firstAid||0),0);s.level=2;act(s,{type:'sync'},0);assert.equal(s.learned.firstAid,1);assert.equal(s.sp,0);
 const max=stats(s).hp;s.skills=[];assert.equal(victoryHeal(s),Math.floor(max*.08));s.skills=['firstAid'];assert.equal(victoryHeal(s),Math.floor(max*.12));
 s.dungeon={id:'grotto',wave:0};assert.equal(victoryHeal(s),Math.floor(max*.08));s.skills=[];assert.equal(victoryHeal(s),Math.floor(max*.04));
 const src=encounterSource.slice(encounterSource.indexOf('function reward('));const end=src.indexOf('\nexport function ');assert.equal(((end<0?src:src.slice(0,end)).match(/victoryHeal\(/g)||[]).length,1);
});
test('Long-term goals: dungeon steps, one-time achievement notice, suggestions only what is open now',()=>{
 const s=newState(0);act(s,{type:'growthGoal',id:'grotto',value:'dungeon'},0);let p=goalProgress(s);assert.equal(p.max,3);assert.equal(p.value,0);
 s.level=60;s.clears.grotto=1;s.bossResearchClaims.grotto=true;act(s,{type:'sync'},0);assert.equal(goalProgress(s).done,true);assert.equal(s.growthGoal.notified,true);
 act(s,{type:'sync'},0);assert.equal(s.logs.filter(l=>l.text.startsWith('장기 목표 달성')).length,1);
 const f=newState(0);const g=goalSuggestions(f);assert.equal(g.job,undefined);assert.equal(g.dungeon,undefined);
 for(const d of DUNGEONS){const x=newState(0);x.level=d.level;x.rebirths=d.rebirth;const sug=goalSuggestions(x).dungeon;if(sug)assert.ok(x.level>=sug.level&&x.rebirths>=sug.rebirth);}
});
test('Stat points: 5 per level, old saves get the difference once, max button spends all',()=>{
 const s=newState(0);assert.equal(s.statRate,5);const old=newState(0);old.level=21;old.statPoints=10;old.attributes.str=70;delete old.statRate;act(old,{type:'pause'},0);assert.equal(old.statPoints,30);assert.equal(old.statRate,5);act(old,{type:'pause'},0);assert.equal(old.statPoints,30);
 act(old,{type:'attribute',id:'vit',value:'max'},0);assert.equal(old.statPoints,0);assert.equal(old.attributes.vit,30);assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'max'},0));assert.throws(()=>act(old,{type:'attribute',id:'vit',value:'7'},0));
});
test('SP is only earned once at 10000 catches; early codex rewards are gold',()=>{
 const s=newState(0);assert.equal(s.sp,0);s.book.minnow=50;act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.sp,0);assert.equal(s.gold,300);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.book.minnow=9999;act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.bookClaims.minnow,3);assert.equal(s.gold,300+1000+5000);assert.equal(s.sp,0);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.book.minnow=10000;act(s,{type:'claimBook',id:'minnow'},0);assert.equal(s.sp,1);assert.throws(()=>act(s,{type:'claimBook',id:'minnow'},0));
 s.inventory.push({id:'book-item',slot:'rod',rarity:1,power:5,level:1,name:'test'});act(s,{type:'registerItem',id:'book-item'},0);assert.equal(s.itemBook['rod:1'],true);assert.equal(s.inventory.length,0);assert.throws(()=>act(s,{type:'registerItem',id:'book-item'},0));
});

test('v25.9 tutorial: 8 steps, dungeon/enhance steps complete by clears or enhancement, early phase ends at the job step', async () => {
    const { TUTORIAL_STEPS, tutorialProgress, tutorialEarly } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/guidance');
    assert.equal(TUTORIAL_STEPS.length, 8); assert.deepEqual(TUTORIAL_STEPS.map(x => x.id), ['catch', 'attribute', 'skill', 'dungeon', 'job', 'enhance', 'research', 'rebirth']);
    const s = newState(0); assert.equal(tutorialEarly(s), true); assert.equal(tutorialProgress(s), 1, 'starter skill counts as equipped');
    s.clears = { grotto: 1 }; assert.ok(TUTORIAL_STEPS.find(x => x.id === 'dungeon').done(s)); s.equipment.rod.enhance = 1; assert.ok(TUTORIAL_STEPS.find(x => x.id === 'enhance').done(s));
    s.job = 'physical'; assert.equal(tutorialEarly(s), false); const r = newState(0); r.rebirths = 1; assert.equal(tutorialEarly(r), false, 'rebirth completes the early steps');
});
