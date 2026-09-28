// Run from the repository root: node scripts/check-balance.mjs
// Fresh saves; no paid SP, permanent bonuses, guilds or inherited-job routing.
// Manage stats/gear/training each minute; sample available fishing areas every
// ten minutes. The chooser has information a novice would not have: these are
// managed runs, not a promise of wall-clock completion for every player.
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
const {load:moduleAt}=loadGame();
const {newState,tick,act}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {canChangeJob,canUse,validLoadout,attributes,effectiveSkill,maxSkillLevel}=await moduleAt('systems/progression');
const {itemStats}=await moduleAt('systems/equipment');
const {STAGES}=await moduleAt('data/world');
const {SKILLS}=await moduleAt('data/skills');
const {ACTIVE_SKILL_BALANCE}=await moduleAt('data/skill-balance');
const {xpNeeded}=await moduleAt('data/balance');
const {strike}=await moduleAt('systems/combat');
for(const sk of SKILLS.filter(x=>x.type==='active')){
 assert(ACTIVE_SKILL_BALANCE[sk.id],`Missing balance row: ${sk.id}`);
 for(let level=0;level<=maxSkillLevel(sk);level++){
  const value=effectiveSkill(sk,level+1);
  if(sk.damageType==='magic'||sk.damageType==='split'){assert(value.manaCost>0);assert(value.chance>=.45);}
  else {assert.equal(value.manaCost,0);assert(value.chance<=.381);}
 }
}
const hook=effectiveSkill(SKILLS.find(x=>x.id==='hook'),5);
const fist=effectiveSkill(SKILLS.find(x=>x.id==='wakeFist'),1);
assert(hook.multiplier<fist.multiplier&&hook.chance<fist.chance&&hook.cooldown>=fist.cooldown);
const fresh=newState(0),base={...stats(fresh),hp:100,mana:50,manaRegen:0,lifesteal:0};
const fighter=(id,mana=50)=>({name:'test',stats:base,hp:20,skills:[id],cooldowns:{},stun:0,mana,effects:{}});
const target=()=>({...fighter(''),hp:1000,stats:{...base,hp:1000}});
const healer=fighter('breath');strike(healer,target(),()=>0);assert.equal(healer.hp,30);
const dry=fighter('arcane',0);assert(!strike(dry,target(),()=>0).includes('해류 탄환'));
const free=fighter('pierce',0);assert(strike(free,target(),()=>0).includes('관통 작살'));assert.equal(free.mana,0);
console.log(JSON.stringify({checks:'passed',activeSkills:Object.keys(ACTIVE_SKILL_BALANCE).length}));
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const totalXP=s=>s.exp+Array.from({length:s.level-1},(_,i)=>xpNeeded(i+1)).reduce((a,b)=>a+b,0);
function gearScore(item,magic){const v=itemStats(item);return (v[magic?'magic':'attack']||0)*4+(v.hp||0)*.22+(v.defense||0)*1.5+(v.resist||0)*1.2+(v.accuracy||0)*150+(v.crit||0)*150;}
function manage(s,magic,rng){
 const now=s.turn*2000; const actNow=a=>act(s,a,now,rng);
 while(s.statPoints){const v=attributes(s);let id=magic?(v.wis<10?'wis':v.int<12?'int':s.statPoints%4===0?'vit':'int'):(v.dex<10?'dex':v.str<12?'str':s.statPoints%4===0?'vit':'str');actNow({type:'attribute',id});}
 const jobs=magic?['tide','tempest']:['harpoon','whaler'];
 for(const id of jobs)if(s.job!==id&&!s.unlockedJobs.includes(id)&&canChangeJob(s,id))actNow({type:'job',id});
 const available=SKILLS.filter(sk=>canUse(s,sk.id));
 const priority=available.sort((a,b)=>((a.job===s.job?10:0)+(a.damageType==='magic'===magic?2:0)) - ((b.job===s.job?10:0)+(b.damageType==='magic'===magic?2:0))).reverse();
 s.skills=[];for(const sk of priority)if(validLoadout(s,[...s.skills,sk.id]))s.skills.push(sk.id);
 for(const item of [...s.inventory])if(gearScore(item,magic)>gearScore(s.equipment[item.slot]||{slot:item.slot,power:0,rarity:0,level:0},magic))actNow({type:'equip',id:item.id});
 s.running=true;
}
function chooseStage(s,seed){
 let best=s.stage, rate=-1;
 for(const st of STAGES.filter(x=>x.level<=s.level&&x.rebirth<=s.rebirths)){
  const t=structuredClone(s);t.stage=st.id;t.enemy=null;t.running=true;const start=totalXP(t);const rng=random(seed);for(let n=0;n<180;n++)tick(t,rng);const gain=totalXP(t)-start;if(gain>rate){rate=gain;best=st.id;}
 }
 if(best!==s.stage)act(s,{type:'stage',id:best},s.turn*2000,random(seed));
}
for(const magic of [false,true])for(const seed of [11,29,47]){
 const s=newState(0),rng=random(seed);let checkpoint={};
 for(let n=0;n<21600&&s.level<30;n++){
  if(n%30===0)manage(s,magic,rng);
  if(n%300===0)chooseStage(s,seed+n);
  tick(s,rng);
  if([10,20,25,30].includes(s.level)&&!checkpoint[s.level])checkpoint[s.level]=+(s.turn/1800).toFixed(2);
 }
 console.log(JSON.stringify({build:magic?'magic':'physical',seed,hours:+(s.turn/1800).toFixed(2),level:s.level,kills:s.kills,deaths:s.deaths,job:s.job,stage:s.stage,skills:s.skills,checkpoint}));
}

