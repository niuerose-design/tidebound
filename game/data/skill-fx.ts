/**
 * v27.14 스킬별 연출 갈래 지정. combat-feedback의 id 규칙보다 먼저 봅니다.
 * 규칙으로 잘못 걸리는 스킬만 적고, 나머지는 id 규칙에 맡깁니다. 갈래 목록은 CombatFxVariant.
 */
export type SkillFx = 'pierce' | 'slash' | 'quake' | 'bite' | 'wave' | 'lightning' | 'fire' | 'frost' | 'star' | 'gold' | 'song' | 'ward' | 'heal' | 'curse' | 'arcane' | 'impact' | 'glyph' | 'venom' | 'ink' | 'bone' | 'time';
export const SKILL_FX: Record<string, SkillFx> = {
    // 행운 외길: 주사위 계열은 모두 금빛
    heavenlyDice: 'gold', luckyBreak: 'gold', heavenlyStrike: 'gold',
    // 기민 외길: 찌르기·잔상
    rapidJab: 'pierce', galeTriple: 'pierce', afterimageFlurry: 'slash',
    // 근력·체질 외길: 땅울림
    logSwing: 'quake', mountainCleave: 'quake', boulderToss: 'quake', landslide: 'quake', massiveCharge: 'quake',
    // 루미너스 (2차): 빛
    oath: 'star', vowStrike: 'star',
    // 독립 물리·복합
    runeBurst: 'arcane',
    // 아처: 관통·베기
    abyssHarpoon: 'pierce', krakenBore: 'pierce', needleStep: 'slash',
    // 경제
    goldenStorm: 'gold',
    // 조류: 물결
    tsunamiRush: 'wave', tidalCollapse: 'wave', voidTorrent: 'wave',
    // 마력탄: 마법 기본 갈래
    pureBolt: 'arcane', manaBolt: 'arcane',
    // 부식·모사·맨손
    saltCatalyst: 'venom', borrowedTentacles: 'bite',
    // 제로 (1차)·제로 (4차): 시간 갈래
    // 매지션(불,독)·부식 연성: 독 갈래
    toxicFang: 'fire', venomDart: 'venom', doomMark: 'venom', miasma: 'venom', rotBloom: 'venom', corrosiveBloom: 'venom', transmute: 'venom', grandTransmutation: 'venom',
    // 팬텀 (1차): 먹물 갈래
    inkTrick: 'ink', 
    // 망인 계보: 뼈 갈래
    // 여명·천 번의 삶: 빛
    // v3.195 인피니티 플레임 서클은 불, 엔젤레이는 빛(id 규칙은 genesis → star, blessing → heal로 잡음)
    genesis: 'fire', tidalBlessing: 'star',
};
