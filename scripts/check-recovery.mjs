// 회복 개편 측정: 처치 후 회복 비율별 생존율·성장 속도·던전 정복률 비교. 사용: node scripts/check-recovery.mjs [hours=6]
// 운영 로직(능력치·직업·스킬·장비·사냥터 선택)은 check-balance.mjs와 같고, 30분마다 입장 레벨보다 6 이상 높은 던전 중 가장 높은 곳에 1회 도전합니다.
// 'firstAid'는 승리당 최대 체력 4%를 더 회복하는 패시브를 가정한 값입니다(AP 2 비용은 반영하지 않음).
// Run from the repository root: node scripts/check-balance.mjs
// Fresh saves; no paid SP, permanent bonuses, guilds or inherited-job routing.
// Manage stats/gear/training each minute; sample available fishing areas every
// ten minutes. The chooser has information a novice would not have: these are
// managed runs, not a promise of wall-clock completion for every player.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-recovery-'));
try {
for(const f of fs.readdirSync('game',{recursive:true}).filter(f=>f.endsWith('.ts')&&!f.startsWith('server/'))){
 const code=ts.transpileModule(fs.readFileSync(path.join('game',f),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from ${q}${p}.js${q}`);
 const out=path.join(temp,f.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,code);
}
fs.writeFileSync(path.join(temp,'package.json'),' {"type":"module"}');
const moduleAt=p=>import(pathToFileURL(path.join(temp,p+'.js')).href);
const {newState,tick,act}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {canChangeJob,canUse,validLoadout,attributes,effectiveSkill,maxSkillLevel}=await moduleAt('systems/progression');
const {itemStats}=await moduleAt('systems/equipment');
const {STAGES}=await moduleAt('data/world');
const {SKILLS}=await moduleAt('data/skills');
const {ACTIVE_SKILL_BALANCE}=await moduleAt('data/skill-balance');
const {xpNeeded}=await moduleAt('data/balance');
const {strike}=await moduleAt('systems/combat');
const {BALANCE:B,MONSTER_TUNING:MT}=await moduleAt('data/balance');
const {DUNGEONS}=await moduleAt('data/world');
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const totalXP=s=>s.exp+Array.from({length:s.level-1},(_,i)=>xpNeeded(i+1)).reduce((a,b)=>a+b,0);
function gearScore(item,magic){const v=itemStats(item);return (v[magic?'magic':'attack']||0)*4+(v.hp||0)*.22+(v.defense||0)*1.5+(v.resist||0)*1.2+(v.accuracy||0)*150+(v.crit||0)*150;}
function manage(s,magic,rng,noHeal){
 const now=s.turn*2000; const actNow=a=>act(s,a,now,rng);
 while(s.statPoints){const v=attributes(s);let id=magic?(v.wis<10?'wis':v.int<12?'int':s.statPoints%4===0?'vit':'int'):(v.dex<10?'dex':v.str<12?'str':s.statPoints%4===0?'vit':'str');actNow({type:'attribute',id});}
 const jobs=magic?['tide','tempest']:['harpoon','whaler'];
 for(const id of jobs)if(s.job!==id&&!s.unlockedJobs.includes(id)&&canChangeJob(s,id))actNow({type:'job',id});
 const available=SKILLS.filter(sk=>canUse(s,sk.id)&&!(noHeal&&(['heal','drain'].includes(sk.effect)||(sk.bonus?.lifesteal))));
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
const HOURS=Number(process.argv[2]||6), TURNS=HOURS*1800;
const configs=process.env.RECOVERY_CONFIGS?JSON.parse(process.env.RECOVERY_CONFIGS):{current:[.16,.08],proposal:[.04,0],proposalFirstAid:[.08,.04]};
const rows=[];
for(const [name,[normal,dungeon]] of Object.entries(configs))for(const noHeal of [false,true])for(const magic of [false,true]){
 B.healAfterKill=normal;MT.dungeonHealAfterKill=dungeon;
 const agg={config:name,build:(magic?'magic':'physical')+(noHeal?'-noHeal':''),level:0,kills:0,deaths:0,dTry:0,dClear:0,lv30h:0,runs:0};
 for(const seed of [11,29,47]){
  const s=newState(0),rng=random(seed);let lv30=null,tries=0,clears=0;
  for(let n=0;n<TURNS;n++){
   if(n%30===0&&!s.dungeon)manage(s,magic,rng,noHeal);
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

} finally { fs.rmSync(temp,{recursive:true,force:true}); }
