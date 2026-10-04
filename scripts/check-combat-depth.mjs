// 전투 규칙 회귀 점검: 상태이상·추가타·오프라인 24시간 정산 등을 고정 시드로 검사합니다. 사용: node scripts/check-combat-depth.mjs
const baseline=process.argv.includes('--baseline');
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();

const {newState,advance}=await moduleAt('systems/engine');
const {stats,hitChance}=await moduleAt('systems/stats');
const {combatFxFromLog}=await moduleAt('systems/combat-feedback');
const {strike,fighterSpeed}=await moduleAt('systems/combat');
const {SKILLS}=await moduleAt('data/skills');
const {JOBS}=await moduleAt('data/classes');
const {FISH}=await moduleAt('data/world');
const {tierHealth,tierAttack}=await moduleAt('systems/meta');
const {enemyStats,scaledEnemyStats,profile}=await moduleAt('data/encounters');
const {canUse,validLoadout,skillMasteryRanks,effectiveSkill}=await moduleAt('systems/progression');
const builds=[
 ['whaler',{str:80,dex:30,vit:40,wis:10},['breath','pierce','whaleStrike','focus','barb']],
 ['corsair',{dex:70,luk:40,str:30,vit:20},['breath','cut','razor','drift','precision']],
 ['tempest',{int:80,wis:40,vit:30,dex:10},['spring','wave','maelstrom','arcane','abyssMind']],
 ['oracle',{wis:65,int:55,vit:30,dex:10},['pearlPrayer','wave','arcane','soulTide','flow']],
 ['bulwark',{vit:85,str:45,dex:20,wis:10},['fortress','crush','anchor','ironWill','scales']],
 ['krakenSlayer',{str:85,dex:35,vit:30,wis:10},['breath','krakenBore','pierce','deepWeakpoint','barb']],
 ['stormScribe',{int:85,wis:40,vit:25,dex:10},['spring','thunderPsalm','maelstrom','arcane','overcast']],
 ['coralSaint',{vit:70,wis:55,int:25,dex:10},['reefPulse','anchor','saintTide','sanctuaryShell','soulTide']],
 ['bonecaster',{int:75,wis:40,vit:35,dex:10},['breath','graveHook','arcane','boneLegacy','ossuaryRite']],
];
const summary=[];
for(const [job,attributes,skills] of builds){
 const s=newState(0);s.level=40;s.rebirths=5;s.attributes={...s.attributes,...attributes};s.job=job;s.equipment={};s.inventory=[];s.permanent={};s.book={};s.unlockedJobs=JOBS.map(j=>j.id);s.jobMastery[job]=12000;
 for(const sk of SKILLS){s.learned[sk.id]=1;s.skillPractice[sk.id]=80000;}s.skills=[];
 for(const id of skills)if(canUse(s,id)&&validLoadout(s,[...s.skills,id]))s.skills.push(id);
 for(const [id,tier] of [['shark',0],['ghost',0],['dragon',10],['dragon',30],['templeOracle',0],['abyssSovereign',3]]){
  const fish=FISH.find(f=>f.id===id),boss=!!fish.boss;const foe=baseline?enemyStats(fish,boss):scaledEnemyStats(fish,{boss,tier,...(boss?{wave:4}:{})});if(baseline){foe.hp=Math.round(fish.hp*2.5*(boss?1.9:1)*tierHealth(tier));foe.attack*=tierAttack(tier);foe.magic*=tierAttack(tier);}let wins=0,turns=0,remaining=0;
  for(let seed=1;seed<=160;seed++){
   const st=stats(s),a={name:'player',stats:st,hp:st.hp,mana:st.mana,skills:s.skills,cooldowns:{},stun:0,effects:{},ranks:s.learned,mastery:skillMasteryRanks(s),practice:s.skillPractice};
   const b={name:'foe',stats:foe,hp:foe.hp,mana:100,skills:profile(id).skills,cooldowns:{},stun:0,effects:{}};const rng=random(seed);let n=0;
   while(a.hp>0&&b.hp>0&&n<300){n++;const first=fighterSpeed(a)>=fighterSpeed(b)?a:b,second=first===a?b:a;strike(first,second,rng);if(first.hp>0&&second.hp>0)strike(second,first,rng);}
   wins+=a.hp>0&&b.hp<=0?1:0;turns+=n;remaining+=Math.max(0,a.hp)/st.hp;
  }
  summary.push({job,foe:id,tier,win:Math.round(wins/160*100),turns:+(turns/160).toFixed(1),hp:Math.round(remaining/160*100),skills:s.skills});
 }
}
console.log(JSON.stringify({baseline,matchups:summary}));
if(!baseline){
 const {refinementTargets,rebirthExperience,evasionRating}=await moduleAt('data/long-term');
 assert(hitChance({accuracy:.1,speed:10},{evasion:.2,speed:10})<.35);
 assert(hitChance({accuracy:1.5},{evasion:.6})>hitChance({accuracy:1.2},{evasion:.6}));
 assert(evasionRating(.8)>.5&&evasionRating(.8)<.8);
 const sk=SKILLS.find(s=>s.id==='pierce');const practiced=refinementTargets(sk.masteryMilestones.at(-1))[0];
 assert(effectiveSkill(sk,5,4,undefined,practiced).multiplier>effectiveSkill(sk,5,4).multiplier);
 assert.equal(effectiveSkill(sk,5,4).penetrationBonus,.2);
 assert.equal(effectiveSkill(sk,5,4,'shatter').penetrationBonus,.45);
 assert(rebirthExperience(400)<rebirthExperience(20)*3);
 const full=newState(0),st=stats(full),healer={name:'test',stats:st,hp:st.hp,skills:['breath'],cooldowns:{},stun:0,mana:st.mana};const b={name:'dummy',stats:st,hp:st.hp,skills:[],cooldowns:{},stun:0};strike(healer,b,()=>0);assert.ok(healer.cooldowns.breath>0,'v21: heal skills also fire at full HP');
 const striker={...healer,skills:['twinHook'],cooldowns:{},stats:{...st,accuracy:1,attack:100}};const victim={...b,hp:10000};const rolls=[0,.9999,0,.99];let r=0;const log=strike(striker,victim,()=>rolls[r++]??0);assert(log.includes('본타 빗나감')&&victim.hp<10000);const fx=combatFxFromLog({id:1,type:'battle',text:log},'test');assert(fx.hits[0].miss&&fx.hits[1].value>0);
 const long=newState(0);long.level=40;long.job='whaler';long.equipment={};long.skills=[];const before=stats(long);long.rebirths=100;long.permanent={attack:40,hp:40,guard:30};long.jobMastery.whaler=600000;const after=stats(long);assert(after.attack>before.attack*3&&after.hp>before.hp*4&&after.defense>before.defense*2);
 // Production advance executes every turn for a complete daily absence (v27.43: 기본 상한 6시간 + 긴 휴식 9단계 = 24시간).
 const idle=newState(0);idle.running=true;idle.permanent.offline=9;const start=performance.now();advance(idle,86400000,random(88));assert.equal(idle.turn,43200);assert.equal(idle.lastTick,86400000);const elapsed=performance.now()-start;
 console.log(JSON.stringify({checks:'passed',offline24hMs:Math.round(elapsed),offlineKills:idle.kills,offlineLevel:idle.level,offlineDeaths:idle.deaths,yearPracticeAt1PerWin:{winsPerHour:[100,300,900,1800],practice:[100,300,900,1800].map(n=>n*24*365)},maximumBonusPerWin:10}));
}
