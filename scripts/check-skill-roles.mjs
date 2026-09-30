// 스킬 역할 분류와 겹침 그룹 출력 (docs/skill-role-review.md 근거). 사용: node scripts/check-skill-roles.mjs [out.json]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
const {load:m}=loadGame();
const {SKILLS}=await m('data/skills'); const {JOBS}=await m('data/classes'); const {effectiveSkill,maxSkillLevel}=await m('systems/progression');
const roles=sk=>{const r=[];const b=sk.bonus||{};const lv=(sk.levelEffects||[]).flatMap(x=>Object.keys(x.bonus||{}));const keys=new Set([...Object.keys(b),...lv,...Object.keys(sk.masteryBonus||{})]);
 if(sk.type==='active'){ if(sk.damageType==='magic')r.push('마법공격'); else if(sk.damageType==='split')r.push('복합'); else r.push('물리공격');
  if(sk.penetrationBonus||sk.scaling==='hp'||sk.scaling==='hybrid')r.push('고방어대응'); if(['stun','bleed','weaken','silence','slow'].includes(sk.effect))r.push('상태이상:'+sk.effect);
  if(sk.extraAttacks||sk.damageBonusCondition)r.push('연계'); if(['heal','drain'].includes(sk.effect)||sk.cleanseSelf)r.push('생존:'+(sk.effect||'cleanse')); if(sk.effect==='haste')r.push('버프:haste'); if((sk.manaCost||0)===0)r.push('마나0');}
 else { if(keys.has('attack')||keys.has('crit')||keys.has('critDamage')||keys.has('penetration'))r.push('물리공격↑'); if(keys.has('magic'))r.push('마법공격↑'); if(keys.has('hp')||keys.has('defense')||keys.has('resist')||keys.has('lifesteal')||keys.has('evasion'))r.push('생존↑'); if(keys.has('mana')||keys.has('manaRegen'))r.push('마나유지'); if(keys.has('goldBonus')||keys.has('expBonus')||keys.has('dropBonus')||keys.has('dungeonGoldBonus')||keys.has('rebirthBonus')||sk.masteryGain)r.push('숙련·재화'); if(keys.has('accuracy')||keys.has('speed'))r.push('명중·속도');}
 return r;};
const rows=SKILLS.map(sk=>{const e=effectiveSkill(sk,1,maxSkillLevel(sk));return {id:sk.id,name:sk.name,job:JOBS.find(j=>j.id===sk.job)?.name||'공용',type:sk.type,lv:sk.level,rb:sk.rebirth||0,ap:e.cost,mana:e.manaCost||0,chance:e.chance,cd:e.cooldown,mult:e.multiplier,dmg:sk.damageType||'physical',effect:sk.effect||'',cond:sk.condition||'',extra:sk.extraAttacks||0,roles:roles(sk).join(','),desc:sk.desc};});
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(rows,null,1));
const groups={};for(const r of rows){const k=r.type==='active'?[r.type,r.dmg,r.effect,r.cond,r.extra?'extra':''].join('|'):[r.type,r.roles].join('|');(groups[k]||=[]).push(r);}
for(const [k,g] of Object.entries(groups).sort((a,b)=>b[1].length-a[1].length)) if(g.length>1) console.log(k,'\n  '+g.map(r=>`${r.name}(${r.job} Lv${r.lv}${r.rb?' 환생'+r.rb:''}) AP${r.ap} MP${r.mana} ${r.type==='active'?`확률${Math.round(r.chance*100)}% CD${r.cd} x${r.mult}`:''} [${r.roles}]`).join('\n  '));
console.log('TOTAL',rows.length);
