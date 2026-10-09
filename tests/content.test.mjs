// 상태 표시·설명 생성·심연·환생 시점·반복·팔방 항해사·무리 사냥·추가타
import { xpNeeded, bookMod, weightedMonsterId, spawn, STAGES, economy, researchRefund, apUsed, apCapacity, newState, act, advance, tick, stats, expMultiplier, victoryMastery, visibleStatuses, strike, combatFxFromLog, maxSkillLevel, jobMasteryTarget, jobCombatMultiplier, skillGrowthStages, SKILLS, DUNGEONS, gambleCost, goldMultiplier, metaMod, longTerm, JOBS, assert, rng, test, SKILL_FORMULA ,MONSTER_SHAPES,monsterShape,unmappedMonsters,MONSTERS,SKILL_FX,fxVariantOf,variantChances,equipment,migrations,reward,mimicChanceOf,MIMIC_DATA,setClosures,closuresSnapshot} from './harness.mjs';
const inventoryCapOf=()=>economy.inventoryCap(); // v3.154 가방은 연구와 무관하게 100칸
test('Name statuses include bleed, show consumed stun and target haste at its actor',()=>{
 const stun=combatFxFromLog({id:1,type:'battle',text:'나: 기절로 행동 불가.'},'나');
 assert.equal(visibleStatuses({},0,[stun],'player')[0].label,'기절함');assert.equal(visibleStatuses({},0,[stun],'enemy').length,0);
 assert.equal(visibleStatuses({dot:{turns:2,damage:1,name:'출혈'},silence:2},1,[stun],'player').length,3);
 const haste=combatFxFromLog({id:2,type:'battle',text:'적 · 광폭화 → 10 물리 피해 · 가속 3턴'},'나');
 assert.equal(visibleStatuses({},0,[haste],'enemy')[0].id,'haste');assert.equal(visibleStatuses({},0,[haste],'player').length,0);
});

test('v3.60 one appraisal for all slots: slot, rod style and rarity are rolled in that order, charging once',()=>{
 for(const [slotRoll,styleRoll,slot,style] of [[0,0,'rod','physical'],[.2,.5,'rod','magic'],[.3,.5,'coat','balanced'],[.6,.5,'charm','balanced'],[.9,.5,'cape','balanced']]){
  const s=newState(0);s.gold=10000;const rolls=slot==='rod'?[slotRoll,styleRoll,.95,.2]:[slotRoll,.95,.2];act(s,{type:'gamble',id:'all'},0,()=>rolls.shift()??0);
  assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].slot,slot);assert.equal(s.inventory[0].style,style);assert.equal(s.inventory[0].rarity,3);assert.equal(s.gold,10000-gambleCost(s));
 }
 for(const id of ['unknown','rod','coat']){const s=newState(0);s.gold=10000;const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'gamble',id},0),/부위/);assert.equal(JSON.stringify(s),before,'no slot choice');}
});
test('Job mastery strengthens only the currently selected job and never its penalties',()=>{
 const s=newState(0);s.level=50;s.permanent.attack=100;s.skills=[];s.job='harpoon';const strip=a=>Object.fromEntries(Object.entries(a).filter(([k])=>k!=='masteredPower'));const base=strip(stats(s));
 s.jobMastery.tide=jobMasteryTarget('tide');assert.deepEqual(strip(stats(s)),base);assert.equal(stats(s).masteredPower,1,'mastered count is a reference stat, not strength');
 s.jobMastery.harpoon=jobMasteryTarget('harpoon');assert.ok(stats(s).attack>base.attack);
 s.job='fisher';assert.deepEqual(strip(stats(s)),strip(stats({...s,jobMastery:{}})));
 const penaltyJob=JOBS.find(j=>j.hp<1);assert.equal(jobCombatMultiplier(penaltyJob,penaltyJob.hp,true),penaltyJob.hp);
});
test('Growth descriptions expose real bone penalties, negative AP and farming stages',()=>{
 const bone=skillGrowthStages(SKILLS.find(sk=>sk.id==='boneLegacy')).filter(r=>!r.broken);// v27.6 한계돌파 행 제외
 assert.deepEqual(bone.map(r=>[r.practice,r.effective.cost,r.effective.bonus?.hp||0,r.effective.bonus?.defense||0]),[[0,6,0,0],[1e6,4,0,0],[4e6,2,100,12],[1e7,-3,450,45]]);// v3.137 백만 단위 · 작은 마이너스 제거
 assert.deepEqual(bone.map(r=>r.effective.penaltyRelief||0),[0,.15,.5,1]);
 const loot=skillGrowthStages(SKILLS.find(sk=>sk.id==='salvageContract'));assert.ok(loot[0].effects.includes('장비 드롭 보너스 +45%'),loot[0].effects.join('|'));const codex=skillGrowthStages(SKILLS.find(sk=>sk.id==='rareSense'));assert.match(codex[0].effects.join(' '),/골드 획득 보너스 \+1\d%/);// v3.156 메소 마스터리: 기록 비례 대신 처치 골드
 const study=skillGrowthStages(SKILLS.find(sk=>sk.id==='titanFieldNotes'));assert.match(study[0].effects.join(' '),/모든 보스 처치 시 숙련 ×3/);assert.match(study.at(-1).effects.join(' '),/숙련 ×8/);
});
test('Active descriptions show maximum-resource scaling, statuses and additional hits',()=>{
 const voidLance=skillGrowthStages(SKILLS.find(sk=>sk.id==='voidLance'));assert.match(voidLance[0].effects.join(' '),/태운 마나/);
 const oath=skillGrowthStages(SKILLS.find(sk=>sk.id==='oath'));assert.match(oath[0].effects[0],/마법 공격\(물리 피해로 바꿈\)/);
 const hush=skillGrowthStages(SKILLS.find(sk=>sk.id==='sealHex'));assert.match(hush[0].effects.join(' '),/침묵 4턴/);assert.match(hush[0].effects[0],/직접 피해 없음/);
 const twin=skillGrowthStages(SKILLS.find(sk=>sk.id==='twinHook'));assert.match(twin[0].effects.join(' '),/추가 공격/);
 for(const sk of SKILLS){const rows=skillGrowthStages(sk);assert.equal(rows.length,maxSkillLevel(sk)+1+3,'v27.6 limit break rows');assert.equal(rows.filter(r=>!r.broken).length,maxSkillLevel(sk)+1);assert.ok(rows.every(r=>r.effects.length&&Number.isFinite(r.effective.cost)));}
});

test('Abyss pearls scale with depth and milestone SP is granted once and survives rebirth',()=>{
 const {abyssPearls,ABYSS_SP_MILESTONES}=longTerm;
 assert.deepEqual([1,5,9,10,15,25,50].map(abyssPearls),[1,3,1,6,6,9,18]);
 const clearNext=(s)=>{act(s,{type:'dungeon',id:'abyss'},s.lastTick);let t=s.lastTick;for(let i=0;i<4000&&s.dungeon;i++){t+=2000;advance(s,t,rng);}assert.equal(s.dungeon,null);};
 const s=newState(0);s.level=60;s.rebirths=3;s.permanent.attack=3000000;s.permanent.hp=3000000;s.permanent.guard=1000000;s.abyssBest=9;s.sp=0;s.hp=stats(s).hp;s.mana=stats(s).mana;
 act(s,{type:'sync'},s.lastTick);const pearls=s.pearls;clearNext(s);
 assert.equal(s.abyssBest,10);assert.equal(s.pearls-pearls,16,"v25.8: floor 6 + 10F first-break bonus 10");assert.equal(s.sp,1);assert.deepEqual(s.abyssMilestones,[10]);
 s.abyssBest=24;s.hp=stats(s).hp;clearNext(s);assert.equal(s.sp,2);assert.deepEqual(s.abyssMilestones,[10,25]);
 s.abyssMilestones.push(50);s.abyssBest=49;s.hp=stats(s).hp;clearNext(s);assert.equal(s.sp,2,'already-claimed milestone pays nothing');
 s.level=100;act(s,{type:'rebirth'},s.lastTick);assert.deepEqual(s.abyssMilestones,[10,25,50]);
 assert.deepEqual(ABYSS_SP_MILESTONES,[10,25,50,100]);
});

test('v3.23 Rebirth: tailwind adds +50% to the exp bonus until the target, then the over-target wall compounds',()=>{
 const meta=metaMod;
 const s=newState(0);s.rebirths=6;s.level=100;assert.equal(meta.rebirthLevel(s),60);
 act(s,{type:'sync'},0);const pearls=s.pearls,expected=meta.rebirthReward(s,stats(s).rebirthBonus||0);act(s,{type:'rebirth'},0);
 assert.equal(s.pearls-pearls,expected,'no deep voyage pearls');assert.equal(victoryMastery(s,{id:'minnow',boss:false}).amount,1,'no deep voyage mastery');
 const f=newState(0);f.rebirths=7;f.level=10;assert.ok(meta.tailwindActive(f));assert.ok(!meta.tailwindActive({...f,rebirths:0}),'no tailwind before the first rebirth');
 const e=stats(f).expBonus,off={...f,level:meta.rebirthLevel(f)};assert.ok(!meta.tailwindActive(off),'tailwind ends at the rebirth level');
 assert.ok(Math.abs(expMultiplier(f)/expMultiplier(off)-(1+e+.5)/(1+e))<1e-9,'additive with the exp bonus');
 const w=meta.xpWall(f);assert.deepEqual(w,{target:meta.rebirthLevel(f),growth:1.6});
 assert.equal(xpNeeded(w.target-1,f.rebirths,w),xpNeeded(w.target-1,f.rebirths),'below the target: unchanged');
 for(const [lv,x] of [[w.target,1.6],[w.target+1,1.6**2],[w.target+4,1.6**5]])assert.ok(Math.abs(xpNeeded(lv,f.rebirths,w)/xpNeeded(lv,f.rebirths)-x)/x<1e-3,`Lv.${lv}`);
});

test('Dungeon repeat runs until its stop condition, then resumes idle hunting',()=>{
 const strong=()=>{const s=newState(0);s.level=60;s.rebirths=3;s.permanent.attack=3000000;s.permanent.hp=3000000;s.permanent.guard=1000000;s.hp=stats(s).hp;s.mana=stats(s).mana;return s;};
 const run=(s,limit=20000)=>{let t=s.lastTick;for(let i=0;i<limit&&s.dungeon;i++){t+=2000;advance(s,t,rng);}};
 const first=[...DUNGEONS].sort((a,b)=>a.level-b.level)[0];
 const s=strong();act(s,{type:'dungeon',id:first.id,value:'5'},0);assert.equal(s.dungeon.repeat.left,4);run(s);
 assert.equal(s.clears[first.id],5);assert.equal(s.dungeon,null);assert.equal(s.running,true,'idle hunting resumes');
 const once=strong();act(once,{type:'dungeon',id:first.id},0);assert.equal(once.dungeon.repeat,undefined);run(once);assert.equal(once.clears[first.id],1);assert.equal(once.running,false,'single run keeps old behaviour');
 const a=strong();a.abyssBest=3;act(a,{type:'dungeon',id:'abyss',value:'deeper:5'},0);assert.equal(a.dungeon.repeat.until,8);run(a);assert.equal(a.abyssBest,8);assert.equal(a.running,true);
 const w=newState(0);w.level=60;w.rebirths=3;w.abyssBest=40;w.hp=stats(w).hp;act(w,{type:'dungeon',id:'abyss',value:'fail'},0);run(w,100000);
 assert.equal(w.dungeon,null);assert.equal(w.abyssBest,40);assert.equal(w.running,true,'failure falls back to hunting');
 assert.throws(()=>act(strong(),{type:'dungeon',id:first.id,value:'0'},0));
});

test('Harmony stat: allocated-point formula and per-job passive scaling (all-rounder removed in v3.163)',()=>{
 const s=newState(0);s.level=40;s.attributes={str:20,dex:20,int:20,vit:20,wis:20,luk:15};
 const rawHarmony=40+115*.8+15*12;assert.equal(stats(s).harmony,Math.floor(rawHarmony*SKILL_FORMULA.harmonyScale));
 // 서로 다른 직업의 능력치 패시브를 장착할수록 조화가 강해지고, 같은 직업의 패시브는 한 번만 셉니다.
 for(const id of ['axeArm','bookwise','innerBreath']){s.skillInheritances[id]=true;s.learned[id]=1;}
 s.skills=['axeArm','bookwise','innerBreath'];assert.equal(stats(s).harmony,Math.floor(rawHarmony*SKILL_FORMULA.harmonyScale*(1+3*SKILL_FORMULA.harmonyPerJob)));
 s.skills=[];
 // v3.163 올라운더는 지웠습니다(조화 비례는 제논 본줄기의 조화 보너스로). 조화 기준값 식만 남겨 검사합니다.
});

test('Variants: appear from 10 catches; swarm sizes gated by codex and passive; giant/abyssal/starlit change stats and rewards',()=>{
 const base=()=>{const s=newState(0);s.level=40;s.permanent.attack=300;s.permanent.hp=300;s.hp=stats(s).hp;act(s,{type:'stage',id:'brook'},0);act(s,{type:'target',id:'minnow'},0);return s;};
 // v27.80 지역별 변종 배율이 있어 고정 난수 대신 이 사냥터의 실제 확률 구간 가운데를 씁니다(순서: 무리·거대·심연·별빛).
 const ch=variantChances(base()),band=k=>{const o=['swarm','giant','abyssal','starlit'];let lo=0;for(const id of o){if(id===k)return lo+ch[id]/2;lo+=ch[id];}};
 const plain=base();plain.book.minnow=9;spawn(plain,()=>0);assert.equal(plain.enemy.variant,undefined,'no variant before 10 catches');assert.equal(plain.enemy.swarm,undefined);
 const sw=base();sw.book.minnow=10;spawn(sw,()=>0);assert.equal(sw.enemy.variant,'swarm');assert.equal(sw.enemy.swarm,5,'x5 only until 500 catches');assert.equal(sw.enemy.maxHp,plain.enemy.maxHp*5);assert.equal(sw.enemy.combatStats.attack,plain.enemy.combatStats.attack,'swarm attack stays at one monster');
 const mid=base();mid.book.minnow=5000;spawn(mid,()=>0.999);assert.equal(mid.enemy.variant,undefined,'roll above total chance is a normal monster');
 let calls=0;spawn(mid,()=>calls++===0?0:.999);assert.equal(mid.enemy.swarm,100,'x100 from 500 catches');
 // v3.87 일반 사냥터 무리는 ×100까지: 도감 5,000회 · 무리 감지를 갖춰도 ×500은 나오지 않습니다(×500은 무리 서식지에서만).
 const big=base();big.book.minnow=5000;big.job='rareTracker';big.learned.swarmSense=1;big.skills.push('swarmSense');calls=0;spawn(big,()=>calls++===0?0:.999);assert.equal(big.enemy.swarm,100,'no x500 outside habitats');
 const g=base();g.book.minnow=10;spawn(g,()=>band('giant'));assert.equal(g.enemy.variant,'giant');assert.equal(g.enemy.maxHp,Math.round(plain.enemy.maxHp*3));assert.equal(g.enemy.combatStats.attack,Math.round(plain.enemy.combatStats.attack*1.25));
 const kills=g.kills,gold=g.gold,book=g.book.minnow,mult=goldMultiplier(g);const e=g.enemy;g.running=true;let guard=0;while(g.enemy===e&&guard++<3000)tick(g,()=>.5);
 assert.equal(g.kills-kills,1);assert.equal(g.book.minnow-book,3,'giant counts 3 in the codex');assert.equal(g.gold-gold,Math.floor(e.gold*mult*4),'giant gold x4');assert.equal(g.variantBook.minnow.giant,1);
 const ab=base();ab.book.minnow=10;spawn(ab,()=>band('abyssal'));assert.equal(ab.enemy.variant,'abyssal');assert.equal(ab.enemy.combatStats.speed,Math.round(plain.enemy.combatStats.speed*1.3));
 const st=base();st.book.minnow=10;st.rebirths=3;spawn(st,()=>band('starlit'));assert.equal(st.enemy.variant,'starlit');const pearls=st.pearls;const se=st.enemy;st.running=true;guard=0;while(st.enemy===se&&guard++<3000)tick(st,()=>.5);assert.equal(st.pearls-pearls,2,'starlit gives 2 pearls from rebirth 3');
 const dn=base();dn.book.minnow=100;act(dn,{type:'dungeon',id:'grotto'},0);spawn(dn,()=>0);assert.equal(dn.enemy.variant,undefined,'no variants in dungeons');
});

test('Rebirth reward breakdown always sums to the pearls actually granted',()=>{
 for(const [lv,rb,bonus] of [[30,0,0],[45,3,2],[60,6,0],[100,6,1],[100,25,3],[70,400,5]]){const s=newState(0);s.level=lv;s.rebirths=rb;const p=metaMod.rebirthRewardParts(s,bonus);assert.equal(p.level+p.count+p.bonus,metaMod.rebirthReward(s,bonus));}
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
 const a=mk(['twinHook']),weak={...mk([]),name:'B',hp:5};const ev=[];strike(a,weak,()=>0,ev);assert.equal(ev[0].hits.length,1,'no follow-up after the target dies');assert.equal(ev[0].hits[0].value,5,'value = HP actually removed');assert.equal(ev[0].total,ev[0].hits[0].raw,'v27.75 the displayed total is the computed damage');assert.ok(ev[0].hits[0].raw>5);
 const rolls=[0,0];let r=0;const b2={...mk([]),name:'B',hp:1e6};const ev2=[];strike(mk(['twinHook']),b2,()=>rolls[r++]??.9999,ev2);
 assert.ok(ev2[0].hits.some(h=>h.kind==='follow'&&h.miss),'a follow-up can miss independently');
 const crit=[];strike(mk(['wave'],{crit:1}),{...mk([]),name:'B',hp:1e6},()=>0,crit);assert.equal(crit[0].hits[0].critical,true);assert.equal(crit[0].damageType,'magic');
});

test('v27.81 codex: research stages grant no flat trait stats (ecology only); v3.38 place themes moved into region research tier 1; 50 catches reveal info',()=>{
 const bookDelta=(s,k)=>{const t={};stats(s,t);return (t[k]||[]).filter(x=>x.source==='book'&&x.factor===undefined).reduce((a,x)=>a+x.delta,0);};
 const s=newState(0);s.book.minnow=10000;s.book.eel=10000;s.book.grottoWarden=10000;
 for(const k of ['attack','magic','accuracy','resist','hp','defense'])assert.equal(bookDelta(s,k),0,`no ${k} from traits`);
 const r=newState(0),exp=stats(r).expBonus;for(const id of STAGES[0].monsters)r.book[id]=50;
 assert.ok(Math.abs(stats(r).expBonus-exp)<1e-9,'one place alone gives no theme bonus now');
 for(const id of STAGES[1].monsters)r.book[id]=50;
 assert.ok(Math.abs(stats(r).expBonus-exp-.05)<1e-9,'리스항구 tier 1: first +3% and tier +2%');assert.equal(bookDelta(r,'hp'),0);
 const k=newState(0);assert.equal(bookMod.rareSpawnBonus(k),0);for(const id of STAGES.find(x=>x.id==='kelp').monsters)k.book[id]=50;assert.equal(bookMod.rareSpawnBonus(k),0);
 for(const id of STAGES.find(x=>x.id==='reef').monsters)k.book[id]=50;assert.equal(bookMod.rareSpawnBonus(k),.1,'헤네시스 tier 1 brings the old kelp rare-spawn bonus');
 assert.equal(weightedMonsterId(['minnow','seahorse'],()=>.84),'minnow');assert.equal(weightedMonsterId(['minnow','seahorse'],()=>.84,.1),'seahorse');
 const v=newState(0);v.book.minnow=49;assert.equal(bookMod.bookRevealed(v,'minnow'),false);v.book.minnow=50;assert.equal(bookMod.bookRevealed(v,'minnow'),true);
});
test('v27.81 ecology research: from stage 2 only against that species, 3·3·4·15·25% dealt / 1.5·1.5·2·7.5·12.5% taken, max +50% / -25%',()=>{
 const s=newState(0);s.book.minnow=499;assert.equal(bookMod.bookEcology(s,'minnow').stages,0);
 s.book.minnow=500;assert.deepEqual(bookMod.bookEcology(s,'minnow'),{stages:1,dealt:.03,taken:.015});
 s.book.minnow=10000;const e=bookMod.bookEcology(s,'minnow');assert.equal(e.stages,3);assert.ok(Math.abs(e.dealt-.1)<1e-9&&Math.abs(e.taken-.05)<1e-9);s.book.minnow=500000;s.bookTier={minnow:50};const full=bookMod.bookEcology(s,'minnow');assert.equal(full.stages,5);assert.ok(Math.abs(full.dealt-.5)<1e-9&&Math.abs(full.taken-.25)<1e-9,'max +50% / -25%');s.book.minnow=10000;assert.equal(bookMod.bookEcology(s,'carp').stages,0);
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
test('Pearl research reset: per-tab refund, always free (v27.29), refusal conditions',()=>{
 const s=newState(0);s.pearls=0;s.permanent.attack=3;s.permanent.magicAttack=1;s.permanent.hp=2;s.permanent.gold=2;
 assert.throws(()=>act(s,{type:'resetResearch',id:'nope'},0));
 s.running=true;assert.throws(()=>act(s,{type:'resetResearch',id:'combat'},0),/자동 사냥/);s.running=false;
 s.dungeon={id:'grotto',wave:0};assert.throws(()=>act(s,{type:'resetResearch',id:'combat'},0));s.dungeon=null;
 assert.throws(()=>act(s,{type:'resetResearch',id:'utility'},0),/돌려받을/);
 assert.deepEqual(researchRefund(s,'combat').refund,(2+4+6)+2+(1+2)); // v3.150 체력 강화 기본 1 · 증가 1
 act(s,{type:'resetResearch',id:'combat'},0);assert.equal(s.pearls,17);assert.equal(s.researchResetUsed,true);
 assert.equal(s.permanent.attack||0,0);assert.equal(s.permanent.magicAttack||0,0);assert.equal(s.permanent.hp||0,0);assert.equal(s.permanent.gold,2);
 act(s,{type:'resetResearch',id:'gold'},0);assert.equal(s.pearls,17+(3+5));assert.equal(s.permanent.gold||0,0);
 s.level=40;act(s,{type:'rebirth'},0);assert.equal(s.researchResetUsed,true);
 const a=newState(0);a.permanent.ap=4;const cap=apCapacity(a);const pool=['hook',...SKILLS.filter(x=>x.cost).map(x=>x.id).filter(id=>id!=='hook')];a.skills=[];
 for(const id of pool){if(apUsed({...a,skills:[...a.skills,id]})>cap)continue;a.skills.push(id);if(apUsed(a)>cap-4)break;}
 assert.ok(apUsed(a)>cap-4&&apUsed(a)<=cap);const p=a.pearls;
 assert.throws(()=>act(a,{type:'resetResearch',id:'utility'},0),/AP/);assert.equal(a.permanent.ap,4);assert.equal(a.pearls,p);assert.equal(a.researchResetUsed,undefined);
});

test('v27.11 art: every monster has a silhouette shape and the shape table has no stale ids',()=>{
 assert.deepEqual(unmappedMonsters(),[],'monster without a silhouette shape');
 for(const id of Object.keys(MONSTER_SHAPES)) assert.ok(MONSTERS.some(f=>f.id===id),`stale shape id ${id}`);
 assert.equal(monsterShape('magmaKraken'),'demon');assert.equal(monsterShape('nope'),'slime');
});

test('v27.13 batch appraisal: 5 or 10 at once, all-or-nothing on gold and bag room, same rolls as singles',()=>{
 const s=newState(0);s.gold=100000;const seq=()=>.55;
 act(s,{type:'gamble',id:'all',value:'5'},0,seq);assert.equal(s.inventory.length,5);assert.ok(s.inventory.every(i=>i.rarity>=1));
 assert.match(s.logs.at(-1).text,/랜덤 뽑기 5개/);
 const t=newState(0);t.gold=10;assert.throws(()=>act(t,{type:'gamble',id:'all',value:'5'},0,seq),/골드/);assert.equal(t.inventory.length,0);assert.equal(t.gold,10,'nothing spent when short');
 const u=newState(0);u.gold=100000;u.inventory=Array.from({length:inventoryCapOf(u)-3},(_,i)=>({id:'x'+i,name:'x',slot:'rod',power:1,level:1}));
 assert.throws(()=>act(u,{type:'gamble',id:'all',value:'5'},0,seq),/가방에 5칸/);assert.throws(()=>act(u,{type:'gamble',id:'all',value:'7'},0,seq),/1·5·10/);
 act(u,{type:'gamble',id:'all',value:'1'},0,seq);assert.equal(u.inventory.length,inventoryCapOf(u)-2);
 const a=newState(0),b=newState(0);a.gold=b.gold=100000;const seqA=[.2,.7,.1,.9,.3,.4,.6,.8,.05,.5],seqB=[...seqA];
 act(a,{type:'gamble',id:'all',value:'1'},0,()=>seqA.shift()??.5);act(b,{type:'gamble',id:'all'},0,()=>seqB.shift()??.5);
 assert.deepEqual({...a.inventory[0],id:0},{...b.inventory[0],id:0},'value 1 equals the old single appraisal');
});

test('v27.14 skill fx overrides name real skills and win over the id rules',()=>{
 for(const id of Object.keys(SKILL_FX)) assert.ok(SKILLS.some(x=>x.id===id),`stale fx id ${id}`);
 assert.equal(fxVariantOf('heavenlyDice',false),'gold');assert.equal(fxVariantOf('rapidJab',false),'pierce');assert.equal(fxVariantOf('timeMachine',false),'time');
 assert.equal(fxVariantOf('foeVenom',false,'bleed'),'venom');assert.equal(fxVariantOf('foeInkBurst',true),'ink');assert.equal(fxVariantOf('graveHook',true),'bone');assert.equal(fxVariantOf('rewind',false),'time');
 assert.equal(fxVariantOf('fireball',true),'fire','id rules still apply without an override');assert.equal(fxVariantOf(undefined,true),'arcane');
 const actives=SKILLS.filter(x=>x.type==='active');assert.ok(actives.every(x=>typeof fxVariantOf(x.id,x.damageType==='magic',x.effect)==='string'));
});

test('v27.14 mastery x2 event doubles victory practice',()=>{
 const run=ev=>{const s=newState(0);s.running=true;s.event=ev;s.enemy={id:'minnow',name:'target',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};let guard=0;while(s.enemy&&s.enemy.hp>0&&guard++<50)tick(s,()=>.5);return s.jobMastery.fisher||0;};
 const plain=run(null),doubled=run({id:'m',name:'m',until:9e15,exp:1,gold:1,drop:1,mastery:2});
 assert.ok(plain>0&&doubled===plain*2,`doubled: ${plain} vs ${doubled}`);
});

test('v27.16 stuck-state repair: NaN hp, dead enemy left over, unknown stage, and stalemates all recover',()=>{
 const s=newState(0);s.running=true;s.hp=NaN;s.mana=NaN;s.recovery=NaN;s.stage='nowhere';s.enemy={id:'ghost-monster',name:'x',hp:NaN,maxHp:1,attack:1,defense:1,exp:1,gold:1,boss:false,stun:0};
 tick(s,()=>.5);assert.ok(Number.isFinite(s.hp)&&Number.isFinite(s.mana)&&s.recovery>=0&&s.stage===STAGES[0].id,'repaired');assert.ok(s.logs.some(l=>l.text.includes('전투 상태를 복구')));
 assert.ok(!s.enemy||s.enemy.id!=='ghost-monster','bad enemy discarded');
 const t=newState(0);t.lastTick=NaN;advance(t,5000);assert.ok(Number.isFinite(t.lastTick));
 const u=newState(0);u.running=true;u.enemy={id:'minnow',name:'돌',hp:10,maxHp:10,attack:0,defense:0,exp:1,gold:1,boss:false,stun:99999,combatStats:{hp:10,attack:0,magic:0,defense:1e9,resist:1e9,crit:0,speed:1,evasion:0,accuracy:0}};
 u.hp=1;for(let i=0;i<130&&u.enemy&&u.enemy.id==='minnow';i++)tick(u,()=>.5);
 assert.ok(!u.enemy||u.enemy.id!=='minnow'||u.enemy.hp<10,'stalemate broken within 130 turns');
});

test('v27.18 charm crit is uncapped and crit above 60% becomes super crit (x1.5 crit damage)',()=>{
 const mk=(power,enhance,rarity=3)=>equipment.itemStats({id:'c',name:'c',slot:'charm',power,level:1,enhance,rarity});
 assert.ok(mk(100,5).crit>mk(100,0).crit,'enhancing keeps raising charm crit');
 // v27.36 장신구 치명타는 등급 고정값: 위력(레벨)과 무관하고 전설 +10은 15%.
 assert.equal(mk(100,0).crit,mk(900,0).crit);assert.ok(Math.abs(mk(100,10).crit-.15)<1e-9);assert.ok(mk(100,0,6).crit>mk(100,0,3).crit);
 const s=newState(0);s.attributes.luk=400;const a=stats(s);assert.equal(a.crit,SKILL_FORMULA.critCap);assert.ok(a.superCrit>0&&a.superCrit<.02,'overflow goes to super crit at 1% per 100%p: '+a.superCrit);
 const base={hp:1e6,attack:100,magic:0,defense:0,resist:0,crit:1,superCrit:.5,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:2};
 const f=(extra={})=>({name:'A',stats:{...base,...extra},hp:1e6,mana:100,skills:[],cooldowns:{},stun:0,effects:{},ranks:{},mastery:{},practice:{}});
 const plain=f({crit:0,superCrit:0}),t1=f({});strike(plain,t1,()=>.4);const normal=1e6-t1.hp;
 const sup=f();const target=f({});const text=strike(sup,target,()=>.4);assert.equal(1e6-target.hp,normal*2*SKILL_FORMULA.superCritBonus,'super crit multiplies crit damage');assert.match(text,/\[극 치명타\]/);
 const target2=f({});const text2=strike(f(),target2,()=>.7);assert.equal(1e6-target2.hp,normal*2,'roll above superCrit is a normal crit');assert.ok(text2.includes('[치명타]')&&!text2.includes('[극 치명타]'));
 const fx=combatFxFromLog({id:1,type:'battle',text},'A');assert.ok(fx&&fx.hits[0].superCritical&&fx.hits[0].critical,'feedback parses the super crit label');
});

test('v27.19 relics come from rebirth count, and pearls spent before the change are refunded once',()=>{
 const s=newState(0);s.level=30;s.pearls=5;act(s,{type:'rebirth'},0);const pearls=s.pearls;
 act(s,{type:'buyRelic',id:'memoryRod'},0);assert.equal(s.pearls,pearls,'no pearls spent');assert.ok(s.inventory.some(i=>i.relic==='memoryRod'));
 assert.throws(()=>act(s,{type:'buyRelic',id:'soulCoat'},0),/환생 조건/);
 const before=s.pearls;s.relicRefunded=false;const refund=migrations.refundRelicPurchases(s);assert.equal(refund,10);assert.equal(s.pearls,before+10);assert.equal(migrations.refundRelicPurchases(s),0,'only once');
 const u=newState(0);assert.equal(migrations.refundRelicPurchases(u),0);assert.equal(u.relicRefunded,true);
});

test('v3.58 plain (white) codex entries start registered now that the plain purchase is gone',()=>{
 const s=newState(0);for(const slot of ['rod','coat','charm','cape'])assert.equal(s.itemBook[`${slot}:0`],true);
 assert.throws(()=>act(s,{type:'buy',id:'charm',value:'plain'},0));
});

test('v27.74 catch mastery ignores stage tide (the tide mastery multiplier is gone); v3.201 dungeons give none',()=>{
 const run=(tide,dungeon)=>{const s=newState(0);s.running=true;s.rebirths=10;s.tide=tide;if(dungeon){s.dungeon=dungeon==='abyss'?{id:'abyss',wave:0,depth:1}:{id:'grotto',wave:0,...(dungeon==='hell'?{mode:'hell'}:{})};}s.enemy={id:'minnow',name:'t',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};let g=0;while(s.enemy&&s.enemy.hp>0&&g++<50)tick(s,()=>.5);return s.jobMastery.fisher||0;};
 const base=run(0,false);assert.ok(base>0);assert.equal(run(10,false),base,'tide 10 gives the same catch mastery');assert.equal(run(10,true),0,'v3.201 dungeons give no catch mastery');assert.equal(run(0,'hell'),0,'hell dungeon neither');assert.equal(run(10,'abyss'),0,'Mu Lung neither');
});

test('v27.22 mastery mimic: rare stage-only spawn with the strongest local body, pays lottery mastery to job and equipped skills',()=>{
 const s=newState(0);s.level=20;s.kills=100;s.stage='reef';s.running=true;s.skills=['hook'];
 const flat=newState(0);flat.level=20;flat.kills=100;flat.stage='reef';flat.tide=MIMIC_DATA.minTier-1;spawn(flat,()=>0);assert.notEqual(flat.enemy.id,'masteryMimic','v27.59 needs stage difficulty 5');
 s.tide=MIMIC_DATA.minTier;spawn(s,()=>0);assert.equal(s.enemy.id,'masteryMimic','roll 0 spawns the mimic');assert.equal(s.enemy.name,'숙련의 까미');assert.equal(mimicChanceOf(10,0),MIMIC_DATA.chance+10*MIMIC_DATA.chancePerTier,'tide raises the chance');assert.ok(Math.abs(mimicChanceOf(0,4)-MIMIC_DATA.chance*(1+4*MIMIC_DATA.stageStep))<1e-12,'later stages raise the chance');
 const top=MONSTERS.filter(f=>['lionfish','eel','barracuda','stormBarracuda'].includes(f.id)).sort((a,b)=>b.level-a.level)[0];assert.ok(s.enemy.maxHp>top.hp*2,'borrows the strongest local body');
 const low=newState(0);low.level=5;low.kills=500;low.stage='reef';low.tide=5;spawn(low,()=>0);assert.notEqual(low.enemy.id,'masteryMimic','not before Lv.10');
 const d=newState(0);d.level=20;d.kills=500;d.dungeon={id:'grotto',wave:0};spawn(d,()=>0);assert.notEqual(d.enemy.id,'masteryMimic','never in dungeons');
 s.enemy.hp=0;reward(s,()=>.99);
 assert.ok((s.jobMastery.fisher||0)>=100000,'big ticket: '+s.jobMastery.fisher);assert.ok((s.skillPractice.hook||0)>=100000);assert.equal(s.book.masteryMimic,1);assert.ok(s.logs.some(l=>l.text.includes('숙련의 까미')));
});

test('v27.24 ultimate finale skills exist, belong to 5th-tier jobs, and the fx parser carries the skill id',()=>{
 const ids=['braveSlash','oceanWrath','genesis','doomMark','redApocalypse','worldTentacle','jackpotStrike','frozenTime'];
 for(const id of ids){const sk=SKILLS.find(x=>x.id===id);assert.ok(sk,id);const job=JOBS.find(j=>j.id===sk.job);assert.ok(job&&(job.tier===5||job.id==='chronarch'),id+' job tier');}
 const fx=combatFxFromLog({id:9,type:'battle',text:'나 · 소드 오브 버닝 소울 → 100 물리 피해'},'나');assert.equal(fx.skillId,'braveSlash');
});

test('v27.25·v27.31 closed dungeons/stages refuse entry, evict saves inside, and are written to State.closed',()=>{
 setClosures({dungeons:['abyss'],stages:['brook','reef']});
 try {
  assert.deepEqual(closuresSnapshot(),{dungeons:['abyss'],stages:['reef']},'first stage can never close');
  const s=newState(0);s.level=60;s.rebirths=3;assert.throws(()=>act(s,{type:'dungeon',id:'abyss'},0),/점검 중/);
  assert.throws(()=>act(s,{type:'stage',id:'reef'},0),/점검 중/);
  const inside=newState(0);inside.level=60;inside.rebirths=3;inside.running=true;inside.dungeon={id:'abyss',wave:1,depth:5};inside.enemy={id:'dragon',name:'x',hp:10,maxHp:10,attack:0,defense:0,exp:1,gold:1,boss:false,stun:0};
  tick(inside,()=>.5);assert.equal(inside.dungeon,null,'evicted');assert.ok(inside.running,'keeps hunting');assert.ok(inside.logs.some(l=>l.text.includes('점검으로 닫혀')));
  const hunting=newState(0);hunting.level=60;hunting.rebirths=3;hunting.stage='reef';hunting.running=true;tick(hunting,()=>.5);
  assert.notEqual(hunting.stage,'reef','moved off a closed stage');assert.ok(STAGES.findIndex(x=>x.id===hunting.stage)<STAGES.findIndex(x=>x.id==='reef'),'moved to an earlier stage');
  const g=newState(0);g.level=60;g.rebirths=3;act(g,{type:'dungeon',id:'grotto'},0);assert.equal(g.dungeon.id,'grotto','other dungeons stay open');
  const synced=newState(0);advance(synced,1000);assert.deepEqual(synced.closed,{dungeons:['abyss'],stages:['reef']},'advance writes the list for the UI');
 } finally { setClosures({dungeons:[],stages:[]}); }
 const open=newState(0);advance(open,1000);assert.equal(open.closed,undefined);
});

test('v27.26 restartLife resets this life only: rebirths, pearls, relics, research and codex stay',async()=>{
 const {restartLife}=await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/actions/lifecycle');
 const s=newState(0);s.level=55;s.rebirths=4;s.pearls=77;s.gold=99999;s.job='harpoon';s.unlockedJobs.push('harpoon');s.attributes.str=40;s.permanent.ap=2;s.book.minnow=12;s.running=true;s.dungeon={id:'grotto',wave:2};
 s.inventory=[{id:'r',name:'윤회의 무기',slot:'rod',power:45,rarity:3,level:1,relic:'memoryRod',locked:true},{id:'n',name:'x',slot:'coat',power:10,rarity:1,level:40}];
 restartLife(s,1000);
 assert.equal(s.level,1);assert.equal(s.job,'fisher');assert.equal(s.attributes.str,0);assert.equal(s.dungeon,null);assert.equal(s.running,false);
 assert.equal(s.rebirths,4);assert.equal(s.pearls,77);assert.equal(s.permanent.ap,2);assert.equal(s.book.minnow,12);
 assert.deepEqual(s.inventory.map(i=>i.id),['r'],'only relics survive');assert.ok(s.logs.some(l=>l.text.includes('운영 조치')));
});

test('v3.201 dungeons pay no kill rewards and a fixed dungeon coin per clear; the coin shop sells onyx, gear boxes and the hunter imprint',async()=>{
 const W=await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/world');
 const {restartLife}=await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/actions/lifecycle');
 const clear=(mode,depth)=>{const s=newState(0);s.level=40;s.rebirths=10;s.running=true;const id=depth?'abyss':'grotto';const len=W.DUNGEONS.find(d=>d.id===id).monsters.length;s.dungeon={id,wave:len-1,...(depth?{depth}:{}),...(mode?{mode}:{})};s.clears[id]=1;s.enemy={id:'minnow',name:'t',hp:1,maxHp:1,attack:0,defense:0,exp:50,gold:50,boss:true,stun:0};const gold=s.gold,exp=s.exp,inv=s.inventory.length;let g=0;while(s.enemy&&g++<50)tick(s,()=>.5);return {s,gold:s.gold-gold,exp:s.exp-exp,inv:s.inventory.length-inv};};
 const n=clear();assert.equal(n.gold,0,'no kill or clear gold');assert.equal(n.exp,0,'no kill exp');assert.equal(n.inv,0,'no repeat drop');assert.equal(n.s.dungeonCoins,20,'v3.201 first normal clear of the day = 20 bonus coins');assert.equal(n.s.clears.grotto,2);
 assert.equal(clear('hell').s.dungeonCoins,40);assert.equal(clear('nightmare').s.dungeonCoins,60);const mu=clear(undefined,12).s;assert.equal(mu.dungeonCoins,2,'Mu Lung floor 12 = 1 + 1, no daily bonus');assert.equal(mu.dungeonBonus,undefined,'Mu Lung does not spend the daily bonus');
 const s=newState(0);s.level=40;s.dungeonCoins=0;
 assert.throws(()=>act(s,{type:'dungeonShop',id:'gearBox'},0),/주화가 부족/);
 s.dungeonCoins=100;act(s,{type:'dungeonShop',id:'gearBox'},0,()=>.5);assert.equal(s.dungeonCoins,0);assert.equal(s.inventory.at(-1).rarity>=3,true,'v3.201 legendary or better');
 const P=(await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/dungeon-shop')).DUNGEON_SHOP;assert.deepEqual([P.gearBox,P.quality100,P.hunterImprint,P.quality120,P.onyxAwaken,P.onyxCraft],[100,300,2400,3600,12000,24000],'v3.201 price ladder');
 s.dungeonCoins=P.onyxCraft+P.onyxAwaken+P.hunterImprint;assert.throws(()=>act(s,{type:'dungeonShop',id:'onyx:onyxDusk'},0),/처치해야/);
 s.onyxBook={onyxDusk:1};act(s,{type:'dungeonShop',id:'onyx:onyxDusk'},0,()=>.5);assert.equal(s.dungeonCoins,P.onyxAwaken+P.hunterImprint);const onyx=s.inventory.find(i=>i.onyx==='onyxDusk');assert.ok(onyx,'crafted');
 assert.throws(()=>act(s,{type:'dungeonShop',id:'onyx:onyxDusk'},0,()=>.5),/하루 1번/,'v3.201 onyx goods once per KST day');
 act(s,{type:'dungeonShop',id:'onyx:onyxDusk'},86400000,()=>.5);assert.equal(s.dungeonCoins,P.hunterImprint);assert.equal(onyx.onyxRank,1,'second purchase awakens');
 const line=onyx.affixes.findIndex(a=>!a.rule);act(s,{type:'dungeonShop',id:'hunter',value:`${onyx.id}|${line}`},0,()=>.5);assert.equal(s.dungeonCoins,0);assert.equal(onyx.affixes[line].id,'hunter');
 s.dungeonCoins=5000;assert.throws(()=>act(s,{type:'dungeonShop',id:'hunter',value:`${onyx.id}|${line}`},0),/이미 포식자/);
 const rule=onyx.affixes.findIndex(a=>a.rule);assert.ok(rule>=0);
 s.dungeonCoins=7;restartLife(s,1000);assert.equal(s.dungeonCoins,7,'coins survive a new life');
});

test('v3.201 coin shop quality goods: one option line to 100%, or 120–150% even on normal gear',async()=>{
 const G=await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/gear');
 const s=newState(0);s.level=60;s.dungeonCoins=0;
 const def=G.AFFIX_POOL.find(a=>a.kind==='percent'&&!a.minRarity&&!a.junk&&!a.onlyOrigin&&!a.onlySlot&&!a.retired&&!a.rollBoth);
 const low=G.optionAtQuality(def,200,4,60,.1);s.inventory.push({id:'q1',name:'t',slot:'charm',rarity:4,level:60,power:200,affixes:[low]});
 const q=()=>G.affixQuality(s.inventory.at(-1).affixes[0],200,4,60,G.HEIR_ROLL_TOP);
 assert.throws(()=>act(s,{type:'dungeonShop',id:'quality100',value:'q1|0'},0),/주화가 부족/);
 s.dungeonCoins=300;act(s,{type:'dungeonShop',id:'quality100',value:'q1|0'},0,()=>.5);assert.equal(s.dungeonCoins,0);assert.ok(Math.abs(q()-1)<.01,`100% (${q()})`);
 s.dungeonCoins=5000;assert.throws(()=>act(s,{type:'dungeonShop',id:'quality100',value:'q1|0'},0),/옵션 칸/,'already at 100%');
 act(s,{type:'dungeonShop',id:'quality120',value:'q1|0'},0,()=>.5);assert.equal(s.dungeonCoins,1400);assert.ok(q()>=1.34&&q()<=1.36,`midpoint 135% (${q()})`);
 s.dungeonCoins=4000;assert.throws(()=>act(s,{type:'dungeonShop',id:'quality120',value:'q1|0'},0),/옵션 칸/,'already above 120%');
});

test('v3.201 regional dungeons are one trash wave + boss; the boss keeps the last-wave pressure; Mu Lung stays five fights',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),W=await L.load('data/world'),E=await L.load('data/encounters'),B=await L.load('data/balance');
 for(const d of W.PLAIN_DUNGEONS)assert.equal(d.monsters.length,d.id==='abyss'?5:2,d.id);
 const s=newState(0);s.level=30;s.running=true;act(s,{type:'dungeon',id:'grotto'},0);s.recovery=0;s.dungeon.wave=1;s.enemy=null;tick(s,()=>.9999);
 const boss=W.MONSTERS.find(f=>f.id==='grottoWarden');assert.equal(s.enemy.maxHp,E.scaledEnemyStats(boss,{boss:true,wave:B.BOSS_PRESSURE_WAVE}).hp);
});

test('v3.201 daily bonus clears: the first 30 regional clears of a KST day pay the bonus, shared across dungeons, no carry-over',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),W=await L.load('data/world'),D=await L.load('data/dungeon-shop');
 const s=newState(0);s.level=40;s.rebirths=10;
 const clear=(id,mode)=>{s.running=true;s.dungeon={id,wave:W.DUNGEONS.find(d=>d.id===id).monsters.length-1,...(mode?{mode}:{})};s.clears[id]=1;s.enemy={id:'minnow',name:'t',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:true,stun:0};const before=s.dungeonCoins||0;let g=0;while(s.enemy&&g++<50)tick(s,()=>.5);return (s.dungeonCoins||0)-before;};
 assert.equal(D.DAILY_BONUS.clears,30);
 for(let i=0;i<29;i++)clear(i%2?'grotto':'temple','hell');
 assert.equal(s.dungeonBonus.used,29,'shared across dungeons');
 assert.equal(clear('grotto','hell'),40,'30th clear still pays the bonus');
 assert.equal(clear('grotto','hell'),2,'31st clear pays the base (1/20)');
 assert.equal(clear('grotto','nightmare'),3);assert.equal(clear('grotto'),1);
 s.lastTick+=86400000;assert.equal(clear('grotto','hell'),40,'a new KST day refills 30, unused clears do not carry over');assert.equal(s.dungeonBonus.used,1);
});

test('v3.201 legendary+ gear box: legendary or better at my level; ancient/primal weights x0.25 (about one normal drop); primal pity untouched',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),C=await L.load('systems/dungeon-coins'),O=await L.load('data/odds'),D=await L.load('data/dungeon-shop');
 const w=C.gearBoxWeights(),r=O.ODDS.drop.rarity;assert.deepEqual(w.slice(0,3),[0,0,0]);assert.equal(w[3],r[3]);assert.equal(w[4],r[4]);assert.equal(w[5],r[5]*D.GEAR_BOX.highScale);assert.equal(w[6],r[6]*D.GEAR_BOX.highScale);
 const t=w.reduce((a,b)=>a+b,0),plain=r.slice(1).reduce((a,b)=>a+b,0);assert.ok(Math.abs(w[5]/t-r[5]/plain)<.01,'ancient share close to a normal drop');
 assert.equal(C.rollGearBoxRarity(()=>0),3);assert.equal(C.rollGearBoxRarity(()=>.9999999),6);
 const s=newState(0);s.level=70;s.dungeonCoins=D.DUNGEON_SHOP.gearBox;s.primalDropPity=7;act(s,{type:'dungeonShop',id:'gearBox'},0,()=>.5);const it=s.inventory.at(-1);assert.ok(it.rarity>=3);assert.ok(it.level>=70,'my level');assert.equal(s.primalDropPity,7,'pity untouched');
});

test('v3.201 growth tickets: best full hour of the last 24 (gold and kill exp) x hours, rebirths < 50, daily limits; exp log resets on rebirth',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),I=await L.load('systems/income'),D=await L.load('data/dungeon-shop');
 const H=3600000,s=newState(0);s.level=30;s.rebirths=10;s.playMs=5*H+60000;
 s.goldLog=[{h:2,g:1000},{h:3,g:5000},{h:4,g:2000},{h:5,g:10}];s.expLog=[{h:3,g:300},{h:4,g:900}];
 assert.equal(I.bestHourly(s.goldLog,s.playMs),5000,'max of full hours, current hour excluded');assert.equal(I.bestHourly(s.expLog,s.playMs),900);
 s.dungeonCoins=10000;const gold=s.gold;act(s,{type:'dungeonShop',id:'growth4'},0);
 assert.equal(s.gold-gold,20000);assert.equal(s.dungeonCoins,10000-D.GROWTH_GOODS.growth4.price);
 assert.throws(()=>act(s,{type:'dungeonShop',id:'growth4'},0),/하루 1번/);
 act(s,{type:'dungeonShop',id:'growth1'},0);act(s,{type:'dungeonShop',id:'growth1'},0);assert.throws(()=>act(s,{type:'dungeonShop',id:'growth1'},0),/하루 2번/);
 act(s,{type:'dungeonShop',id:'growth1'},86400000);
 const t=newState(0);t.rebirths=50;t.dungeonCoins=10000;t.goldLog=[{h:0,g:1}];t.playMs=2*H;assert.throws(()=>act(t,{type:'dungeonShop',id:'growth1'},0),/환생 50회 미만/);
 const u=newState(0);u.rebirths=1;u.dungeonCoins=10000;assert.throws(()=>act(u,{type:'dungeonShop',id:'growth1'},0),/사냥 기록이 없습니다/);
 const {restartLife}=await L.load('systems/actions/lifecycle');s.expLog=[{h:1,g:5}];restartLife(s,1000);assert.equal(s.expLog,undefined,'exp log does not survive a new life');
});

test('v3.202-199 boss cores: daily-bonus regional clears only; duplicates awaken; one core slot (100%), others resonate 10%; set bonus; kept across lives',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),W=await L.load('data/world'),O=await L.load('data/odds'),BL=await L.load('systems/boss-loot'),C=await L.load('data/boss-core');
 for(const d of W.PLAIN_DUNGEONS.filter(d=>d.id!=='abyss')){const c=C.BOSS_CORES[d.id];assert.ok(c,d.id);assert.equal(c.bonus.bossDamage,.05);}
 assert.ok(O.ODDS.bossLoot.chance>0&&O.ODDS.bossLoot.pity>1);
 const clear=(s,id,rng)=>{s.running=true;s.dungeon={id,wave:W.DUNGEONS.find(d=>d.id===id).monsters.length-1};s.clears[id]=1;s.enemy={id:'minnow',name:'t',hp:1,maxHp:1,attack:0,defense:0,exp:1,gold:1,boss:true,stun:0};let g=0;while(s.enemy&&g++<50)tick(s,rng);};
 const s=newState(0);s.level=60;s.rebirths=10;const inv=s.inventory.length;const hp0=stats(s).hp,mp0=stats(s).mana;clear(s,'grotto',()=>0);
 assert.equal(s.bossCores.grotto.rank,0);assert.equal(s.bossCores.grotto.attrs.length,2);assert.equal(s.coreSlot,'grotto','first core goes into the empty slot');assert.equal(s.inventory.length,inv,'cores are not items');
 const g1=stats(s).hp-hp0;assert.ok(g1>=2000,'Mushmom core: max HP +2,000 flat (then the usual HP multipliers)');assert.ok(stats(s).mana-mp0>=300);
 BL.grantBossCore(s,'grotto');assert.equal(s.bossCores.grotto.rank,1);assert.ok(Math.abs((stats(s).hp-hp0)/g1-1.1)<.01,'awaken +10% of the effect');
 for(let k=0;k<4;k++)BL.grantBossCore(s,'grotto');const p=s.pearls;BL.grantBossCore(s,'grotto');assert.equal(s.bossCores.grotto.rank,5);assert.equal(s.pearls,p+C.BOSS_CORE_RULES.duplicatePearls);
 BL.grantBossCore(s,'caldera');assert.equal(s.coreSlot,'grotto','slot kept');let cs=C.coreStats(s);assert.equal(cs.dotTurnsBonus,undefined,'turn effects do not resonate');
 assert.ok(Math.abs(cs.bossDamage-(.05*1.5+.05*.1+.03))<1e-9,'worn 100% x awaken + resonance 10% + 2-piece set');
 act(s,{type:'equipCore',id:'caldera'},0);cs=C.coreStats(s);assert.equal(cs.dotTurnsBonus,1);assert.equal(stats(s).dotTurnsBonus,1);
 assert.throws(()=>act(s,{type:'equipCore',id:'temple'},0),/가진 보스 코어/);act(s,{type:'equipCore',id:''},0);assert.equal(s.coreSlot,undefined);
 const t=newState(0);t.level=60;t.bossLootMiss=O.ODDS.bossLoot.pity-1;clear(t,'temple',()=>.5);assert.ok('temple' in t.bossCores,'pity');
 const u=newState(0);u.level=60;u.dungeonBonus={day:'1970-01-01',used:30};clear(u,'grotto',()=>0);assert.equal(u.bossCores,undefined,'no core after the daily bonus');
 const {restartLife,ascend}=await L.load('systems/actions/lifecycle');restartLife(s,1000);assert.equal(s.bossCores.grotto.rank,5,'kept across lives');
 s.rebirths=999;ascend(s,2000);assert.equal(s.bossCores.grotto.rank,5,'kept across ascension');assert.equal(s.coreSlot,undefined);
});

test('v3.202 Zakum and Papulatus have their own kits (no longer the Mu Gong ancient-boss set); loot rules are inherit-style',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),E=await L.load('data/encounters'),F=await L.load('data/foe-fx'),BL=await L.load('data/boss-core');
 const z=E.foeSkills('ventColossus',66,true),p=E.foeSkills('starfallSeraph',62,true),m=E.foeSkills('abyssSovereign',52,true);
 assert.ok(z.includes('zakumArms')&&z.includes('zakumFlame'));assert.ok(p.includes('papTimeStop')&&p.includes('papRift')&&p.includes('papAlarm'));assert.ok(m.includes('tentacleBarrage'));
 assert.notDeepEqual(z,p);assert.notDeepEqual(z,m);assert.ok(E.profile('starfallSeraph').splitBasic);
 for(const id of [...z,...p])assert.ok(F.FOE_FX[id],`${id} has a background effect`);
 assert.equal(BL.BOSS_CORES.cemetery.bonus.stunBonus,1);assert.equal(BL.BOSS_CORES.caldera.bonus.dotTurnsBonus,1);assert.equal(BL.BOSS_CORES.temple.bonus.penetration,.1);
});

test('v3.202 research 던전 탐험 I: +10% dungeon coins per rank; 황금 비 is gold only',async()=>{
 const E=(await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/economy'));
 const r=E.RESEARCH.find(x=>x.id==='dungeon');assert.equal(r.name,'던전 탐험 I');assert.equal(r.tab,'gold');
 const s=newState(0);const base=stats(s).dungeonGoldBonus||0;s.permanent.dungeon=3;assert.ok(Math.abs((stats(s).dungeonGoldBonus||0)-base-.3)<1e-9);
 assert.ok(!E.RESEARCH.find(x=>x.id==='gold').desc.includes('던전 골드'));
});

test('v3.202 boss cores roll two random attributes scaled by level (x1~5, awaken, 10% resonance); daily random core box',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),C=await L.load('data/boss-core'),D=await L.load('data/dungeon-shop');
 const a=C.rollCoreAttrs(()=>.5);assert.equal(a.length,2);assert.notEqual(a[0].k,a[1].k);for(const x of a)assert.ok(x.f>=.2&&x.f<=1);
 const s=newState(0);s.level=40;s.bossCores={grotto:{rank:0,attrs:[{k:'str',f:3},{k:'vit',f:2}]},temple:{rank:2,attrs:[{k:'str',f:5}]}};s.coreSlot='grotto';
 assert.deepEqual(C.coreAttributes(s),{str:120+Math.floor(40*5*1.2*.1),vit:80});
 const atk0=(()=>{const t={...s,bossCores:{}};return stats(t).attack;})();assert.ok(stats(s).attack>atk0,'core strength raises attack');
 assert.deepEqual(C.coreEntry(3),{rank:3,attrs:[]},'old numeric saves still read');
 const u=newState(0);u.dungeonCoins=D.DUNGEON_SHOP.coreBox*2;act(u,{type:'dungeonShop',id:'coreBox'},0,()=>.1);assert.equal(Object.keys(u.bossCores).length,1);assert.equal(u.dungeonCoins,D.DUNGEON_SHOP.coreBox);
 assert.throws(()=>act(u,{type:'dungeonShop',id:'coreBox'},0,()=>.1),/하루 1번/);act(u,{type:'dungeonShop',id:'coreBox'},86400000,()=>.1);assert.equal(Object.values(u.bossCores)[0].rank,1,'same core again awakens');
});

test('v3.203 boss core attribute reroll (essence or coins) and refine (essence, factor only); v3.203 cost 50 x1.2, pearl reset',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),B=await L.load('systems/boss-loot'),D=await L.load('data/dungeon-shop');
 const s=newState(0);s.bossCores={grotto:{rank:1,attrs:[{k:'str',f:.3},{k:'vit',f:.5}]}};s.essence=1e6;
 const c0=B.coreForgeCost(s,'grotto');assert.equal(c0,50);s.rebirths=80;assert.equal(B.coreForgeCost(s,'grotto'),50,'no rebirth scaling');
 act(s,{type:'coreForge',id:'grotto',value:'refine|0'},0,()=>.99);assert.deepEqual(s.bossCores.grotto.attrs[0],{k:'str',f:1});assert.equal(s.essence,1e6-c0);assert.equal(s.bossCores.grotto.forges,1);
 assert.equal(B.coreForgeCost(s,'grotto'),60,'x1.2 per forge');
 act(s,{type:'coreForge',id:'grotto',value:'reroll|1'},0,()=>.0);assert.equal(s.essence,1e6-50-60);assert.notEqual(s.bossCores.grotto.attrs[1].k,'str','reroll never duplicates the other line');assert.equal(s.bossCores.grotto.rank,1);
 assert.throws(()=>act(s,{type:'coreForge',id:'temple',value:'reroll|0'},0),/가진 보스 코어/);
 s.essence=0;assert.throws(()=>act(s,{type:'coreForge',id:'grotto',value:'refine|0'},0),/정수가 부족/);
 const f=s.bossCores.grotto.forges;s.dungeonCoins=D.DUNGEON_SHOP.coreReroll;act(s,{type:'dungeonShop',id:'coreReroll',value:'grotto|0'},0,()=>.5);assert.equal(s.dungeonCoins,0);assert.equal(s.bossCores.grotto.forges,f,'coin reroll does not raise essence cost');
 const attrs=JSON.stringify(s.bossCores.grotto.attrs);s.pearls=100;act(s,{type:'coreForgeReset',id:'grotto'},0);assert.equal(s.pearls,0);assert.equal(s.bossCores.grotto.forges,undefined);assert.equal(JSON.stringify(s.bossCores.grotto.attrs),attrs);assert.equal(B.coreForgeCost(s,'grotto'),50);
 assert.throws(()=>act(s,{type:'coreForgeReset',id:'grotto'},0),/손본 적이 없어/);
 const o=newState(0);o.bossCores={cemetery:2};o.essence=1e6;assert.throws(()=>act(o,{type:'coreForge',id:'cemetery',value:'refine|0'},0),/빈 줄/);
 act(o,{type:'coreForge',id:'cemetery',value:'reroll|0'},0,()=>.5);assert.equal(o.bossCores.cemetery.attrs.length,1);assert.equal(o.bossCores.cemetery.rank,2,'old saves fill empty lines by reroll');
});

test('v3.205 boss core honor achievements (no reward) unlock dungeon titles',async()=>{
 const L=(await import('../scripts/lib/game-modules.mjs')).loadGame(),P=await L.load('systems/progress'),A=await L.load('data/achievements'),T=await L.load('data/titles');
 for(const id of ['bossCore:1','bossCore:4','bossCore:7','coreAwaken:1','coreAwaken:7']){const a=A.achievementById(id);assert.ok(a&&a.honor,id);assert.deepEqual(a.reward,{});assert.ok(T.titleById(id)?.achievement===id,id);}
 const s=newState(0);s.bossCores={grotto:{rank:5,attrs:[]},temple:{rank:0,attrs:[]},caldera:3,cemetery:{rank:1,attrs:[]}};P.syncAchievements(s,()=>{});
 for(const id of ['bossCore:1','bossCore:4','coreAwaken:1'])assert.ok(s.achievements[id]!==undefined,id);
 for(const id of ['bossCore:7','coreAwaken:7'])assert.equal(s.achievements[id],undefined,id);
 const owned=T.unlockedTitles(s).map(t=>t.id);assert.ok(owned.includes('bossCore:4')&&owned.includes('coreAwaken:1')&&!owned.includes('bossCore:7'));
 assert.ok(s.achievementClaims['bossCore:4']&&s.achievementClaims['coreAwaken:1'],'rewardless achievements complete at once');assert.ok(!P.unclaimedAchievements(s).some(id=>id.startsWith('bossCore')||id.startsWith('coreAwaken')),'nothing to claim');
 const old=newState(0);old.achievements={'reenlist:1':1,'regions:2':1};old.achievementClaims={};P.syncAchievements(old,()=>{});assert.ok(!old.achievementClaims['regions:2'],'AP honor steps still claimed by hand');assert.ok(old.achievementClaims['reenlist:1'],'old unclaimed honor achievements are tidied');
});
