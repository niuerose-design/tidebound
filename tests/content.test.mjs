// 상태 표시·설명 생성·심연·환생 시점·반복·만능 항해사·무리 사냥·추가타
import { bookMod, weightedFishId, STAGES, economy, researchRefund, apUsed, apCapacity, newState, act, advance, tick, stats, expMultiplier, victoryMastery, visibleStatuses, strike, combatFxFromLog, canChangeJob, maxSkillLevel, jobMasteryTarget, jobCombatMultiplier, skillGrowthStages, SKILLS, DUNGEONS, gambleCost, goldMultiplier, metaMod, longTerm, JOBS, assert, rng, test, SKILL_FORMULA } from './harness.mjs';
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
 assert.deepEqual(bone.map(r=>[r.practice,r.effective.cost,r.effective.bonus.hp,r.effective.bonus.defense]),[[0,6,-60,-8],[2500,6,-40,-5],[25000,2,100,12],[125000,-3,450,45]]);
 assert.deepEqual(bone.map(r=>r.effective.penaltyRelief||0),[0,.15,.5,1]);
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

test('All-rounder: allocated-point harmony damage, split mitigation and allocation-only unlock',()=>{
 const s=newState(0);s.level=40;s.attributes={str:20,dex:20,int:20,vit:20,wis:20,luk:15};
 const rawHarmony=40+115*.8+15*12;assert.equal(stats(s).harmony,Math.floor(rawHarmony*SKILL_FORMULA.harmonyScale));
 // 서로 다른 직업의 능력치 패시브를 장착할수록 조화가 강해지고, 같은 직업의 패시브는 한 번만 셉니다.
 for(const id of ['axeArm','bookwise','innerBreath']){s.skillInheritances[id]=true;s.learned[id]=1;}
 s.skills=['axeArm','bookwise','innerBreath'];assert.equal(stats(s).harmony,Math.floor(rawHarmony*SKILL_FORMULA.harmonyScale*(1+3*SKILL_FORMULA.harmonyPerJob)));
 s.skills=[];
 const j=JOBS.find(x=>x.id==='allRounder');assert.equal(j.parent,'wanderer');
 s.jobMastery.wanderer=2400;s.unlockedJobs=['fisher','wanderer'];assert.equal(canChangeJob(s,'allRounder'),true);
 s.attributes.luk=14;s.level=100;assert.equal(canChangeJob(s,'allRounder'),false,'level growth does not count as allocated points');
 s.attributes.luk=15;s.jobMastery.wanderer=2399;assert.equal(canChangeJob(s,'allRounder'),false);
 const base={hp:1e6,attack:1,magic:1,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:1000,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5,harmony:1000};
 const fighter=(st)=>({name:'A',stats:st,hp:st.hp,mana:st.mana,skills:['harmonicWeight'],cooldowns:{},stun:0,effects:{},ranks:{harmonicWeight:1},mastery:{},practice:{}});
 const target=(def,res)=>({name:'B',stats:{...base,defense:def,resist:res,harmony:0},hp:1e6,skills:[],cooldowns:{},stun:0,effects:{}});
 const sk=SKILLS.find(x=>x.id==='harmonicWeight');const raw=1000*sk.multiplier;
 let b=target(0,0);strike(fighter(base),b,()=>0);assert.equal(1e6-b.hp,Math.round(raw*.5)*2);
 b=target(50,0);strike(fighter(base),b,()=>0);assert.equal(1e6-b.hp,Math.round(raw*.5*100/200)+Math.round(raw*.5));
 b=target(0,50);let log=strike(fighter({...base,attack:99999,magic:99999}),b,()=>0);assert.equal(1e6-b.hp,Math.round(raw*.5)+Math.round(raw*.5*100/200),'attack/magic are not added');assert.match(log,/복합 피해/);
 let calls=0;strike(fighter(base),target(0,0),()=>{calls++;return 0;});let normal=0;strike({...fighter(base),skills:['arcane'],ranks:{arcane:1}},target(0,0),()=>{normal++;return 0;});assert.equal(calls,normal,'one hit roll and one crit roll');
});

test('Swarm hunting: unlock by codex, one entity with N x HP and single attack, rewards only on kill',()=>{
 const s=newState(0);s.level=40;s.permanent.attack=300;s.permanent.hp=300;s.hp=stats(s).hp;act(s,{type:'stage',id:'brook'},0);
 assert.throws(()=>act(s,{type:'swarm',id:'5'},0),/어종/);act(s,{type:'target',id:'minnow'},0);
 s.book.minnow=49;assert.throws(()=>act(s,{type:'swarm',id:'5'},0),/50/);s.book.minnow=50;act(s,{type:'swarm',id:'5'},0);assert.throws(()=>act(s,{type:'swarm',id:'100'},0),/500/);
 assert.throws(()=>act(s,{type:'swarm',id:'7'},0));
 act(s,{type:'start'},0);tick(s,()=>.99);const e=s.enemy;assert.equal(e.swarm,5);
 const single=newState(0);single.level=40;single.permanent.attack=300;single.permanent.hp=300;act(single,{type:'stage',id:'brook'},0);act(single,{type:'target',id:'minnow'},0);act(single,{type:'start'},0);tick(single,()=>.99);
 assert.equal(e.combatStats.attack,single.enemy.combatStats.attack,'swarm attack stays at one fish');assert.equal(e.maxHp,single.enemy.maxHp*5,'one entity with 5x HP');assert.equal(e.combatStats.hp,e.maxHp);
 const big=newState(0);act(big,{type:'stage',id:'brook'},0);act(big,{type:'target',id:'minnow'},0);big.book.minnow=4999;assert.throws(()=>act(big,{type:'swarm',id:'500'},0),/5,000/);big.book.minnow=5000;act(big,{type:'swarm',id:'500'},0);act(big,{type:'start'},0);tick(big,()=>.99);
 assert.equal(big.enemy.swarm,500);assert.equal(big.enemy.maxHp,Math.round(single.enemy.maxHp*490),'x500 has 490x HP');assert.equal(big.enemy.combatStats.attack,Math.round(single.enemy.combatStats.attack*490),'x500 challenge also has 490x attack');assert.equal(big.enemy.combatStats.defense,single.enemy.combatStats.defense);
 const kills=s.kills,gold=s.gold,book=s.book.minnow,job=s.jobMastery[s.job]||0,mult=goldMultiplier(s);
 let guard=0;while(s.enemy===e&&guard++<2000){tick(s,()=>.5);if(s.enemy===e)assert.equal(s.kills,kills,'no partial rewards');}
 assert.equal(s.kills-kills,5);assert.equal(s.book.minnow-book,5);assert.equal(s.gold-gold,Math.floor(e.gold*mult)*5);assert.equal((s.jobMastery[s.job]||0)-job,5);
 // 적의 자기 체력 비례 공격은 한 마리 체력 기준
 const hpSkill={name:'foe',stats:{hp:1000,attack:0,magic:0,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:1000,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5,harmony:0},hp:5000,skills:['vitalSurge'],cooldowns:{},stun:0,effects:{},mana:1000,ranks:{vitalSurge:1}};
 const t1={name:'p',stats:{...hpSkill.stats,hp:1e6},hp:1e6,skills:[],cooldowns:{},stun:0,effects:{}},t5={...t1,effects:{},cooldowns:{}};
 strike({...hpSkill,cooldowns:{},effects:{}},t1,()=>0);strike({...hpSkill,cooldowns:{},effects:{},hp:5000,stats:{...hpSkill.stats,hp:5000},swarm:5},t5,()=>0);assert.equal(t1.hp,t5.hp);
 const dead=newState(0);dead.level=1;act(dead,{type:'stage',id:'brook'},0);act(dead,{type:'target',id:'minnow'},0);dead.book.minnow=500;act(dead,{type:'swarm',id:'100'},0);act(dead,{type:'start'},0);
 for(let i=0;i<3000&&dead.deaths===0;i++)tick(dead,rng);assert.ok(dead.deaths>0);assert.equal(dead.kills,0,'death forfeits the whole swarm');
 const other=newState(0);act(other,{type:'stage',id:'brook'},0);act(other,{type:'target',id:'minnow'},0);other.book.minnow=500;act(other,{type:'swarm',id:'100'},0);act(other,{type:'target',id:'carp'},0);act(other,{type:'start'},0);tick(other,()=>.99);assert.ok(other.enemy);assert.equal(other.swarm,100);assert.equal(other.enemy?.swarm,undefined,'swarm applies only to an unlocked target');
});

test('Rebirth reward breakdown always sums to the pearls actually granted',()=>{
 for(const [lv,rb,bonus] of [[30,0,0],[45,3,2],[60,6,0],[100,6,1],[100,25,3],[70,400,5]]){const s=newState(0);s.level=lv;s.rebirths=rb;const p=metaMod.rebirthRewardParts(s,bonus);assert.equal(p.level+p.count+p.bonus+p.deep,metaMod.rebirthReward(s,bonus));}
});

test('Follow-up hits: each hit counted once, total equals HP lost, stops when the target dies, works for player and enemy',()=>{
 const base={hp:1e6,attack:100,magic:10,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:1000,manaRegen:0,penetration:0,lifesteal:.1,critDamage:1.5,harmony:0};
 const mk=(skills,extra={})=>({name:'A',stats:{...base,...extra},hp:1000,mana:1000,skills,cooldowns:{},stun:0,effects:{},ranks:Object.fromEntries(skills.map(id=>[id,1]))});
 for(const id of ['twinHook','tentacleBarrage','foeFrenzy']){
  const a=mk([id]),b={...mk([]),name:'B',hp:1e6};a.hp=500;const ev=[];const text=strike(a,b,()=>0,ev);const e=ev[0];
  assert.equal(e.skillId,id);assert.ok(e.hits.length>=2,id);assert.equal(e.hits[0].kind,'main');assert.ok(e.hits.slice(1).every(h=>h.kind==='follow'));
  assert.equal(e.total,e.hits.reduce((n,h)=>n+h.value,0));assert.equal(1e6-b.hp,e.total,'HP lost equals displayed total');
  assert.equal(e.drained,a.hp-500,'drain shown separately equals HP regained');assert.equal(e.healed,0);
  assert.match(text,/본타 \d+/);assert.match(text,/합계 \d+/);assert.ok(!text.includes('회복'),'drain is not labelled as heal');
 }
 const a=mk(['twinHook']),weak={...mk([]),name:'B',hp:5};const ev=[];strike(a,weak,()=>0,ev);assert.equal(ev[0].hits.length,1,'no follow-up after the target dies');assert.equal(ev[0].total,5,'shows HP actually removed');
 const rolls=[0,0];let r=0;const b2={...mk([]),name:'B',hp:1e6};const ev2=[];strike(mk(['twinHook']),b2,()=>rolls[r++]??.9999,ev2);
 assert.ok(ev2[0].hits.some(h=>h.kind==='follow'&&h.miss),'a follow-up can miss independently');
 const crit=[];strike(mk(['arcane'],{crit:1}),{...mk([]),name:'B',hp:1e6},()=>0,crit);assert.equal(crit[0].hits[0].critical,true);assert.equal(crit[0].damageType,'magic');
});

test('Codex traits: each research stage grants its species trait; region themes replace the flat HP bonus; 50 catches reveal info',()=>{
 const bookDelta=(s,k)=>{const t={};stats(s,t);return (t[k]||[]).filter(x=>x.source==='book'&&x.factor===undefined).reduce((a,x)=>a+x.delta,0);};
 const s=newState(0);s.book.minnow=500;
 assert.equal(bookDelta(s,'attack'),4);assert.equal(bookDelta(s,'magic'),0);assert.ok(Math.abs(bookDelta(s,'accuracy')-.006)<1e-9);
 s.book.eel=50;assert.equal(bookDelta(s,'magic'),2);assert.equal(bookDelta(s,'resist'),.5);
 s.book.grottoWarden=50;assert.equal(bookDelta(s,'attack'),5);assert.equal(bookDelta(s,'magic'),3);assert.equal(bookDelta(s,'hp'),5);
 const r=newState(0),exp=stats(r).expBonus;for(const id of STAGES[0].fish)r.book[id]=50;
 assert.ok(Math.abs(stats(r).expBonus-exp-.03)<1e-9);assert.equal(bookDelta(r,'hp'),0);
 const k=newState(0);assert.equal(bookMod.rareSpawnBonus(k),0);for(const id of STAGES.find(x=>x.id==='kelp').fish)k.book[id]=50;assert.equal(bookMod.rareSpawnBonus(k),.1);
 assert.equal(weightedFishId(['minnow','seahorse'],()=>.84),'minnow');assert.equal(weightedFishId(['minnow','seahorse'],()=>.84,.1),'seahorse');
 const v=newState(0);v.book.minnow=49;assert.equal(bookMod.bookRevealed(v,'minnow'),false);v.book.minnow=50;assert.equal(bookMod.bookRevealed(v,'minnow'),true);
});
test('Ecology research: from stage 2 only against that species, +2% dealt / -1% taken per stage',()=>{
 const s=newState(0);s.book.minnow=499;assert.equal(bookMod.bookEcology(s,'minnow').stages,0);
 s.book.minnow=500;assert.deepEqual(bookMod.bookEcology(s,'minnow'),{stages:1,dealt:.02,taken:.01});
 s.book.minnow=10000;const e=bookMod.bookEcology(s,'minnow');assert.equal(e.stages,3);assert.ok(Math.abs(e.dealt-.06)<1e-9&&Math.abs(e.taken-.03)<1e-9);assert.equal(bookMod.bookEcology(s,'carp').stages,0);
 const base={attack:1000,defense:0,hp:1e6,crit:0,accuracy:2,evasion:0,speed:10,mana:0,manaRegen:0,resist:0,penetration:0,lifesteal:0,critDamage:1.5,magic:0};
 const hit=(a,b)=>{const x={name:'a',stats:base,hp:1e6,skills:[],cooldowns:{},stun:0,...a},y={name:'b',stats:base,hp:1e6,skills:[],cooldowns:{},stun:0,...b};strike(x,y,()=>.5);return 1e6-y.hp;};
 assert.equal(hit({},{}),1000);assert.equal(hit({damageDealt:.06},{}),1060);assert.equal(hit({},{damageTaken:.03}),970);
});
test('Pearl research: locked research is refused server-side until its rebirth count',()=>{
 const r=economy.RESEARCH.find(x=>x.id==='magicAttack'),before=r.rebirth;r.rebirth=2;
 try{const s=newState(0);s.pearls=100;assert.throws(()=>act(s,{type:'permanent',id:'magicAttack'},0),/환생 2회/);assert.equal(s.pearls,100);assert.equal(s.permanent.magicAttack||0,0);
  s.rebirths=2;act(s,{type:'permanent',id:'magicAttack'},0);assert.equal(s.permanent.magicAttack,1);assert.equal(s.pearls,98);}
 finally{r.rebirth=before;}
 for(const x of economy.RESEARCH)assert.ok(['combat','utility','gold'].includes(x.tab));
});
test('Pearl research: physical and magic attack/defense are separate research lines',()=>{
 const factor=(s,k)=>{const t={};stats(s,t);return (t[k]||[]).filter(x=>x.source==='research'&&x.factor!==undefined).reduce((a,x)=>a*x.factor,1);};
 const s=newState(0);s.permanent.attack=10;assert.ok(Math.abs(factor(s,'attack')-1.5)<1e-9);assert.equal(factor(s,'magic'),1);
 s.permanent.magicAttack=4;assert.ok(Math.abs(factor(s,'magic')-1.2)<1e-9);assert.ok(Math.abs(factor(s,'attack')-1.5)<1e-9);
 s.permanent.guard=5;assert.ok(Math.abs(factor(s,'defense')-1.15)<1e-9);assert.equal(factor(s,'resist'),1);
 s.permanent.magicGuard=2;assert.ok(Math.abs(factor(s,'resist')-1.06)<1e-9);
});
test('Pearl research reset: per-tab refund, first reset free then 90% floored, refusal conditions',()=>{
 const s=newState(0);s.pearls=0;s.permanent.attack=3;s.permanent.magicAttack=1;s.permanent.hp=2;s.permanent.gold=2;
 assert.throws(()=>act(s,{type:'resetResearch',id:'nope'},0));
 s.running=true;assert.throws(()=>act(s,{type:'resetResearch',id:'combat'},0),/자동 낚시/);s.running=false;
 s.dungeon={id:'grotto',wave:0};assert.throws(()=>act(s,{type:'resetResearch',id:'combat'},0));s.dungeon=null;
 assert.throws(()=>act(s,{type:'resetResearch',id:'utility'},0),/돌려받을/);
 assert.deepEqual(researchRefund(s,'combat').refund,(2+4+6)+2+(2+4));
 act(s,{type:'resetResearch',id:'combat'},0);assert.equal(s.pearls,20);assert.equal(s.researchResetUsed,true);
 assert.equal(s.permanent.attack||0,0);assert.equal(s.permanent.magicAttack||0,0);assert.equal(s.permanent.hp||0,0);assert.equal(s.permanent.gold,2);
 act(s,{type:'resetResearch',id:'gold'},0);assert.equal(s.pearls,20+Math.floor((3+5)*.9));assert.equal(s.permanent.gold||0,0);
 s.level=40;act(s,{type:'rebirth'},0);assert.equal(s.researchResetUsed,true);
 const a=newState(0);a.permanent.ap=4;const cap=apCapacity(a);const pool=['hook',...SKILLS.filter(x=>x.cost).map(x=>x.id).filter(id=>id!=='hook')];a.skills=[];
 for(const id of pool){if(apUsed({...a,skills:[...a.skills,id]})>cap)continue;a.skills.push(id);if(apUsed(a)>cap-4)break;}
 assert.ok(apUsed(a)>cap-4&&apUsed(a)<=cap);const p=a.pearls;
 assert.throws(()=>act(a,{type:'resetResearch',id:'utility'},0),/AP/);assert.equal(a.permanent.ap,4);assert.equal(a.pearls,p);assert.equal(a.researchResetUsed,undefined);
});
