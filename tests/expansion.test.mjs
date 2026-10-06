// v21 직업 확장·전투 규칙, v22 장비 옵션·흡혈 상한
import { JOBS, RARITIES, SKILLS, SKILL_FORMULA, STATUS_TUNING, STATUS_TUNING_MAX, act, assert, dropRate, gear, newState, rng, rollRarity, stats, strike, test, tick, visibleStatuses } from './harness.mjs';
test('v21 tank counter and defense-scaled damage follow the job defense multiplier',()=>{
 const base={hp:1e6,attack:100,magic:0,defense:100,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const fighter=(extra={},skills=[])=>({name:'A',stats:{...base,...extra},hp:1e6,mana:100,skills,cooldowns:{},stun:0,effects:{},ranks:Object.fromEntries(skills.map(id=>[id,1])),mastery:{},practice:{}});
 // 반격: 맞은 쪽 물리 방어 × thorns를 공격자의 물리 방어로 경감해 돌려줍니다.
 const attacker=fighter({defense:0}),tank=fighter({thorns:.5});const ev=[];strike(attacker,tank,()=>0,ev);
 assert.equal(1e6-attacker.hp,50);assert.equal(ev[0].reflected,50);assert.match(ev[0]&&strike(fighter({defense:0}),fighter({thorns:.5}),()=>0),/반격 50/);
 const noThorns=fighter({defense:0});strike(noThorns,fighter(),()=>0);assert.equal(noThorns.hp,1e6);
 // 방어 비례 기술은 방어 친화도만큼만 더해집니다.
 const hit=(affinity)=>{const b=fighter({defense:0});strike(fighter({guardAffinity:affinity},['ironRetort']),b,()=>0);return 1e6-b.hp;};
 assert.ok(hit(1)>hit(.2));const sk=SKILLS.find(x=>x.id==='ironRetort');assert.equal(hit(1),Math.round((100+100*sk.scalingRatio)*sk.multiplier));
 // 직업 방어 배율 → 방어 친화도 → 최종 반격 수치
 const s=newState(0);s.level=40;s.skillInheritances.reefFortress=true;s.learned.reefFortress=1;s.skills=['reefFortress'];
 s.job='brineThorn';const tankThorns=stats(s).thorns;s.job='krakenSlayer';const dealerThorns=stats(s).thorns;
 assert.equal(stats({...s,job:'brineThorn'}).guardAffinity,1);assert.ok(Math.abs(stats(s).guardAffinity-SKILL_FORMULA.guardFloor)<1e-9);
 assert.ok(Math.abs(dealerThorns/tankThorns-stats(s).guardAffinity)<1e-9);
});
test('v21 heal skills fire at full HP; non-healers deal reduced damage when the heal is wasted',()=>{
 const base={hp:1000,attack:100,magic:100,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const cast=(extra,hp)=>{const a={name:'A',stats:{...base,...extra},hp,mana:100,skills:['moonTide'],cooldowns:{},stun:0,effects:{},ranks:{moonTide:1},mastery:{},practice:{}};const b={name:'B',stats:{...base,hp:1e6},hp:1e6,skills:[],cooldowns:{},stun:0,effects:{}};const log=strike(a,b,()=>0),holy=Number(/넘친 회복 → 피해 (\d+)/.exec(log)?.[1]||0);return {dmg:1e6-b.hp-holy,holy,log,a};};// v3.54 힐러의 넘친 회복 피해는 따로 셉니다
 const idle=cast({},1000),healer=cast({healFocus:1},1000),hurt=cast({},300);
 assert.match(idle.log,/달빛 치유/);assert.equal(idle.a.cooldowns.moonTide>0,true);
 assert.ok(Math.abs(idle.dmg/healer.dmg-SKILL_FORMULA.idleHealDamage)<.01);assert.equal(hurt.dmg,healer.dmg,'a needed heal keeps full damage');assert.ok(healer.holy>0&&idle.holy===0,'v3.54 only healers turn the wasted heal into damage');
 assert.ok(SKILLS.filter(sk=>sk.effect==='heal').every(sk=>!sk.condition));
 assert.equal(stats({...newState(0),job:'lunarOracle'}).healFocus,1);assert.equal(stats(newState(0)).healFocus,0);
});
test('v21 poison, burns and execute conditions are data-driven',()=>{
 const base={hp:1e6,attack:100,magic:100,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const mk=(skills,extra={})=>({name:'A',stats:{...base,...extra},hp:1e6,mana:100,skills,cooldowns:{},stun:0,effects:{},ranks:Object.fromEntries(skills.map(id=>[id,1])),mastery:{},practice:{}});
 const dart=SKILLS.find(x=>x.id==='venomDart');let b=mk([]);strike(mk(['venomDart'],{dotBonus:.5}),b,()=>0);
 assert.equal(b.effects.poison.stacks,STATUS_TUNING.poisonFirstStacks,'v3.54 first poison starts at 2 stacks');assert.equal(b.effects.poison.perStack,Math.floor(100*(dart.dotRatio??SKILL_FORMULA.poisonRatio)*1.5));assert.equal(b.effects.poison.hpRatio,SKILL_FORMULA.poisonHpRatio,'v3.54 poison tick adds 0.3% of target current hp per stack');
 assert.equal(b.hp,1e6-(b.effects.poison.perStack+Math.floor(1e6*SKILL_FORMULA.poisonHpRatio))*2,'v3.54 독침은 상태이상 전용: 직접 피해 없이 첫 틱만 바로');assert.equal(b.effects.poison.turns,dart.statusTurns??STATUS_TUNING.poisonTurns,'duration unchanged');
 b=mk([]);strike(mk(['fireball']),b,()=>0);assert.equal(b.effects.burn.stacks,STATUS_TUNING.burnFirstStacks);assert.equal(b.effects.dot,undefined);assert.ok(b.hp<1e6);// 플레임 디스차지는 피해와 화상을 함께
 b=mk([]);strike(mk(['rotBloom']),b,()=>0);assert.equal(b.effects.poison.stacks,2);assert.ok(b.hp<1e6);// 4차는 피해와 상태이상을 함께
 const brave=(hp)=>{const t=mk([]);t.hp=hp;const ev=[];strike(mk(['braveSlash']),t,()=>0,ev);return ev[0].hits[0].value;};
 const sk=SKILLS.find(x=>x.id==='braveSlash');assert.equal(brave(3e5),Math.round(Math.round(100*sk.multiplier)*(1+sk.conditionalDamageBonus)));assert.equal(brave(1e6),Math.round(100*sk.multiplier));
});
test('v21 job chains: five-step flagships per archetype and a physical kraken route',()=>{
 for(const top of ['hero','grandMagus','celestialBlade','guardianDeity','apostle']){
  let j=JOBS.find(x=>x.id===top);assert.equal(j.tier,5);assert.ok(j.rebirth>=2);
  while(j.parent){const p=JOBS.find(x=>x.id===j.parent);assert.equal(p.tier,j.tier-1,j.id);assert.ok(p.level<j.level);assert.ok(Object.keys(j.requiresSkillMastery||{}).every(id=>SKILLS.find(sk=>sk.id===id).job===p.id),j.id);j=p;}
  assert.equal(j.tier,1);
 }
 const bite=SKILLS.find(x=>x.id==='electricBite');assert.equal(bite.damageType,'physical');assert.equal(bite.manaCost,0);
 assert.equal(JOBS.find(j=>j.id==='stormEel').parent,'tidalBrawler');assert.deepEqual(JOBS.find(j=>j.id==='stormEel').requiresSkillMastery,{wakeFist:2});
 for(const id of ['stormEel','krakenkin'])assert.ok(SKILLS.filter(sk=>sk.job===id&&sk.type==='active').every(sk=>sk.damageType!=='magic'),id);
 for(const job of JOBS.filter(j=>j.branchless&&!j.retired&&j.role.startsWith('능력치'))){const owned=SKILLS.filter(sk=>sk.job===job.id);assert.equal(owned.length,1,job.id);assert.equal(owned[0].type,'passive');}
});

test('v21.1 magic jobs replace basic attacks with a weaker arcane strike from tier 1',()=>{
 const base={hp:1e6,attack:10,magic:1000,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:0,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const hit=(extra)=>{const b={name:'B',stats:{...base,hp:1e6},hp:1e6,skills:[],cooldowns:{},stun:0,effects:{}};const ev=[];const log=strike({name:'A',stats:{...base,...extra},hp:1e6,mana:0,skills:[],cooldowns:{},stun:0,effects:{}},b,()=>0,ev);return {dmg:1e6-b.hp,log,ev:ev[0]};};
 const arc=hit({arcaneStrike:.7});assert.match(arc.log,/마력 평타/);assert.equal(arc.dmg,Math.round(1000*SKILL_FORMULA.arcaneStrikeRatio));assert.equal(arc.ev.damageType,'magic');
 const plain=hit({});assert.match(plain.log,/기본 공격/);assert.equal(plain.dmg,10);
 const job=id=>stats({...newState(0),job:id}).arcaneStrike;
 assert.equal(job('apprentice'),SKILL_FORMULA.arcaneStrikeChance[1]);assert.equal(job('tempest'),SKILL_FORMULA.arcaneStrikeChance[2]);assert.equal(job('grandMagus'),SKILL_FORMULA.arcaneStrikeChance[5]);
 assert.equal(job('harpoon'),0);assert.equal(job('fisher'),0);assert.equal(job('celestialBlade'),0);
 assert.ok(SKILL_FORMULA.arcaneStrikeChance.slice(1).every((c,i,a)=>c>=.7&&(i===0||c>=a[i-1])));
});

test('v21.2 tier 5 (v3.76) signature skills work fully in their own lineage and at 70% when inherited elsewhere',()=>{
 const base={hp:1e6,attack:100,magic:100,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const hit=(job,id='braveSlash')=>{const b={name:'B',stats:{...base},hp:1e6,skills:[],cooldowns:{},stun:0,effects:{}};strike({name:'A',job,stats:{...base},hp:1e6,mana:100,skills:[id],cooldowns:{},stun:0,effects:{},ranks:{[id]:1},mastery:{},practice:{}},b,()=>0);return 1e6-b.hp;};
 const own=hit('hero'),outside=hit('apostle');assert.ok(Math.abs(outside/own-SKILL_FORMULA.signatureScale)<.02);assert.equal(hit('knight'),hit('knight'));
 assert.equal(hit(undefined),own,'enemies and legacy fighters are unaffected');assert.equal(hit('apostle','flashCut'),hit('hero','flashCut'),'tier 3 skills combine freely');
 const s=newState(0);s.level=100;s.rebirths=2;s.skillInheritances.heroSoul=true;s.learned.heroSoul=1;s.skills=['heroSoul'];
 const withHero=stats({...s,job:'hero'}).critDamage-stats({...s,job:'hero',skills:[]}).critDamage,withApostle=stats({...s,job:'apostle'}).critDamage-stats({...s,job:'apostle',skills:[]}).critDamage;
 assert.ok(Math.abs(withApostle/withHero-SKILL_FORMULA.signatureScale)<1e-9);
 // v3.76 시작 차수 5: 4차 기술은 계보 밖에서도 온전히 씁니다.
 assert.equal(SKILL_FORMULA.signatureTier,5);const t4=SKILLS.find(sk=>sk.type==='active'&&JOBS.find(j=>j.id===sk.job)?.tier===4&&!sk.song);const owner=t4.job,other=JOBS.find(j=>j.tier===4&&j.id!==owner&&!j.retired&&!j.hidden).id;assert.equal(hit(other,t4.id),hit(owner,t4.id),'tier 4 skills combine freely');
});

test('v27.17 poison is its own stacking status; bleed does not stack but makes the target take more damage',()=>{
 const base={hp:1e6,attack:100,magic:0,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const mk=(skills)=>({name:'A',stats:{...base},hp:1e6,mana:100,skills,cooldowns:{},stun:0,effects:{},ranks:Object.fromEntries(skills.map(id=>[id,1])),mastery:{},practice:{}});
 const b=mk([]),dart=SKILLS.find(x=>x.id==='venomDart');assert.equal(dart.effect,'poison');const per=Math.floor(100*(dart.dotRatio??SKILL_FORMULA.poisonRatio)),hpRatio=SKILL_FORMULA.poisonHpRatio;
 for(let i=1;i<=STATUS_TUNING_MAX+2;i++){strike(mk(['venomDart']),b,()=>0);const n=Math.min(i+STATUS_TUNING.poisonFirstStacks-1,STATUS_TUNING_MAX);assert.equal(b.effects.poison.stacks,n);assert.equal(b.effects.poison.perStack,per);assert.equal(b.effects.poison.hpRatio,hpRatio);}
 assert.match(visibleStatuses(b.effects,0,[],'enemy').find(r=>r.id==='poison').label,/중독 ×5/);
 strike(mk(['cut']),b,()=>0);assert.ok(b.effects.dot&&!b.effects.dot.stacks,'bleed sits beside poison');assert.equal(b.effects.poison.stacks,STATUS_TUNING_MAX,'bleed never touches poison stacks');
 const hp=b.hp,bleedHit=b.effects.dot.damage+Math.floor(hp*b.effects.dot.hpRatio),expected=bleedHit+(b.effects.poison.perStack+Math.floor((hp-bleedHit)*hpRatio))*STATUS_TUNING_MAX;/* v3.54 출혈 틱 뒤 남은 현재 체력으로 중독 틱 */strike(b,mk([]),()=>0);assert.equal(hp-b.hp,expected,'bleed and poison ticks both apply on its own action');
 const c=mk([]);strike(mk(['cut']),c,()=>0);const d1=c.effects.dot.damage;strike(mk(['cut']),c,()=>0);assert.equal(c.effects.dot.damage,d1);assert.equal(c.effects.dot.stacks,undefined,'bleed does not stack');
 const plain=mk([]),bleeding=mk([]);bleeding.effects.dot={damage:1,turns:3,name:'출혈'};strike(mk([]),plain,()=>.99);strike(mk([]),bleeding,()=>.99);
 assert.equal(1e6-bleeding.hp,Math.round((1e6-plain.hp)*(1+SKILL_FORMULA.bleedVulnerability)),'bleeding targets take extra direct damage');
});

test('v22 gear: rarity = option count, at most one rule option, themed origins and value rolls',()=>{
 assert.equal(RARITIES.length,7);let r=0;const seq=()=>{r=(r*16807+11)%2147483647;return r/2147483647;};r=7;
 for(let rarity=0;rarity<=6;rarity++)for(let n=0;n<200;n++){const opts=gear.rollAffixes(rarity,500,'moon',seq);assert.equal(opts.length,rarity);assert.equal(new Set(opts.map(o=>o.id)).size,rarity);assert.ok(opts.filter(o=>o.rule).length<=(rarity>=3?1:0));}
 // 테마 옵션은 더 자주 나옵니다.
 let themed=0,plain=0;for(let n=0;n<4000;n++){const o=gear.rollAffixes(1,500,'moon',seq)[0];if(['arcana','flow','glassCannon'].includes(o.id))themed++;if(['might','vigor','plating','ward'].includes(o.id))plain++;}assert.ok(themed>plain*2,themed+' vs '+plain);
 const def=gear.affixDef('might'),lo=gear.rollOption(def,1000,1,()=>0),hi=gear.rollOption(def,1000,1,()=>.9999);assert.ok(hi.value>lo.value*2);assert.equal(lo.value,Math.round(1000*def.base*.6*gear.rarityQuality(1)));
 const berserk=gear.rollOption(gear.affixDef('berserk'),1000,3,()=>.5);assert.ok(berserk.value>0&&berserk.value2<0&&berserk.stat2==='defense');
 assert.ok([0,.5,.999].map(x=>rollRarity(()=>x,1)).every(x=>x>=1));assert.equal(rollRarity(()=>0),0);assert.equal(rollRarity(()=>.99999),6);
});
test('v22 gear: rule options change existing rules within caps and apply from equipment',()=>{
 const s=newState(0);const add=(stat,value)=>({id:'r'+stat,slot:'charm',rarity:3,power:10,level:1,name:'r',affixes:[{id:stat,name:stat,stat,value,rule:true}]});
 s.equipment.charm=add('stunBonus',1);s.equipment.rod={...add('stunBonus',1),slot:'rod',style:'balanced'};assert.equal(stats(s).stunBonus,1,'same rule is capped');
 const leech=slot=>({id:'l'+slot,slot,rarity:6,power:10,level:1,name:'l',affixes:[{id:'leech',name:'b',stat:'lifesteal',value:.05}]});const s2=newState(0);s2.equipment={rod:{...leech('rod'),style:'balanced'},coat:leech('coat'),charm:leech('charm')};assert.ok(Math.abs(stats(s2).lifesteal-gear.GEAR_CAPS.lifesteal)<1e-9,'gear lifesteal is capped');
 const base={hp:1e6,attack:100,magic:100,defense:0,resist:0,crit:0,accuracy:5,evasion:0,speed:10,mana:100,manaRegen:0,penetration:0,lifesteal:0,critDamage:1.5};
 const mk=(skills,extra={})=>({name:'A',stats:{...base,...extra},hp:1e6,mana:100,skills,cooldowns:{},stun:0,effects:{},ranks:Object.fromEntries(skills.map(id=>[id,1])),mastery:{},practice:{}});
 let b=mk([]);strike(mk(['anchor'],{stunBonus:1}),b,()=>0);assert.equal(b.stun,3);
 b=mk([]);strike(mk(['cut'],{dotTurnsBonus:2}),b,()=>0);assert.equal(b.effects.dot.turns,7);
 b=mk([]);for(let i=0;i<9;i++)strike(mk(['venomDart'],{poisonStackBonus:3}),b,()=>0);assert.equal(b.effects.poison.stacks,STATUS_TUNING_MAX+3);
 {const a=mk([],{attack:1e7,lifesteal:.1});a.hp=1;strike(a,mk([]),()=>0);assert.equal(a.hp-1,Math.floor(1e6*.1*SKILL_FORMULA.lifestealHpCap),'lifesteal heal per action is capped by max HP');}
 const arc=(extra)=>{const t=mk([]);strike(mk([],{arcaneStrike:1,...extra}),t,()=>0);return 1e6-t.hp;};assert.equal(arc({arcaneRatioBonus:.2}),Math.round(100*(SKILL_FORMULA.arcaneStrikeRatio+.2)));
});
test('v22 gear (v27.53 base 0.25%, rare or better): scarce drops, dismantle into essence and reroll one option',()=>{
 const s=newState(0);s.itemBook={};/* v3.58 ‘일반’ 4칸 미리 등록분(도감 드롭 보너스) 없이 기본 확률 */assert.ok(dropRate(s)<=.003,'drop rate '+dropRate(s));s.running=true;act(s,{type:'stage',id:'brook'},0);s.running=true;for(let i=0;i<1800;i++)tick(s,rng);assert.ok(s.inventory.length<=12&&s.inventory.every(i=>i.rarity>=1),'a few items an hour with variants: '+s.inventory.map(i=>i.rarity).join(','));
 s.inventory=[{id:'x',slot:'rod',style:'physical',rarity:4,power:300,level:40,name:'x',origin:'wreck',affixes:gear.rollAffixes(4,300,'wreck',rng)},{id:'y',slot:'coat',rarity:2,power:50,level:10,name:'y',affixes:gear.rollAffixes(2,50,undefined,rng)},{id:'z',slot:'coat',rarity:2,power:50,level:10,name:'z',locked:true}];
 s.essence=0;act(s,{type:'dismantle',id:'y'},0);assert.equal(s.essence,gear.ESSENCE_BY_RARITY[2]);assert.throws(()=>act(s,{type:'dismantle',id:'z'},0));
 s.gold=1e9;assert.throws(()=>act(s,{type:'reforge',id:'x',value:'1'},0),/정수/);s.essence=100;
 const before=s.inventory[0].affixes.map(a=>a.id);act(s,{type:'reforge',id:'x',value:'1'},0,()=>.37);const after=s.inventory[0].affixes;
 assert.equal(after.length,4);assert.deepEqual([after[0].id,after[2].id,after[3].id],[before[0],before[2],before[3]]);assert.equal(new Set(after.map(a=>a.id)).size,4);assert.equal(s.essence,100-gear.rerollEssence(4));
 assert.throws(()=>act(s,{type:'reforge',id:'x',value:'9'},0));
 // v27.74 단일 옵션(유물·상점·옛 장비) 재설정도 정수를 받습니다.
 s.inventory.push({id:'relic1',slot:'coat',rarity:3,power:10,level:1,name:'유물',affix:{stat:'evasion',name:'영혼 회피',value:.12}});s.essence=0;
 assert.throws(()=>act(s,{type:'reforge',id:'relic1'},0),/정수/);s.essence=20;const g0=s.gold;act(s,{type:'reforge',id:'relic1'},0,()=>.2);
 assert.equal(s.essence,20-gear.rerollEssence(3),'single-affix reroll spends essence');assert.ok(s.gold<g0);assert.ok(s.inventory.find(i=>i.id==='relic1').affix);
 const reb=newState(0);reb.level=30;reb.essence=7;act(reb,{type:'rebirth'},0);assert.equal(reb.essence,7,'essence survives rebirth');
});
test('v27.94 essence sinks: rerolling the same item costs +10% each time without a cap, refine rerolls only the value',()=>{
 const s=newState(0);s.gold=1e12;s.essence=1e6;
 s.inventory=[{id:'x',slot:'rod',style:'physical',rarity:4,power:300,level:40,name:'x',affixes:gear.rollAffixes(4,300,undefined,rng)}];
 const item=()=>s.inventory[0],base=gear.rerollEssence(4);
 for(let n=0;n<30;n++){const e=s.essence,g=s.gold;act(s,{type:'reforge',id:'x',value:'0'},0);assert.equal(e-s.essence,Math.ceil(base*(10+n)/10),'essence step '+n);assert.ok(s.gold<g);}
 assert.equal(item().rerolls,30);assert.equal(Math.ceil(base*4),Math.ceil(gear.rerollScaled(base,30)),'no cap: 30 rerolls = x4');
 // 실패한 재설정(정수 부족)은 횟수를 올리지 않습니다.
 s.essence=0;assert.throws(()=>act(s,{type:'reforge',id:'x',value:'0'},0),/정수/);assert.equal(item().rerolls,30);
 // 수치 재련: 종류는 그대로, 수치만 바뀌고, 비용은 재설정 기본 비용의 절반이며 오르지 않습니다.
 s.essence=1000;const ids=item().affixes.map(a=>a.id),idx=item().affixes.findIndex(a=>!a.rule);
 const spent=[];for(const r of [.0,.999,.5]){const e=s.essence;act(s,{type:'refine',id:'x',value:String(idx)},0,()=>r);spent.push(e-s.essence);}
 assert.deepEqual(spent,[gear.refineEssence(4),gear.refineEssence(4),gear.refineEssence(4)]);assert.equal(gear.refineEssence(4),Math.ceil(base/2));
 assert.deepEqual(item().affixes.map(a=>a.id),ids,'refine keeps every option kind');assert.equal(item().rerolls,30,'refine does not raise the reroll cost');
 const def=gear.affixDef(ids[idx]),lo=gear.refineOption({...item().affixes[idx]},300,4,()=>0),hi=gear.refineOption({...item().affixes[idx]},300,4,()=>.999999);
 assert.ok(hi.value>lo.value,def.id);assert.ok(gear.affixQuality(lo,300,4)<.02);assert.ok(gear.affixQuality(hi,300,4)>.98);
 // 규칙 옵션은 재련할 수 없습니다.
 s.inventory.push({id:'r',slot:'rod',rarity:6,power:300,level:40,name:'r',affixes:[{id:'rr',name:'규칙',stat:'attack',value:1,rule:true}]});
 assert.throws(()=>act(s,{type:'refine',id:'r',value:'0'},0),/규칙/);assert.throws(()=>act(s,{type:'refine',id:'x',value:'9'},0),/재련할 옵션/);
});
