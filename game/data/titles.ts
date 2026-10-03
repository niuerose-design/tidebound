/**
 * v26.1 칭호: 업적을 달성하면 얻는 이름 앞 꼬리표. 환생 칭호(REBIRTH_TITLES)도 같은 목록에 들어갑니다.
 * 장착은 State.title(칭호 id). undefined면 가장 최근에 얻은 칭호를 자동 표시, null이면 표시하지 않습니다.
 * 캐릭터 카드·전투 카드·랭킹·채팅이 모두 displayTitle()을 씁니다.
 */
import type { State } from '../types';
import { REBIRTH_TITLES } from './long-term';

export type TitleDef = { id: string; name: string; desc: string; group: '환생' | '도전' | '심연' | '사냥'; /** 달성해야 하는 업적 id. */ achievement: string };

export const TITLES: TitleDef[] = [
    ...REBIRTH_TITLES.map(t => ({ id: `rebirth:${t.rebirths}`, name: t.title, desc: `환생 ${t.rebirths}회`, group: '환생' as const, achievement: `rebirths:${t.rebirths}` })),
    { id: 'playtime:100', name: '바다에 사는 자', desc: '누적 플레이 100시간', group: '도전', achievement: 'playtime:100' },
    { id: 'playtime:500', name: '바다 그 자체', desc: '누적 플레이 500시간', group: '도전', achievement: 'playtime:500' },
    { id: 'turns:1000000', name: '끝없는 항해자', desc: '전투 1,000,000턴', group: '도전', achievement: 'turns:1000000' },
    { id: 'attr:500', name: '한 우물을 판 자', desc: '능력치 하나 500 돌파', group: '도전', achievement: 'attr:500' },
    { id: 'hpmax:200000', name: '거산', desc: '최대 체력 200,000', group: '도전', achievement: 'hpmax:200000' },
    { id: 'manamax:50000', name: '마나의 바다', desc: '최대 마나 50,000', group: '도전', achievement: 'manamax:50000' },
    { id: 'deaths:100', name: '일곱 번 넘어진 자', desc: '쓰러짐 100회', group: '도전', achievement: 'deaths:100' },
    { id: 'abyss:25', name: '심연 탐사자', desc: '무한 심연 25층', group: '심연', achievement: 'abyss:25' },
    { id: 'abyss:100', name: '심연의 주인', desc: '무한 심연 100층', group: '심연', achievement: 'abyss:100' },
];
export const titleById = (id?: string | null) => id ? TITLES.find(t => t.id === id) : undefined;
/** 달성한 업적 기준으로 얻은 칭호. 환생 칭호는 업적 기록이 없어도 환생 횟수로 인정합니다. */
export function unlockedTitles(s: Pick<State, 'achievements' | 'rebirths'>) {
    return TITLES.filter(t => s.achievements?.[t.achievement] !== undefined || (t.id.startsWith('rebirth:') && (s.rebirths || 0) >= Number(t.id.split(':')[1])));
}
/** 자동 표시 칭호: 얻은 것 중 가장 최근에 달성한 것(환생 칭호는 환생 횟수가 큰 것). */
export function autoTitle(s: Pick<State, 'achievements' | 'rebirths'>) {
    const owned = unlockedTitles(s);
    if (!owned.length) return undefined;
    return owned.reduce((best, t) => (s.achievements?.[t.achievement] ?? -1) >= (s.achievements?.[best.achievement] ?? -1) ? t : best);
}
/** 지금 이름 앞에 보일 칭호 이름. 없으면 빈 문자열. */
export function displayTitle(s: Pick<State, 'achievements' | 'rebirths' | 'title'>) {
    if (s.title === null) return '';
    const chosen = titleById(s.title);
    if (chosen && unlockedTitles(s).some(t => t.id === chosen.id)) return chosen.name;
    return autoTitle(s)?.name || '';
}
