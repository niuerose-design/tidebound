'use client';
import { useSyncExternalStore } from 'react';

/**
 * v3.19 자동 사냥 화면 알림·카드 켜기/끄기. 기기마다 따로 저장합니다(이 브라우저의 localStorage). 저장값이 없으면 모두 켜짐.
 * 꺼도 게임 진행·보상은 그대로이고, 화면에 띄우지만 않습니다(같은 내용은 각 메뉴에서 볼 수 있음).
 */
export const NOTICE_KINDS = [
    { id: 'offline', label: '부재중 정산', desc: '접속하지 않은 동안의 사냥 결과' },
    { id: 'event', label: '서버 이벤트', desc: '진행 중인 경험치·골드 이벤트' },
    { id: 'altar', label: '제단 · 월드보스', desc: '축복·신·월드보스 소식' },
    { id: 'door', label: '문 열림', desc: '새로 열린 ??? 직업의 문' },
    { id: 'hacker', label: '해커 방송 · 안내', desc: '해커의 방송 탈취와 해커 직업 안내' },
    { id: 'tip', label: '모험 안내 팁', desc: '사냥·던전 진행 한 줄 안내' },
    { id: 'slots', label: '분신 바로가기', desc: '캐릭터 슬롯 칩' },
    { id: 'liveRates', label: '실시간 효율', desc: '시간당 경험치·골드·숙련 카드' },
] as const;
export type NoticeKind = typeof NOTICE_KINDS[number]['id'];

const KEY = 'tidebound.notices';
const EVENT = 'tidebound:notices';
const read = (): string => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
/** 꺼 둔 항목 목록(쉼표 구분 문자열). 같은 값이면 같은 문자열이라 다시 그리지 않습니다. */
function subscribe(fn: () => void) {
    window.addEventListener('storage', fn); window.addEventListener(EVENT, fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); };
}
/** 화면에 보여 줄지 묻는 함수를 돌려줍니다. 서버 렌더링 때는 모두 켜짐. */
export function useNotices() {
    const off = useSyncExternalStore(subscribe, read, () => '');
    const hidden = new Set(off.split(',').filter(Boolean));
    return (id: NoticeKind) => !hidden.has(id);
}
/** 이 기기의 설정을 바꿉니다. */
export function setNotice(id: NoticeKind, on: boolean) {
    const hidden = new Set(read().split(',').filter(Boolean));
    if (on) hidden.delete(id); else hidden.add(id);
    try { localStorage.setItem(KEY, [...hidden].join(',')); } catch { /* 저장소 없음: 이번 화면에서만 */ }
    window.dispatchEvent(new Event(EVENT));
}
