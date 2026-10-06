// 게임 데이터(직업·스킬·물고기·던전)와 성장 공식을 JSON으로 내보냅니다. 사용: node scripts/export-game-content.mjs <출력.json>
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadGame } from './lib/game-modules.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: node scripts/export-game-content.mjs /absolute/path/content.json');
const { load: moduleAt } = loadGame();
{
    const { JOBS, JOB_TREES } = await moduleAt('game/data/classes');
    const { SKILLS } = await moduleAt('game/data/skills');
    const { FISH, DUNGEONS } = await moduleAt('game/data/world');
    const { PROGRESSION, STAT_LABELS } = await moduleAt('game/data/progression');
    const { STATUS_TUNING } = await moduleAt('game/data/balance');
    const { ENEMY_SKILLS, profile } = await moduleAt('game/data/encounters');
    const { effectiveSkill, masteryMilestonesFor, masteryGainBonus, jobCombatMultiplier, jobFlatBonus } = await moduleAt('game/systems/progression');
    const { masteryConditionText } = await moduleAt('game/systems/mastery');
    const jobName = id => JOBS.find(job => job.id === id)?.name || id;
    const jobs = JOBS.map(job => ({
        ...job, treeName: JOB_TREES.find(tree => tree.id === job.tree).name,
        successors: JOBS.filter(next => next.parent === job.id || next.requiresJobMastery?.[job.id]).map(next => next.name),
        requiredJobs: [job.parent ? `${jobName(job.parent)} 숙련 ${job.mastery}` : '', ...Object.entries(job.requiresJobMastery || {}).map(([id, n]) => `${jobName(id)} 숙련 ${n}`)].filter(Boolean).join(' / ') || '없음',
        requiredSkills: Object.entries(job.requiresSkillMastery || {}).map(([id, level]) => {
            const skill = SKILLS.find(sk => sk.id === id);
            return `${skill?.name || id} 숙련 Lv.${level} (${masteryMilestonesFor(skill)[level - 1]})`;
        }).join(' / ') || '없음',
        effectiveMultipliers: Object.fromEntries(['hp', 'attack', 'magic', 'defense', 'resist'].map(key => [key, jobCombatMultiplier(job, job[key])])),
        masteredMultipliers: Object.fromEntries(['hp', 'attack', 'magic', 'defense', 'resist'].map(key => [key, jobCombatMultiplier(job, job[key], true)])),
        flatBonus: Object.fromEntries(['hp', 'attack', 'magic', 'defense', 'resist'].map(key => [key, jobFlatBonus(job, key)])),
        masteredFlatBonus: Object.fromEntries(['hp', 'attack', 'magic', 'defense', 'resist'].map(key => [key, jobFlatBonus(job, key, true)])),
    }));
    const skills = SKILLS.map(skill => ({ ...skill, ownerName: jobName(skill.job) || '공용', masteryCondition: masteryConditionText(skill),
        sourceName: ENEMY_SKILLS.find(sk => sk.id === skill.sourceEnemySkill)?.name || '',
        sourceMonsters: skill.sourceEnemySkill ? FISH.filter(f => profile(f.id).skills.includes(skill.sourceEnemySkill)).map(f => f.name) : [],
        stages: Array.from({ length: masteryMilestonesFor(skill).length + 1 }, (_, level) => ({ ...effectiveSkill(skill, level + 1), level, mastery: level ? masteryMilestonesFor(skill)[level - 1] : 0, extraMastery: masteryGainBonus(skill, level) })),
    }));
    const { FIRST_CLEAR_SP } = await moduleAt('game/data/achievements');
    const longTerm = await moduleAt('game/data/long-term');
    const payload = { longTerm: { refinementOffsets: longTerm.REFINEMENT_OFFSETS, vocationOffsets: longTerm.VOCATION_OFFSETS }, bossResearch: FIRST_CLEAR_SP, version: '20.0', asOf: '2026-09-28', jobs, skills, fish: FISH, dungeons: DUNGEONS, trees: JOB_TREES, progression: PROGRESSION, statLabels: STAT_LABELS, statusTuning: STATUS_TUNING };
    await writeFile(resolve(outputPath), JSON.stringify(payload, null, 2));
    console.log(JSON.stringify({ output: resolve(outputPath), jobs: jobs.length, skills: skills.length, stages: skills.reduce((sum, sk) => sum + sk.stages.length, 0) }));
}
