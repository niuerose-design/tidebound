/** v3.18 해커 행동: 재화 변환(단방향), 침투 작전, 해킹 단계 해금, 애드가드 공개 항목, 해킹 실행(서버 공유는 /api/hack에서). */
import type { ActionHandlers } from './types';
import { HACKER, PRIVACY_FIELDS, HACK_TIER, programById, type PrivacyField } from '../../data/hacker';
import { STAGES, DUNGEONS } from '../../data/world';
import { BLESSINGS, RAIDS } from '../../data/altar';
import { hackerState, rollHackerDay, isHacker, isWhiteHacker, gainHacker, makeNode, nodeExtra, traceKeep, judge, nodeAnswer, adguardLevel, bumpSeason, memoryCap, memoryUsed } from '../hacker';
import { addLog } from '../state';

const needHacker = (s: Parameters<ActionHandlers[string]>[0]) => { if (!isHacker(s)) throw Error('해커 직업일 때만 할 수 있습니다.'); };
export const BROADCAST_PATTERN = /^[^\n\r<>]{1,40}$/;
const ROMAN = 'I II III IV V VI VII VIII IX X'.split(' ');
/** stage:<id> · dungeon:<id>. 첫 사냥터는 다운·패치 대상이 아닙니다. */
function parsePlace(value: string) {
    const [kind, ...rest] = value.split(':'), id = rest.join(':');
    if (kind === 'stage' && STAGES.some(st => st.id === id) && id !== STAGES[0].id) return `stage:${id}`;
    if (kind === 'dungeon' && DUNGEONS.some(d => d.id === id)) return `dungeon:${id}`;
    throw Error('사냥터나 던전을 고르세요(첫 사냥터 제외).');
}

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
        h.infil = { seed: Math.floor(rng() * 2 ** 31), depth: 0, bank: { bits: 0, exp: 0 }, node: makeNode(0, nodeExtra(s)) };
        addLog(s, '침투 작전 시작 · 방화벽 1층', 'system');
    },
    infilGuess(s, { a, now }) {
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
            run.node = makeNode(run.depth, nodeExtra(s));
            bumpSeason(s, now, { depth: run.depth });
            addLog(s, `노드 ${run.depth} 돌파 · 쌓인 보상 비트 ${run.bank.bits} · 권한 ${run.bank.exp}`, 'reward');
            return;
        }
        if (run.node.tries >= run.node.max) {
            const keep = traceKeep(s), bits = Math.floor(run.bank.bits * keep), exp = Math.floor(run.bank.exp * keep);
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
     * v3.25 해킹 II~V(이벤트 변조·서버 다운·패킷 스니핑·백도어)와 화이트 해커(복구·패치). 화이트 해커는 공격 해킹(I~III)을 쓰지 않습니다.
     */
    hackRun(s, { a, id, now }) {
        needHacker(s);
        const h = rollHackerDay(s, now), n = h.tier, white = isWhiteHacker(s);
        const used = h.used ??= {}, value = String(a.value || '').trim();
        const need = (tier: number) => { if (n < tier) throw Error(`해킹 ${ROMAN[tier - 1]}을 먼저 해금하세요.`); };
        const pay = (bits: number) => { if (h.bits < bits) throw Error(`비트 ${bits}가 필요합니다.`); h.bits -= bits; };
        const daily = (key: string, cap: number, label: string) => { if ((used[key] || 0) >= cap) throw Error(`오늘의 ${label} 횟수를 모두 썼습니다.`); used[key] = (used[key] || 0) + 1; };
        const offense = () => { if (white) throw Error('화이트 해커는 공격 해킹을 쓰지 않습니다. 해커로 전직하면 쓸 수 있습니다.'); };
        if (id === 'broadcast') {
            offense(); need(HACK_TIER.broadcast);
            if (!BROADCAST_PATTERN.test(value)) throw Error(`방송 문구는 1~${HACKER.broadcast.maxLength}자(줄바꿈·꺾쇠 제외)로 쓰세요.`);
            if ((used.broadcast || 0) >= HACKER.broadcast.perDay(n)) throw Error('오늘의 방송 탈취 횟수를 모두 썼습니다.');
            pay(HACKER.broadcast.bits); used.broadcast = (used.broadcast || 0) + 1;
            h.pending = { kind: 'broadcast', value, minutes: HACKER.broadcast.minutes(n) };
            gainHacker(s, 0, HACKER.broadcast.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'crack') {
            offense(); need(HACK_TIER.crack);
            if (!value) throw Error('크래킹할 대상을 고르세요.');
            if ((used.crack || 0) >= HACKER.crack.perDay(n)) throw Error('오늘의 크래킹 횟수를 모두 썼습니다.');
            pay(HACKER.crack.bits); used.crack = (used.crack || 0) + 1;
            h.pending = { kind: 'crack', value, minutes: HACKER.crack.minutes };
            gainHacker(s, 0, HACKER.crack.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'tamper') {
            // 값: 이벤트id|시간(+ 또는 -)|배율(+ 또는 -)
            offense(); need(HACK_TIER.tamper);
            const [eventId, time, rate] = value.split('|');
            if (!eventId || eventId.startsWith('altar-') || !['+', '-'].includes(time) || !['+', '-'].includes(rate)) throw Error('변조할 이벤트와 방향을 고르세요.');
            daily('tamper', HACKER.tamper.perDay(), '이벤트 변조'); pay(HACKER.tamper.bits);
            h.pending = { kind: 'tamper', value: `${eventId}|${time === '+' ? 1 : -1}|${rate === '+' ? 1 : -1}`, minutes: HACKER.tamper.minutes(n), n };
            gainHacker(s, 0, HACKER.tamper.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'down') {
            offense(); need(HACK_TIER.down);
            const place = parsePlace(value);
            daily('down', HACKER.down.perDay(n), '서버 다운'); pay(HACKER.down.bits);
            const minutes = Math.round(HACKER.down.minutes(n) * (h.loadout?.includes('exploitKit') ? 1.2 : 1));
            h.pending = { kind: 'down', value: place, minutes, n };
            gainHacker(s, 0, HACKER.down.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'sniff') {
            need(HACK_TIER.sniff);
            if (h.sniff) throw Error(h.sniff.until > now ? `패킷 스니핑이 ${Math.ceil((h.sniff.until - now) / 60000)}분 남았습니다.` : '끝난 패킷 스니핑을 먼저 정산하세요.');
            daily('sniff', HACKER.sniff.perDay(), '패킷 스니핑'); pay(HACKER.sniff.bits);
            h.sniff = { from: now, until: now + HACKER.sniff.minutes * 60_000, n };
            addLog(s, `패킷 스니핑 시작 · ${HACKER.sniff.minutes}분 동안 서버에서 활동한 모험가 1명당 권한 경험치 +${HACKER.sniff.perPlayer(n)}`, 'system');
            bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'sniffClaim') {
            const sn = h.sniff;
            if (!sn) throw Error('정산할 패킷 스니핑이 없습니다.');
            if (sn.until > now) throw Error(`패킷 스니핑이 ${Math.ceil((sn.until - now) / 60000)}분 남았습니다.`);
            h.pending = { kind: 'sniffClaim', value: String(sn.from), minutes: 0, n: sn.n };
            return;
        }
        if (id === 'backdoor') {
            need(HACK_TIER.backdoor);
            if (![...BLESSINGS.map(b => b.id), 'god', ...RAIDS.map(r => r.id)].includes(value)) throw Error('채울 제단 게이지를 고르세요.');
            daily(`backdoor:${value}`, 1, '이 게이지의 백도어'); pay(HACKER.backdoor.bits);
            h.pending = { kind: 'backdoor', value, minutes: 0, n };
            gainHacker(s, 0, HACKER.backdoor.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'restore') {
            // 값: broadcast | down:stage:<id> | down:dungeon:<id> | tamper:<이벤트id>
            if (!white) throw Error('해킹 되돌리기는 화이트 해커만 할 수 있습니다.');
            const kind = value.split(':')[0];
            if (!['broadcast', 'down', 'tamper'].includes(kind)) throw Error('되돌릴 해킹을 고르세요.');
            need(Math.max(1, HACK_TIER[kind] || 1));
            daily('restore', HACKER.white.restore.perDay(n), '해킹 되돌리기'); pay(HACKER.white.restore.bits);
            h.pending = { kind: 'restore', value, minutes: 0 };
            gainHacker(s, 0, HACKER.white.restore.exp); bumpSeason(s, now, { restores: 1 });
            return;
        }
        if (id === 'patch') {
            if (!white) throw Error('패치는 화이트 해커만 할 수 있습니다.');
            const place = parsePlace(value);
            daily('patch', HACKER.white.patch.perDay(), '패치'); pay(HACKER.white.patch.bits);
            h.pending = { kind: 'patch', value: place, minutes: HACKER.white.patch.minutes };
            gainHacker(s, 0, HACKER.white.patch.exp);
            return;
        }
        throw Error('알 수 없는 해킹입니다.');
    },
    /** v3.25 프로그램 구매(비트, 영구). */
    programBuy(s, { id }) {
        const p = programById(id || ''), h = hackerState(s);
        if (!p) throw Error('알 수 없는 프로그램입니다.');
        if (h.programs?.includes(p.id)) throw Error('이미 가진 프로그램입니다.');
        if (h.bits < p.bits) throw Error(`비트 ${p.bits}가 필요합니다.`);
        h.bits -= p.bits; h.programs = [...(h.programs || []), p.id];
        addLog(s, `프로그램 ${p.name} 설치 · 비트 -${p.bits}`, 'reward');
    },
    /** v3.25 프로그램 장착·해제(메모리 한도 안). */
    programEquip(s, { id }) {
        const p = programById(id || ''), h = hackerState(s);
        if (!p || !h.programs?.includes(p.id)) throw Error('설치한 프로그램이 아닙니다.');
        const now = h.loadout || [];
        if (now.includes(p.id)) { h.loadout = now.filter(x => x !== p.id); return; }
        if (memoryUsed([...now, p.id]) > memoryCap(s)) throw Error(`메모리가 부족합니다(${memoryUsed(now)} / ${memoryCap(s)}).`);
        h.loadout = [...now, p.id];
    },
};
