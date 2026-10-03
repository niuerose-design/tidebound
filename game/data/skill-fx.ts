/**
 * v27.14 스킬별 연출 갈래 지정. combat-feedback의 id 규칙보다 먼저 봅니다.
 * 규칙으로 잘못 걸리는 스킬만 적고, 나머지는 id 규칙에 맡깁니다. 갈래 목록은 CombatFxVariant.
 */
export type SkillFx = 'pierce' | 'slash' | 'quake' | 'bite' | 'wave' | 'lightning' | 'fire' | 'frost' | 'star' | 'gold' | 'song' | 'ward' | 'heal' | 'curse' | 'arcane' | 'impact' | 'glyph';
export const SKILL_FX: Record<string, SkillFx> = {
    // 행운 외길: 주사위 계열은 모두 금빛
    heavenlyDice: 'gold', luckyBreak: 'gold', heavenlyStrike: 'gold',
    // 기민 외길: 찌르기·잔상
    rapidJab: 'pierce', galeTriple: 'pierce', afterimageFlurry: 'slash',
    // 근력·체질 외길: 땅울림
    logSwing: 'quake', mountainCleave: 'quake', boulderToss: 'quake', landslide: 'quake', massiveCharge: 'quake',
    // 성해 기사: 빛
    oath: 'star', vowStrike: 'star',
    // 독립 물리·복합
    netThrow: 'wave', oathShout: 'song', runeBurst: 'arcane', harmonicWeight: 'quake', windupCast: 'arcane',
    // 작살 사냥꾼: 관통·베기
    abyssHarpoon: 'pierce', krakenBore: 'pierce', needleStep: 'slash',
    // 경제·망인
    goldenStorm: 'gold', harvestEcho: 'curse',
    // 조류: 물결
    tsunamiRush: 'wave', tidalCollapse: 'wave', voidTorrent: 'wave',
    // 마력탄: 마법 기본 갈래
    pureBolt: 'arcane', manaBolt: 'arcane', encyclopediaBolt: 'arcane', borrowedForm: 'arcane',
    // 부식·모사·맨손
    saltCatalyst: 'curse', borrowedTentacles: 'bite', bareGrab: 'quake',
    // 시계공·시간의 지배자: 서리(멈춘 시간)
    windUp: 'frost', slackHand: 'frost', timeMachine: 'frost', precede: 'frost',
    // 여명·천 번의 삶: 빛
    dawnFlare: 'star', thousandLives: 'star',
};
