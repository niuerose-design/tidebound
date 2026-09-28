// Run: node scripts/check-swarm.mjs
// 무리 사냥 검증: 같은 캐릭터·어종·시간으로 ×1/×5/×100의 시간당 숙련·경험치·골드·드롭·사망을 비교합니다.
// Fresh saves; no paid SP, permanent bonuses, guilds or inherited-job routing.
// Manage stats/gear/training each minute; sample available fishing areas every
// ten minutes. The chooser has information a novice would not have: these are
// managed runs, not a promise of wall-clock completion for every player.
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
const baseline=process.argv.includes('--baseline');
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-balance-'));
try {
for(const f of fs.readdirSync('game',{recursive:true}).filter(f=>f.endsWith('.ts')&&!f.startsWith('server/'))){
 let source; try { source=baseline?execFileSync('git',['show',`e015f6433fc42c6ef2d8fbcc1c810fc30b75c701:game/${f}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']}):fs.readFileSync(path.join('game',f),'utf8'); } catch { continue; }
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from ${q}${p}.js${q}`);
 const out=path.join(temp,f.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,code);
}
fs.writeFileSync(path.join(temp,'package.json'),' {"type":"module"}');
const moduleAt=p=>import(pathToFileURL(path.join(temp,p+'.js')).href);

const {newState,tick,advance}=await moduleAt('systems/engine');
const {stats,hitChance,snapshot}=await moduleAt('systems/stats');
const {combatFxFromLog}=await moduleAt('systems/combat-feedback');
const {strike,fighterSpeed}=await moduleAt('systems/combat');
const {SKILLS}=await moduleAt('data/skills');
const {JOBS}=await moduleAt('data/classes');
const {FISH}=await moduleAt('data/world');
const {tierHealth,tierAttack}=await moduleAt('systems/meta');
const {enemyStats,scaledEnemyStats,profile}=await moduleAt('data/encounters');
const {grantJobSkills,canUse,validLoadout,skillMasteryRanks,effectiveSkill}=await moduleAt('systems/progression');
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}

const {BALANCE}=await moduleAt('data/balance');
const {xpNeeded}=await moduleAt('data/balance');
const {act}=await moduleAt('systems/engine');
BALANCE.inventoryCap=1e9; // 드롭 수를 그대로 세기 위해 자동 판매를 끕니다.
const HOURS=+(process.env.HOURS||6);
const cases=[
 // [설명, 직업, 레벨, 배분, 스킬, 낚시터, 어종]
 ['압도·출혈 작살','whaler',40,{str:80,dex:30,vit:40,wis:10},['breath','pierce','whaleStrike','focus','barb'],'reef','eel'],
 ['압도·체력 비례','chimera',40,{str:60,int:50,vit:50},['vitalSurge','adaptiveCore','breath'],'reef','eel'],
 ['압도·추가타','corsair',40,{dex:70,luk:40,str:30,vit:20},['breath','cut','razor','drift','precision'],'reef','eel'],
 ['쉬운 상대·출혈 작살','whaler',40,{str:80,dex:30,vit:40,wis:10},['breath','pierce','whaleStrike','focus','barb'],'wreck','shark'],
 ['적정 상대·출혈 작살','whaler',40,{str:80,dex:30,vit:40,wis:10},['breath','pierce','whaleStrike','focus','barb'],'moon','dragon'],
 ['적정 상대·체력 비례','chimera',40,{str:60,int:50,vit:50},['vitalSurge','adaptiveCore','breath'],'moon','dragon'],
 ['적정 상대·추가타','corsair',40,{dex:70,luk:40,str:30,vit:20},['breath','cut','razor','drift','precision'],'moon','moonfish'],
 ['적정 상대·마법','tempest',40,{int:80,wis:40,vit:30,dex:10},['spring','wave','maelstrom','arcane','abyssMind'],'moon','moonfish'],
];
const rows=[];
for(const [label,job,L,attributes,skills,stage,fish] of cases)for(const size of [1,5,100]){
 const s=newState(0);s.level=L;s.rebirths=5;s.attributes={str:0,dex:0,int:0,vit:0,wis:0,luk:0,...attributes};s.job=job;s.equipment={};s.inventory=[];s.book={[fish]:1000};s.unlockedJobs=JOBS.map(j=>j.id);s.jobMastery[job]=12000;
 for(const sk of SKILLS){s.learned[sk.id]=1;s.skillPractice[sk.id]=80000;}s.skills=[];
 for(const id of skills)if(canUse(s,id)&&validLoadout(s,[...s.skills,id]))s.skills.push(id);
 s.hp=stats(s).hp;s.mana=stats(s).mana;
 act(s,{type:'stage',id:stage},0);act(s,{type:'target',id:fish},0);act(s,{type:'swarm',id:String(size)},0);act(s,{type:'start'},0);
 const m0=s.jobMastery[job],g0=s.gold,k0=s.kills,d0=s.deaths,inv0=s.inventory.length,L0=s.level,e0=s.exp;
 const rng=random(7);let now=0;const end=HOURS*3600000;
 while(now<end){now=Math.min(end,now+600000);advance(s,now,rng);s.level=L;s.exp=0;} // 레벨 고정: 같은 조건 비교
 const h=HOURS;rows.push({label,size,killsPerH:Math.round((s.kills-k0)/h),masteryPerH:Math.round((s.jobMastery[job]-m0)/h),goldPerH:Math.round((s.gold-g0)/h),dropsPerH:+((s.inventory.length-inv0)/h).toFixed(1),deathsPerH:+((s.deaths-d0)/h).toFixed(2),inProgress:s.enemy?.swarm?Math.round((1-s.enemy.hp/s.enemy.maxHp)*100):0});
}
const byLabel={};for(const r of rows)(byLabel[r.label]??=[]).push(r);
for(const [label,list] of Object.entries(byLabel)){const base=list[0];for(const r of list){r.masteryVsX1=base.masteryPerH?+(r.masteryPerH/base.masteryPerH).toFixed(2):null;r.goldVsX1=base.goldPerH?+(r.goldPerH/base.goldPerH).toFixed(2):null;}}
console.table(rows);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
