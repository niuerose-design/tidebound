/** v3.17 해커 행동: 재화 변환(단방향), 침투 작전, 해킹 단계 해금, 애드가드 공개 항목, 해킹 실행(서버 공유는 /api/hack에서). */
import type { ActionHandlers } from './types';
import { HACKER, PRIVACY_FIELDS, type PrivacyField } from '../../data/hacker';
import { hackerState, rollHackerDay, isHacker, gainHacker, makeNode, judge, nodeAnswer, adguardLevel } from '../hacker';
import { addLog } from '../state';

const needHacker = (s: Parameters<ActionHandlers[string]>[0]) => { if (!isHacker(s)) throw Error('해커 직업일 때만 할 수 있습니다.'); };
export const BROADCAST_PATTERN = /^[^\n\r<>]{1,40}$/;

export const hackerActions: ActionHandlers = {
    /** SP·세계석을 비트로 영구 변환합니다(되돌릴 수 없음, 해커가 아니어도 가능). value = 개수. */
    hackConvert(s, { a, id }) {
        const n = Number(a.value || '0');
        if (!Number.isInteger(n) || n < 1 || n > 100000) throw Error('변환할 개수를 확인하세요.');
        if (id === 'sp') { if (s.sp < n) throw Error('SP가 부족합니다.'); s.sp -= n; }
        else if (id === 'pearls') { if (s.pearls < n) throw Error('세계석이 부족합니다.'); s.pearls -= n; }
        else throw Error('변환할 재화를 고르세요.');
        const bits = n * HACKER.convert[id];
        hackerState(s).bits += bits;
        addLog(s, `${id === 'sp' ? 'SP' : '세계석'} ${n}개를 태워 비트 +${bits}`, 'reward');
    },
    infilStart(s, { now, rng }) {
        needHacker(s);
        const h = rollHackerDay(s, now);
        if (h.infil) throw Error('진행 중인 침투 작전이 있습니다.');
        if ((h.entries || 0) >= HACKER.infil.entriesPerDay) throw Error(`오늘의 침투 작전 입장(${HACKER.infil.entriesPerDay}회)을 모두 썼습니다.`);
        h.entries = (h.entries || 0) + 1;
        h.runs = (h.runs || 0) + 1;
        h.infil = { seed: Math.floor(rng() * 2 ** 31), depth: 0, bank: { bits: 0, exp: 0 }, node: makeNode(0) };
        addLog(s, '침투 작전 시작 · 방화벽 1층', 'system');
    },
    infilGuess(s, { a }) {
        needHacker(s);
        const h = hackerState(s), run = h.infil;
        if (!run) throw Error('진행 중인 침투 작전이 없습니다.');
        const guess = String(a.value || '').trim(), { solved, hint } = judge(run, guess);
        run.node.tries++;
        run.node.history.push({ guess, hint });
        if (solved) {
            const r = HACKER.infil.reward(run.depth + 1);
            run.bank.bits += r.bits; run.bank.exp += r.exp; run.depth++;
            h.bestDepth = Math.max(h.bestDepth || 0, run.depth);
            run.node = makeNode(run.depth);
            addLog(s, `노드 ${run.depth} 돌파 · 쌓인 보상 비트 ${run.bank.bits} · 권한 ${run.bank.exp}`, 'reward');
            return;
        }
        if (run.node.tries >= run.node.max) {
            const keep = HACKER.infil.traceKeep, bits = Math.floor(run.bank.bits * keep), exp = Math.floor(run.bank.exp * keep);
            addLog(s, `추적당했습니다! 정답은 ${nodeAnswer(run)} · 깊이 ${run.depth} · 보상 ${Math.round(keep * 100)}%만 회수 (비트 +${bits} · 권한 +${exp})`, 'system');
            h.infil = null;
            gainHacker(s, bits, exp);
        }
    },
    infilCashout(s) {
        needHacker(s);
        const h = hackerState(s), run = h.infil;
        if (!run) throw Error('진행 중인 침투 작전이 없습니다.');
        h.infil = null;
        gainHacker(s, run.bank.bits, run.bank.exp);
        addLog(s, `침투 작전 이탈 · 깊이 ${run.depth} · 비트 +${run.bank.bits} · 권한 +${run.bank.exp}`, 'reward');
    },
    /** 다음 해킹 단계를 영구 해금합니다(권한 등급 + 비트). */
    hackUnlock(s) {
        const h = hackerState(s), next = HACKER.tiers[h.tier];
        if (!next) throw Error('지금 열 수 있는 해킹 단계를 모두 열었습니다.');
        if (h.grade < next.grade) throw Error(`권한 등급 ${next.grade}이 필요합니다.`);
        if (h.bits < next.bits) throw Error(`비트 ${next.bits}가 필요합니다.`);
        h.bits -= next.bits; h.tier++;
        addLog(s, `해킹 ${'I II III IV V VI VII VIII IX X'.split(' ')[h.tier - 1]} 해금 · 비트 -${next.bits}`, 'reward');
    },
    /** 애드가드 2단계: 공개할 항목(쉼표 구분). 빈 값이면 전부 숨김. */
    privacy(s, { a }) {
        if (adguardLevel(s) < 2) throw Error('애드가드 숙련 2단계부터 공개 항목을 고를 수 있습니다.');
        const show = String(a.value || '').split(',').map(x => x.trim()).filter((x): x is PrivacyField => (PRIVACY_FIELDS as readonly string[]).includes(x));
        s.privacy = { show: [...new Set(show)] };
    },
    /**
     * 해킹 실행: 조건·비용을 확인하고 h.pending에 적습니다. 서버 공유 설정에 쓰는 일은 /api/hack이 저장 직전에 하고 pending을 지웁니다.
     * 일반 행동 경로(/api/game)로는 받지 않습니다(route에서 거절).
     */
    hackRun(s, { a, id, now }) {
        needHacker(s);
        const h = rollHackerDay(s, now), n = h.tier;
        if (n < 1) throw Error('해킹 I을 먼저 해금하세요.');
        const used = h.used ??= {};
        if (id === 'broadcast') {
            const text = String(a.value || '').trim();
            if (!BROADCAST_PATTERN.test(text)) throw Error(`방송 문구는 1~${HACKER.broadcast.maxLength}자(줄바꿈·꺾쇠 제외)로 쓰세요.`);
            if ((used.broadcast || 0) >= HACKER.broadcast.perDay(n)) throw Error('오늘의 방송 탈취 횟수를 모두 썼습니다.');
            if (h.bits < HACKER.broadcast.bits) throw Error(`비트 ${HACKER.broadcast.bits}가 필요합니다.`);
            h.bits -= HACKER.broadcast.bits; used.broadcast = (used.broadcast || 0) + 1;
            h.pending = { kind: 'broadcast', value: text, minutes: HACKER.broadcast.minutes(n) };
            gainHacker(s, 0, HACKER.broadcast.exp);
            return;
        }
        if (id === 'crack') {
            const target = String(a.value || '');
            if (!target) throw Error('크래킹할 대상을 고르세요.');
            if ((used.crack || 0) >= HACKER.crack.perDay(n)) throw Error('오늘의 크래킹 횟수를 모두 썼습니다.');
            if (h.bits < HACKER.crack.bits) throw Error(`비트 ${HACKER.crack.bits}가 필요합니다.`);
            h.bits -= HACKER.crack.bits; used.crack = (used.crack || 0) + 1;
            h.pending = { kind: 'crack', value: target, minutes: HACKER.crack.minutes };
            gainHacker(s, 0, HACKER.crack.exp);
            return;
        }
        throw Error('알 수 없는 해킹입니다.');
    },
};
