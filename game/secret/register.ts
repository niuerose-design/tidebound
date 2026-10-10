/**
 * v3.44 서버 전용: 비밀 직업·계보를 직업 표에 더합니다(docs/concept.md 10장). 게임 엔진(systems/engine.ts)이 불러오므로
 * 서버와 테스트에서는 언제나 전체 직업 표를 씁니다. 화면 코드는 이 파일을 가져가면 안 됩니다.
 */
// v3.49 서버 전용 표식: 화면(클라이언트) 번들이 이 파일을 가져가면 빌드가 실패합니다(docs/concept.md 10.2-1).
import 'server-only';
import { registerJobs, registerLineages, jobById, lineageOf, worldOf, AZEROTH_MASTERY_SCALE } from '../data/classes';
import { registerSkills, alignJobMastery, normalizeSkillMastery, scaleUtilityGain, skillById, SKILLS } from '../data/skills';
import { SECRET_JOBS, SECRET_LINEAGES } from './jobs';
import { SECRET_SKILLS } from './skills';
import { awakenSkill } from '../data/skill-balance';
import { applyCoreRework } from '../data/core-passive';
import { SKILL_FORMULA } from '../data/balance';
import { setOdds } from '../data/odds';
import { SERVER_ODDS } from './odds';
// v3.62 숨은 전직 조건(조건 창구 unlock-info를 채움).
import './unlocks';

registerLineages(SECRET_LINEAGES);
registerJobs(SECRET_JOBS, true);
// v3.47 비밀 직업의 스킬(완성된 모양).
registerSkills(SECRET_SKILLS);
// v3.80 비밀 직업 스킬도 숙련 기준(normalizeSkillMastery)에 맞추고, 숙달 목표도 스킬 숙련에 맞춥니다(alignJobMastery).
normalizeSkillMastery(SECRET_SKILLS.map(sk => skillById(sk.id)!).filter(Boolean));
alignJobMastery(SECRET_JOBS.map(j => jobById(j.id)!).filter(Boolean));
// v3.221 아제로스 규칙: 숙련 기준(위)을 맞춘 뒤 직업 숙달 목표와 그 직업 스킬의 숙련 단계를 AZEROTH_MASTERY_SCALE배로.
for (const raw of SECRET_JOBS) {
    const job = jobById(raw.id)!;
    if (worldOf(SECRET_LINEAGES.find(l => l.id === lineageOf(job))) !== 'azeroth') continue;
    job.masteryTarget = (job.masteryTarget || 0) * AZEROTH_MASTERY_SCALE;
    for (const sk of SKILLS) if (sk.job === job.id && sk.masteryMilestones) sk.masteryMilestones = sk.masteryMilestones.map(n => n * AZEROTH_MASTERY_SCALE);
}
// v3.228 비밀 메이플 월드 4 · 5차도 핵심 패시브 개편(data/core-passive.ts, 아제로스 계보 제외).
applyCoreRework(SECRET_JOBS.map(j => jobById(j.id)!).filter(Boolean), SKILLS, SECRET_LINEAGES);
// v3.86 비밀 5차 이상 직업의 액티브도 각성기로(공개 스킬은 tuneActiveSkills에서).
// v3.199 제로 (5차)의 액티브는 각성기로 바꾸지 않습니다. 태그(알파 ↔ 베타)는 행동마다 번갈아 쓰는 규칙이라, 턴마다 따로 굴리는 각성기와 맞지 않습니다.
for (const sk of SECRET_SKILLS) if ((jobById(sk.job || '')?.tier ?? 0) >= SKILL_FORMULA.awaken.tier && sk.job !== 'chronarch') awakenSkill(skillById(sk.id)!);
// v3.83 비밀 직업이 더해진 뒤 한 번 더: 비밀 유틸리티 직업의 스킬도 획득 보너스 ×1.5(scaleUtilityGain, 이미 곱한 객체는 건너뜀).
scaleUtilityGain(SKILLS);
// v3.52 드롭·확률 수치.
setOdds(SERVER_ODDS);
