/** v3.18 해커 행동: 재화 변환(단방향), 침투 작전, 해킹 단계 해금, 신원 조작, 해킹 실행(서버 공유는 /api/hack에서). */
import type { ActionHandlers } from './types';
import { HACKER, PRIVACY_FIELDS, HACK_TIER, HACK_NAMES, WIPE_TRACE_ID, programById, type PrivacyField } from '../../data/hacker';
import { canUse } from '../progression';
import { JOBS } from '../../data/classes';
import { STAGES, DUNGEONS } from '../../data/world';
import { BLESSINGS, RAIDS } from '../../data/altar';
import { crewNote, entriesCap, hackerState, rollHackerDay, isHacker, isWhiteHacker, gainHacker, makeNode, nodeExtra, traceKeep, judge, nodeAnswer, adguardLevel, bumpSeason, memoryCap, memoryUsed, botnetOn, isBlackHacker, crewOn } from '../hacker';
import { dayKey, weekKey } from '../../data/goals';
import { addLog } from '../state';
import { leakPool } from '../../secret/leaks';

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

/** v3.28 미끼 이름: 12자까지, 구분 문자(| ,)·줄바꿈·꺾쇠 제외, ???는 쓸 수 없음. */
export const DECOY_NAME = /^[^\n\r<>|,]{1,12}$/;
/** v3.28 미끼 정보 검사(숙련 3단계). 공개로 남긴 항목은 미끼를 쓰지 않습니다. 돌려주는 값: '이름|직업|레벨' 또는 ''(미끼 없음). */
function parseDecoy(level: number, show: PrivacyField[], name: string, job: string, lv: string) {
    if (!name && !job && !lv) return '';
    if (level < HACKER.spoof.decoyLevel) throw Error(`미끼 정보는 신원 조작 숙련 ${HACKER.spoof.decoyLevel}단계부터 쓸 수 있습니다.`);
    if (name && (!DECOY_NAME.test(name) || name.includes('???'))) throw Error('미끼 이름은 1~12자(줄바꿈·꺾쇠·|·쉼표 제외)로 쓰세요.');
    if (job && !JOBS.some(j => j.id === job && !j.hidden)) throw Error('미끼 직업을 다시 고르세요(숨은 직업 제외).');
    const n = lv ? Number(lv) : 0;
    if (lv && (!Number.isInteger(n) || n < 1 || n > HACKER.spoof.decoyMaxLevel)) throw Error(`미끼 레벨은 1~${HACKER.spoof.decoyMaxLevel}로 쓰세요.`);
    const out = [name, show.includes('job') ? '' : job, show.includes('level') || !n ? '' : String(n)];
    return out.some(Boolean) ? out.join('|') : '';
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
        // v3.27 다른 해커의 역추적만큼 오늘 입장이 줄어듭니다(최소 1회).
        const cap = entriesCap(s, now);
        if ((h.entries || 0) >= cap) throw Error(`오늘의 침투 작전 입장(${cap}회)을 모두 썼습니다.`);
        h.entries = (h.entries || 0) + 1;
        h.runs = (h.runs || 0) + 1;
        const seed = Math.floor(rng() * 2 ** 31);
        h.infil = { seed, depth: 0, bank: { bits: 0, exp: 0 }, node: makeNode(seed, 0, nodeExtra(s)) };
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
            crewNote(s, { nodes: 1 });
            run.node = makeNode(run.seed, run.depth, nodeExtra(s));
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
    /**
     * 해킹 실행: 조건·비용을 확인하고 h.pending에 적습니다. 서버 공유 설정에 쓰는 일은 /api/hack이 저장 직전에 하고 pending을 지웁니다.
     * 일반 행동 경로(/api/game)로는 받지 않습니다(route에서 거절).
     * v3.25 해킹 II~V(이벤트 변조·서버 다운·패킷 스니핑·백도어)와 화이트 해커(복구·패치). 화이트 해커는 공격 해킹(I~III)을 쓰지 않습니다.
     */
    hackRun(s, { a, id, now, rng }) {
        needHacker(s);
        const h = rollHackerDay(s, now), n = h.tier, white = isWhiteHacker(s), black = isBlackHacker(s);
        const used = h.used ??= {}, value = String(a.value || '').trim();
        // v3.28 블랙 해커가 추적당한 동안은 해킹할 수 없습니다(정산·신원 조작 거두기는 가능).
        if ((h.bustedUntil || 0) > now && !['sniffClaim', 'interceptClaim', 'spoof', 'unspoof'].includes(id || '')) throw Error(`추적당해 ${Math.ceil((h.bustedUntil! - now) / 60000)}분 동안 해킹할 수 없습니다.`);
        const need = (tier: number) => { if (n < tier) throw Error(`해킹 ${ROMAN[tier - 1]}을 먼저 해금하세요.`); };
        // v3.28 블랙 해커는 해킹 비트·하루 횟수가 두 배(scale = false: 신원 조작, 대상마다 걸린 1회, 루트 권한 횟수).
        const pay = (bits: number, scale = true) => { const cost = black && scale ? bits * HACKER.black.cost : bits; if (h.bits < cost) throw Error(`비트 ${cost}가 필요합니다.`); h.bits -= cost; };
        const daily = (key: string, cap: number, label: string, scale = true) => { if ((used[key] || 0) >= (black && scale ? cap * HACKER.black.cap : cap)) throw Error(`오늘의 ${label} 횟수를 모두 썼습니다.`); used[key] = (used[key] || 0) + 1; };
        const offense = () => { if (white) throw Error('화이트 해커는 공격 해킹을 쓰지 않습니다. 해커로 전직하면 쓸 수 있습니다.'); };
        /** v3.28 블랙 해커의 실패: 비트·횟수는 쓰이고 효과는 없습니다. 추적되어 이름이 공지되고(서버) 6시간 동안 해킹할 수 없습니다. */
        const busted = () => {
            // v3.33 조직 모듈 세탁: 실패 확률 −3%p(최소 5%), 공지에 이름 대신 조직 이름.
            const launder = crewOn(s, 'launder');
            if (!black || rng() >= Math.max(.05, HACKER.black.fail(n) - (launder ? .03 : 0))) return false;
            const label = HACK_NAMES[id || ''] || '해킹', hours = s.skills.includes(WIPE_TRACE_ID) && canUse(s, WIPE_TRACE_ID) ? HACKER.black.wipedHours : HACKER.black.traceHours;
            h.bustedUntil = now + hours * 3600_000;
            h.pending = { kind: 'busted', value: launder && h.crew ? `${label}|${h.crew.name}` : label, minutes: hours * 60 };
            addLog(s, `${label} 실패 · 추적당했습니다! ${hours}시간 동안 해킹할 수 없고, 소식에 이름이 공지됩니다.`, 'system');
            return true;
        };
        if (id === 'broadcast') {
            offense(); need(HACK_TIER.broadcast);
            if (!BROADCAST_PATTERN.test(value)) throw Error(`방송 문구는 1~${HACKER.broadcast.maxLength}자(줄바꿈·꺾쇠 제외)로 쓰세요.`);
            daily('broadcast', HACKER.broadcast.perDay(n), '방송 탈취'); pay(HACKER.broadcast.bits);
            if (busted()) return;
            h.pending = { kind: 'broadcast', value, minutes: HACKER.broadcast.minutes(n) };
            gainHacker(s, 0, HACKER.broadcast.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'crack') {
            offense(); need(HACK_TIER.crack);
            if (!value) throw Error('크래킹할 대상을 고르세요.');
            daily('crack', HACKER.crack.perDay(n), '크래킹'); pay(HACKER.crack.bits);
            if (busted()) return;
            h.pending = { kind: 'crack', value, minutes: HACKER.crack.minutes };
            gainHacker(s, 0, HACKER.crack.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'tamper') {
            // 값: 이벤트id|시간(+ 또는 -)|배율(+ 또는 -)
            offense(); need(HACK_TIER.tamper);
            const [eventId, time, rate] = value.split('|');
            if (!eventId || eventId.startsWith('altar-') || eventId.startsWith('hack-') || !['+', '-'].includes(time) || !['+', '-'].includes(rate)) throw Error('변조할 이벤트와 방향을 고르세요.');
            daily('tamper', HACKER.tamper.perDay(), '이벤트 변조'); pay(HACKER.tamper.bits);
            if (busted()) return;
            h.pending = { kind: 'tamper', value: `${eventId}|${time === '+' ? 1 : -1}|${rate === '+' ? 1 : -1}`, minutes: HACKER.tamper.minutes(n), n };
            gainHacker(s, 0, HACKER.tamper.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'down') {
            offense(); need(HACK_TIER.down);
            const place = parsePlace(value);
            daily('down', HACKER.down.perDay(n), '서버 다운'); pay(HACKER.down.bits);
            if (busted()) return;
            const minutes = Math.round(HACKER.down.minutes(n) * (h.loadout?.includes('exploitKit') ? 1.2 : 1));
            h.pending = { kind: 'down', value: place, minutes, n };
            gainHacker(s, 0, HACKER.down.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'sniff') {
            need(HACK_TIER.sniff);
            if (h.sniff) throw Error(h.sniff.until > now ? `패킷 스니핑이 ${Math.ceil((h.sniff.until - now) / 60000)}분 남았습니다.` : '끝난 패킷 스니핑을 먼저 정산하세요.');
            daily('sniff', HACKER.sniff.perDay(), '패킷 스니핑'); pay(HACKER.sniff.bits);
            if (busted()) return;
            // v3.28 봇넷 중에 시작한 스니핑은 정산 ×2(상한도 ×2).
            const mult = botnetOn(s, now) ? HACKER.botnet.rate : 1;
            h.sniff = { from: now, until: now + HACKER.sniff.minutes * 60_000, n, ...(mult > 1 ? { mult } : {}) };
            addLog(s, `패킷 스니핑 시작 · ${HACKER.sniff.minutes}분 동안 서버에서 활동한 모험가 1명당 권한 경험치 +${HACKER.sniff.perPlayer(n) * mult} · 비트 +${HACKER.sniff.bitsPerPlayer(n) * mult}${mult > 1 ? ' (봇넷 ×2)' : ''}`, 'system');
            bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'sniffClaim') {
            const sn = h.sniff;
            if (!sn) throw Error('정산할 패킷 스니핑이 없습니다.');
            if (sn.until > now) throw Error(`패킷 스니핑이 ${Math.ceil((sn.until - now) / 60000)}분 남았습니다.`);
            h.pending = { kind: 'sniffClaim', value: String(sn.from), minutes: 0, n: sn.n, ...(sn.mult ? { bits: sn.mult } : {}) };
            return;
        }
        if (id === 'intercept') {
            // v3.28 해킹 VI 패킷 가로채기: 값 = 월드보스 id. 떠 있는지와 세대는 서버가 확인해 h.intercept에 적습니다.
            need(HACK_TIER.intercept);
            if (!RAIDS.some(r => r.id === value)) throw Error('가로챌 월드보스를 고르세요.');
            if (h.intercept) throw Error('걸어 둔 패킷 가로채기를 먼저 정산하세요.');
            daily('intercept', HACKER.intercept.perDay(), '패킷 가로채기'); pay(HACKER.intercept.bits);
            if (busted()) return;
            h.pending = { kind: 'intercept', value, minutes: 0, n };
            gainHacker(s, 0, HACKER.intercept.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'interceptClaim') {
            if (!h.intercept) throw Error('정산할 패킷 가로채기가 없습니다.');
            h.pending = { kind: 'interceptClaim', value: h.intercept.raid, minutes: 0, n: h.intercept.n };
            return;
        }
        if (id === 'savescum') {
            // v3.28 해킹 VII 세이브 스캠: 값 = 월드보스 id|rewind(되감기) 또는 forward(빨리감기).
            need(HACK_TIER.savescum);
            const [raid, mode] = value.split('|');
            if (!RAIDS.some(r => r.id === raid) || !['rewind', 'forward'].includes(mode)) throw Error('월드보스와 되감기·빨리감기를 고르세요.');
            daily('savescum', HACKER.savescum.perDay(), '세이브 스캠'); pay(HACKER.savescum.bits);
            if (busted()) return;
            h.pending = { kind: 'savescum', value: `${raid}|${mode}`, minutes: 0, n };
            gainHacker(s, 0, HACKER.savescum.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'botnet') {
            // v3.28 해킹 VIII 봇넷: 세이브 안에서만 계산합니다(서버 쓰기 없음).
            need(HACK_TIER.botnet);
            daily('botnet', HACKER.botnet.perDay(), '봇넷'); pay(HACKER.botnet.bits);
            if (busted()) return;
            h.botnet = { until: Math.max(h.botnet?.until || 0, now) + HACKER.botnet.hours * 3600_000, day: dayKey(now) };
            gainHacker(s, 0, HACKER.botnet.exp); bumpSeason(s, now, { hacks: 1 });
            addLog(s, `봇넷 가동 · ${HACKER.botnet.hours}시간 동안 브루트포스·패킷 스니핑 ×${HACKER.botnet.rate}, 오늘 침투 작전 입장 +${HACKER.botnet.entries}`, 'reward');
            return;
        }
        if (id === 'ddos') {
            // v3.28 해킹 IX DDoS: 값 = exp | gold | drop. 주 1회.
            need(HACK_TIER.ddos);
            if (!(HACKER.ddos.kinds as readonly string[]).includes(value)) throw Error('열 이벤트(경험치·골드·드롭)를 고르세요.');
            const week = weekKey(now), done = h.ddos?.week === week ? h.ddos.n : 0;
            if (done >= HACKER.ddos.perWeek() * (black ? HACKER.black.cap : 1)) throw Error('이번 주의 DDoS 횟수를 모두 썼습니다.');
            pay(HACKER.ddos.bits); h.ddos = { week, n: done + 1 };
            if (busted()) return;
            h.pending = { kind: 'ddos', value, minutes: HACKER.ddos.hours * 60, n };
            gainHacker(s, 0, HACKER.ddos.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'root') {
            // v3.28 해킹 X 루트 권한: 오늘의 해킹 횟수를 모두 되돌립니다(루트 권한 자신과 주간 DDoS는 그대로).
            need(HACK_TIER.root);
            daily('root', HACKER.root.perDay(), '루트 권한', false); pay(HACKER.root.bits);
            if (busted()) return;
            h.used = { root: used.root };
            h.roots = (h.roots || 0) + 1;
            h.pending = { kind: 'root', value: '', minutes: HACKER.root.showMinutes, n };
            gainHacker(s, 0, HACKER.root.exp); bumpSeason(s, now, { hacks: 1 });
            addLog(s, '루트 권한 획득 · 오늘의 해킹 횟수가 모두 초기화되었습니다.', 'reward');
            return;
        }
        if (id === 'backdoor') {
            need(HACK_TIER.backdoor);
            if (![...BLESSINGS.map(b => b.id), 'god', ...RAIDS.map(r => r.id)].includes(value)) throw Error('채울 제단 게이지를 고르세요.');
            daily(`backdoor:${value}`, 1, '이 게이지의 백도어', false); pay(HACKER.backdoor.bits);
            if (busted()) return;
            h.pending = { kind: 'backdoor', value, minutes: 0, n };
            gainHacker(s, 0, HACKER.backdoor.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'spoof') {
            // v3.26 신원 조작(옛 애드가드): 값 = 대상(랭킹 행 id 또는 self)|공개할 항목(쉼표)|시간(0 = 무기한). 숙련 1단계는 전부 숨김.
            // v3.28 숙련 3단계 미끼 정보: |미끼 이름|미끼 직업 id|미끼 레벨(모두 선택). 가린 항목 대신 ???가 아닌 가짜 값을 보여 줍니다.
            const level = adguardLevel(s);
            if (level < 1) throw Error('신원 조작을 장착하고 숙련 1단계를 달성하세요.');
            const [target, fields = '', hoursRaw = '0', decoyName = '', decoyJob = '', decoyLevel = ''] = value.split('|'), hours = Math.floor(Number(hoursRaw));
            if (!target) throw Error('신원을 조작할 대상을 고르세요.');
            if (!Number.isFinite(hours) || hours < 0 || hours > HACKER.spoof.maxHours) throw Error(`기간은 0(무기한)~${HACKER.spoof.maxHours}시간으로 정하세요.`);
            const show = level >= 2 ? [...new Set(fields.split(',').map(x => x.trim()).filter((x): x is PrivacyField => (PRIVACY_FIELDS as readonly string[]).includes(x)))] : [];
            const decoy = parseDecoy(level, show, decoyName.trim(), decoyJob.trim(), decoyLevel.trim());
            daily('spoof', HACKER.spoof.perDay(level), '신원 조작', false); pay(HACKER.spoof.bits, false);
            h.pending = { kind: 'spoof', value: `${target}|${show.join(',')}${decoy ? `|${decoy}` : ''}`, minutes: hours * 60 };
            gainHacker(s, 0, HACKER.spoof.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'unspoof') {
            // v3.27 내가 건 신원 조작을 거둡니다(무료, 횟수 없음). 값 = 대상 id 또는 self.
            if (!value) throw Error('거둘 대상을 고르세요.');
            h.pending = { kind: 'unspoof', value, minutes: 0 };
            return;
        }
        if (id === 'trace' || id === 'overload') {
            // v3.27 해커끼리 견제(해커 순위 행에서). 값 = 대상 모험가 id.
            offense(); need(1);
            if (!value) throw Error('대상 해커를 고르세요.');
            const def = id === 'trace' ? HACKER.trace : HACKER.overload;
            daily(id, 1, id === 'trace' ? '역추적' : '과부하'); pay(def.bits);
            if (busted()) return;
            h.pending = { kind: id, value, minutes: id === 'overload' ? HACKER.overload.minutes : 0 };
            gainHacker(s, 0, def.exp); bumpSeason(s, now, { hacks: 1 });
            return;
        }
        if (id === 'restore') {
            // 값: broadcast | down:stage:<id> | down:dungeon:<id> | tamper:<이벤트id> | mask:<대상> | v3.28 ddos
            if (!white) throw Error('해킹 되돌리기는 화이트 해커만 할 수 있습니다.');
            const kind = value.split(':')[0];
            if (!['broadcast', 'down', 'tamper', 'mask', 'ddos'].includes(kind)) throw Error('되돌릴 해킹을 고르세요.');
            need(Math.max(1, HACK_TIER[kind] || 1));
            daily('restore', HACKER.white.restore.perDay(n), '해킹 되돌리기'); pay(HACKER.white.restore.bits);
            h.pending = { kind: 'restore', value, minutes: 0 };
            gainHacker(s, 0, HACKER.white.restore.exp); bumpSeason(s, now, { restores: 1 });
            return;
        }
        if (id === 'leak') {
            // v3.57 정보 해킹: 아직 모르는 비밀 조각 하나. 화이트 해커도 씁니다(공격 해킹이 아님).
            need(HACK_TIER.leak);
            const pool = leakPool(s, new Set((h.leaks || []).map(l => l.id)));
            if (!pool.length) throw Error('더 알아낼 정보가 없습니다.');
            daily('leak', HACKER.leak.perDay(n), '정보 해킹'); pay(HACKER.leak.bits);
            if (busted()) return;
            const pick = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
            h.leaks = [{ ...pick, at: now }, ...(h.leaks || [])].slice(0, HACKER.leak.keep);
            gainHacker(s, 0, HACKER.leak.exp); bumpSeason(s, now, { hacks: 1 });
            addLog(s, `정보 해킹 · ${pick.text}`, 'reward');
            return;
        }
        if (id === 'patch') {
            if (!white) throw Error('패치는 화이트 해커만 할 수 있습니다.');
            const place = parsePlace(value);
            daily('patch', HACKER.white.patch.perDay(), '패치'); pay(HACKER.white.patch.bits);
            // v3.33 조직 모듈 합동 패치: +30분.
            h.pending = { kind: 'patch', value: place, minutes: HACKER.white.patch.minutes + (crewOn(s, 'jointPatch') ? 30 : 0) };
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
