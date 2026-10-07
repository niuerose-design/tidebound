/**
 * v3.40 승천 편의(설계 14.3): 자동 환생 · 연구 구매 예약(승천 1회부터), v3.41 사냥터·난이도 자동 따라가기 · 숙련 순회 전직(승천 2회부터).
 * 전투력과 무관한 반복 조작 덜기입니다.
 * 둘 다 자동 사냥 턴(온라인 tick·부재중 정산)마다 확인합니다. 설정은 환생·승천해도 남습니다(승천 전에 짜 둔 순서를 다음 바퀴에 다시 씀).
 */
import type { State } from '../types';
import { ASCENSION, ascensionOf, ascensionPerk } from '../data/ascension';
import { rebirthLevel, tideLimit } from './meta';
import { rebirthNow } from './actions/lifecycle';
import { buildActions } from './actions/build';
import { STAGES, PLACES, stageClosed, hackDownOf } from '../data/world';
import { MIMIC } from '../data/mimic';
import { JOBS, jobById } from '../data/classes';
import { isHackerJob } from '../data/hacker';
import { vocationTargets, thresholdRank } from '../data/long-term';
import { canChangeJob, jobMastered, jobMasteryTarget } from './progression';
import { recommendLoadout } from './loadout';
import { addLog } from './state';
import { runResearchPlan } from './research-plan';

/** 자동 환생이 지금 일어날 조건: 승천 1회 · 켜 둠 · 던전 밖 · 환생 상한 전 · 목표 레벨 도달. */
export function autoRebirthDue(s: State) {
    const a = s.autoRebirth;
    if (!a?.on || !ascensionPerk(s, 'autoRebirth') || s.dungeon || s.rebirths >= ASCENSION.rebirthCap) return false;
    return s.level >= Math.max(rebirthLevel(s), a.level || 0);
}

/** v3.41 자동 따라가기 규칙. 사냥터: top = 레벨이 맞는 가장 높은 일반 사냥터, habitat = 레벨이 맞는 가장 높은 무리 서식지(없으면 top), keep = 그대로. v3.97 적정 환생에 닿은 곳을 먼저.
 * 난이도: max = 고를 수 있는 최대, mimic = 까미 확률이 최대가 되는 난이도(MIMIC.tierCap)까지, keep = 그대로. */
export const FOLLOW_STAGE = ['top', 'habitat', 'keep'] as const;
export const FOLLOW_TIDE = ['max', 'mimic', 'keep'] as const;
export type FollowRule = { on: boolean; stage: typeof FOLLOW_STAGE[number]; tide: typeof FOLLOW_TIDE[number] };
const enterable = (s: State, st: typeof STAGES[number]) => st.level <= s.level && s.rebirths >= st.rebirth && !stageClosed(st.id) && (st.id === s.stage || !hackDownOf('stage', st.id, s.lastTick));
/** 규칙이 고르는 사냥터·난이도(바꿀 것이 없으면 지금 값). */
export function followTarget(s: State, rule: FollowRule) {
    // v3.97 입장 조건을 내리면서, 적정 환생(fit)에 닿은 곳 중 가장 높은 곳을 고릅니다(없으면 입장 가능한 가장 높은 곳).
    const fits = (st: typeof STAGES[number]) => (st.fit ?? 0) <= s.rebirths;
    const pick = (list: typeof STAGES) => [...list].reverse().find(st => enterable(s, st) && fits(st)) || [...list].reverse().find(st => enterable(s, st));
    const top = pick(PLACES), habitat = pick(STAGES.filter(st => st.habitat));
    const stage = rule.stage === 'keep' ? s.stage : (rule.stage === 'habitat' ? habitat || top : top)?.id || s.stage;
    const limit = tideLimit(s), tide = rule.tide === 'keep' ? s.tide || 0 : rule.tide === 'mimic' ? Math.min(limit, MIMIC.tierCap) : limit;
    return { stage, tide };
}
/** 전투 사이(적 없음·던전 밖·회복 대기 아님)에만 바꿉니다. 바꿨으면 true. */
export function runAutoFollow(s: State) {
    const rule = s.autoFollow;
    if (!rule?.on || !ascensionPerk(s, 'autoFollow') || s.dungeon || s.enemy || s.recovery > 0) return false;
    const next = followTarget(s, rule), moved = next.stage !== s.stage, tide = next.tide !== (s.tide || 0);
    if (!moved && !tide) return false;
    if (moved) { const st = STAGES.find(x => x.id === next.stage)!; s.stage = st.id; s.target = null; s.effects = {}; s.playerStun = 0; s.bestStage = Math.max(s.bestStage || 0, STAGES.indexOf(st)); }
    s.tide = next.tide;
    addLog(s, `자동 따라가기 · ${moved ? `${STAGES.find(x => x.id === s.stage)!.name}` : '사냥터 그대로'} · 난이도 ${s.tide}`, 'system');
    return true;
}

/** v3.41 숙련 순회 전직: 전직 시점 선택지. 'mastered' = 숙달 즉시, 숫자 = 단련 N단계. 승천 횟수로 고를 수 있는 범위가 넓어집니다(14.3). */
export function rotationChoices(s: State): ('mastered' | number)[] {
    const n = ascensionOf(s);
    if (n < 2) return [];
    if (n === 2) return [1];
    const top = n === 3 ? 3 : n === 4 ? 5 : 7;
    return ['mastered', ...Array.from({ length: top }, (_, i) => i + 1)];
}
export type RotationRule = { on: boolean; at: 'mastered' | number };
/** 지금 직업이 순회 시점에 닿았는지. */
export function rotationDue(s: State, at: RotationRule['at']) {
    const j = jobById(s.job);
    if (!j || isHackerJob(j.id)) return false;
    const have = s.jobMastery?.[j.id] || 0, target = jobMasteryTarget(j);
    return at === 'mastered' ? have >= target : thresholdRank(have, vocationTargets(target)) >= at;
}
/** 다음 직업: 지금 바꿀 수 있고 아직 숙달하지 않은 직업 중 낮은 차수부터(같으면 직업 목록 순). 해커 계열은 빼고, 없으면 null. */
export function nextRotationJob(s: State) {
    return JOBS.filter(j => j.id !== s.job && !isHackerJob(j.id) && !jobMastered(s, j) && canChangeJob(s, j.id)).sort((a, b) => a.tier - b.tier)[0] || null;
}
/** 순회 시점이면 다음 직업으로 바꾸고 추천 편성을 장착합니다. 전투 사이에만. 바꿨으면 true. */
export function runRotation(s: State, rng: () => number) {
    const rule = s.rotation, choices = rotationChoices(s);
    if (!rule?.on || !choices.length || s.dungeon || s.enemy || s.recovery > 0) return false;
    const at = choices.includes(rule.at) ? rule.at : choices[0];
    if (!rotationDue(s, at)) return false;
    const next = nextRotationJob(s);
    if (!next) { if (!rule.idle) { rule.idle = true; addLog(s, '숙련 순회 전직 · 지금 바꿀 수 있는 숙달 전 직업이 없습니다. 조건이 채워지면 이어 갑니다.', 'system'); } return false; }
    delete rule.idle;
    const from = jobById(s.job)!.name, running = s.running;
    // 전투 사이라 전직 행동이 전투를 정리하거나 멈추지 않게 잠시 멈춘 것으로 두고 바꿉니다.
    s.running = false;
    buildActions.job(s, { a: { type: 'job', id: next.id }, id: next.id, now: s.lastTick, rng });
    s.running = running;
    s.skills = recommendLoadout(s);
    addLog(s, `숙련 순회 전직 · ${from} → ${next.name} (추천 편성 장착)`, 'system');
    return true;
}

/** 자동 사냥 턴마다: 예약 연구를 사고, 조건이 되면 자동 환생한 뒤 사냥을 이어 갑니다. */
export function runAutomation(s: State, rng: () => number) {
    if (s.researchPlan?.on) runResearchPlan(s);
    if (s.rotation?.on) runRotation(s, rng);
    if (s.autoFollow?.on) runAutoFollow(s);
    if (!autoRebirthDue(s)) return;
    // 부재중 정산 중에도 일어나므로, 정산 요약(lastOffline)은 새 생으로 넘어가도 남깁니다.
    const level = s.level, offline = s.lastOffline;
    rebirthNow(s, s.lastTick);
    s.running = true;
    if (offline) s.lastOffline = offline;
    addLog(s, `자동 환생 · Lv.${level}에서 ${s.rebirths}번째 환생`, 'system');
    if (s.researchPlan?.on) runResearchPlan(s);
    if (s.autoFollow?.on) runAutoFollow(s);
}
