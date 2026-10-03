// 새 세이브 관리형 플레이(물리/마법 × 시드 3)로 첫 환생까지의 성장 속도와 액티브 스킬 규칙을 확인합니다. 사용: node scripts/check-balance.mjs
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random,   manage, chooseStage } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();
const {newState,tick}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {effectiveSkill,maxSkillLevel}=await moduleAt('systems/progression');
const {SKILLS}=await moduleAt('data/skills');
const {ACTIVE_SKILL_BALANCE}=await moduleAt('data/skill-balance');
const {strike}=await moduleAt('systems/combat');
for(const sk of SKILLS.filter(x=>x.type==='active')){
 assert(ACTIVE_SKILL_BALANCE[sk.id],`Missing balance row: ${sk.id}`);
 for(let level=0;level<=maxSkillLevel(sk);level++){
  const value=effectiveSkill(sk,level+1);
  // 상태이상 전용 기술은 발동률을 낮게 둡니다(check-progression-pace.mjs와 같은 규칙).
  if(sk.statusOnly){assert(value.chance<=.35,sk.id);if(sk.damageType==='magic')assert(value.manaCost>0,sk.id);}
  else if(sk.damageType==='magic'||sk.damageType==='split'){assert(value.manaCost>0,sk.id);assert(value.chance>=.45,sk.id);}
  else if(sk.scaling==='swap'||sk.scaling==='attr'){/* 힘법사·외길(v26): 공격력 대신 반대 능력치·배분 능력치 기준. 마나 없는 물리형이어도 발동률 규칙 예외 */}
  else {assert.equal(value.manaCost,0,sk.id);assert(value.chance<=.381,sk.id);}
 }
}
const hook=effectiveSkill(SKILLS.find(x=>x.id==='hook'),5);
const fist=effectiveSkill(SKILLS.find(x=>x.id==='wakeFist'),1);
assert(hook.multiplier<fist.multiplier&&hook.chance<fist.chance&&hook.cooldown>=fist.cooldown);
const fresh=newState(0),base={...stats(fresh),hp:100,mana:50,manaRegen:0,hpRegen:0,lifesteal:0};
const fighter=(id,mana=50)=>({name:'test',stats:base,hp:20,skills:[id],cooldowns:{},stun:0,mana,effects:{}});
const target=()=>({...fighter(''),hp:1000,stats:{...base,hp:1000}});
const healer=fighter('breath');strike(healer,target(),()=>0);assert.equal(healer.hp,20+Math.floor(100*ACTIVE_SKILL_BALANCE.breath.healRatio));
const dry=fighter('arcane',0);assert(!strike(dry,target(),()=>0).includes('해류 탄환'));
const free=fighter('pierce',0);assert(strike(free,target(),()=>0).includes('관통 작살'));assert.equal(free.mana,0);
console.log(JSON.stringify({checks:'passed',activeSkills:Object.keys(ACTIVE_SKILL_BALANCE).length}));
for(const magic of [false,true])for(const seed of [11,29,47]){
 const s=newState(0),rng=random(seed);let checkpoint={};
 for(let n=0;n<21600&&s.level<30;n++){
  if(n%30===0)manage(s,{magic,rng});
  if(n%300===0)chooseStage(s,seed+n);
  tick(s,rng);
  if([10,20,25,30].includes(s.level)&&!checkpoint[s.level])checkpoint[s.level]=+(s.turn/1800).toFixed(2);
 }
 console.log(JSON.stringify({build:magic?'magic':'physical',seed,hours:+(s.turn/1800).toFixed(2),level:s.level,kills:s.kills,deaths:s.deaths,job:s.job,stage:s.stage,skills:s.skills,checkpoint}));
}

