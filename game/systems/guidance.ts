import type { State } from '../types';
import { VOYAGE_LOG } from '../data/voyage-log';
import { ABYSS_SP_MILESTONES } from '../data/long-term';

/** 짧은 튜토리얼 단계. 조건은 저장 상태에서 바로 판정하므로 이미 한 단계는 자동으로 완료됩니다. 보상은 없습니다. */
export const TUTORIAL_STEPS: { id: string; title: string; hint: string; view: string; done: (s: State) => boolean }[] = [
    { id: 'catch', title: '첫 포획', hint: '자동 낚시를 시작해 물고기를 한 마리 잡으세요.', view: 'battle', done: s => s.kills > 0 || s.rebirths > 0 },
    { id: 'attribute', title: '능력치 배분', hint: '레벨이 오르면 받는 포인트를 능력치 · 빌드에서 직접 배분하세요.', view: 'character', done: s => Object.values(s.attributes || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'skill', title: '스킬 장착', hint: '스킬 화면에서 기술을 하나 장착하세요. 총 AP 안에서 자유롭게 편성합니다.', view: 'skills', done: s => s.skills.length > 0 || s.rebirths > 0 },
    { id: 'dungeon', title: '던전 첫 정복', hint: 'Lv.8부터 조수의 동굴에 도전할 수 있습니다. 5연전 뒤 보스를 잡으면 희귀 장비와 진주를 받습니다.', view: 'dungeons', done: s => Object.values(s.clears || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'job', title: '전직', hint: 'Lv.10부터 전직 화면에서 첫 직업을 고를 수 있습니다.', view: 'classes', done: s => s.job !== 'fisher' || (s.unlockedJobs?.length || 0) > 1 || s.rebirths > 0 },
    { id: 'enhance', title: '장비 강화', hint: '장비 보관함에서 골드로 장비를 한 번 강화하세요. 실패·파괴 없이 기본 수치가 15%씩 오릅니다.', view: 'inventory', done: s => [...s.inventory, ...Object.values(s.equipment)].some(i => (i?.enhance || 0) > 0) || s.rebirths > 0 },
    { id: 'research', title: '기초 연구', hint: '물고기 도감에서 연구 보상을 받거나 환생 화면에서 진주 연구를 하세요.', view: 'book', done: s => Object.values(s.bookClaims || {}).some(n => n > 0) || Object.values(s.permanent || {}).some(n => n > 0) || s.rebirths > 0 },
    { id: 'rebirth', title: '환생', hint: '요구 레벨에 도달하면 환생으로 진주와 영구 보너스를 얻고 다시 항해합니다.', view: 'rebirth', done: s => s.rebirths > 0 },
];
export const tutorialProgress = (s: State) => TUTORIAL_STEPS.filter(x => x.done(s)).length;
/** v25.9 전직 단계까지는 안내 카드를 전투 화면 맨 위에 둡니다. */
export const tutorialEarly = (s: State) => !TUTORIAL_STEPS.find(x => x.id === 'job')!.done(s);

/** 지금 조건을 만족한 항해 기록 id. */
function metVoyage(s: State): string[] {
    const ids: string[] = [];
    if (s.running && !s.dungeon) ids.push(`stage:${s.stage}`);
    for (const [id, n] of Object.entries(s.clears || {})) if (n > 0) ids.push(`dungeon:${id}`);
    if (s.rebirths > 0) ids.push('rebirth:1');
    for (const d of ABYSS_SP_MILESTONES) if (s.abyssBest >= d) ids.push(`abyss:${d}`);
    return ids;
}
/**
 * 새로 해금된 항해 기록을 저장하고 한 줄 알림을 남깁니다. 전투를 멈추지 않고 난수도 쓰지 않습니다.
 * 기록이 없던 세이브는 이미 달성한 기록을 조용히 채웁니다(알림 없음, 기존 유저에게 강제 노출하지 않음).
 */
export function syncVoyage(s: State, log: (text: string) => void) {
    const silent = !s.voyage;
    s.voyage ??= {};
    for (const id of metVoyage(s)) {
        if (s.voyage[id] !== undefined || !VOYAGE_LOG.some(x => x.id === id)) continue;
        s.voyage[id] = silent ? -1 : s.turn;
        if (!silent) log(`항해 기록 · ${VOYAGE_LOG.find(x => x.id === id)!.title}`);
    }
}
