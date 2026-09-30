// 던전 도달성 점검: 고정 캐릭터로 던전별 보스 도달률·정복률과 입장 준비·보스 보상 규칙을 검사합니다. 사용: node scripts/check-expedition.mjs
const baseline=process.argv.includes('--baseline');
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();


const {newState,tick,act}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {grantJobSkills,canUse,validLoadout,attributes}=await moduleAt('systems/progression');
const {FISH}=await moduleAt('data/world');
const {scaledEnemyStats}=await moduleAt('data/encounters');
const {MONSTER_TUNING}=await moduleAt('data/balance');
function fixture(level,magic,progressed=false){
 const s=newState(0);s.level=level;s.equipment={};s.inventory=[];s.statPoints=level*4;s.rebirths=progressed?30:level>=40?1:0; if(progressed)s.permanent={attack:10,hp:10,guard:10};
 while(s.statPoints){const v=attributes(s);act(s,{type:'attribute',id:magic?(v.int<35?'int':v.wis<20?'wis':s.statPoints%4===0?'vit':'int'):(v.str<35?'str':v.dex<20?'dex':s.statPoints%4===0?'vit':'str')},0);}
 for(const job of level>=25?(magic?['tide','tempest']:['harpoon','whaler']):level>=10?[magic?'tide':'harpoon']:['fisher']){s.job=job;grantJobSkills(s);s.jobMastery[job]=progressed?30000:2000;}
 for(const id of Object.keys(s.learned))s.skillPractice[id]=progressed?30000:1000;
 s.skills=[];for(const id of magic?['spring','wave','arcane','maelstrom','abyssMind','breath','hook']:['breath','pierce','whaleStrike','barb','hook'])if(canUse(s,id)&&validLoadout(s,[...s.skills,id]))s.skills.push(id);
 s.hp=stats(s).hp;s.mana=stats(s).mana;return s;
}
const rows=[];
for(const [id,levels,progressed=false] of [['grotto',[8,14,20,30]],['kelpCatacomb',[14,22,30]],['cemetery',[18,25,30]],['caldera',[26,30,40]],['caldera',[40],true],['temple',[40],true]])for(const level of levels)for(const magic of [false,true]){
 let clears=0,total=0,bossReached=0;
 for(let seed=1;seed<=24;seed++){
  const s=fixture(level,magic,progressed),rng=random(seed);act(s,{type:'dungeon',id},0,rng);let n=0,reached=false;
  while(s.dungeon&&n<2400){tick(s,rng);n++;if(s.dungeon?.wave===4)reached=true;}
  clears+=s.clears[id]?1:0;total+=n;bossReached+=reached?1:0;
 }
 rows.push({id,level,progressed,build:magic?'magic':'physical',clearPct:Math.round(clears/24*100),bossReachedPct:Math.round(bossReached/24*100),seconds:Math.round(total/24*2)});
}
console.log(JSON.stringify({baseline,expeditions:rows}));
if(!baseline){
 const s=fixture(30,false);s.hp=1;s.mana=0;act(s,{type:'dungeon',id:'grotto'},0);assert.equal(s.hp,1);assert.equal(s.mana,0);assert.equal(s.recovery,3);
 tick(s,()=>.5);assert.equal(s.hp,1);tick(s,()=>.5);assert.equal(s.hp,1);tick(s,()=>.5);assert.equal(s.hp,stats(s).hp);assert.equal(s.enemy,null);
 tick(s,()=>.9999);const f=FISH.find(f=>f.id==='ray'),expected=scaledEnemyStats(f,{wave:0});assert.equal(s.enemy.maxHp,expected.hp);assert.equal(s.enemy.attack,expected.attack);
 const boss=FISH.find(f=>f.id==='grottoWarden');s.dungeon.wave=4;s.enemy=null;tick(s,()=>.9999);const expectedBoss=scaledEnemyStats(boss,{boss:true,wave:4});assert.equal(s.enemy.maxHp,expectedBoss.hp);assert.equal(s.enemy.exp,Math.round(boss.exp*1.9*boss.rewardMultiplier));
 const trained=s.skills[0],oldPractice=s.skillPractice[trained];s.enemy.hp=1;s.hp=stats(s).hp;tick(s,()=>0);assert.equal(s.skillPractice[trained],oldPractice+1);
 const health=scaledEnemyStats(f,{wave:3}).hp;assert(health>scaledEnemyStats(f,{wave:0}).hp);assert.equal(MONSTER_TUNING.bossRewardMultiplier,1.9);assert.equal(MONSTER_TUNING.dungeonHealAfterKill,.04);
 console.log(JSON.stringify({checks:'passed',coverage:['real preparation turns','preview/spawn agreement','boss reward unchanged','victory mastery 1','increasing wave pressure']}));
}
