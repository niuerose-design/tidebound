import type { State } from '../types';
import { PLACES } from '../data/world';
import { noteOneTimeReward } from './one-time-rewards';

export type TutorialStep = { id: string; title: string; hint: string; view: string; done: (s: State) => boolean; /** v3.17 보상 조건(없으면 done). 환생으로 자동 완료되는 단계는 실제로 해냈을 때만 보상합니다. */ earned?: (s: State) => boolean; /** v3.17 완료 보상(완료되는 순간 자동 지급, 한 번). */ reward?: { pearls?: number; sp?: number } };
/**
 * 짧은 튜토리얼 단계. 조건은 저장 상태에서 판정하고, 한 번 만족한 단계는 tutorial.done에 기록해 되돌아가지 않습니다
 * (v27.72: 강화한 장비를 팔거나 녹여도 ‘장비 강화’가 미완료로 돌아가지 않음). v3.17 단계마다 완료 보상(세계석·SP)을 자동 지급합니다(강제 없음).
 * 환생 전에 할 수 있는 단계는 환생하면 자동 완료, 환생 뒤 단계(사냥터 난이도)는 환생 1회부터 열립니다.
 * v3.38 환생 전 12단계 + 사냥터 난이도까지만 둡니다. 중후반 안내 8단계(서식지·스타포스·유물·무릉도장·치장·결투·길드·월드보스)는 안내 팁으로 옮겼습니다.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
    { id: 'catch', title: '첫 처치', hint: '자동 사냥 화면의 ‘자동 사냥 시작’을 누르면 알아서 싸웁니다. 몬스터를 한 마리 잡아 보세요.', view: 'battle', done: s => s.kills > 0 || s.rebirths > 0, earned: s => s.kills > 0, reward: { pearls: 1 } },
    { id: 'attribute', title: '능력치 배분', hint: '레벨이 오르면 받는 포인트를 ‘능력치 · 빌드’에서 배분합니다. 힘(물리) · 지능(마법) · 기민(속도·회피) · 체질(체력) · 정신(마나) · 행운(치명). 처음엔 한 가지에 몰아도 됩니다.', view: 'character', done: s => Object.values(s.attributes || {}).some(n => n > 0) || s.rebirths > 0, earned: s => Object.values(s.attributes || {}).some(n => n > 0), reward: { pearls: 1 } },
    { id: 'skill', title: '스킬 장착', hint: '‘스킬 · 전직’에서 기술을 장착하세요. 장착 AP 안에서 자유롭게 바꿀 수 있고, 장착한 스킬은 싸우면서 숙련이 오릅니다.', view: 'skills', done: s => s.skills.length > 0 || s.rebirths > 0, earned: s => s.skills.some(id => id !== 'hook'), reward: { pearls: 1 } },
    { id: 'stage', title: '새 사냥터', hint: 'Lv.5가 되면 ‘사냥터·던전’ 지도에서 리스항구 · 조개 해안으로 옮기세요. 사냥터마다 몬스터와 도감이 다르고, 레벨이 맞는 곳이 경험치가 가장 좋습니다.', view: 'stages', done: s => s.stage !== 'brook' || Object.keys(s.voyage || {}).filter(k => k.startsWith('stage:')).length > 1 || s.rebirths > 0, earned: s => s.stage !== 'brook' || Object.keys(s.voyage || {}).filter(k => k.startsWith('stage:')).length > 1, reward: { pearls: 1 } },
    { id: 'dungeon', title: '던전 첫 정복', hint: 'Lv.8부터 헤네시스 · 버섯 동산에 도전할 수 있습니다. 5연전 뒤 보스를 잡으면 희귀 장비와 세계석을 받고, 반복 횟수를 정해 두면 자동으로 다시 돕니다.', view: 'dungeons', done: s => Object.values(s.clears || {}).some(n => n > 0) || s.rebirths > 0, earned: s => Object.values(s.clears || {}).some(n => n > 0), reward: { pearls: 2 } },
    { id: 'job', title: '전직', hint: 'Lv.10부터 ‘스킬 · 전직’의 전직 탭에서 첫 직업을 고릅니다. 직업은 스킬과 능력치 배율을 정하고, 숙련을 채우면 보너스가 커집니다.', view: 'classes', done: s => s.job !== 'fisher' || (s.unlockedJobs?.length || 0) > 1 || s.rebirths > 0, earned: s => s.job !== 'fisher' || (s.unlockedJobs?.length || 0) > 1, reward: { pearls: 2 } },
    { id: 'enhance', title: '장비 강화', hint: '‘장비 보관함’에서 골드로 장비를 한 번 강화하세요. 실패·파괴가 없고 기본 수치가 15%씩 오릅니다. 나중에 팔거나 분해해도 이 단계는 유지됩니다.', view: 'inventory', done: s => [...s.inventory, ...Object.values(s.equipment)].some(i => (i?.enhance || 0) > 0) || s.rebirths > 0, earned: s => [...s.inventory, ...Object.values(s.equipment)].some(i => (i?.enhance || 0) > 0), reward: { pearls: 1 } },
    { id: 'book', title: '도감 연구 보상', hint: '같은 몬스터를 여러 번 잡으면 ‘도감 · 업적’의 도감에 연구 보상(골드, 마지막 단계 SP)이 쌓입니다. 직접 눌러 받아야 합니다.', view: 'book', done: s => Object.values(s.bookClaims || {}).some(n => n > 0) || s.rebirths > 0, earned: s => Object.values(s.bookClaims || {}).some(n => n > 0), reward: { pearls: 1 } },
    { id: 'achievement', title: '업적 보상', hint: '‘도감 · 업적’의 업적 탭에서 달성한 업적의 보상(세계석 · SP · 장착 AP)을 받으세요. 받은 업적 수만큼 능력치 보너스도 붙습니다. 업적은 환생해도 유지됩니다. 오늘의 목표·주간 목표도 같은 화면에서 세계석을 줍니다.', view: 'voyage', done: s => Object.keys(s.achievementClaims || {}).length > 0 || s.rebirths > 0, earned: s => Object.keys(s.achievementClaims || {}).length > 0, reward: { pearls: 1 } },
    { id: 'altar', title: '제단에 공물', hint: '‘제단’에 골드·세계석·정수를 바치면 모두가 함께 쓰는 축복(골드 · 경험치 · 까미 · 누리 출현) 게이지가 차고, 신 소환 게이지가 차면 신이 깨어나 도전할 수 있습니다. 골드 1,000부터 바칠 수 있습니다.', view: 'altar', done: s => (s.altar?.offers || 0) > 0 || s.rebirths > 0, earned: s => (s.altar?.offers || 0) > 0, reward: { pearls: 2 } },
    { id: 'research', title: '세계석 연구', hint: '던전·목표로 모은 세계석을 ‘환생 · 분신’의 연구 탭에 쓰면 환생해도 남는 영구 능력이 됩니다. 재분배는 무료입니다.', view: 'rebirth', done: s => Object.values(s.permanent || {}).some(n => n > 0) || s.rebirths > 0, earned: s => Object.values(s.permanent || {}).some(n => n > 0), reward: { pearls: 2 } },
    { id: 'rebirth', title: '환생', hint: '요구 레벨(처음 Lv.30)에 닿으면 환생으로 세계석과 영구 보너스를 얻고 1레벨부터 더 빠르게 다시 모험합니다. 도감·연구·업적·유물 장비는 남습니다.', view: 'rebirth', done: s => s.rebirths > 0, reward: { pearls: 3, sp: 1 } },
    { id: 'tide', title: '사냥터 난이도', hint: '환생 1회부터 자동 사냥 화면의 ‘난이도’를 올릴 수 있습니다(환생 횟수만큼). 몬스터가 강해지는 대신 보상·숙련이 오르고, 난이도 5부터 숙련의 까미, 10부터 경험의 누리가 나타납니다. 한 단계만 올려 보세요.', view: 'battle', done: s => (s.tide || 0) > 0, reward: { pearls: 2 } },
];
/** 기록된 완료 또는 지금 조건 만족. */
export const tutorialStepDone = (s: State, step: TutorialStep) => !!s.tutorial?.done?.[step.id] || step.done(s);
export const tutorialProgress = (s: State) => TUTORIAL_STEPS.filter(x => tutorialStepDone(s, x)).length;
export const nextTutorialStep = (s: State) => TUTORIAL_STEPS.find(x => !tutorialStepDone(s, x));
/** 모험 안내 카드가 보이는 동안인지. */
export const tutorialActive = (s: State) => !!s.tutorial && !s.tutorial.skipped && tutorialProgress(s) < TUTORIAL_STEPS.length;
/**
 * v27.72 만족한 단계를 기록합니다. 기록이 없던 세이브(개편 전)는 환생 경험이 있으면 모든 단계를 조용히 채워
 * 기존 유저에게 안내를 다시 띄우지 않고, 환생 전 세이브는 지금 조건으로만 채웁니다.
 */
export function syncTutorial(s: State, log?: (text: string) => void) {
    if (!s.tutorial) return;
    const fresh = !s.tutorial.done;
    const done = (s.tutorial.done ??= {});
    for (const step of TUTORIAL_STEPS) {
        if (done[step.id]) continue;
        const met = step.done(s), auto = fresh && s.rebirths > 0;
        if (!met && !auto) continue;
        done[step.id] = Math.max(1, s.turn || 1);
        // v3.17 완료 보상: 지금 조건을 만족해 완료된 단계만(개편 전 세이브의 조용한 채움은 제외). 건너뛰었어도 조건을 채우면 받습니다.
        if (met && step.reward && !auto && (step.earned ? step.earned(s) : true)) {
            if (step.reward.pearls) s.pearls += step.reward.pearls;
            if (step.reward.sp) s.sp += step.reward.sp;
            noteOneTimeReward(step.reward);
            log?.(`✦ 모험 안내 ‘${step.title}’ 완료 · ${[step.reward.pearls ? `세계석 +${step.reward.pearls}` : '', step.reward.sp ? `SP +${step.reward.sp}` : ''].filter(Boolean).join(' · ')}`);
        }
    }
}

/**
 * 사냥한 일반 사냥터를 기록합니다(업적 ‘사냥터 N곳’과 그 방문 목록). 알림 없이 조용히 남고 환생 후에도 유지됩니다.
 * v3.36 쓰이지 않던 던전·환생·무릉도장 기록과 항해 일지 본문은 없앴습니다(던전 업적은 s.clears로 셉니다).
 */
export function syncVoyage(s: State, log?: (text: string) => void) {
    syncTutorial(s, log);
    s.voyage ??= {};
    const key = `stage:${s.stage}`;
    if (s.running && !s.dungeon && s.voyage[key] === undefined && PLACES.some(st => st.id === s.stage)) s.voyage[key] = s.turn;
}
