/**
 * v26.1 칭호: 업적을 달성하면 얻는 이름 앞 꼬리표. 환생 칭호(REBIRTH_TITLES)도 같은 목록에 들어갑니다.
 * 장착은 State.title(칭호 id). undefined면 가장 최근에 얻은 칭호를 자동 표시, null이면 표시하지 않습니다.
 * 캐릭터 카드·전투 카드·랭킹·채팅이 모두 displayTitle()을 씁니다.
 */
import type { State } from '../types';
import { REBIRTH_TITLES } from './long-term';

export type TitleDef = { id: string; name: string; desc: string; group: '시작' | '환생' | '도전' | '무릉도장' | '사냥' | '강화' | '모험'; /** 달성해야 하는 업적 id. 없으면 누구나 처음부터 가진 칭호. */ achievement?: string };

export const TITLES: TitleDef[] = [
    { id: 'novice', name: '🌱 초심자', desc: '모험을 시작한 모든 모험가', group: '시작' },
    ...REBIRTH_TITLES.map(t => ({ id: `rebirth:${t.rebirths}`, name: t.title, desc: `환생 ${t.rebirths}회`, group: '환생' as const, achievement: `rebirths:${t.rebirths}` })),
    { id: 'playtime:100', name: '메이플 월드에 사는 자', desc: '누적 플레이 100시간', group: '도전', achievement: 'playtime:100' },
    { id: 'playtime:500', name: '세계 그 자체', desc: '누적 플레이 500시간', group: '도전', achievement: 'playtime:500' },
    { id: 'turns:1000000', name: '끝없는 모험가', desc: '전투 1,000,000턴', group: '도전', achievement: 'turns:1000000' },
    { id: 'attr:500', name: '한 우물을 판 자', desc: '능력치 하나 500 돌파', group: '도전', achievement: 'attr:500' },
    { id: 'hpmax:200000', name: '거산', desc: '최대 체력 200,000', group: '도전', achievement: 'hpmax:200000' },
    { id: 'manamax:50000', name: '마나의 샘', desc: '최대 마나 50,000', group: '도전', achievement: 'manamax:50000' },
    { id: 'deaths:100', name: '일곱 번 넘어진 자', desc: '쓰러짐 100회', group: '도전', achievement: 'deaths:100' },
    { id: 'reenlist:1', name: '🎖 다시 입대한 자', desc: '중장에서 재입대', group: '도전', achievement: 'reenlist:1' },
    { id: 'onyx:7', name: '◆ 칠흑보다 어두운 자', desc: '칠흑 장신구 7종 보유', group: '사냥', achievement: 'onyx:7' },
    { id: 'star:22', name: '★ 별을 다 채운 자', desc: '장비 하나를 22성까지 강화', group: '강화', achievement: 'star:22' },
    { id: 'starDestroy:50', name: '☆ 별이 부서져도', desc: '강화로 장비 50개를 잃고도 계속 두드림', group: '강화', achievement: 'starDestroy:50' },
    { id: 'abyss:25', name: '무릉 수련자', desc: '무릉도장 25층', group: '무릉도장', achievement: 'abyss:25' },
    { id: 'abyss:100', name: '무릉의 주인', desc: '무릉도장 100층', group: '무릉도장', achievement: 'abyss:100' },
    { id: 'hacker:root', name: 'root', desc: '해킹 X 루트 권한', group: '도전', achievement: 'hacker:root' },
    // v3.38 명예 업적(지역 연구 N곳 완성) 칭호.
    ...([[2, '첫 지도를 넘긴 자'], [3, '세 번째 발자국'], [5, '다섯 지역의 탐구자'], [6, '여섯 번째 지도'], [7, '일곱 갈래 길의 기록자'], [8, '여덟 지역의 박물학자'], [9, '아홉 번째 도감'], [10, '열 곳의 증인'], [11, '빅토리아 너머로'], [12, '세계를 걷는 자'], [13, '마지막 한 곳 앞에서']] as const).map(([n, name]) => ({ id: `regions:${n}`, name: `📖 ${name}`, desc: `사냥터 ${n}곳 도감 완성`, group: '모험' as const, achievement: `regions:${n}` })),
];
export const titleById = (id?: string | null) => id ? TITLES.find(t => t.id === id) : undefined;
/** 달성한 업적 기준으로 얻은 칭호. 환생 칭호는 업적 기록이 없어도 환생 횟수로 인정합니다. */
export function unlockedTitles(s: Pick<State, 'achievements' | 'rebirths'>) {
    return TITLES.filter(t => !t.achievement || s.achievements?.[t.achievement] !== undefined || (t.id.startsWith('rebirth:') && (s.rebirths || 0) >= Number(t.id.split(':')[1])));
}
/** 자동 표시 칭호: 얻은 것 중 가장 최근에 달성한 것. 업적이 없는 시작 칭호(초심자)는 다른 칭호를 얻기 전까지만 보입니다. */
export function autoTitle(s: Pick<State, 'achievements' | 'rebirths'>) {
    const owned = unlockedTitles(s);
    if (!owned.length) return undefined;
    const at = (t: TitleDef) => t.achievement ? (s.achievements?.[t.achievement] ?? -1) : -2;
    return owned.reduce((best, t) => at(t) >= at(best) ? t : best);
}
/** 지금 이름 앞에 보일 칭호 이름. 없으면 빈 문자열. */
export function displayTitle(s: Pick<State, 'achievements' | 'rebirths' | 'title'>) {
    if (s.title === null) return '';
    const chosen = titleById(s.title);
    if (chosen && unlockedTitles(s).some(t => t.id === chosen.id)) return chosen.name;
    return autoTitle(s)?.name || '';
}
