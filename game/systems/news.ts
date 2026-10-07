/**
 * v3.39 소식: 저장할 때 이전 표시(State.newsMark)와 비교해 모두에게 알릴 일을 찾습니다. 난수를 쓰지 않는 순수 계산이고,
 * 서버(/api/game)가 결과를 소식 채널에 올립니다. 표시가 없던 세이브는 지금 상태로 표시만 하고 소식을 내지 않습니다.
 * 같은 모험가의 같은 종류 소식은 하루(한국 시간)에 한 번만 냅니다. 해커 전직·제단(신·월드보스) 소식은 서버가 따로 올립니다.
 */
import type { State } from '../types';
import { ownedOnyx, onyxById } from '../data/onyx';
import { RANKS, rankIndex, rankState } from '../data/rank';
import { JOBS } from '../data/classes';
import { isHackerJob } from '../data/hacker';
import { dayKey } from '../data/goals';
import { josa } from '../data/altar';

export type NewsKind = 'onyx' | 'ascend' | 'tier5' | 'abyss' | 'star22' | 'general';
export type NewsMark = { onyx: string[]; ascension: number; tier5: string[]; abyss: number; star: number; rank: number; day: Partial<Record<NewsKind, string>> };
export type NewsEvent = { kind: NewsKind; text: (name: string) => string };
/** 무릉도장은 이 층 단위로 새로 넘을 때 알립니다. */
export const NEWS_ABYSS_STEP = 50;
/** 진급은 이 무리(장성)부터 알립니다. */
export const NEWS_RANK_GROUP = '장성';

const bestStar = (s: State) => Math.max(0, ...[...(s.inventory || []), ...Object.values(s.equipment || {})].map(i => i?.enhance || 0));
const tier5Jobs = (s: State) => (s.unlockedJobs || []).filter(id => !isHackerJob(id) && JOBS.find(j => j.id === id)?.tier === 5);
function markOf(s: State, day: NewsMark['day'] = {}): NewsMark {
    return { onyx: [...ownedOnyx(s)], ascension: s.ascension || 0, tier5: tier5Jobs(s), abyss: Math.floor((s.abyssBest || 0) / NEWS_ABYSS_STEP), star: bestStar(s), rank: rankIndex(rankState(s).exp), day };
}

const particle = (word: string, pair: '이가' | '을를') => josa(word, pair).slice(word.length);
/** 소식 문장. collectNews와 운영 페이지의 소식 테스트(server/news.ts)가 같이 씁니다. */
export const NEWS_TEXT = {
    // v3.115 환생 이정표로 받은 칠흑은 ‘환생 N회 달성 보상으로 … 받았습니다’.
    onyx: (n: string, item: string, milestone?: number) => milestone ? `${josa(n, '이가')} 환생 ${milestone}회 달성 보상으로 칠흑 장신구 ‘${item}’${particle(item, '을를')} 받았습니다.` : `${josa(n, '이가')} 칠흑 장신구 ‘${item}’${particle(item, '을를')} 얻었습니다.`,
    ascend: (n: string, count: number) => `${josa(n, '이가')} ${count}번째 승천을 했습니다.`,
    tier5: (n: string, job: string) => `${josa(n, '이가')} 5차 직업 ‘${job}’(으)로 전직했습니다.`,
    abyss: (n: string, floor: number) => `${josa(n, '이가')} 무릉도장 ${floor}층을 돌파했습니다.`,
    star22: (n: string) => `${josa(n, '이가')} 장비를 22성까지 강화했습니다.`,
    general: (n: string, rank: string) => `${josa(n, '이가')} ${rank}(으)로 진급했습니다.`,
} satisfies Record<NewsKind, (n: string, ...a: never[]) => string>;
/** 지난 표시 뒤로 새로 생긴 소식을 찾고 표시를 지금 상태로 옮깁니다. */
export function collectNews(s: State, now: number): NewsEvent[] {
    const prev = s.newsMark, next = markOf(s, { ...(prev?.day || {}) }), gift = s.onyxGift || {};
    s.newsMark = next; delete s.onyxGift;
    if (!prev) return [];
    const found: NewsEvent[] = [];
    for (const id of next.onyx.filter(x => !prev.onyx.includes(x) && gift[x] !== 0)) { const name = onyxById(id)?.accessory.name || id; found.push({ kind: 'onyx', text: n => NEWS_TEXT.onyx(n, name, gift[id]) }); }
    if (next.ascension > prev.ascension) found.push({ kind: 'ascend', text: n => NEWS_TEXT.ascend(n, next.ascension) });
    for (const id of next.tier5.filter(x => !prev.tier5.includes(x))) { const job = JOBS.find(j => j.id === id)!; found.push({ kind: 'tier5', text: n => NEWS_TEXT.tier5(n, job.name) }); }
    if (next.abyss > prev.abyss) found.push({ kind: 'abyss', text: n => NEWS_TEXT.abyss(n, next.abyss * NEWS_ABYSS_STEP) });
    if (next.star >= 22 && prev.star < 22) found.push({ kind: 'star22', text: n => NEWS_TEXT.star22(n) });
    const rank = RANKS[next.rank];
    if (next.rank > prev.rank && rank?.group === NEWS_RANK_GROUP) found.push({ kind: 'general', text: n => NEWS_TEXT.general(n, rank.name) });
    const today = dayKey(now), out: NewsEvent[] = [];
    for (const e of found) { if (next.day[e.kind] === today) continue; next.day[e.kind] = today; out.push(e); }
    return out;
}
