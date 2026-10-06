import type { Attribute, Skill, Stats } from '../types';
import { STATUS_TUNING, SKILL_FORMULA, diceMultiplier, diceRange } from '../data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay, PROGRESSION, ATTRIBUTE_NAMES } from '../data/progression';
import { effectiveSkill, masteryGainBonus, masteryMilestonesFor, maxSkillLevel } from './progression';
import { masteryConditionText, masteryPerVictory } from './mastery';
import { jobById } from '../data/classes';
import { skillById } from '../data/skills';

const number = (n: number) => Number(n.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
/** 玄 계보처럼 한자 한 글자로 된 이름의 한글 음. 툴팁에 함께 보여 줍니다. */
const HANJA_READING: Record<string, string> = { '玄': '현', '無': '무', '虛': '허', '斬': '참', '血': '혈', '縛': '박', '刹': '찰', '魂': '혼', '天': '천' };
export const hanjaReading = (name: string) => HANJA_READING[name] ? `${name}(${HANJA_READING[name]})` : undefined;
export const skillPercent = (n: number) => `${number(n * 100)}%`;
export function skillBonusText(key: string, value: number) {
    return `${STAT_LABELS[key as keyof Stats] || key} ${statDeltaDisplay(key, value)}`;
}
const COUNT_WORD: Record<string, string> = { codex: '도감 기록', catch: '누적 처치', hunt: '던전 클리어·보스 처치', species: '지정 몬스터 처치', gold: '보유 골드 자릿수', rebirth: '환생', mastered: '숙달한 직업', variant: '변종·황금 처치', deaths: '쓰러진 횟수', str: '근력', dex: '기민', int: '지능', vit: '체질', wis: '정신', luk: '행운' };
const PROGRESS_WORD: Record<string, string> = { codex: '도감 기록', catch: '누적 처치', hunt: '사냥 기록', gold: '보유 골드', variant: '변종 기록' };
const STATUS_WORD: Record<string, string> = { stun: '기절', bleed: '출혈', poison: '중독', burn: '화상', weaken: '약화', silence: '침묵', slow: '감속', haste: '가속' };
/** 기술이 거는 상태이상 이름(출혈 계열은 화상·중독 같은 고유 이름). */
/** v27.15 도감의 적 스킬 한 줄: '물리 150%' · '출혈 5턴' · '물리 110% · 자신 가속 3턴'. 긴 문장은 쓰지 않습니다. */
export function enemySkillBrief(sk: Skill) {
    const parts: string[] = [];
    if (!sk.statusOnly && sk.multiplier) parts.push(`${sk.damageType === 'magic' ? '마법' : sk.damageType === 'split' ? '복합' : '물리'} ${number(sk.multiplier * 100)}%`);
    if (sk.effect === 'haste') parts.push(`자신 가속 ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴`);
    else if (sk.effect && STATUS_WORD[sk.effect]) parts.push(`${statusLabel(sk)} ${sk.statusTurns ?? 1}턴`);
    if (sk.extraAttacks) parts.push(`추가타 ${sk.extraAttacks}회`);
    return parts.join(' · ') || '기본 공격';
}
function statusLabel(sk: Skill) {
    return sk.effect === 'bleed' && sk.dotName ? sk.dotName : STATUS_WORD[sk.effect || ''] || '';
}
/**
 * 짧은 효과 요약: 직업 상세·비교처럼 한 줄만 보여 줄 때 씁니다. 피해(또는 피해 없음) → 상태이상 → 추가타·회복·흡혈·연계 순서.
 * 자세한 계산식은 skillEffectLines에 있습니다.
 */
/**
 * v3.5 간단히 보기의 ‘기타’ 칸: 고정 수치 칩으로 다 못 보여 주는 조건·규칙(누적·환생 비례, 조건부 숙련, 특수 규칙).
 * 비어 있으면 기타 칸을 그리지 않습니다.
 */
export function skillExtraNotes(sk: Skill): string[] {
    if (sk.type === 'active') return [];
    const notes: string[] = [];
    if (sk.perRebirth) notes.push(`환생마다 ${byStatOrder(Object.entries(sk.perRebirth)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${SKILL_FORMULA.perRebirthCap}회)`);
    for (const pc of sk.perCount || []) notes.push(`${COUNT_WORD[pc.source]}${pc.per === 1 ? '' : ` ${pc.per.toLocaleString()}`}마다 ${byStatOrder(Object.entries(pc.bonus)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${pc.cap}회)`);
    if (sk.masteryGain) notes.push('지정한 적 처치 시 숙련 추가 획득');
    const special = sk.cooldownReset || sk.lastStand || sk.sealFinale;
    if (special && sk.desc) notes.push(sk.desc);
    return notes;
}
export function skillBrief(sk: Skill): string {
    if (sk.type !== 'active') {
        const parts = byStatOrder(Object.entries(sk.levelEffects?.[0]?.bonus ?? sk.bonus ?? {})).map(([key, n]) => skillBonusText(key, n as number));
        // v3.70 능력치 수련 패시브: 기본 능력치 자체가 오릅니다.
        for (const [key, n] of Object.entries(sk.attrBonus || {})) parts.push(`${ATTRIBUTE_NAMES[key as Attribute]} +${n}`);
        if (sk.perRebirth) parts.push(`환생마다 ${byStatOrder(Object.entries(sk.perRebirth)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')}`);
        if (sk.levelEffects?.length) parts.push(`숙련할수록 강해짐(AP ${sk.levelEffects[0].cost} → ${sk.levelEffects.at(-1)!.cost})`);
        if (sk.masteryGain) parts.push('조건부 숙련 증가');
        for (const pc of sk.perCount || []) parts.push(`${COUNT_WORD[pc.source]} ${pc.per.toLocaleString()}마다 ${byStatOrder(Object.entries(pc.bonus)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')}`);
        if (sk.song) parts.unshift('노래 · AP 0');
        return parts.join(' · ') || '장착 효과';
    }
    const parts = [sk.statusOnly ? '피해 없음' : `${sk.damageType === 'magic' ? '마법' : sk.damageType === 'split' ? '복합' : '물리'} 피해 ×${number(sk.multiplier || 1)}`];
    if (sk.effect && STATUS_WORD[sk.effect] && sk.effect !== 'haste') parts.push(`${statusLabel(sk)} ${sk.statusTurns ?? ({ stun: 1, bleed: STATUS_TUNING.bleedTurns, poison: STATUS_TUNING.poisonTurns, burn: STATUS_TUNING.burnTurns, weaken: STATUS_TUNING.weakenTurns, silence: STATUS_TUNING.silenceTurns, slow: STATUS_TUNING.slowTurns } as Record<string, number>)[sk.effect]}턴`);
    if (sk.effect === 'haste') parts.push(`자신 가속 ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴`);
    if (sk.extraAttacks) parts.push(`추가타 ${sk.extraAttacks}회`);
    if (sk.effect === 'heal') parts.push(`체력 ${skillPercent(sk.healRatio ?? SKILL_FORMULA.healRatio)} 회복`);
    if (sk.effect === 'drain') parts.push(`피해의 ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)} 흡혈`);
    if (sk.damageBonusCondition) parts.push(`${{ bleeding: '출혈·중독', weakened: '약화', controlled: '기절·침묵·감속', lowHp: '빈사' }[sk.damageBonusCondition]} 적 +${skillPercent(sk.conditionalDamageBonus || 0)}`);
    if (sk.scaling && PROGRESS_WORD[sk.scaling]) parts.push(`${PROGRESS_WORD[sk.scaling]} 비례`);
    if (sk.dice) parts.push(`주사위 최대 ${sk.dice.max}개`);
    if (sk.gamble) parts.push([sk.gamble.min !== sk.gamble.max ? `주사위 ×${number(sk.gamble.min)}~${number(sk.gamble.max)}` : '', sk.gamble.accuracy ? `명중 ±${skillPercent(sk.gamble.accuracy)}p` : ''].filter(Boolean).join(' · '));
    if (sk.allIn) parts.push(`체력 ${skillPercent(sk.allIn.hpRatio)}·마나 전부 소모`);
    if (sk.goldSpend) parts.push(`골드 ${skillPercent(sk.goldSpend.ratio)} 투척`);
    if (sk.preyBonus) parts.push(`보스·지정 몬스터 +${skillPercent(sk.preyBonus)}`);
    return parts.join(' · ');
}
/** Describes the effective values used by combat, including HP/MP scaling and follow-ups. */
export function skillEffectLines(sk: Skill, level = 0): string[] {
    const out: string[] = [];
    if (sk.type === 'active') {
        const base = sk.scaling === 'attr' && sk.scalingAttribute ? [`${ATTRIBUTE_NAMES[sk.scalingAttribute]} × ${number(sk.scalingRatio ?? 1)}(배분 능력치, 공격력 미사용)`] : [sk.scaling === 'harmony' ? `${number(SKILL_FORMULA.harmonyBase)} + 배분 포인트 합 × ${number(SKILL_FORMULA.harmonyPerPoint)} + 가장 낮은 배분 포인트 × ${number(SKILL_FORMULA.harmonyPerLowest)}` : sk.scaling === 'dual' ? '(물리 공격 + 마법 공격) ÷ 2' : sk.scaling === 'swap' ? (sk.damageType === 'magic' ? '물리 공격(마법 피해로 바꿈)' : '마법 공격(물리 피해로 바꿈)') : sk.id === 'oath' ? '물리·마법 공격 중 높은 값' : sk.damageType === 'magic' ? '마법 공격' : '물리 공격'];
        if (sk.scaling === 'defense') base.push(`물리 방어 × ${number(sk.scalingRatio ?? 1)} × 방어 친화도`);
        if (sk.scaling === 'resist') base.push(`마법 방어 × ${number(sk.scalingRatio ?? 1)} × 결계 친화도`);
        if (sk.scaling === 'hp') base.push(`최대 체력 × ${number(sk.scalingRatio ?? SKILL_FORMULA.hpScaling)}`);
        if (sk.scaling === 'mana') base.push(`최대 마나 × ${number(sk.scalingRatio ?? SKILL_FORMULA.manaScaling)}`);
        if (sk.scaling === 'hybrid') base.push(`최대 체력 × ${number(sk.scalingRatio ?? SKILL_FORMULA.hybridHpScaling)}`, `최대 마나 × ${number((sk.scalingRatio ?? SKILL_FORMULA.hybridManaScaling) * 2)}`);
        if (sk.healOnly) { out.push(`직접 피해 없음 · 최대 체력 ${skillPercent(sk.healRatio ?? SKILL_FORMULA.healRatio)} 회복(회복량 보너스 적용)`); return out; }
        // v27.9 문체: 피해식은 '(기준)의 N%로 때립니다' 꼴로. 복합 피해는 유형을 앞에 붙입니다.
        const typeWord = sk.damageType === 'split' ? '복합 피해로 ' : '';
        const damage = `${typeWord}${base.length > 1 ? `(${base.join(' + ')})` : base[0]}의 ${number((sk.multiplier || 1) * 100)}%로 때립니다${sk.id === 'crush' ? `. 물리 방어 × ${number(SKILL_FORMULA.crushDefense)}를 더합니다` : ''}`;
        out.push(sk.restoreAll ? '직접 피해 없음. 나와 상대의 체력·마나를 모두 가득 채웁니다(전투당 1회, 쓸 때마다 직업 숙련 +25).' : sk.statusOnly ? '직접 피해 없음.' : `${damage}.`);
        if (sk.scaling === 'codex') out.push(`도감 기록(발견한 몬스터 + 등록한 물건) 1개마다 피해가 ${skillPercent(sk.scalingRatio ?? 0)} 커집니다.`);
        if (sk.scaling === 'catch') out.push(`피해 × (1 + log10(누적 처치 + 1) × ${number(sk.scalingRatio ?? 0)}) · 처치 10배마다 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.scaling === 'hunt') out.push(`피해 × (1 + √(던전 클리어 + 보스 처치) × ${number(sk.scalingRatio ?? 0)})`);
        if (sk.scaling === 'variant') out.push(`피해 × (1 + √(변종·황금 처치 수) × ${number(sk.scalingRatio ?? 0)})`);
        if (sk.scaling === 'mastered') out.push(`숙달한 직업 1개마다 피해 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.scaling === 'luck') out.push(`물리 공격 × (치명 피해 배율 − 1) × ${number(sk.scalingRatio ?? 1)} 추가(행운 비례)`);
        if (sk.scaling === 'gold') out.push(`피해 × (1 + log10(보유 골드 + 1) × ${number(sk.scalingRatio ?? 0)}) · 골드 자릿수가 늘 때마다 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.dice) { const d = sk.dice; out.push(`${ATTRIBUTE_NAMES[d.attribute]} ${d.per}마다 주사위를 1개 더 굴립니다(최대 ${d.max}개). 가장 높은 눈이 피해 배율이 됩니다: ${[1, 2, 3, 4, 5, 6].map(f => `${'⚀⚁⚂⚃⚄⚅'[f - 1]}×${diceMultiplier(d, f).toFixed(2)}`).join(' ')}`); out.push(`손가락 자르기를 장착하면 양 끝이 좁아집니다(3단계: ×${diceRange(d, 3).low.toFixed(2)}~×${diceRange(d, 3).high.toFixed(2)}).`); }
        if (sk.gamble) out.push(`쓸 때마다 ${[sk.gamble.min !== sk.gamble.max ? `피해 ×${number(sk.gamble.min)}~${number(sk.gamble.max)}(평균 ×${number((sk.gamble.min + sk.gamble.max) / 2)})` : '', sk.gamble.accuracy ? `이 기술 명중 ±${skillPercent(sk.gamble.accuracy)}p` : ''].filter(Boolean).join(' · ')} 무작위`);
        if (sk.allIn) out.push(`현재 체력의 ${skillPercent(sk.allIn.hpRatio)}(1은 남김)와 남은 마나 전부를 걸고 (건 체력 × ${number(sk.allIn.hpScale)} + 건 마나 × ${number(sk.allIn.manaScale)})를 피해식에 더합니다 · 빗나가도 소모`);
        if (sk.goldSpend) out.push(`보유 골드의 ${skillPercent(sk.goldSpend.ratio)}(한 번에 최대 ${sk.goldSpend.cap.toLocaleString()})를 실제로 쓰고, 쓴 골드 × ${number(sk.goldSpend.scale)}를 피해식에 더합니다`);
        if (sk.allIn?.heal) out.push(`건 마나 × ${number(sk.allIn.heal)}만큼 자신 회복`);
        if (sk.recoil) out.push(`준 피해의 ${skillPercent(sk.recoil)}를 자신도 받음 · 반동으로는 체력 1 아래로 내려가지 않음`);
        if (sk.sureHit) out.push('반드시 맞힙니다. 기절 뒤 면역 규칙은 그대로입니다.');
        if (sk.extraTurn) out.push('이 행동 뒤 곧바로 한 번 더 행동합니다. 연속 행동과 별개이고, 추가 행동에서는 다시 생기지 않습니다.');
        if (sk.sealPower) out.push(`이번 전투에 새긴 인 1개마다 피해 +${skillPercent(sk.sealPower)}`);
        if (sk.selfEffect) out.push(`쓰고 나면 자신 ${{ stun: '기절', slow: '감속', weaken: '약화' }[sk.selfEffect.status]} ${sk.selfEffect.turns}턴${sk.selfEffect.waivedBy ? ` · ${skillById(sk.selfEffect.waivedBy)?.name || ''}을 장착하면 생략` : ''}`);
        if (sk.seal) out.push('쓰면 이번 전투의 인(印)을 하나 새깁니다');
        if (sk.preyBonus) out.push(`보스와 지정 몬스터(리본 돼지·파이어보어·머쉬맘)에게는 직접 피해가 ${skillPercent(sk.preyBonus)} 커집니다.`);
        if (sk.damageType === 'split') out.push(`복합 피해는 물리 ${skillPercent(SKILL_FORMULA.splitPhysical)}·마법 ${skillPercent(1 - SKILL_FORMULA.splitPhysical)}로 나눠 각각의 방어를 적용합니다. 명중·치명 판정은 한 번이고, 장비·버프는 원시 피해에 들어가지 않습니다.`);
        if (sk.accuracyBonus) out.push(`이 기술은 명중이 ${skillPercent(sk.accuracyBonus)}p 높습니다.`);
        if (sk.penetrationBonus) out.push(`이 기술은 방어 관통이 ${skillPercent(sk.penetrationBonus)}p 높습니다(합계 최대 85%).`);
        if (sk.cleanseSelf) out.push('발동하면 내 출혈·중독·감속이 풀립니다.');
        if (sk.scaling === 'resist') out.push('결계 친화도: 직업의 마법 방어 배율이 높을수록 1에 가깝고(결계 계열), 다른 직업이 계승하면 최소 20%만 발휘');
        if (sk.scaling === 'defense') out.push('방어 친화도: 직업의 물리 방어 배율이 높을수록 1에 가깝고(수호 계열), 다른 직업이 계승하면 최소 20%만 발휘');
        if (sk.damageBonusCondition) out.push(sk.damageBonusCondition === 'lowHp' ? `체력이 ${skillPercent(SKILL_FORMULA.lowHpThreshold)} 이하인 적에게는 직접 피해가 ${skillPercent(sk.conditionalDamageBonus || 0)} 커집니다.` : `${{ bleeding: '출혈·중독', weakened: '약화', controlled: '침묵·감속' }[sk.damageBonusCondition]} 중인 적에게는 직접 피해가 ${skillPercent(sk.conditionalDamageBonus || 0)} 커집니다.`);
        if (sk.effect === 'heal') out.push(`${sk.condition === 'wounded' ? `체력이 ${skillPercent(SKILL_FORMULA.woundedThreshold)} 이하일 때 ` : ''}먼저 최대 체력의 ${skillPercent(sk.healRatio ?? SKILL_FORMULA.healRatio)}를 회복하고 공격합니다. 체력이 ${skillPercent(SKILL_FORMULA.healThreshold)} 이상일 때 쓰면 회복 직업이 아닌 한 피해가 ×${number(SKILL_FORMULA.idleHealDamage)}로 줄어듭니다.`);
        if (sk.effect === 'stun') out.push(`맞히면 ${sk.statusTurns ?? 1}턴 기절시킵니다.`);
        if (sk.effect === 'bleed') out.push(`맞히면 ${sk.dotName || '출혈'}을 ${sk.statusTurns ?? STATUS_TUNING.bleedTurns}턴 겁니다. 출혈 중인 상대는 받는 직접 피해가 ${skillPercent(SKILL_FORMULA.bleedVulnerability)} 커집니다(중첩 없음). 턴마다 (${base.join(' + ')}) × ${number(sk.dotRatio ?? SKILL_FORMULA.bleedRatio)} × (1 + 지속 피해 증가) + 상대 최대 체력 ${skillPercent(SKILL_FORMULA.bleedHpRatio)}의 피해를 방어를 무시하고 줍니다.`);
        if (sk.effect === 'poison') out.push(`맞히면 중독을 한 중첩 겁니다(최대 ${STATUS_TUNING.poisonMaxStacks}중첩, ${sk.statusTurns ?? STATUS_TUNING.poisonTurns}턴, 다시 걸면 지속 갱신). 턴마다 중첩당 (${base.join(' + ')}) × ${number(sk.dotRatio ?? SKILL_FORMULA.poisonRatio)} × (1 + 지속 피해 증가) + 상대 최대 체력 ${skillPercent(SKILL_FORMULA.poisonHpRatio)}의 피해를 줍니다(최대 체력분도 중첩마다 더해집니다). 방어를 무시합니다.`);
        if (sk.effect === 'burn') out.push(`맞히면 화상을 한 중첩 겁니다(최대 ${STATUS_TUNING.burnMaxStacks}중첩, ${sk.statusTurns ?? STATUS_TUNING.burnTurns}턴, 다시 걸면 지속 갱신). 화상 중인 상대는 받는 직접 피해가 ${skillPercent(SKILL_FORMULA.burnVulnerability)} 커집니다. 턴마다 중첩당 (${base.join(' + ')}) × ${number(sk.dotRatio ?? SKILL_FORMULA.burnRatio)} × (1 + 지속 피해 증가) + 상대 최대 체력 ${skillPercent(SKILL_FORMULA.burnHpRatio)}.`);
        if (sk.effect === 'weaken') out.push(`맞히면 ${sk.statusTurns ?? STATUS_TUNING.weakenTurns}턴 동안 상대의 직접 피해를 ${skillPercent(1 - SKILL_FORMULA.weakenedDamage)} 줄입니다(약화).`);
        if (sk.effect === 'silence') out.push(`맞히면 침묵 ${sk.statusTurns ?? STATUS_TUNING.silenceTurns}턴. 그동안 상대는 액티브를 쓰지 못합니다.`);
        if (sk.effect === 'slow') out.push(`맞히면 ${sk.statusTurns ?? STATUS_TUNING.slowTurns}턴 동안 상대 속도를 ${skillPercent(STATUS_TUNING.slowMultiplier)} 늦춥니다(감속).`);
        if (sk.effect === 'haste') out.push(`맞히면 ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴 동안 내 속도가 ${skillPercent(STATUS_TUNING.hasteMultiplier)} 빨라집니다(가속).`);
        if (sk.effect === 'drain') out.push(`깎은 체력의 ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)}를 회복합니다. 한 번에 최대 체력 × (흡혈률 + ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)}) × ${skillPercent(SKILL_FORMULA.lifestealHpCap)}까지입니다.`);
        const statusKey = ({ stun: 'stun', bleed: 'bleed', poison: 'poison', burn: 'burn', weaken: 'weaken', silence: 'silence', slow: 'slow' } as Record<string, keyof typeof STATUS_TUNING.immuneTurns>)[sk.effect || ''];
        if (statusKey) out.push(`${statusKey === 'poison' ? '중첩은 계속 쌓입니다.' : statusKey === 'burn' ? `최대 ${STATUS_TUNING.burnMaxStacks}중첩까지 쌓고, 가득 차 있으면 이 기술은 건너뜁니다.` : '상대에게 이미 걸려 있으면 이 기술은 건너뜁니다.'} 풀린 뒤 ${STATUS_TUNING.immuneTurns[statusKey]}턴은 면역입니다.`);
        if (sk.extraAttacks) out.push(`이어서 추가 공격을 ${Math.min(STATUS_TUNING.maxExtraAttacks, sk.extraAttacks)}회 합니다. 각 타격은 위 피해식의 ${skillPercent(sk.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier)}입니다.`);
    }
    for (const [key, n] of byStatOrder(Object.entries(sk.bonus || {}))) out.push(skillBonusText(key, n as number));
    for (const pc of sk.perCount || []) out.push(`${COUNT_WORD[pc.source]} ${pc.per.toLocaleString()}마다 ${byStatOrder(Object.entries(pc.bonus)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${pc.cap}회)`);
    if (sk.song) out.push('노래: AP 0 · 엔젤릭버스터 계보 직업만 장착');
    if (sk.multicast) out.push(`동시 시전: 이 기술이 먼저 성공하면 편성의 다른 동시 시전 기술도 각자 발동률로 한 행동에 함께 나갑니다(최대 ${SKILL_FORMULA.multicast.max}개). 함께 나간 종류 하나마다 재사용 대기 +${SKILL_FORMULA.multicast.cooldownStep}, 마나 +${skillPercent(SKILL_FORMULA.multicast.manaScale)}`);
    if (sk.cooldownReset) out.push(`${({ crit: '치명타가 터지면', kill: '상대를 쓰러뜨리면', chain: '연속 행동마다' })[sk.cooldownReset.on]} ${sk.cooldownReset.chance >= 1 ? '항상' : `${skillPercent(sk.cooldownReset.chance)} 확률로`} ${({ longest: '가장 긴 재사용 대기 하나', first: '편성 순서 첫 번째 대기 중인 기술', all: '모든 재사용 대기' })[sk.cooldownReset.pick]}를 초기화`);
    if (sk.lastStand) out.push(`체력이 1 아래로 내려가지 않음 · 쓰러질 피해(추가타·지속 피해·반격 포함)를 받으면 체력 1로 버티고${sk.lastStand.heal ? ` 최대 체력 ${skillPercent(sk.lastStand.heal)} 회복` : ''} · 전투당 ${sk.lastStand.charges}번${sk.lastStand.chargesPerLevel ? ` (숙련 1단계마다 +${sk.lastStand.chargesPerLevel}번)` : ''}`);
    if (sk.sealFinale) out.push(`일곱 글자를 모두 장착하고 한 전투에 여섯 글자를 모두 쓰면 발동: (물리 공격 + 마법 공격) × (${number(sk.sealFinale.base)} + 일곱 글자와 天의 숙련 합 × ${number(sk.sealFinale.perLevel)}) 고정 피해 · 기절 ${sk.sealFinale.stun}턴 · 인 초기화`);
    if (sk.unlockAfter) out.push(`해금: ${skillById(sk.unlockAfter.skill)?.name || sk.unlockAfter.skill} 숙련 Lv.${sk.unlockAfter.level}`);
    if (sk.perRebirth) out.push(`환생 1회마다 ${byStatOrder(Object.entries(sk.perRebirth)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${SKILL_FORMULA.perRebirthCap}회)`);
    if (sk.penaltyRelief) out.push(`현재 직업의 마이너스 보정(체력·공격·방어 배율) ${skillPercent(sk.penaltyRelief)} 회복 · 여러 개면 가장 큰 값만`);
    if ((jobById(sk.job)?.tier || 0) >= SKILL_FORMULA.signatureTier) out.push(`전용 기술입니다. 계보 밖 직업이 계승하면 ${sk.type === 'active' ? '피해 배율' : '능력치'}이 ×${number(SKILL_FORMULA.signatureScale)}로 줄어듭니다.`);
    if (sk.masteryGain) out.push(`${masteryConditionText(sk)} 처치 시 숙련 ×${masteryPerVictory(masteryGainBonus(sk, level))}`);
    if (sk.type === 'passive' && !sk.song && !sk.levelEffects && SKILL_FORMULA.masteredPassiveAP) out.push(level >= maxSkillLevel(sk) ? `최대 성장을 마쳐 장착 AP가 ${SKILL_FORMULA.masteredPassiveAP} 줄어 있습니다.` : `최대 성장(Lv.${maxSkillLevel(sk)})에 닿으면 장착 AP가 ${SKILL_FORMULA.masteredPassiveAP} 줄어듭니다.`);
    return out;
}
export function skillGrowthStages(sk: Skill) {
    const milestones = masteryMilestonesFor(sk), max = maxSkillLevel(sk), lb = PROGRESSION.limitBreak;
    // v27.6 한계돌파 단계(최대 성장 다음 1~max)는 숙련 채널로만 도달하므로 mastery 인자로 흉내 냅니다.
    return Array.from({ length: max + 1 + lb.max }, (_, level) => {
        const broken = Math.max(0, level - max);
        const effective = broken ? effectiveSkill(sk, 1, level) : effectiveSkill(sk, level + 1);
        return { level, practice: level ? (broken ? milestones[max - 1] * lb.practiceMultiple[broken - 1] : milestones[level - 1]) : 0, broken, effective, effects: skillEffectLines(effective, level) };
    });
}
