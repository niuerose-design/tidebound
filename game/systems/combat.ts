import { SKILLS, skillById } from '../data/skills';
import { enemySkillById } from '../data/encounters';
import { jobById } from '../data/classes';
import { BALANCE, STATUS_TUNING, SKILL_FORMULA, diceMultiplier, PENETRATION } from '../data/balance';
import type { Stats, CombatStats, StatusEffects, CombatEvent, CombatHit, Attribute, Skill } from '../types';
const ATTR_KEY: Record<Attribute, 'attrStr' | 'attrDex' | 'attrInt' | 'attrVit' | 'attrWis' | 'attrLuk'> = { str: 'attrStr', dex: 'attrDex', int: 'attrInt', vit: 'attrVit', wis: 'attrWis', luk: 'attrLuk' };
export type { CombatEvent, CombatHit } from '../types';
import { normalizeStats, hitChance } from './stats';
import { effectiveSkill, signatureScale } from './progression';
export type Fighter = {
    name: string;
    /** 현재 직업. 4차 이상 전용 기술의 계보 밖 효율을 정합니다(적은 없음). */
    job?: string;
    stats: Stats;
    hp: number;
    /** v3.191 지속 피해 체력 비례분의 기준 체력 상한(월드보스 소환 단계). 없으면 현재 체력. */
    dotHpCap?: number;
    skills: string[];
    /** 재사용 대기(행동 단위). v3.86 각성기는 턴 단위로 같은 칸에 두고, '~id' 칸에 실패한 판정 수를 셉니다. */
    cooldowns: Record<string, number>;
    stun: number;
    /** v3.86 추가 판정 단계(액티브가 발동한 행동에서 아래 액티브로 더 굴리는 횟수). 플레이어만. */
    extraRolls?: number;
    /** v3.86 한 턴에 나갈 수 있는 각성기 수(없으면 SKILL_FORMULA.awaken.perTurn). 승천 연구로 늘릴 자리입니다. */
    awakenPerTurn?: number;
    mana?: number;
    ranks?: Record<string, number>;
    mastery?: Record<string, number>;
    effects?: StatusEffects;
    /** 무리 사냥 개체의 규모. 자기 최대 체력 비례 공격은 한 마리 체력 기준으로 계산합니다. */
    swarm?: number;
    /** 도감 생태 연구: 주는 피해 증가율(0.04 = +4%). */
    damageDealt?: number;
    /** 도감 생태 연구: 받는 공격 피해 감소율(0.02 = -2%). 지속 피해에는 적용하지 않습니다. */
    damageTaken?: number;
    /** v24.2 골드 투척 기술이 쓰는 보유 골드(플레이어만). */
    gold?: number;
    /** v24.2 사냥감 연구 대상 여부(보스·지정 몬스터). */
    prey?: boolean;
    /** v3.5 몬스터(사냥터·던전·월드보스). 이 전투원이 거는 상태이상은 상대의 상태이상 저항에 막힐 수 있습니다. */
    foe?: boolean;
    /** v25.2 기본 공격이 마법 피해(마력 생물). 마법 공격 수치로 치고 상대 마법 방어로 막습니다. */
    magicBasic?: boolean;
    /** v27 기본 공격이 복합 피해(혼돈 생물). (물리+마법)/2로 치고 물리·마법 방어를 절반씩 적용합니다. */
    splitBasic?: boolean;
    /** v27.4 제약 직업 장치: 항상 선공. */
    firstStrike?: boolean;
    /** v27.4 제약 직업 장치: 직업 자체의 최후의 버팀(기술 無와 같은 횟수 카운터를 씁니다). */
    jobStand?: { charges: number; heal?: number };
    /** v27.4 제약 직업 장치: 모든 공격 반드시 명중. */
    sureHit?: boolean;
    /** v3.211 극한 단계 최종 피해 배율(스킬 id → 1.02~1.1). 그 스킬의 본타 · 추가타에 곱합니다. */
    skillFinal?: Record<string, number>;
    /** v3.211 극한돌파 전용 연출이 열린 스킬 id. */
    extremeFx?: string[];
};
/** v27.4 직업의 제약 장치를 전투 참가자 필드로. 플레이어(PvE)와 결투 스냅샷이 같이 씁니다. */
export function constraintFields(jobId: string | undefined): Partial<Fighter> {
    const d = jobById(jobId)?.constraint?.devices;
    if (!d) return {};
    return { ...(d.firstStrike ? { firstStrike: true } : {}), ...(d.lastStand ? { jobStand: d.lastStand } : {}), ...(d.sureHit ? { sureHit: true } : {}), ...(d.damageTaken ? { damageTaken: d.damageTaken } : {}), ...(d.damageDealt ? { damageDealt: d.damageDealt } : {}) };
}
/** v27.4 턴 순서: 선공 장치가 있으면 속도와 무관하게 먼저. 둘 다 없으면 속도 비교(같으면 a). */
export function actsFirst(a: Fighter, b: Fighter) {
    if (!!a.firstStrike !== !!b.firstStrike) return !!a.firstStrike;
    return fighterSpeed(a) >= fighterSpeed(b);
}
type DurationStatus = 'weaken' | 'silence' | 'slow' | 'haste' | 'corrode';
type ImmuneStatus = keyof NonNullable<StatusEffects['immune']>;
/** 상태이상이 끝나면 같은 상태이상에 잠시 면역이 됩니다(가속은 자기 버프라 제외). */
function grantImmunity(effects: StatusEffects, key: ImmuneStatus) {
    (effects.immune ??= {})[key] = STATUS_TUNING.immuneTurns[key];
}
function consumeStatus(effects: StatusEffects, key: DurationStatus) {
    const remaining = effects[key] || 0;
    if (remaining <= 0)
        return false;
    if (remaining === 1) {
        delete effects[key];
        if (key !== 'haste') grantImmunity(effects, key);
    }
    else
        effects[key] = remaining - 1;
    return true;
}
/** 자기 행동마다 면역 턴을 1씩 줄입니다. */
function tickImmunity(effects: StatusEffects) {
    if (!effects.immune) return;
    for (const key of Object.keys(effects.immune) as ImmuneStatus[]) {
        const left = (effects.immune[key] || 0) - 1;
        if (left > 0) effects.immune[key] = left; else delete effects.immune[key];
    }
    if (!Object.keys(effects.immune).length) delete effects.immune;
}
const ENEMY_STATUS: Record<string, ImmuneStatus> = { stun: 'stun', bleed: 'bleed', poison: 'poison', burn: 'burn', weaken: 'weaken', silence: 'silence', slow: 'slow', corrode: 'corrode' };
/** 상대에게 이미 걸려 있는 상태이상(중첩형 중독은 더 쌓을 수 있으므로 제외). */
function alreadyAfflicted(b: Fighter, sk: { effect?: string }) {
    const key = sk.effect ? ENEMY_STATUS[sk.effect] : undefined;
    if (!key) return false;
    if (key === 'stun') return b.stun > 0;
    if (key === 'bleed') return !!b.effects?.dot;
    if (key === 'poison') return false; // 중독은 계속 쌓입니다.
    if (key === 'burn') return (b.effects?.burn?.stacks || 0) >= STATUS_TUNING.burnMaxStacks; // 화상은 최대 중첩까지 쌓습니다.
    return (b.effects?.[key] || 0) > 0;
}
const isImmune = (b: Fighter, key: ImmuneStatus) => (b.effects?.immune?.[key] || 0) > 0;
/** v3.5 상태이상 저항이 막는 상태이상과 표시 이름. */
const RESISTABLE = new Set(['stun', 'bleed', 'poison', 'burn', 'weaken', 'silence', 'slow', 'corrode']);
const RESIST_LABELS: Record<string, string> = { stun: '기절', bleed: '출혈', poison: '중독', burn: '화상', weaken: '약화', silence: '침묵', slow: '감속', corrode: '부식' };
function extendStatus(effects: StatusEffects, key: DurationStatus, turns: number) {
    effects[key] = Math.max(effects[key] || 0, turns);
}
const DAMAGE_WORD = { physical: '물리', magic: '마법', split: '복합', fixed: '고정' } as const;
/** v3.54 이 전투에서 처음 거는 지속 피해면 true를 돌려주고 표시합니다(첫 틱 즉시 적용은 전투당 한 번). */
const opens = (b: Fighter, key: 'bleed' | 'poison' | 'burn') => { const fx = (b.effects ??= {}); if (fx.opened?.[key]) return false; (fx.opened ??= {})[key] = true; return true; };
/** v3.54 지속 피해의 체력 비례분: 틱 때 현재 체력 × hpRatio. hpRatio가 없는 옛 효과는 저장된 고정값(legacy)을 씁니다. */
const hpPart = (current: number, hpRatio: number | undefined, legacy: number | undefined) => hpRatio === undefined ? (legacy || 0) : Math.floor(Math.max(0, current) * hpRatio);
/** v3.191 지속 피해 체력 비례분의 기준 체력: 현재 체력, 상한(dotHpCap)이 있으면 그 아래로. 월드보스 소환 단계가 체력을 올려도 지속 피해는 1단계 체력 기준입니다. */
const dotHp = (f: Pick<Fighter, 'hp' | 'dotHpCap'>) => f.dotHpCap ? Math.min(f.hp, f.dotHpCap) : f.hp;
export const swarmDotShare = (swarm?: number) => swarm && swarm > 1 ? 1 / Math.sqrt(swarm) : 1;
/** v27.75 화면에 보여 주는 타격 수치: 계산된 피해(raw). 남은 체력에 막힌 실제 감소량(value)은 규칙에만 씁니다. */
export const shownHit = (h: Pick<CombatHit, 'value' | 'raw'>) => h.raw ?? h.value;
/** 타격 기록: 실제 감소량과 다를 때만 계산 피해(raw)를 함께 적습니다. */
const hitRecord = (kind: CombatHit['kind'], actual: number, computed: number, critical: boolean, superCritical = false): CombatHit => ({ kind, value: actual, ...(computed !== actual ? { raw: computed } : {}), critical, miss: false, ...(superCritical ? { superCritical: true } : {}) });
/** 본타·추가타를 한 번씩만 적고, 추가타가 있을 때만 합계를 붙입니다. 수치는 계산된 피해(shownHit)입니다. */
function describeHits(ev: Pick<CombatEvent, 'hits' | 'total' | 'damageType'>) {
    const word = DAMAGE_WORD[ev.damageType];
    if (!ev.hits.length) return '피해 없음';
    if (ev.hits.every(h => h.miss)) return '빗나감';
    if (ev.hits.length === 1) return `${ev.total} ${word} 피해`;
    const part = (h: CombatHit) => h.miss ? '빗나감' : `${shownHit(h)}${h.superCritical ? ' [극 치명타]' : h.critical ? ' [치명타]' : ''}`;
    return [`본타 ${part(ev.hits[0])}`, ...ev.hits.slice(1).map((h, i) => `추가타${ev.hits.length > 2 ? ` ${i + 1}` : ''} ${part(h)}`), `합계 ${ev.total} ${word} 피해`].join(' · ');
}
/** v3.151 자기 버프: 옛 세이브의 가속(effects.haste 턴 수)을 buffs.haste로 옮기고, 살아 있는 버프 목록을 돌려줍니다. */
function buffsOf(effects: StatusEffects | undefined) {
    if (!effects) return [];
    if (effects.haste) { grantBuff(effects, { id: 'haste', name: '가속', turns: effects.haste, speedMultiplier: 1 + STATUS_TUNING.hasteMultiplier }); delete effects.haste; }
    return Object.entries(effects.buffs || {}).filter(([, b]) => b.turns > 0);
}
/** 같은 id의 버프가 있으면 더 긴 쪽으로 갱신합니다(효과는 새 값). */
export function grantBuff(effects: StatusEffects, buff: { id: string; name?: string; turns: number; stats?: Partial<Stats>; speedMultiplier?: number; damageMultiplier?: number }) {
    const buffs = (effects.buffs ??= {}), cur = buffs[buff.id];
    buffs[buff.id] = { turns: Math.max(buff.turns, cur?.turns || 0), ...(buff.name ? { name: buff.name } : {}), ...(buff.stats ? { stats: buff.stats } : {}), ...(buff.speedMultiplier ? { speedMultiplier: buff.speedMultiplier } : {}), ...(buff.damageMultiplier ? { damageMultiplier: buff.damageMultiplier } : {}) };
}
/** v3.158 접신(아크) · v3.163 파이널 피규레이션(카이저): 장착한 패시브 중 가장 센 변신의 need에 충전이 닿으면 충전을 비우고 자기 버프에 들어갑니다. */
function triggerSpectre(f: Fighter, notes: string[], ev: CombatEvent) {
    const spectre = f.skills.map(id => skillById(id)?.spectre).filter((x): x is NonNullable<Skill['spectre']> => !!x).sort((x, y) => y.damageMultiplier - x.damageMultiplier)[0];
    const effects = (f.effects ??= {});
    if (!spectre || (effects.charge || 0) < spectre.need) return;
    const name = spectre.name ?? '접신';
    grantBuff(effects, { id: 'spectre', name, turns: spectre.turns, damageMultiplier: spectre.damageMultiplier, speedMultiplier: spectre.speedMultiplier, stats: spectre.stats });
    effects.charge = 0; notes.push(`${name} ${spectre.turns}턴`); ev.statuses.push({ id: 'spectre', turns: spectre.turns, onSelf: true });
}
/** 자기 행동마다 버프 턴을 하나씩 줄이고 끝난 버프를 지웁니다. */
function tickBuffs(effects: StatusEffects) {
    for (const [id, b] of buffsOf(effects)) { b.turns -= 1; if (b.turns <= 0) delete effects.buffs![id]; }
    if (effects.buffs && !Object.keys(effects.buffs).length) delete effects.buffs;
}
/** 전투 능력치에 살아 있는 버프의 고정값을 더합니다. */
function withBuffs(stats: CombatStats, effects: StatusEffects | undefined): CombatStats {
    const live = buffsOf(effects); if (!live.length) return stats;
    const out = { ...stats } as CombatStats & Record<string, number>;
    for (const [, b] of live) for (const [k, v] of Object.entries(b.stats || {})) if (typeof v === 'number') out[k] = (out[k] || 0) + v;
    return out;
}
/** 행동 순서·명중 보정·연속 행동 확률에 쓰는 속도. 가속·감속이 반영됩니다. */
export function fighterSpeed(f: Fighter) {
    const base = withBuffs(normalizeStats(f.stats), f.effects).speed;
    const slowed = (f.effects?.slow || 0) > 0, corroded = (f.effects?.corrode || 0) > 0;
    const buffSpeed = buffsOf(f.effects).reduce((m, [, b]) => m * (b.speedMultiplier || 1), 1);
    const multiplier = (slowed ? 1 - STATUS_TUNING.slowMultiplier : 1) * (corroded ? 1 - STATUS_TUNING.corrodeSpeed : 1) * buffSpeed;
    return Math.max(1, base * multiplier);
}
/** 연속 행동 확률: min(1, max(0, 계수 × log2(내 속도 / 상대 속도))). 같거나 느리면 0. */
export function chainChance(a: Fighter, b: Fighter) {
    const sa = fighterSpeed(a), sb = fighterSpeed(b);
    // v3.12 연속 행동 가산(칠흑 장신구)은 속도와 무관하게 더합니다.
    const bonus = a.stats.chainBonus || 0;
    return Math.min(1, Math.max(0, (sa > sb ? BALANCE.chainCoefficient * Math.log2(sa / sb) : 0) + bonus));
}
/**
 * 한 전투원의 턴: 행동한 뒤 연속 행동 확률로 다시 행동합니다(연쇄). 턴당 최대 chainMaxActions번, 어느 쪽이든 쓰러지면 즉시 멈춥니다.
 * 추가 행동도 strike 그대로의 온전한 행동입니다. 확률이 0이면 난수를 쓰지 않아 기존과 같은 난수 순서를 유지합니다.
 * onAction은 행동마다 (로그 문장, 구조화된 결과)로 불립니다. 두 번째 행동부터 문장 끝에 '연속 N'을 붙입니다.
 */
export function actTurn(a: Fighter, b: Fighter, rng: () => number, onAction: (text: string, event: CombatEvent) => void) {
    for (let chain = 1; ; chain++) {
        const events: CombatEvent[] = [];
        const text = act(a, b, rng, events, false, chain > 1), ev = events[0];
        if (chain > 1) ev.chain = chain;
        onAction(chain > 1 ? `${text} · 연속 ${chain}` : text, ev);
        // v25.5 동시 시전: 첫 줄에 적힌 기술들을 같은 행동 안에서 이어서 씁니다(행동 시작 효과 없이).
        if (ev?.multicast?.ids) for (const [i, id] of ev.multicast.ids.entries()) {
            if (a.hp <= 0 || b.hp <= 0) break;
            const more: CombatEvent[] = [];
            const t = act(a, b, rng, more, false, chain > 1, { id, index: i + 1, count: ev.multicast.count });
            onAction(`${t} · 동시 시전 ${i + 2}/${ev.multicast.count}`, more[0]);
        }
        // v3.86 추가 판정 · 각성기(턴의 첫 행동만, 연속 행동은 턴을 세지 않음).
        afterAction(a, b, rng, ev, chain === 1, onAction);
        // v25 확정 추가 행동(선행·찰): 연속 행동 횟수와 별개로 한 번 더 행동합니다. 추가 행동에서 다시 생기지는 않습니다. v3.86 각성기에는 한 턴으로 셉니다.
        if (ev?.extraTurn && a.hp > 0 && b.hp > 0) {
            const extra: CombatEvent[] = [];
            const t2 = act(a, b, rng, extra, true);
            onAction(`${t2} · 추가 행동`, extra[0]);
            afterAction(a, b, rng, extra[0], true, onAction);
        }
        if (a.hp <= 0 || b.hp <= 0 || chain >= BALANCE.chainMaxActions) return;
        const p = chainChance(a, b);
        if (p <= 0 || (p < 1 && rng() >= p)) return;
    }
}
/**
 * v25 無: 쓰러질 피해를 받으면 체력 1로 버팁니다(전투당 charges번). 버틸 때마다 최대 체력 × heal을 되찾습니다.
 * 직접 피해·추가타·지속 피해·반격 어느 것으로도 체력이 1 아래로 내려가지 않습니다. self는 행동한 쪽이 자기 지속 피해·반격을 버틴 경우입니다.
 */
function endure(f: Fighter, sf: CombatStats, notes: string[], ev: CombatEvent, self = false) {
    if (f.hp > 0) return false;
    const id = f.skills.find(x => skillById(x)?.lastStand), stand = id ? skillById(id)!.lastStand! : f.jobStand;
    if (!stand) return false;
    f.effects ??= {};
    // v25.14 無는 함께 새긴 글자(같은 직업의 seal 액티브) 수에 비례합니다. 혼자 새기면 전투당 1번, 회복 없음. 여섯 글자를 모두 새겨야 원래 횟수·회복.
    const owner = id ? skillById(id)! : undefined, sealsAll = owner ? SKILLS.filter(x => x.job === owner.job && x.seal).length : 0, sealsOn = owner ? f.skills.filter(x => skillById(x)?.seal && skillById(x)?.job === owner.job).length : 0;
    const weave = sealsAll ? sealsOn / sealsAll : 1;
    const perLevel = Number((stand as { chargesPerLevel?: number }).chargesPerLevel || 0);
    const used = f.effects.lastStand || 0, full = stand.charges + Math.floor(perLevel * (id ? f.mastery?.[id] || 0 : 0)), charges = Math.max(1, Math.round(full * weave));
    if (used >= charges) return false;
    f.effects.lastStand = used + 1;
    const heal = Math.max(0, Math.min(sf.hp - 1, Math.floor(sf.hp * (stand.heal || 0) * weave)));
    f.hp = 1 + heal;
    ev.endured = { heal, ...(self ? { self } : {}) };
    notes.push(`${owner?.name ?? '無'} · 체력 1로 버팀 (${f.effects.lastStand}/${charges})${heal > 0 ? ` · 체력 ${heal} 회복` : ''}`);
    return true;
}
/**
 * v3.84 방어 피해식 비교(docs/concept.md 11.9 5단계). 기본은 지금 식(legacy)이고, 측정 스크립트만 바꿔 씁니다.
 * - legacy: 피해 × 100 / (100 + 방어 × 2)
 * - ratio(B안, 공격 대비): 피해 × 공격 / (공격 + c × 방어). 공격 = 때리는 쪽의 물리 또는 마법 공격.
 * - constant(C안, 기준값 키우기): 피해 × k / (k + 방어 × 2)
 */
export type DefenseModel = { kind: 'legacy' } | { kind: 'ratio'; c: number } | { kind: 'constant'; k: number };
let defenseModel: DefenseModel = { kind: 'legacy' };
export function setDefenseModel(model: DefenseModel) { defenseModel = model; }
export function mitigate(raw: number, defense: number, attackStat: number) {
    const m = defenseModel;
    if (m.kind === 'ratio') { const a = Math.max(1, attackStat); return raw * a / (a + m.c * defense); }
    if (m.kind === 'constant') return raw * m.k / (m.k + defense * 2);
    return raw * 100 / (100 + defense * 2);
}
/** v3.86 각성기의 실패한 판정 수를 적는 재사용 대기 칸: '~' + 기술 id. */
const AWAKEN_PITY = '~';
const isAwaken = (id: string) => id.startsWith(AWAKEN_PITY) || !!skillById(id)?.awaken;
/** 모험가 스킬 또는 몬스터 스킬. */
const anySkillById = (id: string) => skillById(id) ?? enemySkillById(id);
/** 기술의 실제 효과(숙련·계보 밖 효율 반영). */
function skillOf(a: Fighter, id: string) {
    const base = anySkillById(id);
    if (!base) return undefined;
    // v3.104 effectiveSkill은 캐시된 객체를 돌려주므로 복사본에 배율을 곱합니다.
    const e = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0);
    return outsider(base, a, { ...e, multiplier: e.multiplier * signatureScale(base, a.job) });
}
/** v3.132 계보 밖에서 쓰는 5차 기술: outsiderChance가 있으면 발동률을 그만큼 낮춥니다(포이즌 노바). */
function outsider(base: Skill, a: Fighter, sk: Skill): Skill {
    return base.outsiderChance !== undefined && signatureScale(base, a.job) < 1 ? { ...sk, chance: sk.chance * base.outsiderChance } : sk;
}
/**
 * 편성 순서대로 액티브 발동 판정을 굴려 처음 성공한 기술을 고릅니다. from부터 봅니다(추가 판정은 앞서 고른 기술 아래부터).
 * 각성기는 따로 굴리므로 여기서 빼고, 쓸 수 없는 상황(대기·조건·마나·이미 걸린 상태이상·면역)은 굴리지 않고 넘어갑니다.
 */
function pickActive(a: Fighter, b: Fighter, sa: CombatStats, sb: CombatStats, rng: () => number, blocked: Set<string>, bonusAction: boolean, from = 0) {
    for (const id of a.skills.slice(from)) {
        const base = anySkillById(id);
        if (!base || base.type !== 'active' || base.awaken || blocked.has(id))
            continue;
        const e = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0), candidate = outsider(base, a, { ...e, multiplier: e.multiplier * signatureScale(base, a.job) });
        // v21: 회복 기술은 체력이 가득 차도 시도합니다(회복이 필요 없으면 아래에서 피해가 줄어듦).
        if (candidate.condition === 'wounded' && a.hp > sa.hp * SKILL_FORMULA.woundedThreshold)
            continue;
        if (candidate.condition === 'healthyTarget' && b.hp < sb.hp * .6)
            continue;
        if (candidate.condition === 'afflicted' && !(a.effects?.dot || a.effects?.poison || a.effects?.burn || a.effects?.slow || a.effects?.weaken || a.effects?.corrode))
            continue;
        if ((a.mana ?? 0) < (candidate.manaCost || 0))
            continue;
        // v3.143 전탄발사: 충전 중첩이 모자라면 굴리지 않습니다.
        if (candidate.chargeNeed && (a.effects?.charge || 0) < candidate.chargeNeed)
            continue;
        // v3.158 접신 중에만 나가는 기술(아크 인피니티 스펠).
        if (candidate.requiresBuff && !((a.effects?.buffs?.[candidate.requiresBuff]?.turns || 0) > 0))
            continue;
        // 이미 걸린 상태이상은 다시 걸지 않고 다음 기술로 넘어갑니다. 면역 중인 상대에게 상태이상 전용 기술은 쓰지 않습니다.
        if (alreadyAfflicted(b, candidate))
            continue;
        if (candidate.timeRewind && a.effects?.timeUsed)
            continue;
        if (bonusAction && candidate.extraTurn)
            continue;
        if (candidate.statusOnly && candidate.effect && ENEMY_STATUS[candidate.effect] && isImmune(b, ENEMY_STATUS[candidate.effect]))
            continue;
        if (rng() < candidate.chance)
            return candidate;
    }
    return undefined;
}
/** v3.86 행동 뒤에 붙는 줄: 추가 판정(액티브가 발동한 행동)과, 턴을 세는 행동(턴의 첫 행동·확정 추가 행동)이면 각성기. */
function afterAction(a: Fighter, b: Fighter, rng: () => number, first: CombatEvent | undefined, turn: boolean, onAction: (text: string, event: CombatEvent) => void) {
    followUps(a, b, rng, first, onAction);
    if (turn) awaken(a, b, rng, first, onAction);
}
/** v3.86 추가 판정: 액티브가 발동한 행동에서 그 아래 액티브로 단계 수만큼 더 굴려, 성공하면 줄어든 위력으로 바로 씁니다. 동시 시전 묶음으로 나간 행동에는 굴리지 않고, 대신 v3.87부터 묶음 최대 개수가 단계만큼 늘어납니다. */
function followUps(a: Fighter, b: Fighter, rng: () => number, first: CombatEvent | undefined, onAction: (text: string, event: CombatEvent) => void) {
    const R = SKILL_FORMULA.extraRoll, rolls = Math.min(R.power.length, a.extraRolls || 0);
    if (!rolls || !first?.skillId || first.multicast || a.hp <= 0 || b.hp <= 0) return;
    let from = a.skills.indexOf(first.skillId) + 1;
    for (let i = 0; i < rolls && from > 0 && a.hp > 0 && b.hp > 0; i++) {
        const sa = normalizeStats(a.stats), sb = normalizeStats(b.stats);
        // 확정 추가 행동 기술은 추가 판정에서 쓰지 않습니다(추가 행동이 붙지 않으므로).
        const next = pickActive(a, b, sa, sb, rng, new Set(Object.keys(a.cooldowns).filter(k => a.cooldowns[k] > 0)), true, from);
        if (!next) return;
        from = a.skills.indexOf(next.id) + 1;
        const more: CombatEvent[] = [];
        const text = act(a, b, rng, more, false, false, { id: next.id, index: i + 1, count: 1, kind: 'followUp', power: R.power[i] });
        onAction(`${text} · 추가 판정${rolls > 1 ? ` ${i + 1}` : ''} (위력 ${Math.round(R.power[i] * 100)}%)`, more[0]);
    }
}
/**
 * v3.86 각성기: 턴마다 대기를 1 줄이고, 대기가 끝난 각성기를 편성 순서대로 굴려 한 턴에 perTurn개(기본 1)까지 씁니다.
 * 처음(대기 칸이 비어 있으면)은 awaken.start 턴을 기다립니다. 실패하면 다음 판정 확률에 기본 발동률을 더하고(최대 100%), 쓰면 초기화합니다.
 * 기절·침묵인 턴과 마나가 모자란 턴은 굴리지 않습니다(대기는 줄어듦).
 */
function awaken(a: Fighter, b: Fighter, rng: () => number, first: CombatEvent | undefined, onAction: (text: string, event: CombatEvent) => void) {
    let fired = 0;
    const limit = a.awakenPerTurn ?? SKILL_FORMULA.awaken.perTurn;
    for (const id of a.skills) {
        const base = skillById(id);
        if (!base?.awaken) continue;
        if (a.cooldowns[id] === undefined) a.cooldowns[id] = base.awaken.start;
        if (a.cooldowns[id] > 0) { a.cooldowns[id]--; continue; }
        if (fired >= limit || a.hp <= 0 || b.hp <= 0 || first?.stunned || first?.silenced) continue;
        const sk = skillOf(a, id)!;
        if ((a.mana ?? 0) < (sk.manaCost || 0)) continue;
        // v3.143 전탄발사: 충전 중첩이 chargeNeed에 닿을 때까지 기다립니다(대기 0에서 멈춰 있고, 실패로 세지 않음).
        if (sk.chargeNeed && (a.effects?.charge || 0) < sk.chargeNeed) continue;
        if (sk.requiresBuff && !((a.effects?.buffs?.[sk.requiresBuff]?.turns || 0) > 0)) continue;
        const key = AWAKEN_PITY + id, misses = a.cooldowns[key] || 0;
        if (rng() >= Math.min(1, sk.chance * (1 + misses))) { a.cooldowns[key] = misses + 1; continue; }
        delete a.cooldowns[key];
        fired++;
        const more: CombatEvent[] = [];
        const text = act(a, b, rng, more, false, false, { id, index: 0, count: 1, kind: 'awaken' });
        // 각성기로 쓰러뜨리면 대기를 kill턴만 둡니다(짧은 사냥에서 남는 피해로 버려지는 몫을 돌려줌).
        if (b.hp <= 0) a.cooldowns[id] = Math.min(a.cooldowns[id] ?? 0, SKILL_FORMULA.awaken.kill);
        onAction(`${text} · 각성`, more[0]);
    }
}
/**
 * Shared PvE/PvP action. Recovery, status, conditional proc, MP, accuracy, defense and crit.
 * v3.86 한 행동에 이어 추가 판정과 각성기(턴의 첫 행동·확정 추가 행동이면)까지 처리합니다. 이어진 줄의 결과는 events에 차례로 쌓입니다.
 * 연속 행동(chained)은 턴을 세지 않습니다. 점검 도구는 이 함수를 한 턴으로 씁니다.
 */
export function strike(a: Fighter, b: Fighter, rng = Math.random, events?: CombatEvent[], bonusAction = false, chained = false, forced?: ForcedCast) {
    const list = events ?? [], start = list.length;
    const text = act(a, b, rng, list, bonusAction, chained, forced);
    if (!forced) afterAction(a, b, rng, list[start], !chained, (_, ev) => list.push(ev));
    return text;
}
/** v25.5 동시 시전 묶음의 2번째 이후 줄: 행동 시작 효과(회복·지속 피해·대기 감소·기절)를 건너뛰고 정해진 기술을 바로 씁니다.
 * v3.86 kind: 'awaken'(각성기) · 'followUp'(추가 판정, power = 위력 배율)도 같은 방식으로 씁니다. */
export type ForcedCast = { id: string; index: number; count: number; kind?: 'awaken' | 'followUp'; power?: number };
function act(a: Fighter, b: Fighter, rng = Math.random, events?: CombatEvent[], bonusAction = false, chained = false, forced?: ForcedCast) {
    a.effects ??= {};
    b.effects ??= {};
    // v3.151 자기 버프(가속 포함)의 고정값을 얹은 전투 능력치.
    const sa = withBuffs(normalizeStats(a.stats), a.effects), sb = withBuffs(normalizeStats(b.stats), b.effects);
    if (!forced) a.mana = Math.min(sa.mana, (a.mana ?? sa.mana) + sa.manaRegen);
    const notes: string[] = [];
    const ev: CombatEvent = { actor: a.name, skillName: '기본 공격', damageType: 'physical', hits: [], total: 0, healed: 0, drained: 0, statuses: [] };
    const emit = (text: string) => { events?.push(ev); return text; };
    // 턴당 체력 회복: 마나처럼 행동 시작 때 되찾습니다(연속·추가 행동 포함).
    if (!forced && sa.hpRegen > 0 && a.hp > 0 && a.hp < sa.hp) { ev.regen = Math.min(sa.hp - a.hp, sa.hpRegen); a.hp += ev.regen; }
    // v3.172 마나 치유(라라): 행동 시작 때 체력이 모자라면 최대 마나 × spend를 써서 최대 체력 × heal을 되찾습니다(마나가 모자라면 안 함, 여러 개면 heal이 큰 것 하나).
    if (!forced && a.hp > 0 && a.hp < sa.hp) {
        const mend = a.skills.map(id => skillById(id)?.manaMend).filter((m): m is NonNullable<Skill['manaMend']> => !!m).sort((x, y) => y.heal - x.heal)[0];
        const cost = mend ? Math.ceil(sa.mana * mend.spend) : 0;
        if (mend && cost > 0 && (a.mana ?? 0) >= cost) {
            const healed = Math.min(sa.hp - a.hp, Math.floor(sa.hp * mend.heal));
            if (healed > 0) { a.mana = (a.mana ?? 0) - cost; a.hp += healed; ev.mend = { mana: cost, value: healed }; notes.push(`마나 치유 ${healed}`); }
        }
    }
    if (!forced) tickImmunity(a.effects);
    if (!forced && a.effects.dot) {
        const dot = a.effects.dot;
        const dotHit = dot.damage + hpPart(dotHp(a), dot.hpRatio, 0);
        a.hp = Math.max(0, a.hp - dotHit);
        notes.push(`${dot.name} ${dotHit}`);
        ev.dot = { name: dot.name, value: dotHit };
        dot.turns--;
        if (dot.turns <= 0) {
            delete a.effects.dot;
            grantImmunity(a.effects, 'bleed');
        }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) {
            ev.defeated = true;
            return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`);
        }
    }
    // v27.19 중독 틱: 중첩 × (중첩당 피해 + 최대 체력 비례). 출혈과 별개로 함께 들어갑니다.
    if (!forced && a.effects.poison && a.hp > 0) {
        const poison = a.effects.poison;
        const hit = (poison.perStack + hpPart(dotHp(a), poison.hpRatio, poison.hpTick)) * poison.stacks;
        a.hp = Math.max(0, a.hp - hit);
        notes.push(`중독 ×${poison.stacks} ${hit}`);
        ev.dot = ev.dot ? { name: `${ev.dot.name}·중독`, value: ev.dot.value + hit } : { name: `중독 ×${poison.stacks}`, value: hit };
        poison.turns--;
        if (poison.turns <= 0) { delete a.effects.poison; grantImmunity(a.effects, 'poison'); }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) { ev.defeated = true; return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`); }
    }
    // v27.48 화상 틱: 중독과 같은 방식(중첩 × (중첩당 피해 + 최대 체력 비례)). 출혈·중독과 함께 들어갑니다.
    if (!forced && a.effects.burn && a.hp > 0) {
        const burn = a.effects.burn;
        const hit = (burn.perStack + hpPart(dotHp(a), burn.hpRatio, burn.hpTick)) * burn.stacks;
        a.hp = Math.max(0, a.hp - hit);
        notes.push(`화상 ×${burn.stacks} ${hit}`);
        ev.dot = ev.dot ? { name: `${ev.dot.name}·화상`, value: ev.dot.value + hit } : { name: `화상 ×${burn.stacks}`, value: hit };
        burn.turns--;
        if (burn.turns <= 0) { delete a.effects.burn; grantImmunity(a.effects, 'burn'); }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) { ev.defeated = true; return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`); }
    }
    const attackSpeed = fighterSpeed(a), targetSpeed = fighterSpeed(b);
    const weakened = forced ? (a.effects.weaken || 0) > 0 : consumeStatus(a.effects, 'weaken');
    const silenced = forced ? false : consumeStatus(a.effects, 'silence');
    if (!forced) { consumeStatus(a.effects, 'slow'); consumeStatus(a.effects, 'corrode'); tickBuffs(a.effects); }
    if (silenced) {
        notes.push('침묵 중');
        ev.silenced = true;
    }
    const blocked = new Set(Object.keys(a.cooldowns).filter(k => a.cooldowns[k] > 0));
    if (!forced) for (const k of Object.keys(a.cooldowns))
        if (!isAwaken(k)) a.cooldowns[k] = Math.max(0, a.cooldowns[k] - 1);
    if (!forced && a.stun > 0) {
        a.stun--;
        if (a.stun === 0) grantImmunity(a.effects, 'stun');
        ev.stunned = true;
        return emit(`${a.name}: 기절로 행동 불가.${notes.length ? ' ' + notes.join(' · ') : ''}`);
    }
    let chosen: Skill | undefined;
    if (forced) {
        chosen = skillOf(a, forced.id);
        if (chosen && forced.power) chosen.multiplier *= forced.power;
    }
    else if (!silenced) chosen = pickActive(a, b, sa, sb, rng, blocked, bonusAction);
    // v25.5 동시 시전: 첫 성공이 multicast 기술이면 편성의 다른 multicast 액티브도 각자 발동률로 굴려 함께 나갑니다. 묶음 전체의 가중 마나를 감당할 수 있을 때까지 뒤에서부터 뺍니다.
    const MC = SKILL_FORMULA.multicast;
    let castCount = forced?.count || 1;
    if (chosen?.multicast && !forced) {
        // v3.87 추가 판정 단계만큼 묶음 최대 개수가 늘어납니다(동시 시전으로 나간 행동에는 추가 판정을 따로 굴리지 않음).
        const maxCast = MC.max + Math.min(SKILL_FORMULA.extraRoll.power.length, a.extraRolls || 0);
        const extras: { id: string; mana: number }[] = [];
        for (const id of a.skills) {
            if (id === chosen.id || extras.length + 1 >= maxCast || blocked.has(id)) continue;
            const c = skillOf(a, id);
            if (!c || c.type !== 'active' || !c.multicast || c.awaken || c.statusOnly && c.effect && ENEMY_STATUS[c.effect] && isImmune(b, ENEMY_STATUS[c.effect])) continue;
            if (rng() < c.chance) extras.push({ id, mana: c.manaCost || 0 });
        }
        const manaFor = (n: number) => Math.ceil(((chosen!.manaCost || 0) + extras.slice(0, n - 1).reduce((s, e) => s + e.mana, 0)) * (1 + (n - 1) * MC.manaScale));
        while (extras.length && (a.mana ?? 0) < manaFor(extras.length + 1)) extras.pop();
        if (extras.length) { castCount = extras.length + 1; ev.multicast = { index: 0, count: castCount, ids: extras.map(e => e.id) }; notes.push(`동시 시전 1/${castCount}`); }
    }
    if (forced?.kind === 'awaken') ev.awaken = true;
    else if (forced?.kind === 'followUp') ev.followUp = { index: forced.index, power: forced.power ?? 1 };
    else if (forced) ev.multicast = { index: forced.index, count: forced.count };
    // 마력 평타: 마법 직업은 기본 공격 대신 마법 공격 × 계수의 마법 피해를 줍니다(v25.22부터 확률 없이 항상).
    const arcane = !chosen && sa.arcaneStrike > 0;
    let healed = 0, overheal = 0;
    // 체력이 충분한데 쓴 회복 기술: 회복 직업이 아니면 이번 공격 피해가 줄어듭니다.
    const idleHeal = chosen?.effect === 'heal' && a.hp >= sa.hp * SKILL_FORMULA.healThreshold && !sa.healFocus;
    let burned = 0;
    if (chosen) {
        a.cooldowns[chosen.id] = chosen.cooldown + (castCount - 1) * MC.cooldownStep;
        a.mana = Math.max(0, (a.mana ?? 0) - Math.ceil((chosen.manaCost || 0) * (1 + (castCount - 1) * MC.manaScale)));
        // v3.145 체력 소모: 현재 체력 × hpCost를 바칩니다(1은 남김). 피의 분노가 그만큼 더 세게 반응합니다.
        if (chosen.hpCost) { const pay = Math.min(Math.max(0, a.hp - 1), Math.floor(a.hp * chosen.hpCost)); if (pay > 0) { a.hp -= pay; ev.hpSpent = pay; notes.push(`체력 ${pay.toLocaleString()} 소모`); } }
        // v3.148 마나 연소: 현재 마나 × manaBurn을 태웁니다. 태운 만큼 아래에서 피해 기준값에 더합니다.
        if (chosen.manaBurn) { burned = Math.floor((a.mana ?? 0) * chosen.manaBurn); if (burned > 0) { a.mana = (a.mana ?? 0) - burned; ev.manaBurned = burned; notes.push(`마나 ${burned.toLocaleString()} 연소`); } }
        // v3.151 자기 버프: 쓰면 시전자에게 걸립니다(명중과 무관).
        // v3.155 자기 버프 연장(카데나 메일스트롬): 살아 있는 버프를 모두 N턴 늘립니다.
        if (chosen.extendBuffs) { const live = buffsOf(a.effects); if (live.length) { for (const [, bf] of live) bf.turns += chosen.extendBuffs; notes.push(`자기 버프 ${live.length}개 +${chosen.extendBuffs}턴`); } }
        if (chosen.selfBuff) { grantBuff(a.effects, chosen.selfBuff); notes.push(`${chosen.selfBuff.name ?? chosen.selfBuff.id} ${chosen.selfBuff.turns}턴`); ev.statuses.push({ id: chosen.selfBuff.id, turns: chosen.selfBuff.turns, onSelf: true }); }
        if (chosen.cleanseSelf) { delete a.effects.dot; delete a.effects.poison; delete a.effects.burn; delete a.effects.slow; notes.push('정화'); ev.cleansed = true; }
        if (chosen.wardTurns) {
            delete a.effects.weaken;
            const immune = (a.effects.immune ??= {});
            for (const key of ['stun', 'bleed', 'poison', 'burn', 'weaken', 'silence', 'slow', 'corrode'] as const) immune[key] = Math.max(immune[key] || 0, chosen.wardTurns);
            notes.push(`상태이상 면역 ${chosen.wardTurns}턴`);
        }
        if (chosen.effect === 'heal') {
            const intended = Math.floor(sa.hp * (chosen.healRatio ?? SKILL_FORMULA.healRatio) * (1 + sa.healBonus));
            healed = Math.min(sa.hp - a.hp, intended);
            a.hp += healed;
            // v3.54 힐러(회복 직업)는 넘친 회복량을 적에게 피해로 돌려줍니다(아래에서 overhealDamage 배율로 적용).
            if (sa.healFocus) overheal = intended - healed;
        }
        // v3.198 타임 리와인드: 나만 처음 상태로(체력 · 마나 가득, 재사용 대기 초기화). 상대는 그대로. 전투당 1회.
        if (chosen.timeRewind) {
            a.effects.timeUsed = true;
            a.hp = sa.hp; a.mana = sa.mana;
            for (const k of Object.keys(a.cooldowns)) if (k !== chosen.id && !isAwaken(k)) a.cooldowns[k] = 0;
            notes.push('타임 리와인드 · 나의 시간을 처음으로');
            ev.restored = true;
        }
    }
    // v24.2 도박: 쓸 때마다 피해 배율과 명중을 굴립니다.
    let gambleRoll = 1, gambleAccuracy = 0;
    // v26.6 주사위: 능력치 per마다 1개(최대 max)를 굴려 가장 높은 눈을 배율로(1→최저, 6→최고). 손가락 자르기가 양 끝을 좁힙니다.
    if (chosen?.dice) {
        const count = Math.min(chosen.dice.max, 1 + Math.floor((sa[ATTR_KEY[chosen.dice.attribute]] || 0) / chosen.dice.per));
        const faces = Array.from({ length: count }, () => 1 + Math.floor(rng() * 6));
        gambleRoll = diceMultiplier(chosen.dice, Math.max(...faces), sa.diceTrim || 0);
        notes.push(`주사위 ${faces.map(f => '⚀⚁⚂⚃⚄⚅'[f - 1]).join('')} ×${gambleRoll.toFixed(2)}`);
        ev.gamble = gambleRoll; ev.dice = faces;
    }
    else if (chosen?.gamble) {
        gambleRoll = chosen.gamble.min + rng() * (chosen.gamble.max - chosen.gamble.min);
        if (chosen.gamble.accuracy) gambleAccuracy = (rng() * 2 - 1) * chosen.gamble.accuracy;
        notes.push([chosen.gamble.min !== chosen.gamble.max ? `주사위 ×${gambleRoll.toFixed(2)}` : '주사위', chosen.gamble.accuracy ? `명중 ${gambleAccuracy >= 0 ? '+' : ''}${Math.round(gambleAccuracy * 100)}%p` : ''].filter(Boolean).join(' · '));
        ev.gamble = gambleRoll;
    }
    // v24.2 올인: 현재 체력 일부와 남은 마나 전부를 겁니다(체력은 1 남김).
    let allInBonus = 0;
    if (chosen?.allIn) {
        const spentHp = Math.max(0, Math.min(a.hp - 1, Math.floor(a.hp * chosen.allIn.hpRatio))), spentMana = Math.max(0, a.mana || 0);
        a.hp -= spentHp; a.mana = 0;
        allInBonus = spentHp * chosen.allIn.hpScale + spentMana * chosen.allIn.manaScale;
        if (chosen.allIn.heal && spentMana > 0) { const h = Math.min(sa.hp - a.hp, Math.floor(spentMana * chosen.allIn.heal)); a.hp += h; healed += h; }
        notes.push(`올인 · 체력 ${spentHp} · 마나 ${Math.floor(spentMana)}`);
    }
    // v24.2 골드 투척: 보유 골드 일부를 던져 피해에 더합니다.
    if (chosen?.goldSpend && (a.gold || 0) > 0) {
        // v3.157 상한: 절대값 cap과 기준 공격력 × capAttack 중 작은 쪽. 골드가 아무리 많아도 공격력에 맞는 만큼만 태우고, 새 생의 저레벨에서도 수십 배가 되지 않습니다.
        const baseStat = chosen.damageType === 'magic' || chosen.damageType === 'fixed' && chosen.baseStat === 'magic' ? sa.magic : sa.attack;
        const limit = Math.min(chosen.goldSpend.cap ?? Infinity, chosen.goldSpend.capAttack ? Math.max(1, Math.floor(baseStat * chosen.goldSpend.capAttack)) : Infinity);
        const spent = Math.min(limit, Math.floor(a.gold! * chosen.goldSpend.ratio));
        if (spent > 0) { a.gold! -= spent; allInBonus += spent * chosen.goldSpend.scale; notes.push(`골드 ${spent.toLocaleString()} 투척`); }
    }
    // v3.140 루미너스 액티브는 모두 damageType physical · scaling swap(마법 계수 → 물리 피해)으로 선언합니다.
    const magical = arcane || chosen?.damageType === 'magic' || !chosen && !!a.magicBasic;
    // v3.143 고정 피해: 방어를 전혀 받지 않습니다(메카닉 전탄발사). 명중은 마법처럼(회피 절반 · 속도 페널티 없음), 치명은 그대로 판정합니다.
    const fixed = chosen?.damageType === 'fixed';
    // v26.7 마법 공격은 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다(물리 빌드와의 차별점).
    const hit = chosen?.sureHit || a.sureHit ? 1 : hitChance({ ...sa, speed: attackSpeed, accuracy: sa.accuracy + (chosen?.accuracyBonus || 0) + gambleAccuracy }, { ...sb, speed: targetSpeed }, magical || fixed);
    const splitBasic = !chosen && !!a.splitBasic;
    const label = chosen?.name || (arcane ? '마력 평타' : splitBasic ? '복합 평타' : '기본 공격');
    // v26.3 순수 회복 기술: 명중 판정 없이 회복만 하고 끝납니다.
    const healOnly = !!chosen?.healOnly;
    const landed = healOnly ? true : rng() < hit;
    const split = chosen?.damageType === 'split' || splitBasic;
    // 올라운드 밸런스는 배분 능력치로 만든 원시 피해만 사용하고 일반 공격력을 더하지 않습니다.
    let base = arcane ? sa.magic * (SKILL_FORMULA.arcaneStrikeRatio + sa.arcaneRatioBonus) : chosen?.scaling === 'harmony' ? (sa.harmony || 0) : chosen?.scaling === 'dual' ? (sa.attack + sa.magic) / 2 : chosen?.scaling === 'swap' ? (magical ? sa.attack : sa.magic) : chosen?.scaling === 'arcane' ? sa.magic * (SKILL_FORMULA.arcaneStrikeRatio + sa.arcaneRatioBonus) : chosen?.scaling === 'attr' ? 0 : splitBasic ? (sa.attack + sa.magic) / 2 : magical || chosen?.baseStat === 'magic' ? sa.magic : sa.attack;
    // 방어 비례 피해: 수호 계열(방어 친화도 1)에서 온전히, 다른 직업이 계승하면 일부만 발휘됩니다.
    if (chosen?.scaling === 'defense')
        base += sa.defense * (chosen.scalingRatio ?? 1) * sa.guardAffinity;
    // v3.143 전탄발사: 쌓인 충전 중첩을 모두 소모해 중첩당 chargeBonus만큼 피해를 키웁니다(추가타 · 지속 피해 기준값에도 적용).
    const targetWeakened = (b.effects.weaken || 0) > 0;
    // v3.176 콤보 피해(아란): 지금 중첩 × comboBonus. 중첩을 소모하는 기술은 아래에서 대신 chargeBonus를 씁니다.
    const comboBonus = Math.max(0, ...a.skills.map(id => skillById(id)?.comboBonus || 0)), comboStacks = comboBonus && !chosen?.chargeNeed ? Math.min(SKILL_FORMULA.charge.max, a.effects.charge || 0) : 0;
    const comboBoost = 1 + comboStacks * comboBonus;
    if (comboStacks) notes.push(`콤보 ${comboStacks}`);
    // v3.176 회피 반격 소모(듀얼블레이드): 명중하면 충전을 모두 소모해 중첩당 추가타를 더합니다.
    const chargeHitSpent = chosen?.chargeHits && landed ? Math.min(SKILL_FORMULA.charge.max, a.effects.charge || 0) : 0;
    if (chargeHitSpent) { a.effects.charge = 0; notes.push(`반격 ${chargeHitSpent}중첩 방출`); }
    if (chosen?.chargeNeed && landed) {
        const spent = Math.min(SKILL_FORMULA.charge.max, a.effects.charge || 0);
        a.effects.charge = 0;
        base *= 1 + spent * (chosen.chargeBonus || 0);
        notes.push(`충전 ${spent}중첩 방출`);
    }
    // v3.145 피의 분노(데몬슬레이어 패시브): 잃은 체력 비율 × bloodRage 합만큼 기준값이 커집니다(체력 소모 뒤 기준).
    const rage = a.skills.reduce((n, id) => n + (skillById(id)?.bloodRage || 0), 0);
    if (rage > 0 && sa.hp > 0) { const missing = Math.min(1, Math.max(0, 1 - a.hp / sa.hp)); if (missing > 0) { base *= 1 + rage * missing; notes.push(`피의 분노 +${Math.round(rage * missing * 100)}%`); } }
    // v3.148 마나 연소(아델): 태운 마나 × burnScale을 기준값에 더합니다.
    if (burned > 0) base += burned * (chosen?.burnScale ?? SKILL_FORMULA.manaBurnScale);
    // v3.148 화상 폭발(플레임위자드): 명중한 적의 화상 중첩을 모두 터뜨려 중첩당 burnConsume만큼 키웁니다. 중첩은 피해를 준 뒤 사라집니다.
    const consumedBurn = chosen?.burnConsume && landed && b.effects.burn ? b.effects.burn.stacks : 0;
    if (consumedBurn > 0) { base *= 1 + consumedBurn * chosen!.burnConsume!; notes.push(`화상 ${consumedBurn}중첩 폭발`); }
    // v25.14 마법 방어 비례 피해: 결계 계열(마법 방어 배율이 높은 직업)에서 온전히, 다른 직업이 계승하면 일부만.
    if (chosen?.scaling === 'resist')
        base += sa.resist * (chosen.scalingRatio ?? 1) * (sa.wardAffinity ?? 1);
    // v25.22 행운 비례 피해(도박 기술): 물리 공격 × (치명 피해 배율 − 1) × 비율. 행운을 몰아주면 치명 피해 배율이 커져 주사위 기술이 세집니다.
    // v26.4 능력치 비례 피해(외길 계보): 기준값 = 배분 능력치 × 비율(공격력은 쓰지 않음). 그 능력치만 올려도 사냥이 됩니다.
    // v3.97 scalingAttack: 외길 기술은 공격력 × 비율을 더합니다(장비 · 연구가 쌓여도 기술 피해가 따라 커짐). v3.172 마법 기술이면 마법 공격.
    if (chosen?.scaling === 'attr' && chosen.scalingAttribute)
        base += (sa[ATTR_KEY[chosen.scalingAttribute]] || 0) * (chosen.scalingRatio ?? 1) + (magical ? sa.magic : sa.attack) * (chosen.scalingAttack ?? 0);
    if (chosen?.scaling === 'luck')
        base += sa.attack * Math.max(0, (sa.critDamage || 1) - 1) * (chosen.scalingRatio ?? 1) * SKILL_FORMULA.luckScalingScale;
    if (chosen?.scaling === 'hp')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hpScaling);
    if (chosen?.scaling === 'mana')
        base += sa.mana * (chosen.scalingRatio ?? SKILL_FORMULA.manaScaling);
    // v24.2 진행도 비례 피해: 기본 피해 × 비율 × 기록(도감 종 수 · log10 처치 · √사냥 · log10 골드).
    const progress = chosen?.scaling === 'codex' ? sa.codexPower : chosen?.scaling === 'catch' ? sa.catchPower : chosen?.scaling === 'hunt' ? sa.huntPower : chosen?.scaling === 'gold' ? sa.goldPower : chosen?.scaling === 'mastered' ? sa.masteredPower : chosen?.scaling === 'variant' ? sa.variantPower : chosen?.scaling === 'relic' ? sa.relicPower : 0;
    if (progress) base += base * (chosen?.scalingRatio ?? 0) * progress;
    base += allInBonus;
    if (chosen?.scaling === 'hybrid')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hybridHpScaling) + sa.mana * ((chosen.scalingRatio ?? SKILL_FORMULA.hybridManaScaling) * 2);
    if (chosen?.id === 'crush')
        base += sa.defense * SKILL_FORMULA.crushDefense / (chosen.multiplier || 1);
    // v3.84 능력치 관통(출처끼리 곱연산)에 스킬 관통 보너스는 예전처럼 더합니다(곱하면 관통이 낮은 캐릭터의 스킬 보너스가 줄어듦). 합계 상한 85%(PENETRATION.cap).
    const pierce = 1 - Math.min(PENETRATION.cap, sa.penetration + (chosen?.penetrationBonus || 0));
    // v3.151 부식: 걸린 동안 물리 · 마법 방어가 깎입니다.
    const corrodeGuard = (b.effects.corrode || 0) > 0 ? { defense: 1 - STATUS_TUNING.corrodeDefense, resist: 1 - STATUS_TUNING.corrodeResist } : { defense: 1, resist: 1 };
    const defense = (magical ? sb.resist * corrodeGuard.resist : sb.defense * corrodeGuard.defense) * pierce;
    // 복합(split) 피해: 한 번의 명중·치명 판정 뒤 물리·마법 절반씩 각각의 방어를 적용합니다.
    const mitigated = (raw: number) => fixed ? Math.round(raw) : split
        ? Math.round(mitigate(raw * SKILL_FORMULA.splitPhysical, sb.defense * corrodeGuard.defense * pierce, sa.attack)) + Math.round(mitigate(raw * (1 - SKILL_FORMULA.splitPhysical), sb.resist * corrodeGuard.resist * pierce, sa.magic))
        : Math.round(mitigate(raw, defense, magical ? sa.magic : sa.attack));
    // v3.159 헥스 수집(칼리): 상대에게 걸린 상태이상 종류 수. 1종마다 conditionalDamageBonus.
    const statusCount = [b.stun > 0, !!b.effects.silence, !!b.effects.weaken, !!b.effects.slow, !!b.effects.corrode, !!b.effects.dot, !!b.effects.poison, !!b.effects.burn].filter(Boolean).length;
    const linked = chosen?.damageBonusCondition === 'statuses' ? statusCount > 0 : chosen?.damageBonusCondition === 'bleeding' ? !!(b.effects.dot || b.effects.poison || b.effects.burn) : chosen?.damageBonusCondition === 'weakened' ? !!b.effects.weaken : chosen?.damageBonusCondition === 'controlled' ? !!(b.effects.silence || b.effects.slow || b.stun > 0) : chosen?.damageBonusCondition === 'lowHp' ? b.hp <= sb.hp * (SKILL_FORMULA.lowHpThreshold + sa.executeBonus) : false;
    const preyHit = !!(chosen?.preyBonus && b.prey);
    if (preyHit) notes.push('사냥감');
    const sealBoost = chosen?.sealPower ? 1 + chosen.sealPower * (a.effects.seals?.length || 0) : 1;
    if (chosen?.sealPower) notes.push(`인 ${a.effects.seals?.length || 0}개`);
    // v27.17 출혈 중인 대상은 직접 피해를 더 받습니다(출혈은 중첩되지 않는 대신 이 보정). v27.48 화상은 그 절반을 더합니다.
    const bleedBoost = 1 + (b.effects.dot ? SKILL_FORMULA.bleedVulnerability : 0) + (b.effects.burn ? SKILL_FORMULA.burnVulnerability : 0);
    // v3.155 웨폰 버라이어티(카데나): 살아 있는 자기 버프 1개마다 피해 +varietyBonus.
    const varietyCount = sa.varietyBonus ? buffsOf(a.effects).length : 0, varietyBoost = 1 + varietyCount * (sa.varietyBonus || 0);
    if (varietyCount) notes.push(`버라이어티 ${varietyCount}`);
    // v3.163 조화 보너스(제논): 배분한 여섯 능력치의 최저 ÷ 최고 비율 × balanceBonus.
    const attrs = [sa.attrStr, sa.attrDex, sa.attrInt, sa.attrVit, sa.attrWis, sa.attrLuk].map(x => x || 0), attrTop = Math.max(...attrs), balanceRatio = attrTop > 0 ? Math.min(...attrs) / attrTop : 0;
    const balanceBoost = chosen?.balanceBonus ? 1 + chosen.balanceBonus * balanceRatio : 1;
    if (chosen?.balanceBonus) notes.push(`조화 ${Math.round(balanceRatio * 100)}%`);
    // v3.158 자기 버프의 피해 배율(접신): 살아 있는 버프의 damageMultiplier를 곱합니다.
    const buffDamage = buffsOf(a.effects).reduce((m, [, bf]) => m * (bf.damageMultiplier || 1), 1);
    // v3.198 태그(제로): 알파 ↔ 베타로 쪽을 바꿔 쓰면 장착 패시브의 tagBonus(가장 큰 값)만큼 피해가 커집니다. 쓴 쪽을 기억합니다.
    const tagBonus = chosen?.tag && a.effects.tag && a.effects.tag !== chosen.tag ? Math.max(0, ...a.skills.map(id => skillById(id)?.tagBonus || 0)) : 0;
    if (tagBonus) notes.push(`태그 ${chosen!.tag === 'alpha' ? '알파' : '베타'} +${Math.round(tagBonus * 100)}%`);
    if (chosen?.tag) a.effects.tag = chosen.tag;
    // v3.211 극한 단계: 그 스킬의 최종 피해 배율(방어 경감이 곱셈이라 피해 숫자에 그대로 +2%씩).
    const extremeFinal = chosen ? a.skillFinal?.[chosen.id] || 1 : 1;
    const linkMultiplier = extremeFinal * (1 + tagBonus) * comboBoost * balanceBoost * buffDamage * varietyBoost * (linked ? 1 + (chosen?.conditionalDamageBonus || 0) * (chosen?.damageBonusCondition === 'statuses' ? statusCount : 1) : 1) * bleedBoost * sealBoost * (preyHit ? 1 + chosen!.preyBonus! : 1) * (b.prey && sa.bossDamage ? 1 + sa.bossDamage : 1) * (1 + (a.damageDealt || 0)) * (1 - (b.damageTaken || 0));
    if (linked) { notes.push(chosen?.damageBonusCondition === 'statuses' ? `헥스 ${statusCount}` : '연계'); ev.linked = true; }
    // 상태이상 전용 기술: 명중 판정만 하고 직접 피해·반격·흡혈·추가타는 없습니다.
    const statusOnly = !!chosen?.statusOnly || healOnly;
    // v27.18 극 치명타: 같은 난수로 판정합니다(치명타 확률 상한을 넘은 몫 = superCrit). 치명 피해에 superCritBonus를 더 곱합니다.
    const critRoll = landed && !statusOnly ? rng() : 1;
    const crit = critRoll < sa.crit, superCrit = crit && critRoll < (sa.superCrit || 0);
    // v3.88 행운 비례(scaling 'luck', 팬텀 계열)는 위력에 이미 치명 피해를 넣으므로, 치명타가 터져도 치명 피해를 다시 곱하지 않습니다(제곱 방지).
    let damage = !landed || statusOnly ? 0 : Math.max(1, mitigated(base * (chosen?.multiplier || 1) * gambleRoll * linkMultiplier * (idleHeal ? SKILL_FORMULA.idleHealDamage : 1) * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (crit && chosen?.scaling !== 'luck' ? sa.critDamage * (superCrit ? SKILL_FORMULA.superCritBonus : 1) : 1)));
    // v3.176 마나 방패(배틀메이지): 받는 피해의 ratio만큼을 마나로 먼저 받습니다(마나 1이 피해 rate를 막음).
    let shielded = 0;
    if (damage > 0) {
        const shield = b.skills.map(id => skillById(id)?.manaShield).filter((x): x is NonNullable<Skill['manaShield']> => !!x).sort((x, y) => y.ratio - x.ratio)[0];
        if (shield && (b.mana ?? 0) > 0) {
            shielded = Math.min(Math.floor(damage * shield.ratio), Math.floor((b.mana ?? 0) * shield.rate));
            if (shielded > 0) { b.mana = (b.mana ?? 0) - Math.ceil(shielded / shield.rate); damage -= shielded; notes.push(`${b.name} 마나 방패 ${shielded}`); ev.shielded = (ev.shielded || 0) + shielded; }
        }
    }
    const actual = Math.min(b.hp, damage);
    b.hp = Math.max(0, b.hp - actual);
    // v3.163 피격 충전(카이저): 피해를 입는 공격을 맞으면 맞은 쪽의 충전이 쌓이고(치명타 +1), 가득 차면 변신합니다.
    if (actual > 0 && b.hp > 0) {
        const onHit = Math.max(0, ...b.skills.map(id => skillById(id)?.chargeOnHit || 0));
        if (onHit) { b.effects.charge = Math.min(SKILL_FORMULA.charge.max, (b.effects.charge || 0) + onHit + (crit ? 1 : 0)); notes.push(`${b.name} 충전 ${b.effects.charge}`); triggerSpectre(b, notes, ev); }
        // v3.172 반동 게이지(블래스터): 받은 피해가 최대 체력 × recoilGauge에 닿을 때마다 맞은 쪽의 충전 +1(소모형: 실린더 버스트 · 벙커 버스터가 중첩을 모두 씀).
        const gauge = Math.min(...b.skills.map(id => skillById(id)?.recoilGauge || Infinity));
        if (gauge < Infinity) {
            const unit = Math.max(1, sb.hp * gauge), pool = (b.effects.recoilPool || 0) + actual, gained = Math.floor(pool / unit);
            b.effects.recoilPool = pool - gained * unit;
            if (gained > 0 && (b.effects.charge || 0) < SKILL_FORMULA.charge.max) { b.effects.charge = Math.min(SKILL_FORMULA.charge.max, (b.effects.charge || 0) + gained); notes.push(`${b.name} 반동 ${b.effects.charge}`); }
        }
    }
    // v25 無: 쓰러질 피해를 받은 쪽이 無를 장착했으면 체력 1로 버티고, 이 행동의 남은 추가타는 멈춥니다.
    let stood = endure(b, sb, notes, ev);
    if (consumedBurn > 0) delete b.effects.burn;
    // v3.143 충전: 충전 기술이 명중하면 중첩이 쌓입니다(약화된 적이면 weakenedExtra 더).
    if (landed && chosen?.charge) {
        const before = Math.min(SKILL_FORMULA.charge.max, a.effects.charge || 0);
        a.effects.charge = Math.min(SKILL_FORMULA.charge.max, before + chosen.charge + (targetWeakened ? SKILL_FORMULA.charge.weakenedExtra : 0));
        if (a.effects.charge > before) notes.push(`충전 ${a.effects.charge}`);
        triggerSpectre(a, notes, ev);
    }
    // 반격: 맞은 쪽이 방어 비례 피해를 되돌려 줍니다. 공격자의 물리 방어로 경감됩니다.
    if (landed && !statusOnly && sb.thorns > 0) {
        // v27.2 공격자 방어를 절반만 적용하고, 무리 규모에 따라 (1 + log2 N)배(최대 10배). 탱커가 무리 사냥에서 빛나는 장치입니다.
        const crowd = a.swarm && a.swarm > 1 ? Math.min(SKILL_FORMULA.swarmThornsCap, 1 + Math.log2(a.swarm)) : 1;
        // v27.2 마법 공격을 맞으면 마법 방어로 반격합니다(결계 계보가 마법 무리를 갈 수 있도록). 공격자도 같은 종류의 방어로 막습니다.
        const guard = magical ? sb.resist : sb.defense, foeGuard = magical ? sa.resist : sa.defense;
        const reflected = Math.min(a.hp, Math.max(1, Math.round(mitigate(guard * sb.thorns * crowd, foeGuard * (1 - SKILL_FORMULA.thornsPierce), guard))));
        a.hp = Math.max(0, a.hp - reflected);
        endure(a, sa, notes, ev, true);
        ev.reflected = reflected;
        notes.push(`반격 ${reflected}`);
        // v25.25 반격에도 흡혈: 되돌려 준 피해 × 흡혈률 × 2만큼 맞은 쪽이 회복합니다(반격 피해가 작아 2배).
        if (sb.lifesteal > 0 && b.hp > 0) {
            const heal = Math.min(sb.hp - b.hp, Math.floor(reflected * sb.lifesteal * SKILL_FORMULA.thornsLifestealScale));
            if (heal > 0) { b.hp += heal; ev.reflectHeal = heal; notes.push(`반격 흡혈 ${heal}`); }
        }
    }
    // 표시는 실제로 깎인 체력 기준: 본타·추가타를 각각 한 번씩만 세고 합계는 그 합입니다.
    if (!statusOnly || !landed) ev.hits.push(landed ? hitRecord('main', actual, damage, crit, superCrit) : { kind: 'main', value: 0, critical: false, miss: true });
    // v3.176 회피 반격(듀얼블레이드): 내게 온 공격이 빗나가면 충전이 쌓입니다.
    if (!landed && !healOnly) {
        const evade = Math.max(0, ...b.skills.map(id => skillById(id)?.evadeCharge || 0));
        if (evade) { b.effects.charge = Math.min(SKILL_FORMULA.charge.max, (b.effects.charge || 0) + evade); notes.push(`${b.name} 반격 준비 ${b.effects.charge}`); }
    }
    // v3.176 콤보(아란): 피해를 주는 공격이 명중하면 내 충전이 쌓입니다(중첩을 방출한 기술도 1부터 다시).
    if (landed && !statusOnly && !healOnly) {
        const combo = Math.max(0, ...a.skills.map(id => skillById(id)?.hitCharge || 0));
        if (combo) { a.effects.charge = Math.min(SKILL_FORMULA.charge.max, (a.effects.charge || 0) + combo); notes.push(`콤보 ${a.effects.charge}`); }
    }
    if (healOnly) notes.push(`회복 ${healed}`);
    // v3.5 상태이상 저항: 몬스터가 거는 해로운 상태이상을 대상의 statusResist 확률로 무효화합니다(저항이 0이면 난수를 쓰지 않음).
    // v3.151 기본 공격 상태이상: 기술이 없을 때(기본 공격 · 마력 평타) 장착한 패시브의 basicEffect를 그 공격의 효과로 씁니다.
    const basic = !chosen ? a.skills.map(id => skillById(id)).find(x => x?.basicEffect) : undefined;
    const src: Skill | undefined = chosen ?? (basic ? { ...basic, effect: basic.basicEffect } as Skill : undefined);
    const harmful = src?.effect && RESISTABLE.has(src.effect) ? src.effect : undefined;
    const resisted = !!(landed && harmful && a.foe && sb.statusResist > 0 && !isImmune(b, harmful as ImmuneStatus) && rng() < sb.statusResist);
    if (resisted) { notes.push(`${RESIST_LABELS[harmful!]} 저항`); ev.resisted = harmful; }
    const effect = resisted ? undefined : src?.effect;
    const onset: { name: string; value: number }[] = [];
    // v3.86 각성기가 거는 상태이상은 지속(패시브 보너스 포함)에 awaken.statusScale을 곱합니다.
    const lasting = (turns: number) => forced?.kind === 'awaken' && chosen?.awaken?.statusScale ? Math.round(turns * chosen.awaken.statusScale) : turns;
    if (landed && src && effect === 'stun' && isImmune(b, 'stun')) { notes.push('기절 면역'); ev.immune = 'stun'; }
    else if (landed && src && effect === 'stun') {
        const turns = lasting((src!.statusTurns ?? 1) + sa.stunBonus);
        b.stun = Math.max(b.stun, turns);
        notes.push(turns > 1 ? `기절 ${turns}턴` : '기절');
        ev.statuses.push({ id: 'stun', turns });
    }
    if (landed && chosen && effect === 'bleed' && isImmune(b, 'bleed')) { notes.push('출혈 면역'); ev.immune = 'bleed'; }
    else if (landed && chosen && effect === 'bleed') {
        const turns = lasting((chosen.statusTurns ?? STATUS_TUNING.bleedTurns) + sa.dotTurnsBonus);
        const name = chosen.dotName || '출혈';
        // v27.3 틱 피해 = 위력 비례 + 대상 체력 비례(v3.54 틱 때 현재 체력 × bleedHpRatio, 무리는 × swarmDotShare). 방어·반격을 모두 무시하므로 탱커의 카운터입니다.
        const tick = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.bleedRatio) * (1 + (sa.dotBonus || 0) + (sa.bleedBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.bleedHpRatio * swarmDotShare(b.swarm);
        // v27.17 출혈은 중첩되지 않습니다. 다시 걸면 더 강한 피해와 더 긴 지속으로 갱신합니다.
        const current = b.effects.dot;
        // v3.54 전투에서 처음 걸 때 첫 틱을 바로 한 번 더 줍니다(지속은 그대로, 전투당 한 번). 원킬·짧은 전투에서도 지속 피해가 몫을 합니다.
        // (지속을 1턴 줄이면 다시 걸기 전에 끝나 면역이 생겨 긴 전투 피해가 줄었고, 매번 주면 출혈만 긴 전투에서 크게 늘었습니다.)
        if (opens(b, 'bleed')) onset.push({ name, value: tick + hpPart(dotHp(b), hpRatio, 0) });
        b.effects.dot = { damage: Math.max(tick, current?.hpRatio === undefined ? 0 : current.damage), hpRatio: Math.max(hpRatio, current?.hpRatio || 0), turns: Math.max(turns, current?.turns || 0), name };
        notes.push(`${name} ${turns}턴`);
        ev.statuses.push({ id: 'bleed', turns });
    }
    // v27.17 중독: 출혈과 별개의 중첩형 지속 피해. 걸릴 때마다 한 중첩, 지속 갱신, 중첩당 피해는 더 강한 쪽.
    // v3.132 alsoEffect: 같은 공격으로 두 번째 중첩형 지속 피해(중독·화상)를 함께 겁니다.
    const also = resisted ? undefined : chosen?.alsoEffect;
    if (landed && chosen && (effect === 'poison' || also === 'poison') && isImmune(b, 'poison')) { notes.push('중독 면역'); ev.immune = 'poison'; }
    else if (landed && chosen && (effect === 'poison' || also === 'poison')) {
        const turns = lasting((chosen.statusTurns ?? STATUS_TUNING.poisonTurns) + sa.dotTurnsBonus);
        const perStack = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.poisonRatio) * (1 + (sa.dotBonus || 0) + (sa.poisonBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.poisonHpRatio * swarmDotShare(b.swarm);
        const current = b.effects.poison;
        // v3.54 처음 걸면 poisonFirstStacks중첩으로 시작합니다. 전투에서 처음 걸 때 첫 틱을 바로 한 번 더 줍니다(전투당 한 번).
        const first = opens(b, 'poison'), stacks = Math.min(STATUS_TUNING.poisonMaxStacks + sa.poisonStackBonus, current ? current.stacks + 1 : first ? STATUS_TUNING.poisonFirstStacks : 1);
        if (first) onset.push({ name: '중독', value: (perStack + hpPart(dotHp(b), hpRatio, 0)) * stacks });
        b.effects.poison = { perStack: Math.max(perStack, current?.perStack || 0), stacks, turns: Math.max(turns, current?.turns || 0), hpRatio: Math.max(hpRatio, current?.hpRatio || 0) };
        notes.push(`중독 ${stacks}중첩 ${turns}턴`);
        ev.statuses.push({ id: 'poison', turns });
    }
    // v27.48 화상: 걸릴 때마다 한 중첩(최대 burnMaxStacks), 지속 갱신, 중첩당 피해는 더 강한 쪽.
    if (landed && chosen && (effect === 'burn' || also === 'burn') && isImmune(b, 'burn')) { notes.push('화상 면역'); ev.immune = 'burn'; }
    else if (landed && chosen && (effect === 'burn' || also === 'burn')) {
        const turns = lasting((chosen.statusTurns ?? STATUS_TUNING.burnTurns) + sa.dotTurnsBonus);
        const perStack = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.burnRatio) * (1 + (sa.dotBonus || 0) + (sa.burnBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.burnHpRatio * swarmDotShare(b.swarm);
        const current = b.effects.burn;
        // v3.54 전투에서 처음 걸면 burnFirstStacks중첩으로 시작하고 첫 틱을 바로 한 번 더 줍니다(전투당 한 번).
        const first = opens(b, 'burn'), stacks = Math.min(STATUS_TUNING.burnMaxStacks, current ? current.stacks + 1 : first ? STATUS_TUNING.burnFirstStacks : 1);
        if (first) onset.push({ name: '화상', value: (perStack + hpPart(dotHp(b), hpRatio, 0)) * stacks });
        b.effects.burn = { perStack: Math.max(perStack, current?.perStack || 0), stacks, turns: Math.max(turns, current?.turns || 0), hpRatio: Math.max(hpRatio, current?.hpRatio || 0) };
        notes.push(`화상 ${stacks}중첩 ${turns}턴`);
        ev.statuses.push({ id: 'burn', turns });
    }
    // v3.54 새로 건 지속 피해의 첫 틱과 힐러의 넘친 회복 피해를 바로 줍니다(방어 무시). 쓰러지면 無 판정을 거칩니다.
    if (onset.length && b.hp > 0) {
        const value = Math.min(b.hp, onset.reduce((n, x) => n + x.value, 0));
        b.hp -= value; ev.onset = { name: onset.map(x => x.name).join('·'), value };
        notes.push(`${ev.onset.name} 즉시 ${value}`);
        if (b.hp <= 0) stood = endure(b, sb, notes, ev) || stood;
    }
    if (overheal > 0 && b.hp > 0) {
        const value = Math.min(b.hp, Math.floor(overheal * SKILL_FORMULA.overhealDamage));
        if (value > 0) { b.hp -= value; ev.holy = value; notes.push(`넘친 회복 → 피해 ${value}`); if (b.hp <= 0) stood = endure(b, sb, notes, ev) || stood; }
    }
    if (landed && src && effect === 'weaken' && isImmune(b, 'weaken')) { notes.push('약화 면역'); ev.immune = 'weaken'; }
    else if (landed && src && effect === 'weaken') {
        const turns = lasting(src!.statusTurns ?? STATUS_TUNING.weakenTurns);
        extendStatus(b.effects, 'weaken', turns);
        notes.push(`공격 약화 ${turns}턴`);
        ev.statuses.push({ id: 'weaken', turns });
    }
    if (landed && src && effect === 'silence' && isImmune(b, 'silence')) { notes.push('침묵 면역'); ev.immune = 'silence'; }
    else if (landed && src && effect === 'silence') {
        const turns = lasting((src!.statusTurns ?? STATUS_TUNING.silenceTurns) + sa.controlBonus);
        extendStatus(b.effects, 'silence', turns);
        notes.push(`침묵 ${turns}턴`);
        ev.statuses.push({ id: 'silence', turns });
    }
    if (landed && src && effect === 'slow' && isImmune(b, 'slow')) { notes.push('감속 면역'); ev.immune = 'slow'; }
    else if (landed && src && effect === 'slow') {
        const turns = lasting((src!.statusTurns ?? STATUS_TUNING.slowTurns) + sa.controlBonus);
        extendStatus(b.effects, 'slow', turns);
        notes.push(`감속 ${turns}턴`);
        ev.statuses.push({ id: 'slow', turns });
    }
    // v3.151 부식: 물리 · 마법 방어와 속도를 깎는 최상급 디버프(일리움). 기본 공격 상태이상(패시브)으로도 걸립니다.
    if (landed && src && effect === 'corrode' && isImmune(b, 'corrode')) { notes.push('부식 면역'); ev.immune = 'corrode'; }
    else if (landed && src && effect === 'corrode') {
        const turns = lasting((src.statusTurns ?? STATUS_TUNING.corrodeTurns) + sa.controlBonus);
        extendStatus(b.effects, 'corrode', turns);
        notes.push(`부식 ${turns}턴`);
        ev.statuses.push({ id: 'corrode', turns });
    }
    if (landed && chosen?.effect === 'haste') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.hasteTurns;
        grantBuff(a.effects, { id: 'haste', name: '가속', turns, speedMultiplier: 1 + STATUS_TUNING.hasteMultiplier });
        notes.push(`가속 ${turns}턴`);
        ev.statuses.push({ id: 'haste', turns, onSelf: true });
    }
    const drainRate = sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? SKILL_FORMULA.drainRatio) : 0);
    // 흡혈 회복은 준 피해 비례지만 한 번의 행동에서 최대 체력 × 흡혈률 × lifestealHpCap을 넘지 않습니다.
    let drainLeft = Math.floor(sa.hp * drainRate * SKILL_FORMULA.lifestealHpCap);
    const drain = Math.min(drainLeft, Math.floor(actual * drainRate));
    drainLeft -= drain;
    if (drain) {
        const recovery = Math.min(sa.hp - a.hp, drain);
        a.hp += recovery;
        ev.drained += recovery;
    }
    // Follow-up hits are part of the same action. They use the same hit chance,
    // cannot recursively trigger another follow-up, and are capped in balance.ts.
    // v3.132 도트 퍼니셔: 적의 중독·화상 중첩(각 최대 대비 비율의 평균 fill)에 따라 추가타. 둘 다 최대면 maxHits회,
    // 하나라도 걸려 있으면 maxHits × (1 + fill) / 2회(절반부터, 최대보다 1회 적게), 없으면 0회. 최대 추가타 상한(maxExtraAttacks)을 따로 씁니다.
    const finisher = landed && !statusOnly ? chosen?.dotFinisher : undefined;
    const poisonFill = Math.min(1, (b.effects.poison?.stacks || 0) / (STATUS_TUNING.poisonMaxStacks + sa.poisonStackBonus)), burnFill = Math.min(1, (b.effects.burn?.stacks || 0) / STATUS_TUNING.burnMaxStacks), fill = (poisonFill + burnFill) / 2;
    const fullFinish = !!finisher && poisonFill >= 1 && burnFill >= 1, finisherHits = !finisher || fill <= 0 ? 0 : fullFinish ? finisher.maxHits : Math.min(finisher.maxHits - 1, Math.max(1, Math.round(finisher.maxHits * (1 + fill) / 2)));
    if (finisher) notes.push(finisherHits ? `퍼니시 ${finisherHits}회` : '퍼니시 없음');
    // v3.164 전류(스트라이커): 살아 있는 전류 버프가 있으면 패시브만큼 추가타가 늘어납니다(상한 뒤에 더함).
    const currentExtra = statusOnly || finisher || !(chosen?.extraAttacks) ? 0 : Math.max(0, ...a.skills.map(id => { const x = skillById(id)?.followUpExtra; return x && (a.effects?.buffs?.[x.buff]?.turns || 0) > 0 ? x.hits : 0; }));
    const skillFollowUps = statusOnly ? 0 : finisher ? finisherHits : Math.min(chosen?.awaken ? STATUS_TUNING.maxExtraAttacksAwaken : STATUS_TUNING.maxExtraAttacks, Math.max(0, chosen?.extraAttacks || 0)) + currentExtra + chargeHitSpent * (chosen?.chargeHits || 0);
    // v3.146 정령(은월): 장착한 패시브의 정령이 모든 공격 행동(기본 공격 포함, 피해 없는 기술 · 순수 회복 · 도트 퍼니셔 제외)에 추가타를 붙입니다.
    const spirits = a.skills.map(id => skillById(id)?.companion).filter((c): c is { hits: number; power: number } => !!c);
    const spirit = spirits.length && !statusOnly && !healOnly && !finisher ? { hits: Math.max(...spirits.map(c => c.hits)), power: Math.max(...spirits.map(c => c.power)) } : null;
    if (spirit) notes.push(`정령 ${spirit.hits}회`);
    const followUps = skillFollowUps + (spirit?.hits || 0);
    let currentTurns = 0;
    for (let i = 0; i < followUps && b.hp > 0 && a.hp > 0 && !stood; i++) {
        if (rng() >= hit) {
            ev.hits.push({ kind: 'follow', value: 0, critical: false, miss: true });
            continue;
        }
        const followRoll = rng(), followCrit = followRoll < sa.crit, followSuper = followCrit && followRoll < (sa.superCrit || 0);
        const followMultiplier = (chosen?.multiplier || 1) * ((i >= skillFollowUps && spirit ? spirit.power : (finisher?.hitMultiplier ?? chosen?.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier)) + sa.followUpBonus);
        const followDamage = Math.max(1, mitigated(base * followMultiplier * linkMultiplier * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (followCrit ? sa.critDamage * (followSuper ? SKILL_FORMULA.superCritBonus : 1) : 1)));
        const followActual = Math.min(b.hp, followDamage);
        b.hp = Math.max(0, b.hp - followDamage);
        if (endure(b, sb, notes, ev)) stood = true;
        ev.hits.push(hitRecord('follow', followActual, followDamage, followCrit, followSuper));
        // v3.164 전류(스트라이커): 추가타가 명중하면 전류 버프가 1턴 길어집니다(없으면 시작 턴으로).
        if (i < skillFollowUps) { const fb = a.skills.map(id => skillById(id)?.followUpBuff).filter((x): x is NonNullable<Skill['followUpBuff']> => !!x).sort((x, y) => (y.speedMultiplier || 1) - (x.speedMultiplier || 1))[0]; if (fb) { const cur = a.effects.buffs?.[fb.id]; if (cur && cur.turns > 0) { cur.turns += 1; cur.speedMultiplier = fb.speedMultiplier; } else grantBuff(a.effects, { id: fb.id, name: fb.name, turns: fb.turns, speedMultiplier: fb.speedMultiplier }); currentTurns = a.effects.buffs![fb.id].turns; } }
        const followDrain = Math.min(drainLeft, Math.floor(followActual * drainRate));
        drainLeft -= followDrain;
        if (followDrain) {
            const recovery = Math.min(sa.hp - a.hp, followDrain);
            a.hp += recovery;
            ev.drained += recovery;
        }
    }
    if (currentTurns) { notes.push(`전류 ${currentTurns}턴`); ev.statuses.push({ id: 'current', turns: currentTurns, onSelf: true }); }
    // v3.132 도트 퍼니셔 기절: 중독·화상이 모두 최대 중첩이면 fullStun턴, 하나라도 걸려 있으면 partStun턴(+기절 보너스).
    if (finisher && finisherHits && b.hp > 0 && !stood) {
        if (isImmune(b, 'stun')) { notes.push('기절 면역'); ev.immune = 'stun'; }
        else {
            const turns = (fullFinish ? finisher.fullStun : finisher.partStun) + sa.stunBonus;
            b.stun = Math.max(b.stun, turns);
            notes.push(turns > 1 ? `기절 ${turns}턴` : '기절');
            ev.statuses.push({ id: 'stun', turns });
        }
    }
    // v25 반동: 준 피해에 비례해 자신도 받습니다. 반동으로는 쓰러지지 않습니다.
    if (chosen?.recoil && ev.hits.length) {
        const dealt = ev.hits.reduce((n, h) => n + h.value, 0), self = Math.min(Math.max(0, a.hp - 1), Math.floor(dealt * chosen.recoil));
        if (self > 0) { a.hp -= self; notes.push(`반동 ${self}`); }
    }
    // v25 자기 상태이상: 짝 기술(waivedBy)을 장착하면 생략합니다.
    if (chosen?.selfEffect) {
        const fx = chosen.selfEffect, waived = !!fx.waivedBy && a.skills.includes(fx.waivedBy);
        if (waived) notes.push(`${skillById(fx.waivedBy!)?.name || ''} · 반작용 상쇄`);
        else if (fx.status === 'stun') { a.stun = Math.max(a.stun, fx.turns); notes.push(`자신 기절 ${fx.turns}턴`); ev.statuses.push({ id: 'stun', turns: fx.turns, onSelf: true }); }
        else { extendStatus(a.effects, fx.status, fx.turns); notes.push(`자신 ${fx.status === 'slow' ? '감속' : '약화'} ${fx.turns}턴`); ev.statuses.push({ id: fx.status, turns: fx.turns, onSelf: true }); }
    }
    if (chosen?.extraTurn && !bonusAction && !forced) { ev.extraTurn = true; notes.push('추가 행동'); }
    // v25 일곱 글자: 인을 새기고, 天을 장착한 채 일곱 글자를 모두 갖추고 여섯 인이 모이면 天이 터집니다.
    if (chosen?.seal) {
        a.effects.seals = [...new Set([...(a.effects.seals || []), chosen.id])];
        const finaleSkill = a.skills.map(id => skillById(id)).find(x => x?.sealFinale);
        const glyphs = SKILLS.filter(x => x.job === chosen.job && (x.seal || x.lastStand));
        const sealsNeeded = glyphs.filter(x => x.seal).length;
        if (finaleSkill && b.hp > 0 && glyphs.every(x => a.skills.includes(x.id)) && a.effects.seals.length >= sealsNeeded) {
            const f = finaleSkill.sealFinale!, levels = glyphs.reduce((n, x) => n + (a.mastery?.[x.id] || 0), 0) + (a.mastery?.[finaleSkill.id] || 0);
            const blast = Math.max(1, Math.round((sa.attack + sa.magic) * (f.base + f.perLevel * levels)));
            const dealt = Math.min(b.hp, blast);
            b.hp = Math.max(0, b.hp - blast);
            endure(b, sb, notes, ev);
            ev.hits.push(hitRecord('follow', dealt, blast, false));
            ev.finale = true;
            a.effects.seals = [];
            notes.push(`天 · 일곱 인 해방 ${blast.toLocaleString()}`);
            if (b.hp > 0 && !isImmune(b, 'stun')) { b.stun = Math.max(b.stun, f.stun); const own = ev.statuses.find(x => x.id === 'stun' && !x.onSelf); if (own) own.turns = Math.max(own.turns, f.stun); else ev.statuses.push({ id: 'stun', turns: f.stun }); notes.push(`기절 ${f.stun}턴`); }
        }
    }
    // v25.5 재사용 대기 초기화 패시브: 치명타·처치·연속 행동 조건마다 확률로 대기 중인 액티브를 되돌립니다(플레이어 전용).
    if (a.ranks) {
        const critical = ev.hits.some(h => h.critical), killed = b.hp <= 0;
        for (const id of a.skills) {
            const rule = skillById(id)?.cooldownReset;
            if (!rule || !(rule.on === 'crit' ? critical : rule.on === 'kill' ? killed : chained)) continue;
            if (rule.chance < 1 && rng() >= rule.chance) continue;
            const waiting = a.skills.filter(x => (a.cooldowns[x] || 0) > 0 && skillById(x)?.type === 'active');
            if (!waiting.length) continue;
            const picked = rule.pick === 'all' ? waiting : rule.pick === 'first' ? [waiting[0]] : [waiting.reduce((best, x) => a.cooldowns[x] > a.cooldowns[best] ? x : best, waiting[0])];
            // v3.86 각성기는 턴 단위 대기를 awaken.reset턴만 줄입니다(0이 되면 다음 턴에 판정).
            for (const x of picked) a.cooldowns[x] = skillById(x)?.awaken ? Math.max(0, a.cooldowns[x] - SKILL_FORMULA.awaken.reset) : 0;
            ev.cooldownReset = [...(ev.cooldownReset || []), ...picked.map(x => skillById(x)?.name || x)];
            notes.push(`대기 초기화 · ${picked.map(x => skillById(x)?.name || x).join('·')} (${skillById(id)?.name})`);
        }
    }
    ev.skillId = chosen?.id;
    ev.skillName = label;
    if (chosen && a.extremeFx?.includes(chosen.id)) ev.extreme = true;
    ev.damageType = fixed ? 'fixed' : split ? 'split' : magical ? 'magic' : 'physical';
    ev.healed = healed;
    // v27.75 합계도 계산된 피해 기준(표시용). 실제 감소량 합이 필요하면 hits의 value를 더합니다.
    ev.total = ev.hits.reduce((n, h) => n + shownHit(h), 0);
    return emit(`${a.name} · ${label}${superCrit ? ' [극 치명타]' : crit ? ' [치명타]' : ''} → ${describeHits(ev)}${healed ? ` · 회복 ${healed}` : ''}${ev.drained ? ` · 흡혈 ${ev.drained}` : ''}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
}
