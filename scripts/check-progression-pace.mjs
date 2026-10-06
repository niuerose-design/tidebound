// 장비 없이(유료 SP·연구 제외) 관리형 플레이로 레벨 10·20·25·30 도달 시간을 측정합니다. 사용: node scripts/check-progression-pace.mjs
import { loadGame } from './lib/game-modules.mjs';
import { random, manage, chooseStage } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();
const {newState,tick}=await moduleAt('systems/engine');
// 액티브 스킬 규칙은 check-balance.mjs가 확인합니다.
for(const magic of [false,true])for(const seed of [29]){
 const s=newState(0),rng=random(seed);s.equipment={};s.inventory=[];let checkpoint={};
 for(let n=0;n<43200&&s.level<30;n++){
  if(n%30===0)manage(s,{magic,rng,secondary:20,primary:35,gear:false});
  if(n%300===0)chooseStage(s,seed+n);
  tick(s,rng);
  if([10,20,25,30].includes(s.level)&&!checkpoint[s.level])checkpoint[s.level]=+(s.turn/1800).toFixed(2);
 }
 console.log(JSON.stringify({build:magic?'magic':'physical',seed,hours:+(s.turn/1800).toFixed(2),level:s.level,kills:s.kills,deaths:s.deaths,job:s.job,stage:s.stage,skills:s.skills,checkpoint}));
}

