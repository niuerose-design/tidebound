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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-balance-'));
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
for(const sk of SKILLS.filter(x=>x.type==='active')){
 assert(ACTIVE_SKILL_BALANCE[sk.id],`Missing balance row: ${sk.id}`);
 for(let level=0;level<=maxSkillLevel(sk);level++){
  const value=effectiveSkill(sk,level+1);
  if(sk.damageType==='magic'){assert(value.manaCost>0);assert(value.chance>=.45);}
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

const {migrateState}=await moduleAt('systems/migrations');
const {snapshot}=await moduleAt('systems/stats');
const {duel}=await moduleAt('systems/duel');
const {victoryMastery}=await moduleAt('systems/mastery');
const {BOSS_RESEARCH,SPECIALIZATIONS,specializationFits}=await moduleAt('data/specializations');
const legacy=newState(0);legacy.version=5;legacy.clears.grotto=3;legacy.gold=987;legacy.sp=2;delete legacy.bossResearchClaims;delete legacy.skillSpecializations;
const migrated=migrateState(legacy);assert.equal(migrated.version,6);assert.equal(migrated.gold,987);assert.equal(migrated.clears.grotto,3);
act(migrated,{type:'bossResearch',id:'grotto'},0);assert.equal(migrated.sp,3);
assert.throws(()=>act(migrated,{type:'bossResearch',id:'grotto'},0));assert.equal(migrated.sp,3);
assert.throws(()=>act(migrated,{type:'bossResearch',id:'caldera'},0));
assert.throws(()=>act(migrated,{type:'specialize',id:'hook',value:'precision'},0));
migrated.skillPractice.hook=120;
act(migrated,{type:'specialize',id:'hook',value:'disrupt'},0);
assert.throws(()=>act(migrated,{type:'specialize',id:'hook',value:'shatter'},0));
act(migrated,{type:'growthGoal',id:'hook',value:'skill'},0);assert.equal(migrated.growthGoal.target,2);
migrated.running=true;assert.throws(()=>act(migrated,{type:'specialize',id:'hook',value:'precision'},0));migrated.running=false;
const snap=snapshot(migrated);assert.equal(snap.skillSpecializations.hook,'disrupt');
const result=duel(snap,snap,true,()=>.5);assert(Number.isFinite(result.playerHp));
migrated.level=30;act(migrated,{type:'rebirth'},0);assert.equal(migrated.skillSpecializations.hook,'disrupt');assert.equal(migrated.bossResearchClaims.grotto,true);assert.equal(migrated.growthGoal.target,2);assert.equal(migrated.skillPractice.hook,120);assert.equal(migrated.sp,3);
assert.throws(()=>act(migrated,{type:'bossResearch',id:'grotto'},0));
assert.equal(victoryMastery(migrated,{id:'minnow',boss:false}).amount,1);assert.equal(victoryMastery(migrated,{id:'abyssSovereign',boss:true}).amount,1);
for(const sk of SKILLS.filter(x=>x.type==='active'))for(const spec of SPECIALIZATIONS.filter(x=>specializationFits(sk,x)))for(let rank=1;rank<=5;rank++){
 const fx=effectiveSkill(sk,rank,1,spec.id);assert(fx.multiplier>0);if(sk.damageType==='magic')assert(fx.manaCost>=1);else assert.equal(fx.manaCost,0);assert((fx.extraAttacks||0)<=2);
}
const make=(id,spec,effects={})=>({name:'test',stats:{...base,hp:1000,attack:100,magic:100,defense:0,resist:0,crit:0,mana:100,manaRegen:0},hp:800,mana:100,skills:[id],mastery:{[id]:1},specializations:{[id]:spec},stun:0,cooldowns:{},effects});
const plainTarget=()=>({...make('',undefined),skills:[],hp:10000});
const a=make('hook','bloodlink'),b=plainTarget();strike(a,b,()=>0);const unlinked=10000-b.hp;
const c=make('hook','bloodlink'),d=plainTarget();d.effects.dot={damage:1,turns:3,name:'출혈'};const linkedLog=strike(c,d,()=>0);assert(10000-d.hp>unlinked);assert(linkedLog.includes('연계'));
const purify=make('breath','purify',{dot:{damage:2,turns:3,name:'출혈'},slow:3});purify.hp=200;strike(purify,plainTarget(),()=>0);assert(!purify.effects.dot&&!purify.effects.slow);
const reserve=make('arcane','reserve');const cost=effectiveSkill(SKILLS.find(x=>x.id==='arcane'),1,1,'reserve').manaCost;strike(reserve,plainTarget(),()=>0);assert.equal(reserve.mana,100-cost);
const echo=make('pierce','echo');assert(strike(echo,plainTarget(),()=>0).includes('추가타'));
const expedition=newState(0);expedition.level=30;expedition.attributes.str=100;expedition.attributes.vit=100;expedition.attributes.wis=100;act(expedition,{type:'dungeon',id:'grotto'},0);for(let n=0;n<1000&&expedition.dungeon;n++)tick(expedition,()=>.1);assert.equal(expedition.clears.grotto,1);assert.equal(expedition.sp,0);act(expedition,{type:'bossResearch',id:'grotto'},0);assert.equal(expedition.sp,1);
console.log(JSON.stringify({growthChecks:'passed',coverage:['v5 migration','retroactive reward','duplicate reward blocked','mastery and boss gates','pause gate','rebirth preservation','normal mastery unchanged','physical and magic costs','combo','cleanse','mana saving','follow-up','PvP snapshot','actual dungeon loop']}));
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
