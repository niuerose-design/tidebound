/** v3.215 스토리 ‘모험 일지’: 행동(동기화 포함) 뒤에 열린 장면을 State.story에 남기고 기록판에 알립니다. 장면 표는 data/story.ts. */
import type { State } from '../types';
import { STORY } from '../data/story';

/** 이번에 새로 연 장면 id. 처음 보는 세이브(story 없음)가 여러 장면을 한꺼번에 열면 알림을 한 줄로 묶습니다. */
export function syncStory(s: State, now: number, log: (text: string) => void) {
    const first = !s.story, open = s.story ?? {}, fresh = STORY.filter(x => !open[x.id] && x.when(s));
    if (!fresh.length) { if (first) s.story = open; return fresh; }
    for (const x of fresh) open[x.id] = now;
    s.story = open;
    if (first && fresh.length > 1) log(`📖 모험 일지 · 지난 모험 ${fresh.length}편이 기록되었습니다. ‘도감 · 업적 · 스토리’의 스토리 탭에서 읽을 수 있습니다.`);
    else for (const x of fresh) log(`📖 모험 일지 · 새 이야기 『${x.title}』 — 스토리 탭에서 읽기`);
    return fresh;
}
