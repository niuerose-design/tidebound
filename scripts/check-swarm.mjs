// 무리 사냥 검증: 같은 캐릭터·어종·시간으로 ×1/×5/×100의 시간당 숙련·경험치·골드·드롭·사망을 비교합니다. 사용: node scripts/check-swarm.mjs
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const {load:moduleAt}=loadGame();

const {newState,advance}=await moduleAt('systems/engine');
const {stats}=await moduleAt('systems/stats');
const {SKILLS}=await moduleAt('data/skills');
const {JOBS}=await moduleAt('data/classes');
const {canUse,validLoadout}=await moduleAt('systems/progression');

const {BALANCE}=await moduleAt('data/balance');
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
 const m0=s.jobMastery[job],g0=s.gold,k0=s.kills,d0=s.deaths,inv0=s.inventory.length;
 const rng=random(7);let now=0;const end=HOURS*3600000;
 while(now<end){now=Math.min(end,now+600000);advance(s,now,rng);s.level=L;s.exp=0;} // 레벨 고정: 같은 조건 비교
 const h=HOURS;rows.push({label,size,killsPerH:Math.round((s.kills-k0)/h),masteryPerH:Math.round((s.jobMastery[job]-m0)/h),goldPerH:Math.round((s.gold-g0)/h),dropsPerH:+((s.inventory.length-inv0)/h).toFixed(1),deathsPerH:+((s.deaths-d0)/h).toFixed(2),inProgress:s.enemy?.swarm?Math.round((1-s.enemy.hp/s.enemy.maxHp)*100):0});
}
const byLabel={};for(const r of rows)(byLabel[r.label]??=[]).push(r);
for(const list of Object.values(byLabel)){const base=list[0];for(const r of list){r.masteryVsX1=base.masteryPerH?+(r.masteryPerH/base.masteryPerH).toFixed(2):null;r.goldVsX1=base.goldPerH?+(r.goldPerH/base.goldPerH).toFixed(2):null;}}
console.table(rows);
