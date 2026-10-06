/**
 * v3.38 소식 채널: 전투 화면 기록판의 ‘소식’ 탭. 채팅 저장소의 'news' 채널에 시스템 줄로 남깁니다(읽기 전용, 채널당 최근 300줄).
 * 모험가 소식(칠흑·승천·5차 전직·무릉도장·22성·장성 진급)은 /api/game이, 제단(신·월드보스)·해커 전직 소식은 각 서버 모듈이 올립니다.
 */
import { db } from './db';
import { readHacks, newsName } from './hacks';
import type { State } from '../types';
import type { NewsEvent } from '../systems/news';

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
