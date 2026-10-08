// 팔방 항해사(육중 조화) 검증: 같은 레벨·배분 포인트 총량에서 균등/편중 배분과 순수 공격 직업을 비교합니다. 사용: node scripts/check-all-rounder.mjs
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();

const {newState}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {strike,fighterSpeed}=await moduleAt('systems/combat');
const {SKILLS}=await moduleAt('data/skills');
const {JOBS}=await moduleAt('data/classes');
const {MONSTERS}=await moduleAt('data/world');
const {scaledEnemyStats,profile}=await moduleAt('data/encounters');
const {canUse,validLoadout,skillMasteryRanks}=await moduleAt('systems/progression');

const LEVELS=[40,60];
const {SKILL_FORMULA}=await moduleAt('data/balance');
const tune=JSON.parse(process.env.TUNE||'{}');
Object.assign(SKILL_FORMULA,tune.formula||{});
const hw=SKILLS.find(s=>s.id==='harmonicWeight');if(tune.multiplier)hw.multiplier=tune.multiplier;if(tune.chance)hw.chance=tune.chance;
const ar=JOBS.find(j=>j.id==='allRounder');Object.assign(ar,tune.job||{});
const QUIET=!!process.env.QUIET;
const even=(total)=>{const k=['str','dex','int','vit','wis','luk'];const o={};k.forEach((x,i)=>o[x]=Math.floor(total/6)+(i<total%6?1:0));return o;};
const scale=(o,total)=>{const sum=Object.values(o).reduce((a,b)=>a+b,0);const r={};let used=0;const keys=Object.keys(o);keys.forEach((k,i)=>{r[k]=i===keys.length-1?total-used:Math.round(o[k]*total/sum);used+=r[k];});return r;};
const builds=L=>{const total=4+(L-1)*4;return [
 ['allRounder·균등',even(total),['harmonicWeight','breath','focus']],
 ['allRounder·편중',{...{str:15,dex:15,int:15,vit:15,wis:15,luk:15},str:total-75},['harmonicWeight','breath','focus']],
 ['whaler',scale({str:80,dex:30,vit:40,wis:10},total),['breath','pierce','whaleStrike','focus','barb']],
 ['tempest',scale({int:80,wis:40,vit:30,dex:10},total),['spring','wave','maelstrom','abyssMind']],
 ['krakenSlayer',scale({str:85,dex:35,vit:30,wis:10},total),['breath','krakenBore','pierce','deepWeakpoint','barb']],
 ['chimera',scale({str:60,int:50,vit:50},total),['vitalSurge','adaptiveCore','breath']],
];};
const foes=[['shark',0],['ghost',0],['dragon',10],['dragon',30],['templeOracle',0],['abyssSovereign',3]];
const rows=[];
for(const L of LEVELS)for(const [label,attributes,skills] of builds(L)){
 const job=label.split('·')[0];
 const s=newState(0);s.level=L;s.rebirths=5;s.attributes={str:0,dex:0,int:0,vit:0,wis:0,luk:0,...attributes};s.job=job;s.equipment={};s.inventory=[];s.permanent={};s.book={};s.unlockedJobs=JOBS.map(j=>j.id);s.jobMastery[job]=12000;
 for(const sk of SKILLS){s.learned[sk.id]=1;s.skillPractice[sk.id]=80000;}s.skills=[];
 for(const id of skills)if(canUse(s,id)&&validLoadout(s,[...s.skills,id]))s.skills.push(id);
 const st=stats(s);
 const agg={L,build:label,skills:s.skills.join('/'),hp:Math.round(st.hp),atk:Math.round(st.attack),mag:Math.round(st.magic),def:Math.round(st.defense),res:Math.round(st.resist),harmony:Math.round(st.harmony),win:0,turns:0,hpLeft:0,dmgPerAction:0,taken:0,n:0};
 const per=[];
 for(const [id,tier] of foes){
  const monster=MONSTERS.find(f=>f.id===id),boss=!!monster.boss;const foe=scaledEnemyStats(monster,{boss,tier,...(boss?{wave:4}:{})});let wins=0,turns=0,remaining=0,dealt=0,actions=0,taken=0;
  for(let seed=1;seed<=120;seed++){
   const a={name:'player',stats:st,hp:st.hp,mana:st.mana,skills:s.skills,cooldowns:{},stun:0,effects:{},ranks:s.learned,mastery:skillMasteryRanks(s),practice:s.skillPractice};
   const b={name:'foe',stats:foe,hp:foe.hp,mana:100,skills:profile(id).skills,cooldowns:{},stun:0,effects:{}};const rng=random(seed);let n=0;
   const hit=(x,y)=>{const before=y.hp;strike(x,y,rng);if(x===a){dealt+=before-y.hp;actions++;}else taken+=Math.max(0,before-y.hp);};
   while(a.hp>0&&b.hp>0&&n<300){n++;const first=fighterSpeed(a)>=fighterSpeed(b)?a:b,second=first===a?b:a;hit(first,second);if(first.hp>0&&second.hp>0)hit(second,first);}
   wins+=a.hp>0&&b.hp<=0?1:0;turns+=n;remaining+=Math.max(0,a.hp)/st.hp;
  }
  per.push(`${id}${tier?'+'+tier:''}:${Math.round(wins/1.2)}%/${(turns/120).toFixed(1)}t/${Math.round(dealt/actions)}`);
  agg.win+=wins/120;agg.turns+=turns/120;agg.hpLeft+=remaining/120;agg.dmgPerAction+=dealt/actions;agg.taken+=taken/Math.max(1,turns);agg.n++;
 }
 rows.push({L,build:label,skills:agg.skills,hp:agg.hp,atk:agg.atk,mag:agg.mag,def:agg.def,res:agg.res,harmony:agg.harmony,win:Math.round(agg.win/agg.n*100),turns:+(agg.turns/agg.n).toFixed(1),hpLeft:Math.round(agg.hpLeft/agg.n*100),dmgPerAction:Math.round(agg.dmgPerAction/agg.n),takenPerTurn:Math.round(agg.taken/agg.n),per:per.join(' ')});
}
if(QUIET){for(const r of rows)console.log([r.L,r.build.padEnd(16),'win',r.win,'turns',r.turns,'hpLeft',r.hpLeft,'dmg',r.dmgPerAction,'taken',r.takenPerTurn,'hp',r.hp].join(' '));}
else{console.table(rows.map(({...r})=>r));for(const r of rows)console.log(r.L,r.build,r.per);}
