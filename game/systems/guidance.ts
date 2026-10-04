import type { State } from '../types';
import { VOYAGE_LOG } from '../data/voyage-log';
import { ABYSS_SP_MILESTONES } from '../data/long-term';

export type TutorialStep = { id: string; title: string; hint: string; view: string; done: (s: State) => boolean };
/**
 * 짧은 튜토리얼 단계. 조건은 저장 상태에서 판정하고, 한 번 만족한 단계는 tutorial.done에 기록해 되돌아가지 않습니다
 * (v27.72: 강화한 장비를 팔거나 녹여도 ‘장비 강화’가 미완료로 돌아가지 않음). 보상은 없습니다.
 * 환생 전에 할 수 있는 단계는 환생하면 자동 완료, 환생 뒤 단계(사냥터 난이도)는 환생 1회부터 열립니다.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
    { id: 'catch', title: '첫 처치', hint: '자동 사냥 화면의 ‘자동 사냥 시작’을 누르면 알아서 싸웁니다. 몬스터를 한 마리 잡아 보세요.', view: 'battle', done: s => s.kills > 0 || s.rebirths > 0 },
    { id: 'attribute', title: '능력치 배분', hint: '레벨이 오르면 받는 포인트를 ‘능력치 · 빌드’에서 배분합니다. 힘(물리) · 지능(마법) · 기민(속도·회피) · 체질(체력) · 정신(마나) · 행운(치명). 처음엔 한 가지에 몰아도 됩니다.', view: 'character', done: s => Object.values(s.attributes || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'skill', title: '스킬 장착', hint: '‘스킬 · 전직’에서 기술을 장착하세요. 장착 AP 안에서 자유롭게 바꿀 수 있고, 장착한 스킬은 싸우면서 숙련이 오릅니다.', view: 'skills', done: s => s.skills.length > 0 || s.rebirths > 0 },
    { id: 'stage', title: '새 사냥터', hint: 'Lv.5가 되면 ‘사냥터·던전’ 지도에서 리스항구 · 조개 해안으로 옮기세요. 사냥터마다 몬스터와 도감이 다르고, 레벨이 맞는 곳이 경험치가 가장 좋습니다.', view: 'stages', done: s => s.stage !== 'brook' || Object.keys(s.voyage || {}).filter(k => k.startsWith('stage:')).length > 1 || s.rebirths > 0 },
    { id: 'dungeon', title: '던전 첫 정복', hint: 'Lv.8부터 헤네시스 · 버섯 동산에 도전할 수 있습니다. 5연전 뒤 보스를 잡으면 희귀 장비와 세계석을 받고, 반복 횟수를 정해 두면 자동으로 다시 돕니다.', view: 'dungeons', done: s => Object.values(s.clears || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'job', title: '전직', hint: 'Lv.10부터 ‘스킬 · 전직’의 전직 탭에서 첫 직업을 고릅니다. 직업은 스킬과 능력치 배율을 정하고, 숙련을 채우면 보너스가 커집니다.', view: 'classes', done: s => s.job !== 'fisher' || (s.unlockedJobs?.length || 0) > 1 || s.rebirths > 0 },
    { id: 'enhance', title: '장비 강화', hint: '‘장비 보관함’에서 골드로 장비를 한 번 강화하세요. 실패·파괴가 없고 기본 수치가 15%씩 오릅니다. 나중에 팔거나 분해해도 이 단계는 유지됩니다.', view: 'inventory', done: s => [...s.inventory, ...Object.values(s.equipment)].some(i => (i?.enhance || 0) > 0) || s.rebirths > 0 },
    { id: 'book', title: '도감 연구 보상', hint: '같은 몬스터를 여러 번 잡으면 ‘도감 · 업적’의 도감에 연구 보상(골드, 마지막 단계 SP)이 쌓입니다. 직접 눌러 받아야 합니다.', view: 'book', done: s => Object.values(s.bookClaims || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'achievement', title: '업적 보상', hint: '‘도감 · 업적’의 업적 탭에서 달성한 업적의 보상(장착 AP · 능력치 · SP)을 받으세요. 업적은 환생해도 유지됩니다. 오늘의 목표·주간 목표도 같은 화면에서 세계석을 줍니다.', view: 'voyage', done: s => Object.keys(s.achievementClaims || {}).length > 0 || s.rebirths > 0 },
    { id: 'altar', title: '제단에 공물', hint: '‘제단’에 골드·세계석·정수를 바치면 모두가 함께 쓰는 축복(골드 · 경험치 · 까미 · 누리 출현) 게이지가 차고, 신 소환 게이지가 차면 신이 깨어나 도전할 수 있습니다. 골드 1,000부터 바칠 수 있습니다.', view: 'altar', done: s => (s.altar?.offers || 0) > 0 || s.rebirths > 0 },
    { id: 'research', title: '세계석 연구', hint: '던전·목표로 모은 세계석을 ‘환생 · 분신’의 연구 탭에 쓰면 환생해도 남는 영구 능력이 됩니다. 재분배는 무료입니다.', view: 'rebirth', done: s => Object.values(s.permanent || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'rebirth', title: '환생', hint: '요구 레벨(처음 Lv.30)에 닿으면 환생으로 세계석과 영구 보너스를 얻고 1레벨부터 더 빠르게 다시 모험합니다. 도감·연구·업적·유물 장비는 남습니다.', view: 'rebirth', done: s => s.rebirths > 0 },
    { id: 'tide', title: '사냥터 난이도', hint: '환생 1회부터 자동 사냥 화면의 ‘난이도’를 올릴 수 있습니다(환생 횟수만큼). 몬스터가 강해지는 대신 보상·숙련이 오르고, 난이도 5부터 숙련의 까미, 10부터 경험의 누리가 나타납니다. 한 단계만 올려 보세요.', view: 'battle', done: s => (s.tide || 0) > 0 },
];
/** 기록된 완료 또는 지금 조건 만족. */
export const tutorialStepDone = (s: State, step: TutorialStep) => !!s.tutorial?.done?.[step.id] || step.done(s);
export const tutorialProgress = (s: State) => TUTORIAL_STEPS.filter(x => tutorialStepDone(s, x)).length;
export const nextTutorialStep = (s: State) => TUTORIAL_STEPS.find(x => !tutorialStepDone(s, x));
/** v25.9 전직 단계까지는 안내 카드를 전투 화면 맨 위에 둡니다. */
export const tutorialEarly = (s: State) => !tutorialStepDone(s, TUTORIAL_STEPS.find(x => x.id === 'job')!);
/**
 * v27.72 만족한 단계를 기록합니다. 기록이 없던 세이브(개편 전)는 환생 경험이 있으면 모든 단계를 조용히 채워
 * 기존 유저에게 안내를 다시 띄우지 않고, 환생 전 세이브는 지금 조건으로만 채웁니다.
 */
export function syncTutorial(s: State) {
    if (!s.tutorial) return;
    const fresh = !s.tutorial.done;
    const done = (s.tutorial.done ??= {});
    for (const step of TUTORIAL_STEPS)
        if (!done[step.id] && (step.done(s) || fresh && s.rebirths > 0)) done[step.id] = Math.max(1, s.turn || 1);
}

/** 지금 조건을 만족한 모험 기록 id. */
function metVoyage(s: State): string[] {
    const ids: string[] = [];
    if (s.running && !s.dungeon) ids.push(`stage:${s.stage}`);
    for (const [id, n] of Object.entries(s.clears || {})) if (n > 0) ids.push(`dungeon:${id}`);
    if (s.rebirths > 0) ids.push('rebirth:1');
    for (const d of ABYSS_SP_MILESTONES) if (s.abyssBest >= d) ids.push(`abyss:${d}`);
    return ids;
}
/**
 * 새로 해금된 모험 기록을 저장하고 한 줄 알림을 남깁니다. 전투를 멈추지 않고 난수도 쓰지 않습니다.
 * 기록이 없던 세이브는 이미 달성한 기록을 조용히 채웁니다(알림 없음, 기존 유저에게 강제 노출하지 않음).
 */
export function syncVoyage(s: State, log?: (text: string) => void) {
    syncTutorial(s);
    // v25.13 알림 없이 조용히 기록만 남깁니다(업적 ‘사냥터 N곳’·‘던전 N곳’의 방문 기록으로만 쓰임).
    void log;
    const silent = !s.voyage;
    s.voyage ??= {};
    for (const id of metVoyage(s)) {
        if (s.voyage[id] !== undefined || !VOYAGE_LOG.some(x => x.id === id)) continue;
        s.voyage[id] = silent ? -1 : s.turn;
    }
}
