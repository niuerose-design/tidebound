// 게임플레이 테스트 공용 준비: 게임 모듈, 공유 시드 난수, test 함수. 테스트 파일은 run.mjs가 정한 순서로 실행됩니다(난수 상태를 공유).
import {readFile} from 'node:fs/promises';
import { loadGame } from '../scripts/lib/game-modules.mjs';
import assert from 'node:assert/strict';
export { assert };
const {load}=loadGame();
const engine=await load('game/systems/engine.js');
export const {act,tick,victoryHeal,rollRarity}=engine;
/** v3.17 분할 정산: 테스트의 advance는 남은 턴이 없을 때까지 이어 돌려 전처럼 한 번에 다 정산한 결과를 줍니다(분할 자체는 v25 테스트가 systems/turn을 직접 검사). */
export const advance=(s,now,rng)=>{do{engine.advance(s,now,rng);}while(s.catchUpLeft);};
/** 분할 정산 한 번만(남은 턴은 s.catchUpLeft). 정산 상한처럼 끝까지 돌릴 필요가 없는 검사에 씁니다. */
export const rawAdvance=(s,now,rng)=>engine.advance(s,now,rng);
/** v3.17 테스트 상태는 모험 안내를 끕니다(단계 완료 보상 세계석·SP가 재화 검증에 섞이지 않게). 안내를 검사하는 테스트는 s.tutorial을 직접 둡니다. */
export const newState=(...a)=>{const s=engine.newState(...a);delete s.tutorial;return s;};
export const encounterSource=await readFile('game/systems/encounter.ts','utf8');
export const {stats,snapshot,expMultiplier,normalizeStats}=await load('game/systems/stats.js');
export const {victoryMastery}=await load('game/systems/mastery.js');
export const {FISH_SHAPES,fishShape,unmappedFish}=await load('game/data/art.js');
export const {SKILL_FX}=await load('game/data/skill-fx.js');
export const equipment=await load('game/systems/equipment.js');
export const migrations=await load('game/systems/migrations.js');
export const {mimicChance:mimicChanceOf,MIMIC:MIMIC_DATA}=await load('game/data/mimic.js');
export const {EXP_NURI:NURI_DATA}=await load('game/data/exp-nuri.js');
export const {fxVariantOf}=await load('game/systems/combat-feedback.js');
export const {visibleStatuses}=await load('game/systems/combat-status.js');
export const {duel,TRAINING,bossSnapshot,BOSS_OPPONENTS}=await load('game/systems/duel.js');
export const {strike,fighterSpeed,actsFirst,constraintFields}=await load('game/systems/combat.js');
export const {diceMultiplier,diceRange}=await load('game/data/balance.js');
export const {variantChances}=await load('game/data/variants.js');
export const {combatFxFromLog,combatFxBatch}=await load('game/systems/combat-feedback.js');
export const {migrateState}=await load('game/systems/migrations.js');
export const {randomGameRunsLeft}=await load('game/systems/random-game.js');
export const {passiveGrowthBonus,jobMastered,apCapacity,apUsed,canUse,canChangeJob,effectiveSkill,skillRankDeltas,skillMasteryLevel,masteryMilestonesFor,jobRequirements,validLoadout,skillLevel,maxSkillLevel,inherited,trimLoadout,jobMasteryTarget,jobCombatMultiplier,limitBreakNext,skillMastery}=await load('game/systems/progression.js');
export const {goalProgress,goalSuggestions}=await load('game/systems/goals.js');
export const {skillGrowthStages,skillExtraNotes}=await load('game/systems/skill-description.js');
export const {SKILLS}=await load('game/data/skills.js');
const WORLD=await load('game/data/world.js');
// v27.86 테스트의 DUNGEONS는 일반 던전(랜덤게임 제외)입니다.
export const {STAGES,FISH,CLOSED_DUNGEONS,setClosures,closuresSnapshot}=WORLD, DUNGEONS=WORLD.PLAIN_DUNGEONS;
// v27.25·v27.31 닫힌 사냥터·던전(기본: 무한 심연)은 라이브에서만 닫습니다. 테스트는 모두 엽니다(닫힘 자체는 content.test에서 따로 확인).
setClosures({dungeons:[],stages:[]});
export const {profile}=await load('game/data/encounters.js');
export const bookMod=await load('game/systems/book.js');
export const economy=await load('game/data/economy.js');
export const {researchRefund}=await load('game/systems/commerce.js');
export const {weightedFishId,victoryHealRate,drop,reward,spawn}=await load('game/systems/encounter.js');
export const vowsMod=await load('game/systems/vows.js');
export const {researchMastery}=await load('game/systems/mastery.js');
export const {shopCost,gambleCost,shopPreview}=await load('game/systems/commerce.js');
export const {itemStats,enhanceCost,reforgeCost,bulkItems}=await load('game/systems/equipment.js');
export const {goldMultiplier,dungeonGoldMultiplier,dropRate,hitChance}=await load('game/systems/stats.js');
export const {rebirthLevel,rebirthReward}=await load('game/systems/meta.js');
export const metaMod=await load('game/systems/meta.js');
export const longTerm=await load('game/data/long-term.js');
export const {xpNeeded,SKILL_FORMULA,STATUS_TUNING,BALANCE,RARITIES}=await load('game/data/balance.js');
export const STATUS_TUNING_MAX=STATUS_TUNING.poisonMaxStacks;
export const gear=await load('game/data/gear.js');
export const {PROGRESSION}=await load('game/data/progression.js');
export const {JOBS,JOB_TREES,LINEAGES,lineageOf,jobTags,isConstraintJob,constraintDeviceLabels}=await load('game/data/classes.js');
export const doorsMod=await load('game/data/doors.js');
// 직업 화면 공용 계산(components/game/jobs/job-status.ts)은 게임 모듈만 쓰므로 같은 임시 폴더에 옮겨 불러옵니다.
{const {dir}=loadGame(),ts=(await import('typescript')).default,fs=await import('node:fs');
fs.mkdirSync(`${dir}/ui`,{recursive:true});
fs.writeFileSync(`${dir}/ui/job-status.js`,ts.transpileModule(fs.readFileSync('components/game/jobs/job-status.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (['"])@\/game\/([^'"]+)\1/g,'from $1../$2.js$1'));}
export const jobUi=await load('ui/job-status.js');
let seed=44;
export const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
export const results={passed:0};
// v3.27 비동기 테스트(파일 DB 등)는 차례로 돌립니다. 동시에 돌면 서로의 TIDEBOUND_DEV_DB 파일을 지워 결과가 흔들렸습니다. 동기 테스트는 그대로 즉시 실행.
let chain=Promise.resolve();
export const test=(name,fn)=>{if(fn.constructor.name==='AsyncFunction'){chain=chain.then(async()=>{await fn();results.passed++;console.log('PASS',name)});return;}fn();results.passed++;console.log('PASS',name)};
/** run.mjs가 끝에 기다립니다: 줄 세운 비동기 테스트가 모두 끝날 때까지. */
export const settled=()=>chain;
