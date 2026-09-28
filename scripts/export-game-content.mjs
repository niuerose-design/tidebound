// Export the same data and growth formulas used by the running game.
import ts from 'typescript';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: node scripts/export-game-content.mjs /absolute/path/content.json');
const temp = await mkdtemp(join(tmpdir(), 'tidebound-content-'));
try {
    async function compile(dir) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.name === 'server') continue;
            const src = join(dir, entry.name), dst = join(temp, src);
            if (entry.isDirectory()) { await mkdir(dst, { recursive: true }); await compile(src); }
            else if (entry.name.endsWith('.ts')) {
                const code = ts.transpileModule(await readFile(src, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, quote, path) => `from ${quote}${path}.js${quote}`);
                await writeFile(dst.replace(/\.ts$/, '.js'), code);
            }
        }
    }
    await mkdir(join(temp, 'game'));
    await writeFile(join(temp, 'package.json'), '{"type":"module"}');
    await compile('game');
    const moduleAt = path => import(pathToFileURL(join(temp, path + '.js')).href);
    const { JOBS, JOB_TREES } = await moduleAt('game/data/classes');
    const { SKILLS } = await moduleAt('game/data/skills');
    const { FISH, DUNGEONS } = await moduleAt('game/data/world');
    const { PROGRESSION, STAT_LABELS } = await moduleAt('game/data/progression');
    const { STATUS_TUNING } = await moduleAt('game/data/balance');
    const { ENEMY_SKILLS, profile } = await moduleAt('game/data/encounters');
    const { effectiveSkill, masteryMilestonesFor, masteryGainBonus, jobCombatMultiplier } = await moduleAt('game/systems/progression');
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
    }));
    const skills = SKILLS.map(skill => ({ ...skill, ownerName: jobName(skill.job) || '공용', masteryCondition: masteryConditionText(skill),
        sourceName: ENEMY_SKILLS.find(sk => sk.id === skill.sourceEnemySkill)?.name || '',
        sourceMonsters: skill.sourceEnemySkill ? FISH.filter(f => profile(f.id).skills.includes(skill.sourceEnemySkill)).map(f => f.name) : [],
        stages: Array.from({ length: masteryMilestonesFor(skill).length + 1 }, (_, level) => ({ ...effectiveSkill(skill, level + 1), level, mastery: level ? masteryMilestonesFor(skill)[level - 1] : 0, extraMastery: masteryGainBonus(skill, level) })),
    }));
    const { SPECIALIZATIONS, BOSS_RESEARCH } = await moduleAt('game/data/specializations');
    const longTerm = await moduleAt('game/data/long-term');
    const payload = { longTerm: { refinementOffsets: longTerm.REFINEMENT_OFFSETS, vocationOffsets: longTerm.VOCATION_OFFSETS }, specializations: SPECIALIZATIONS, bossResearch: BOSS_RESEARCH, version: '20.0', asOf: '2026-09-28', jobs, skills, fish: FISH, dungeons: DUNGEONS, trees: JOB_TREES, progression: PROGRESSION, statLabels: STAT_LABELS, statusTuning: STATUS_TUNING };
    await writeFile(resolve(outputPath), JSON.stringify(payload, null, 2));
    console.log(JSON.stringify({ output: resolve(outputPath), jobs: jobs.length, skills: skills.length, stages: skills.reduce((sum, sk) => sum + sk.stages.length, 0) }));
} finally {
    // Only the exact private compilation directory created above is removed.
    await rm(temp, { recursive: true, force: true });
}
