/** 턴 진행(온라인 tick·오프라인 advance). */
import { regionCores } from '../data/boss-core';
import { syncGoals, syncAchievements } from './progress';
import { activeEvent, offlineEvent } from '../data/events';
import { recordUnlocks } from '../secret/unlocks';
import { syncVoyage } from './guidance';
import { stats, wornOnyx } from './stats';
import type { State } from '../types';
import { BALANCE, SKILL_FORMULA } from '../data/balance';
import { TIME_MACHINE_MASTERY } from '../data/expansion-v25';
import { STAGES, dungeonClosed, stageClosed, closuresSnapshot, monsterById, stageById, dungeonById } from '../data/world';
import { actTurn, actsFirst, constraintFields, Fighter, type CombatEvent } from './combat';
import { PROGRESSION } from '../data/progression';
import { offlineCapSeconds } from '../data/economy';
import { canUse, lazySkillMasteryRanks, extraRollLevel, extremeFinalTable, extremeFxTable } from './progression';
import { addLog, endRun } from './state';
import { spawn, takeWhistle, reward, releaseLegacySeal, gainLevels, enemyLabel } from './encounter';
import { deathRecoveryTurns, deathExpLoss } from '../data/sprout';
import { profile } from '../data/encounters';
import { bookEcology } from './book';
import { OFFLINE_SAMPLE, canSampleOffline, markOffline, sampleStable, extrapolateOffline, markOfflineRare, noteOfflineRare } from './offline-sample';
import { breathReset } from './actions/lifecycle';
import { isHacker, hackerTick } from './hacker';
import { runAutomation } from './automation';
import { recordIncome } from './income';
export function tick(s: State, rng = Math.random) {
    if (!s.running)
        return;
    // v3.18 해커는 전투하지 않습니다: 자동 사냥 대신 브루트포스로 비트·권한 경험치만 쌓습니다.
    if (isHacker(s)) { hackerTick(s); return; }
    syncStatRate(s);
    syncGoals(s, s.lastTick);
    // v3.58 사냥 골드 수입 기록(운영 페이지 통계): 턴 처리로 늘어난 골드만 셉니다.
    const goldBefore = s.gold;
    tickTurn(s, rng);
    recordIncome(s, s.gold - goldBefore);
    syncVoyage(s, text => addLog(s, text, 'reward'));
    syncAchievements(s, text => addLog(s, text, 'reward'));
    // v3.40 승천 편의: 연구 구매 예약 · 자동 환생.
    runAutomation(s, rng);
}
/** 레벨당 능력치 포인트가 오른 뒤(4 → 5), 이전 세이브에 지난 레벨만큼 차액을 한 번 지급합니다. */
export function syncStatRate(s: State) {
    const rate = s.statRate ?? 4;
    if (rate >= PROGRESSION.statPerLevel) return;
    const bonus = (s.level - 1) * (PROGRESSION.statPerLevel - rate);
    s.statPoints += bonus;
    s.statRate = PROGRESSION.statPerLevel;
    if (bonus > 0) addLog(s, `레벨당 능력치 포인트가 ${PROGRESSION.statPerLevel}로 올라 지난 레벨분 +${bonus}포인트를 받았습니다.`, 'reward');
}
/** v27.16 전투가 멈춘 채로 남는 것을 막는 안전장치: 양쪽 체력이 이만큼 턴 동안 그대로면 몬스터가 달아난 것으로 봅니다. */
const STALEMATE_TURNS = 120;
/**
 * v27.16 세이브가 어떤 이유로든 진행 불가 상태(숫자가 아닌 체력·회복·시각, 없는 사냥터·몬스터, 체력 0 이하로 남은 적)가 되면 조용히 복구합니다.
 * 던전에 들어갔다 나오면 풀리던 '몬스터가 나오지 않는' 현상의 안전망입니다. 복구한 내용은 일지에 남깁니다.
 */
function repairState(s: State, now?: number) {
    const fixed: string[] = [];
    // v27.86 옛 ‘잠든 힘’ 봉인(서약이 던전 랜덤게임으로 바뀜): 쌓인 경험치를 지급하고 봉인을 지웁니다.
    if (s.vows?.seal || s.vows?.anchor) { releaseLegacySeal(s); if (s.vows) { delete s.vows.anchor; delete s.vows.seal; } gainLevels(s); }
    if (now !== undefined && !Number.isFinite(s.lastTick)) { s.lastTick = now; fixed.push('시각'); }
    if (!Number.isFinite(s.recovery) || s.recovery < 0) { s.recovery = 0; fixed.push('회복 대기'); }
    if (!stageById(s.stage)) { s.stage = STAGES[0].id; s.target = null; fixed.push('사냥터'); }
    if (s.enemy && (!Number.isFinite(s.enemy.hp) || s.enemy.hp <= 0 || !Number.isFinite(s.enemy.maxHp) || !monsterById(s.enemy!.id))) { s.enemy = null; fixed.push('몬스터'); }
    if (!Number.isFinite(s.hp) || !Number.isFinite(s.mana)) { const a = stats(s); if (!Number.isFinite(s.hp)) s.hp = a.hp; if (!Number.isFinite(s.mana)) s.mana = a.mana; fixed.push('체력·마나'); }
    if (fixed.length) addLog(s, `전투 상태를 복구했습니다 (${fixed.join('·')}).`, 'system');
    return fixed;
}
function tickTurn(s: State, rng: () => number) {
    s.turn++;
    s.playMs = (s.playMs || 0) + BALANCE.turnMs;
    repairState(s);
    // v27.25·v27.31 운영 페이지에서 닫은 던전·사냥터에 있던 세이브는 보상 없이 나와 열린 사냥터에서 자동 사냥을 잇습니다.
    if (s.dungeon && dungeonClosed(s.dungeon.id)) { const name = dungeonById(s.dungeon!.id)?.name || '던전'; s.dungeon = null; s.enemy = null; s.effects = {}; s.playerStun = 0; addLog(s, `${name}이(가) 점검으로 닫혀 사냥터로 돌아왔습니다. 점검이 끝나면 다시 열립니다.`, 'system'); }
    if (!s.dungeon && stageClosed(s.stage)) {
        const from = STAGES.findIndex(x => x.id === s.stage), name = STAGES[from]?.name || '사냥터';
        const to = [...STAGES.slice(0, Math.max(0, from))].reverse().find(x => !stageClosed(x.id) && s.level >= x.level && s.rebirths >= x.rebirth) || STAGES[0];
        s.stage = to.id; s.target = null; s.enemy = null; s.effects = {}; s.playerStun = 0;
        addLog(s, `${name}이(가) 점검으로 닫혀 ${to.name}(으)로 옮겼습니다. 점검이 끝나면 다시 열립니다.`, 'system');
    }
    const a = stats(s);
    if (s.recovery > 0) {
        s.recovery--;
        if (!s.recovery) {
            s.hp = a.hp;
            s.mana = a.mana;
            addLog(s, '숨을 고르고 다시 무기를 들었습니다.');
        }
        return;
    }
    if (!s.enemy)
        spawn(s, rng, takeWhistle(s));
    const e = s.enemy!;
    const enemyHpBefore = e.hp, playerHpBefore = s.hp;
    const ecology = bookEcology(s, e.id);
    const usable = s.skills.filter(id => canUse(s, id)), skillFinal = extremeFinalTable(s, usable), extremeFx = extremeFxTable(s, usable);
    const player: Fighter = { name: s.name, job: s.job, cores: regionCores(s).length, onyx: wornOnyx(s), stats: a, hp: s.hp, skills: usable, cooldowns: s.cooldowns, extraRolls: extraRollLevel(s), stun: s.playerStun, mana: s.mana, effects: s.effects, ranks: s.learned, mastery: lazySkillMasteryRanks(s), gold: s.gold, ...(skillFinal ? { skillFinal } : {}), ...(extremeFx ? { extremeFx } : {}), ...(ecology.stages ? { damageDealt: ecology.dealt, damageTaken: ecology.taken } : {}), ...constraintFields(s.job) };
    const enemy: Fighter = { foe: true, foeId: e.id, name: enemyLabel(e), stats: e.combatStats || { hp: e.maxHp, attack: e.attack, defense: e.defense, crit: 0 }, hp: e.hp, skills: e.skills || [], cooldowns: e.cooldowns || {}, stun: e.stun, mana: e.mana, effects: e.effects || {}, prey: e.boss || SKILL_FORMULA.designatedSpecies.includes(e.id), ...(profile(e.id).magicBasic ? { magicBasic: true } : {}), ...(profile(e.id).splitBasic ? { splitBasic: true } : {}), ...(e.swarm ? { swarm: e.swarm } : {}) };
    const first = actsFirst(player, enemy) ? player : enemy, second = first === player ? enemy : player;
    // 빠른 쪽이 먼저 행동(연속 행동 포함)하고, 둘 다 살아 있으면 느린 쪽도 같은 방식으로 행동합니다.
    // v25 타임 리와인드: 쓸 때마다 현재 직업 숙련이 오릅니다.
    const log = (text: string, event: CombatEvent) => { addLog(s, text, 'battle', event); if (event?.restored && event.actor === s.name) s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + TIME_MACHINE_MASTERY; };
    actTurn(first, second, rng, log);
    if (first.hp > 0 && second.hp > 0)
        actTurn(second, first, rng, log);
    s.hp = player.hp;
    s.mana = player.mana ?? a.mana;
    s.gold = Math.max(0, player.gold ?? s.gold);
    s.playerStun = player.stun;
    s.effects = player.effects || {};
    e.hp = enemy.hp;
    e.stun = enemy.stun;
    e.mana = enemy.mana;
    e.effects = enemy.effects;
    e.cooldowns = enemy.cooldowns;
    // v27.16 교착 안전장치: 양쪽 체력이 그대로인 턴이 이어지면 몬스터가 달아난 것으로 보고 새 몬스터를 맞이합니다.
    if (e.hp > 0 && s.hp > 0) {
        // v3.12 칠흑 보스는 정해진 턴이 지나면 떠납니다(도망 보상 없음). v3.161 대왕 시리즈도 leavesAt으로 같은 규칙.
        if (e.leavesAt !== undefined && s.turn >= e.leavesAt && e.hp > 0) { s.enemy = null; s.effects = {}; s.playerStun = 0; addLog(s, e.onyx ? `${enemyLabel(e)}이(가) 어둠 속으로 사라졌습니다. 다음에 다시 만나세요.` : `${enemyLabel(e)}이(가) 힘이 다 빠지기 전에 달아났습니다. 다음에 다시 만나세요.`); return; }
        e.stale = e.hp === enemyHpBefore && s.hp === playerHpBefore ? (e.stale || 0) + 1 : 0;
        if (e.stale >= STALEMATE_TURNS) { s.enemy = null; s.effects = {}; s.playerStun = 0; addLog(s, `${enemyLabel(e)}이(가) 줄을 끊고 달아났습니다. 다음 몬스터를 기다립니다.`); return; }
    }
    if (e.hp <= 0 && s.hp > 0) {
        // v3.104 부재중 정산 중 희귀 몬스터 처치는 표본 환산의 비례에서 뺍니다(남은 시간에는 따로 실제로 굴림).
        const rare = markOfflineRare(s);
        reward(s, rng);
        noteOfflineRare(s, rare);
    }
    else if (s.hp <= 0) {
        s.deaths++;
        // 하드코어: 쓰러지면 즉시 이번 생을 처음부터 다시 시작합니다(오프라인 정산 중에도 같은 규칙).
        if (s.vows?.breath) { breathReset(s, s.lastTick); return; }
        // v3.17 사망 페널티: 회복 대기(기본 25턴 = 50초, 연구 ‘불굴의 의지’·패시브로 단축, 최저 10턴)와 경험치 손실(지금 레벨 필요량의 2%).
        // 환생 10회 미만(새싹)은 전처럼 3턴·손실 없음(사다리 걷어차기 방지).
        s.recovery = deathRecoveryTurns(s);
        const lost = deathExpLoss(s);
        if (lost > 0) s.exp = Math.max(0, s.exp - lost);
        s.enemy = null;
        s.cooldowns = {};
        s.effects = {};
        s.playerStun = 0;
        addLog(s, `몬스터를 놓쳤습니다. ${Math.round(s.recovery * BALANCE.turnMs / 1000)}초 동안 회복합니다.${lost > 0 ? ` 경험치 -${lost.toLocaleString()}` : ''}`);
        if (s.dungeon) {
            const repeating = !!s.dungeon.repeat;
            endRun(s, `${dungeonById(s.dungeon!.id)?.name || '던전'} 도전 실패${repeating ? ' · 반복 중단 → 자동 사냥으로 전환' : ' · 멈춤'}`);
            s.dungeon = null;
            s.running = repeating;
            addLog(s, repeating ? '던전 도전에 실패했습니다. 반복 도전을 멈추고 사냥터에서 자동 사냥을 이어갑니다.' : '던전 도전에 실패했습니다. 손실 없이 다시 도전할 수 있습니다.');
        }
    }
}
/** v3.17 요청 하나에서 돌리는 부재중 정산 턴 상한(약 1~2초). */
export const CATCH_UP_CHUNK = 1500;
/** v3.189 이만큼 비운 정산이 부재중 보정을 받는지(1시간 초과). */
export const awayGap = (elapsedMs: number) => elapsedMs > BALANCE.offlineAwaySeconds * 1000;
export function advance(s: State, now: number, rng = Math.random) {
    repairState(s, now);
    now = Math.max(now, s.lastTick);
    // v26.1 서버 이벤트: 정산 시각 기준으로 적어 두고, 아래 틱들이 이 배율을 씁니다.
    const elapsed = now - s.lastTick;
    const continuing = (s.catchUpLeft || 0) > 0;
    // v27.51 이벤트·제단 축복 배율: 접속 중에는 그대로, 부재중 정산에는 절반만(offlineEvent). 정산이 끝난 뒤 원래 배율을 다시 적습니다.
    // v3.189 부재중 보정(이벤트 절반 · 특별 몬스터 offlineScale)은 1시간(offlineAwaySeconds) 넘게 비운 정산만 받습니다(탭을 잠깐 내린 것은 접속 중과 같게).
    // 나눠 돌리는 정산은 처음 정한 보정을 이어 씁니다(catchUpAway). 표본 환산 · 분할은 아래 offline 기준입니다.
    const away = continuing ? !!s.catchUpAway : awayGap(elapsed);
    const live = activeEvent(now);
    s.event = away ? offlineEvent(live) : live;
    // v27.31 닫힌 사냥터·던전 목록도 같이 적어 화면이 잠금 표시를 합니다.
    const closed = closuresSnapshot(); if (closed) s.closed = closed; else delete s.closed;
    // 정산 상한은 정산을 시작할 때의 긴 휴식 단계로 정합니다(정산 중 연구가 바뀌지 않음).
    const cap = offlineCapSeconds(s);
    // v3.17 긴 부재중 정산은 요청 하나에서 다 돌리지 않고 CATCH_UP_CHUNK턴씩 나눕니다(6~30시간 = 1만~5만 턴을 한 요청에서 돌리면 수십 초가 걸려
    // 클라이언트 20초 제한에 걸리고 서버가 멈춘 것처럼 보였음). 남은 턴은 catchUpLeft에 적어 다음 동기화가 이어 돌립니다.
    const budget = continuing ? Math.min(s.catchUpLeft!, Math.floor(elapsed / BALANCE.turnMs)) : Math.min(Math.floor(elapsed / BALANCE.turnMs), cap * 1000 / BALANCE.turnMs);
    // 1분 넘게 밀린 정산은 오프라인 정산으로 봅니다(저장하지 않는 임시 표시).
    const offline = elapsed > 60000 || continuing;
    // v3.104 긴 부재중 정산은 앞의 OFFLINE_SAMPLE.turns턴만 돌리고 남은 턴은 비례해 더합니다(systems/offline-sample.ts).
    const sampling = offline && !continuing && budget > OFFLINE_SAMPLE.warmup + OFFLINE_SAMPLE.turns && canSampleOffline(s);
    const warmup = sampling ? OFFLINE_SAMPLE.warmup : 0, count = sampling ? warmup + OFFLINE_SAMPLE.turns : Math.min(budget, CATCH_UP_CHUNK);
    let truncated = count < budget;
    const before = { kills: s.kills, gold: s.gold, exp: s.exp };
    let mark: ReturnType<typeof markOffline> | null = null;
    if (offline) s.catchingUp = true;
    if (away) s.away = true;
    try {
        for (let i = 0; i < count; i++) {
            // 워밍업이 끝난 때부터 비율을 잽니다.
            if (sampling && i === warmup) mark = markOffline(s);
            tick(s, rng);
        }
        // 표본 뒤에도 같은 사냥 중이면 남은 턴을 환산하고, 아니면 전처럼 남은 턴을 이어 돌립니다(catchUpLeft).
        if (mark && sampleStable(s, mark)) { extrapolateOffline(s, mark, count - warmup, budget - count, rng, () => tick(s, rng)); truncated = false; }
    }
    finally { delete s.catchingUp; delete s.away; }
    if (away) s.event = live;
    if (truncated) { if (away) s.catchUpAway = true; else delete s.catchUpAway; s.catchUpLeft = budget - count; s.lastTick = s.lastTick + count * BALANCE.turnMs; }
    else { delete s.catchUpLeft; delete s.catchUpAway; s.lastTick = elapsed > cap * 1000 || continuing ? now : now - (elapsed % BALANCE.turnMs); }
    recordUnlocks(s);
    if (offline && s.kills > before.kills) {
        const prev = continuing && s.lastOffline ? s.lastOffline : null;
        s.lastOffline = { seconds: prev ? prev.seconds : Math.min(cap, Math.floor(elapsed / 1000)), kills: (prev?.kills || 0) + s.kills - before.kills, gold: (prev?.gold || 0) + Math.max(0, s.gold - before.gold), exp: (prev?.exp || 0) + Math.max(0, s.exp - before.exp) };
    }
}
