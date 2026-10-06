// 시드 고정 관리형 플레이(장비 유무·물리/마법)로 낚시터·던전 경로와 첫 정복 시점을 확인합니다. 사용: node scripts/check-active-routing.mjs
const baseline=process.argv.includes('--baseline');
import { loadGame } from './lib/game-modules.mjs';
import { random, totalXP } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();

const {newState,tick,act}=await moduleAt('systems/engine');
const {canChangeJob,canUse,validLoadout,attributes,skillLevel,skillMastery,maxSkillLevel,bookReward}=await moduleAt('systems/progression');
const {itemStats}=await moduleAt('systems/equipment');
const {STAGES,DUNGEONS,FISH}=await moduleAt('data/world');
const {SKILLS}=await moduleAt('data/skills');
const gearScore=(item,magic)=>{const v=itemStats(item);return (v[magic?'magic':'attack']||0)*4+(v.hp||0)*.22+(v.defense||0)*1.5+(v.resist||0)*1.2+(v.accuracy||0)*150+(v.crit||0)*150;};
function manage(s,magic,gear,rng){
 const action=a=>act(s,a,s.turn*2000,rng);
 while(s.statPoints){const v=attributes(s),goal=s.level<10?12:35;action({type:'attribute',id:magic?(v.int<goal?'int':v.wis<(s.level<10?10:20)?'wis':s.statPoints%4===0?'vit':'int'):(v.str<goal?'str':v.dex<(s.level<10?10:20)?'dex':s.statPoints%4===0?'vit':'str')});}
 // Keep dungeon progress intact; change job at the next expedition boundary.
 if(!s.dungeon)for(const id of magic?['tide','tempest']:['harpoon','whaler'])if(s.job!==id&&!s.unlockedJobs.includes(id)&&canChangeJob(s,id))action({type:'job',id});
 for(const f of FISH){const reward=bookReward(s,f.id);if(reward.ready)action({type:'claimBook',id:f.id});}
 for(const d of DUNGEONS)if(s.achievements?.[`firstClear:${d.id}`]!==undefined&&!s.achievementClaims?.[`firstClear:${d.id}`])action({type:'claimAchievement',id:`firstClear:${d.id}`});
 const order=magic?['maelstrom','wave','arcane','spring','abyssMind','insight','flow','hook','breath']:['whaleStrike','pierce','barb','focus','hook','breath','scales'];
 s.skills=[];for(const id of order)if(canUse(s,id)&&validLoadout(s,[...s.skills,id]))s.skills.push(id);
 for(const id of order){const sk=SKILLS.find(x=>x.id===id);while(s.sp>0&&s.skills.includes(id)&&skillLevel(sk,s.learned[id],skillMastery(s,id))<maxSkillLevel(sk))action({type:'learn',id});}
 if(gear){
  for(const item of [...s.inventory])if(gearScore(item,magic)>gearScore(s.equipment[item.slot]||{slot:item.slot,power:0,rarity:0,level:0},magic))action({type:'equip',id:item.id});
 }
 s.running=true;
}
function enter(s,route,rng){
 if(route.dungeon){act(s,{type:'dungeon',id:route.dungeon},s.turn*2000,rng);}
 else {if(s.dungeon||s.stage!==route.stage)act(s,{type:'stage',id:route.stage},s.turn*2000,rng);if(s.target!==route.target)act(s,{type:'target',id:route.target},s.turn*2000,rng);s.running=true;}
}
function choose(s,seed){
 const candidates=STAGES.filter(x=>x.level<=s.level&&x.rebirth<=s.rebirths).flatMap(st=>st.fish.map(target=>({stage:st.id,target})));
 candidates.push(...DUNGEONS.filter(d=>!d.random&&d.level<=s.level&&d.rebirth<=s.rebirths).map(d=>({dungeon:d.id})));
 let best=candidates[0],rate=-1,firstClear=null,firstRate=-1;
 for(const route of candidates){
  const t=structuredClone(s),rng=random(seed),start=totalXP(t);enter(t,route,rng);
  // Five minutes per candidate, including failed expeditions and repeated entries.
  for(let n=0;n<150;n++){if(route.dungeon&&!t.dungeon)enter(t,route,rng);tick(t,rng);}
  const gain=totalXP(t)-start;
  if(route.dungeon&&!s.clears[route.dungeon]&&t.clears[route.dungeon]&&gain>firstRate){firstClear=route;firstRate=gain;}
  if(gain>rate){rate=gain;best=route;}
 }
 return firstClear || best;
}
for(const gear of [false,true])for(const magic of [false,true])for(const seed of [11,29]){
 const s=newState(0),rng=random(seed);if(!gear){s.equipment={};s.inventory=[];}
 let route={stage:'brook',target:'minnow'},lastLevel=0,lastKill=-1,lastChoice=-150,checkpoints={},routeChanges=[],entries=0;
 for(let n=0;n<86400&&s.level<30;n++){
  const leveled=s.level!==lastLevel;
  if(leveled||s.kills!==lastKill){manage(s,magic,gear,rng);lastLevel=s.level;lastKill=s.kills;}
  if(!s.dungeon&&(leveled||n-lastChoice>=150)){const next=choose(s,seed+n);if(JSON.stringify(next)!==JSON.stringify(route))routeChanges.push({hour:+(n/1800).toFixed(2),level:s.level,...next});route=next;lastChoice=n;enter(s,route,rng);if(route.dungeon)entries++;}
  else if(route.dungeon&&!s.dungeon){enter(s,route,rng);entries++;}
  tick(s,rng);
  if([10,20,25,30].includes(s.level)&&!checkpoints[s.level])checkpoints[s.level]=+(s.turn/1800).toFixed(2);
 }
 console.log(JSON.stringify({baseline,gear,build:magic?'magic':'physical',seed,hours:+(s.turn/1800).toFixed(2),level:s.level,kills:s.kills,deaths:s.deaths,job:s.job,checkpoints,clears:s.clears,entries,routeChanges}));
}
