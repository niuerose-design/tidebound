/**
 * v3.39 소식 채널: 전투 화면 기록판의 ‘소식’ 탭. 채팅 저장소의 'news' 채널에 시스템 줄로 남깁니다(읽기 전용, 채널당 최근 300줄).
 * 모험가 소식(칠흑·승천·5차 전직·무릉도장·22성·진급·v3.212 칠흑 각성 · 보스 코어 획득 · 완전 각성)은 /api/game이, 제단(신·월드보스)·해커 전직 소식은 각 서버 모듈이 올립니다.
 */
import { db } from './db';
import { readHacks, newsName, hackerJobNews } from './hacks';
import { ALTAR_NEWS } from './altar';
import { ApiError } from './store';
import type { State } from '../types';
import { NEWS_TEXT, NEWS_ABYSS_STEP, NEWS_RANK_FIRST, type NewsEvent } from '../systems/news';
import { ONYX_BOSSES } from '../data/onyx';
import { BOSS_CORES } from '../data/boss-core';
import { JOBS } from '../data/classes';
import { isHackerJob } from '../data/hacker';
import { RANKS } from '../data/rank';
import { ALTAR, RAIDS } from '../data/altar';

export const NEWS_CHANNEL = 'news';
/** 소식 한 줄. 실패해도 본 처리는 그대로입니다. */
export async function postNews(text: string, now: number, from = 'system-news', label = '소식') {
    try { await db().postChat({ channel: NEWS_CHANNEL, account_id: from, name: label, text, created_at: now }); } catch { /* 소식은 부가 기능 */ }
}
/** 모험가 소식: 신원 조작으로 이름을 가린 동안은 미끼 이름이나 ‘누군가’로 씁니다. */
export async function postPlayerNews(id: string, s: State, events: NewsEvent[], now: number) {
    if (!events.length) return;
    let name = String(s.name || '모험가').slice(0, 20);
    try { name = newsName(id, name, await readHacks(now), now); } catch { /* 해킹 설정을 못 읽으면 이름 그대로 */ }
    for (const e of events) await postNews(e.text(name), now);
}

/** 운영 페이지 소식 테스트: 종류별 예시 줄을 실제 소식과 같은 문장·발신자로 올립니다. */
export const NEWS_SAMPLES = [
    { id: 'onyx', label: '칠흑 장신구' }, { id: 'ascend', label: '승천' }, { id: 'tier5', label: '5차 전직' }, { id: 'abyss', label: '무릉도장 50층' },
    { id: 'star22', label: '22성 강화' }, { id: 'general', label: '진급(하사)' }, { id: 'onyxAwaken', label: '칠흑 각성' }, { id: 'core', label: '보스 코어' }, { id: 'coreAwaken', label: '코어 완전 각성' }, { id: 'hacker', label: '해커 전직(빨간 줄)' },
    { id: 'god', label: '제단 · 신 깨어남' }, { id: 'raid', label: '제단 · 월드보스 출현' }, { id: 'custom', label: '직접 입력' },
] as const;
export type NewsSampleId = typeof NEWS_SAMPLES[number]['id'];
export async function postNewsSample(kind: string, opts: { name?: string; text?: string; tag?: boolean }, now: number) {
    const name = String(opts.name || '테스트 모험가').slice(0, 20), tag = opts.tag === false ? '' : '[테스트] ';
    const job = JOBS.find(j => j.tier === 5 && !isHackerJob(j.id)), raid = RAIDS[0];
    const line: Record<NewsSampleId, () => { text: string; from: string; label: string }> = {
        onyx: () => ({ text: NEWS_TEXT.onyx(name, ONYX_BOSSES[0].accessory.name), from: 'system-news', label: '소식' }),
        ascend: () => ({ text: NEWS_TEXT.ascend(name, 1), from: 'system-news', label: '소식' }),
        tier5: () => ({ text: NEWS_TEXT.tier5(name, job?.name || '5차 직업'), from: 'system-news', label: '소식' }),
        abyss: () => ({ text: NEWS_TEXT.abyss(name, NEWS_ABYSS_STEP), from: 'system-news', label: '소식' }),
        star22: () => ({ text: NEWS_TEXT.star22(name), from: 'system-news', label: '소식' }),
        general: () => ({ text: NEWS_TEXT.general(name, RANKS.find(r => r.id === NEWS_RANK_FIRST)!.name), from: 'system-news', label: '소식' }),
        onyxAwaken: () => ({ text: NEWS_TEXT.onyxAwaken(name, ONYX_BOSSES[0].accessory.name, 1), from: 'system-news', label: '소식' }),
        core: () => ({ text: NEWS_TEXT.core(name, BOSS_CORES.grotto.name, 1), from: 'system-news', label: '소식' }),
        coreAwaken: () => ({ text: NEWS_TEXT.coreAwaken(name, BOSS_CORES.grotto.name), from: 'system-news', label: '소식' }),
        hacker: () => ({ text: hackerJobNews('whiteHacker'), from: 'system-hacker', label: '시스템' }),
        god: () => ({ text: ALTAR_NEWS.godAwake(ALTAR.firstGod.name), from: 'system', label: '제단' }),
        raid: () => ({ text: ALTAR_NEWS.raidAppear(raid.name, raid.lifetimeHours), from: 'system', label: '제단' }),
        custom: () => ({ text: String(opts.text || '').trim().slice(0, 200), from: 'system-news', label: '운영' }),
    };
    const make = line[kind as NewsSampleId];
    if (!make) throw new ApiError('알 수 없는 소식 종류입니다.', 400);
    const row = make();
    if (!row.text) throw new ApiError('올릴 문장을 적으세요.', 400);
    await db().postChat({ channel: NEWS_CHANNEL, account_id: row.from, name: row.label, text: tag + row.text, created_at: now });
    return recentNews();
}
/** v3.190 운영 페이지: 소식 · 전체 채팅 · 길드 채팅(모든 길드) · 모두를 지웁니다. 지운 줄 수와 남은 소식 목록을 돌려줍니다. 이미 열려 있는 화면은 새로고침 전까지 옛 줄이 남습니다(after 커서). */
export const CHAT_CLEAR_SCOPES = ['news', 'global', 'guild', 'all'] as const;
export async function clearChatScope(scope: string) {
    if (!(CHAT_CLEAR_SCOPES as readonly string[]).includes(scope)) throw new ApiError('지울 범위를 고르세요(news · global · guild · all).', 400);
    const database = db();
    const removed = scope === 'all' ? await database.clearChat() : scope === 'guild' ? await database.clearChat(undefined, 'guild:') : await database.clearChat(scope);
    return { removed, rows: await recentNews() };
}
/** 운영 페이지: 소식 채널 최근 20줄. */
export async function recentNews() {
    return (await db().listChat(NEWS_CHANNEL, 0, 20)).map(r => ({ id: r.id, name: r.name, text: r.text, at: r.created_at, hacker: r.account_id === 'system-hacker' }));
}
