// 도감·능력치 추적·항해 기록·회복·장기 목표·능력치 포인트
import { newState, act, advance, tick, victoryHeal, encounterSource, stats, migrateState, assert, rng, test } from './harness.mjs';
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
 const o=newState(0);o.version=8;delete o.placeApMoved;for(const st of W.BASE_STAGES.slice(0,5))for(const id of st.monsters)o.book[id]=50;
 migrateState(o,0);assert.equal(o.placeApMoved,true);for(const n of [1,2,3,4,5])assert.equal(o.achievementClaims[`regions:${n}`],true);
 assert.equal(P.apSources(o).find(x=>x.id==='achievement').value>=5,true);assert.equal(P.apSources(o).some(x=>x.id==='places'),false);
 const before=JSON.stringify(o.achievementClaims);migrateState(o,0);assert.equal(JSON.stringify(o.achievementClaims),before,'once');
 assert.equal(A.achievementById('regions:2').honor,true);assert.equal(A.achievementById('regions:4').honor,undefined);
 assert.equal(A.achievementTotals({achievementClaims:{'regions:2':true,'regions:3':true}}).count,0,'honor steps do not raise the bonus');
 assert.ok(T.TITLES.some(t=>t.achievement==='regions:13'));
 const v=newState(0);v.version=8;delete v.placeApMoved;v.rebirths=5;v.achievements={'rebirths:5':50};for(const st of W.BASE_STAGES.slice(0,3))for(const id of st.monsters)v.book[id]=50;migrateState(v,0);assert.equal(T.displayTitle({...v,title:undefined}),T.displayTitle({achievements:{'rebirths:5':50},rebirths:5,title:undefined}),'auto title is not replaced by the backfilled honor titles');
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
test('v3.219 staff lineage: 보급관 enters by rank 하사 + 3 mastered jobs; support skills give other slots exp · gold · mastery (max per effect, capped), command boosts self',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),Su=await L.load('systems/support'),P=await L.load('systems/progression'),C=await L.load('data/classes'),R=await L.load('data/rank'),St=await L.load('systems/stats'),M=await L.load('systems/mastery');
 const j=C.jobById('quartermaster');assert.ok(j&&j.tier===3&&j.lineage==='staff'&&j.requiresRank==='ssg'&&!j.parent);
 const s=newState(0);s.level=40;const req=()=>P.jobRequirements(s,j);
 assert.ok(req().some(r=>r.label.includes('하사')&&!r.met));s.rank={exp:R.RANK_CUMULATIVE[R.RANKS.findIndex(r=>r.id==='ssg')],perks:{}};assert.ok(req().find(r=>r.label.includes('하사')).met);
 assert.ok(req().some(r=>r.label.includes('숙달한 직업 3개')));
 // 장착한 지원 스킬: 숙련 0단계 3% → 마지막 단계 8%, 참모 계보가 아니면 지원 없음.
 s.job='quartermaster';s.unlockedJobs.push('quartermaster');for(const id of ['supplyConvoy','militaryProcurement','fieldManual','commandStructure'])s.learned[id]=1;
 s.skills=['supplyConvoy','militaryProcurement','commandStructure'];
 assert.deepEqual(Su.supportOf(s),{exp:.03,gold:.03});
 s.skillPractice.supplyConvoy=2250000;assert.equal(Su.supportOf(s).exp,.08);s.skillPractice.supplyConvoy=225000;assert.equal(Su.supportOf(s).exp,.055); // v3.222 아제로스 규칙: 숙련 단계 ×10
 assert.ok(Math.abs(Su.commandBonus(s)-.08)<1e-9,'two support skills x 4%');
 const atk=St.stats(s).attack;s.skills=['commandStructure'];assert.ok(St.stats(s).attack<atk,'command raises own attack');
 s.skills=['supplyConvoy'];s.job='fisher';assert.deepEqual(Su.supportOf(s),{},'other lineage gives nothing');assert.equal(Su.commandBonus(s),0);
 // 합치기: 효과별 최고값, 상한 8%.
 assert.deepEqual(Su.mergeSupport([{exp:.05,gold:.03},{exp:.07},undefined,{mastery:.5}]),{exp:.07,gold:.03,mastery:.08});
 // 받는 쪽: 경험치 · 골드 · 숙련 배율에 곱하고, 결투 스냅샷 능력치는 그대로입니다.
 const t=newState(0),e0=St.expMultiplier(t),g0=St.goldMultiplier(t),m0=M.masteryResearchHundredths(t),snap0=JSON.stringify(St.snapshot(t).stats);
 t.support={exp:.05,gold:.04,mastery:.06};
 assert.ok(Math.abs(St.expMultiplier(t)/e0-1.05)<1e-9);assert.ok(Math.abs(St.goldMultiplier(t)/g0-1.04)<1e-9);assert.equal(M.masteryResearchHundredths(t),Math.round(((1+m0/100)*1.06-1)*100));
 assert.equal(JSON.stringify(St.snapshot(t).stats),snap0,'duel snapshot unaffected');
 t.level=60;act(t,{type:'rebirth'},1000);assert.deepEqual(t.support,{exp:.05,gold:.04,mastery:.06},'kept through rebirth until the next sync');
});
test('v3.219 군의관: hp · mana · regen support (other slots only); duel snapshots drop support, altar (PvE) snapshots keep it',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),Su=await L.load('systems/support'),St=await L.load('systems/stats'),C=await L.load('data/classes');
 const j=C.jobById('fieldMedic');assert.ok(j&&j.tier===3&&j.lineage==='staff'&&j.requiresRank==='ssg');
 const s=newState(0);s.level=40;s.job='fieldMedic';s.unlockedJobs.push('fieldMedic');for(const id of ['bloodSupply','stimulantKit','fieldDressing','triage'])s.learned[id]=1;
 s.skills=['bloodSupply','stimulantKit','fieldDressing','triage'];assert.deepEqual(Su.supportOf(s),{hp:.02,mana:.02,hpRegen:.05});assert.ok(Math.abs(Su.commandBonus(s)-.12)<1e-9);
 s.skillPractice.bloodSupply=2250000;assert.equal(Su.supportOf(s).hp,.05);
 assert.deepEqual(Su.mergeSupport([{hp:.2,hpRegen:.5}]),{hp:.05,hpRegen:.15},'capped per effect');
 const t=newState(0);t.level=30;t.hpRegen=0;const a0=St.stats(t);t.support={hp:.05,mana:.05,hpRegen:.15};const a1=St.stats(t);
 assert.ok(a1.hp>a0.hp&&a1.mana>a0.mana,'hp and mana rise');assert.ok(Math.abs(a1.hp/a0.hp-1.05)<.01);
 assert.deepEqual(St.duelSnapshot(t).stats,St.snapshot({...t,support:undefined}).stats);assert.ok(St.snapshot(t).stats.hp>St.duelSnapshot(t).stats.hp,'PvE snapshot keeps support, duel drops it');
});
test('v3.219 작전참모 · 화력참모: rank 소위 + either 3rd-tier mastery; AP · boss · rank exp · penetration · crit damage support; duel trims support AP',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),Su=await L.load('systems/support'),St=await L.load('systems/stats'),P=await L.load('systems/progression'),C=await L.load('data/classes'),R=await L.load('data/rank');
 for(const id of ['operationsOfficer','fireSupportOfficer']){const j=C.jobById(id);assert.ok(j&&j.tier===4&&j.requiresRank==='lt2');
  const s=newState(0);s.level=55;s.rank={exp:R.RANK_CUMULATIVE[R.RANKS.findIndex(r=>r.id==='lt2')],perks:{}};const any=()=>P.jobRequirements(s,j).find(r=>r.label.includes('보급관 또는 군의관'));
  assert.ok(any()&&!any().met);s.jobMastery.fieldMedic=300;assert.ok(any().met,'either branch counts');}
 const o=newState(0);o.level=55;o.job='operationsOfficer';o.unlockedJobs.push('operationsOfficer');for(const id of ['tacticalMap','operationPlan','personnelRecord'])o.learned[id]=1;o.skills=['tacticalMap','operationPlan','personnelRecord'];
 assert.deepEqual(Su.supportOf(o),{ap:1,boss:.02,rank:.03});o.skillPractice.tacticalMap=1e7;assert.equal(Su.supportOf(o).ap,2);
 const f=newState(0);f.level=55;f.job='fireSupportOfficer';f.unlockedJobs.push('fireSupportOfficer');for(const id of ['armorPiercingDoctrine','concentratedFire'])f.learned[id]=1;f.skills=['armorPiercingDoctrine','concentratedFire'];
 assert.deepEqual(Su.supportOf(f),{penetration:.02,critDamage:.05});
 // 받는 쪽: AP · 보스 · 관통 · 치명 피해, 결투 스냅샷에서는 빠집니다.
 const t=newState(0);t.level=30;const cap0=P.apCapacity(t),a0=St.stats(t);t.support={ap:2,boss:.05,penetration:.05,critDamage:.15};const a1=St.stats(t);
 assert.equal(P.apCapacity(t),cap0+2);assert.ok(a1.bossDamage>a0.bossDamage&&a1.penetration>a0.penetration);assert.ok(Math.abs(a1.critDamage-a0.critDamage-.15)<1e-9);
 assert.deepEqual(St.duelSnapshot(t).stats,St.snapshot({...t,support:undefined}).stats);
 // 지원 AP로만 들어가는 장착은 결투 스냅샷에서 빠집니다.
 const d=newState(0);d.level=30;d.support={ap:2};const pool=Object.keys(d.learned).filter(id=>P.canUse(d,id));d.skills=[];for(const id of pool){if(P.validLoadout(d,[...d.skills,id]))d.skills.push(id);}
 const bare=St.snapshot({...d,support:undefined,skills:d.skills}).skills;assert.ok(P.apUsed({...d,support:undefined},St.duelSnapshot(d).skills)<=P.apCapacity({...d,support:undefined}));assert.ok(St.duelSnapshot(d).skills.length<=bare.length);
 // 계급 경험치 지원: 같은 난수로 사냥하면 계급 경험치가 더 쌓입니다.
 const run=sup=>{const h=newState(0);if(sup)h.support={rank:.06};act(h,{type:'start'},0);advance(h,1_800_000,()=>.5);return h.rank?.exp||0;};
 const base=run(false),boosted=run(true);assert.ok(boosted>base&&boosted<=Math.ceil(base*1.06)+1,`${base} → ${boosted}`);
});
test('v3.212 boss core news: a new core and a full awakening (rank 5) announce once a day; saves marked before v3.212 stay quiet',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),N=await L.load('systems/news'),B=await L.load('data/boss-core');
 const s=newState(0);s.bossCores={grotto:{rank:0,attrs:[]}};N.collectNews(s,0);delete s.newsMark.cores;delete s.newsMark.coreFull;
 s.bossCores.cemetery={rank:5,attrs:[]};assert.deepEqual(N.collectNews(s,0),[],'old mark: only fills in the cores');assert.deepEqual(s.newsMark.cores.sort(),['cemetery','grotto']);
 s.bossCores.temple={rank:0,attrs:[]};let ev=N.collectNews(s,0);assert.deepEqual(ev.map(e=>e.kind),['core']);
 assert.equal(ev[0].text('영희'),`영희가 보스 코어 ‘${B.BOSS_CORES.temple.name}’를 얻었습니다. (보유 3/${Object.keys(B.BOSS_CORES).length}종)`);
 s.bossCores.grotto.rank=4;assert.deepEqual(N.collectNews(s,0),[],'awaken below max is quiet');
 s.bossCores.grotto.rank=5;ev=N.collectNews(s,0);assert.deepEqual(ev.map(e=>e.kind),['coreAwaken']);assert.ok(ev[0].text('철수').endsWith('완전 각성(5단계)했습니다.'));
 s.bossCores.caldera={rank:0,attrs:[]};assert.deepEqual(N.collectNews(s,0),[],'same kind once a day');
 s.bossCores.starSanctum=3;assert.equal(N.collectNews(s,86_400_000*2).length,1,'next day again (old number entry too)');
});
test('v3.212 onyx awakening news: every awakening announces (no daily cap); vault merges and old marks stay quiet',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),N=await L.load('systems/news'),O=await L.load('data/onyx');
 const boss=O.ONYX_BOSSES[0],s=newState(0),item={id:'o',slot:'charm',rarity:6,power:1,level:1,name:boss.accessory.name,onyx:boss.id};s.inventory.push(item);N.collectNews(s,0);
 item.onyxRank=1;let ev=N.collectNews(s,0);assert.deepEqual(ev.map(e=>e.kind),['onyxAwaken']);assert.equal(ev[0].text('영희'),`영희가 칠흑 장신구 ‘${boss.accessory.name}’${/[가-힣]/.test(boss.accessory.name.at(-1))&&(boss.accessory.name.at(-1).charCodeAt(0)-0xac00)%28?'을':'를'} 각성 1단계로 올렸습니다.`);
 item.onyxRank=2;assert.equal(N.collectNews(s,0).length,1,'same day again');
 item.onyxRank=3;s.onyxGift={[boss.id]:0};assert.deepEqual(N.collectNews(s,0),[],'vault merge is quiet');
 delete s.newsMark.onyxRanks;item.onyxRank=4;assert.deepEqual(N.collectNews(s,0),[],'old mark only fills in');
});
test('v3.190 rank news: 하사 and 소위 and every rank after 소위 announce, other ranks stay quiet, no once-a-day cap, skipped ranks still count',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),N=await L.load('systems/news'),R=await L.load('data/rank'),T=await L.load('data/titles');
 const at=id=>R.RANK_CUMULATIVE[R.RANKS.findIndex(r=>r.id===id)],s=newState(0);N.collectNews(s,0);
 const promote=(id,t=0)=>{s.rank={exp:at(id),perks:{}};return N.collectNews(s,t).filter(e=>e.kind==='general').map(e=>e.text('철수'));};
 assert.deepEqual(promote('pvt1'),[],'일병 is quiet');assert.deepEqual(promote('sgt'),[],'병장 is quiet');
 assert.deepEqual(promote('ssg'),['철수가 하사(으)로 진급했습니다.']);assert.deepEqual(promote('sfc'),[],'중사 is quiet');assert.deepEqual(promote('smaj'),[],'원사 is quiet');
 assert.deepEqual(promote('lt2'),['철수가 소위(으)로 진급했습니다.']);assert.deepEqual(promote('lt1'),['철수가 중위(으)로 진급했습니다.'],'same day, second promotion still announces');
 for(const id of ['cpt','maj','ltc','col','bg','mg','ltg'])assert.equal(promote(id).length,1,id+' announces');
 const j=newState(0);N.collectNews(j,0);j.rank={exp:at('sfc'),perks:{}};assert.deepEqual(N.collectNews(j,0).filter(e=>e.kind==='general').map(e=>e.text('영희')),['영희가 중사(으)로 진급했습니다.'],'jumping past 하사 announces the rank reached');
 const k=newState(0);N.collectNews(k,0);k.rank={exp:at('cpl'),perks:{}};assert.deepEqual(N.collectNews(k,0).filter(e=>e.kind==='general'),[],'jumping 이등병→상병 stays quiet');
 for(const t of T.TITLES)assert.ok(!/^[\p{L}\p{N}]/u.test(t.name),'every title starts with a picture: '+t.name);
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
