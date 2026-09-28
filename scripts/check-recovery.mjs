// 처치 후 회복 비율별 사망률·처치 속도·던전 정복률 비교. 사용: node scripts/check-recovery.mjs [시간=6]
// RECOVERY_CONFIGS 환경 변수로 비교할 [일반, 던전] 회복률을 바꿀 수 있습니다. 응급처치는 +4%로 가정합니다(AP 비용 미반영).
import { loadGame } from './lib/game-modules.mjs';
import { random,   manage, chooseStage } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();
const {newState,tick,act}=await moduleAt('systems/engine');
const {BALANCE:B,MONSTER_TUNING:MT}=await moduleAt('data/balance');
const {DUNGEONS}=await moduleAt('data/world');
const HOURS=Number(process.argv[2]||6), TURNS=HOURS*1800;
const configs=process.env.RECOVERY_CONFIGS?JSON.parse(process.env.RECOVERY_CONFIGS):{current:[.16,.08],proposal:[.04,0],proposalFirstAid:[.08,.04]};
const rows=[];
for(const [name,[normal,dungeon]] of Object.entries(configs))for(const noHeal of [false,true])for(const magic of [false,true]){
 B.healAfterKill=normal;MT.dungeonHealAfterKill=dungeon;
 const agg={config:name,build:(magic?'magic':'physical')+(noHeal?'-noHeal':''),level:0,kills:0,deaths:0,dTry:0,dClear:0,lv30h:0,runs:0};
 for(const seed of [11,29,47]){
  const s=newState(0),rng=random(seed);let lv30=null,tries=0,clears=0;
  for(let n=0;n<TURNS;n++){
   if(n%30===0&&!s.dungeon)manage(s,{magic,rng,skillFilter:sk=>!(noHeal&&(['heal','drain'].includes(sk.effect)||(sk.bonus?.lifesteal)))});
   if(n%300===0&&!s.dungeon)chooseStage(s,seed+n);
   if(n%900===450&&!s.dungeon){const d=[...DUNGEONS].filter(x=>x.id!=='abyss'&&s.level>=x.level+6&&s.rebirths>=x.rebirth).sort((a,b)=>b.level-a.level)[0];if(d){const before=s.clears[d.id]||0;act(s,{type:'dungeon',id:d.id},s.turn*2000,rng);tries++;let k=0;while(s.dungeon&&k++<600)tick(s,rng);if(process.env.DEBUG_DUNGEON&&tries<3)console.log('dungeon',d.id,'lv',s.level,'k',k,'inDungeon',!!s.dungeon,'wave',s.dungeon?.wave,'running',s.running,'last',s.logs.slice(-3).map(l=>l.text).join(' | '));if((s.clears[d.id]||0)>before)clears++;act(s,{type:'start'},s.turn*2000,rng);}}
   tick(s,rng);
   if(s.level>=30&&lv30===null)lv30=s.turn/1800;
  }
  agg.level+=s.level;agg.kills+=s.kills;agg.deaths+=s.deaths;agg.dTry+=tries;agg.dClear+=clears;agg.lv30h+=lv30??HOURS*2;agg.runs++;
 }
 const r=agg.runs;rows.push({config:agg.config,build:agg.build,level:+(agg.level/r).toFixed(1),killsPerHour:Math.round(agg.kills/r/HOURS),deathsPer100Kills:+(agg.deaths/agg.kills*100).toFixed(2),dungeonClear:`${agg.dClear}/${agg.dTry}`,hoursToLv30:+(agg.lv30h/r).toFixed(2)});
}
console.table(rows);

