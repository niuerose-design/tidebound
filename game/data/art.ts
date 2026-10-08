/**
 * v27.11 외부 생성 이미지 자리와 실루엣 폴백.
 * 이미지는 public/art/{monsters|jobs}/{id}.webp 에 두면 자동으로 쓰이고, 없으면 실루엣이 그대로 남습니다.
 * 파일 이름은 몬스터 id / 계보 id와 같습니다(docs/art/README.md).
 */
import { MONSTERS } from './world';

import { MONSTER_ART, JOB_ART, ONYX_ART } from './art-manifest';
/** v27.57 그림이 있으면 경로, 없으면 null(요청하지 않고 실루엣·아이콘). 목록은 node scripts/art-manifest.mjs 가 만듭니다. */
export const monsterArtSrc = (id: string) => MONSTER_ART[id] ? `/art/monsters/${id}.${MONSTER_ART[id]}` : null;
export const jobArtSrc = (lineageId: string) => JOB_ART[lineageId] ? `/art/jobs/${lineageId}.${JOB_ART[lineageId]}` : null;
/** v3.14 칠흑 장신구 그림(public/art/onyx/{보스id}.png|webp). 없으면 null(components/game/onyx-art의 SVG). */
export const onyxArtSrc = (bossId: string) => ONYX_ART[bossId] ? `/art/onyx/${bossId}.${ONYX_ART[bossId]}` : null;
/** v27.40 스킬 아이콘(원작 도트 아이콘을 그대로 쓰려고 PNG). 있는 파일 목록은 art-manifest.ts. */
export const skillArtSrc = (skillId: string) => `/art/skills/${skillId}.png`;

/** 실루엣 모양. 몬스터마다 하나를 고정해 두어 이미지가 없어도 책·장면에서 종류를 구분할 수 있게 합니다. */
export type MonsterShape = 'snail' | 'mushroom' | 'slime' | 'pig' | 'boar' | 'golem' | 'eye' | 'monkey' | 'drake' | 'ghost' | 'skeleton' | 'octopus' | 'bat' | 'crab' | 'croc' | 'snake' | 'bubble' | 'chest' | 'demon' | 'mage' | 'fighter' | 'statue' | 'clock';
/** v27.42 메이플 몬스터 모양으로 다시 짰습니다(maple-monsters.ts 이름 기준). */
export const MONSTER_SHAPES: Record<string, MonsterShape> = {
    // 달팽이 · 버섯 · 슬라임
    minnow: 'snail', carp: 'snail', perch: 'snail', mackerel: 'mushroom', ray: 'slime', puffer: 'mushroom',
    barracuda: 'mushroom', seahorse: 'mushroom', needlefish: 'mushroom', tidejelly: 'mushroom',
    // 돼지 · 멧돼지
    lionfish: 'pig', eel: 'pig', stormBarracuda: 'boar', ghost: 'boar', emberEel: 'boar', abyssManta: 'boar',
    // 골렘 · 해골 · 눈 · 원숭이 · 망령
    shark: 'golem', ashRay: 'golem', magmaPuffer: 'golem', angler: 'skeleton', viper: 'eye', squid: 'eye', leviathan: 'eye',
    moonfish: 'monkey', dragon: 'monkey', eclipseMoonfish: 'ghost', glassSquid: 'ghost',
    // 용 · 비룡
    cinderKoi: 'drake', ancient: 'drake', novaManta: 'drake', ventLeviathan: 'drake',
    // 커닝시티
    starKoi: 'bubble', prismRay: 'octopus', voidGuppy: 'bat', ventCrab: 'crab', sulfurEel: 'snake', blindShark: 'croc', cinderAngler: 'croc',
    // v3.10 아쿠아로드 · 리프레 · 시간의 신전 · 아케인 리버
    aqSeaco: 'pig', aqShark: 'croc', aqSquid: 'octopus', aqFlower: 'mushroom', aqGuard: 'fighter', lfBlueTurtle: 'golem', lfRedTurtle: 'golem', lfWyvern: 'drake', lfSkelegon: 'skeleton', lfManticore: 'boar',
    ttMonitor: 'eye', ttGuardian: 'statue', ttChimera: 'demon', ttDodo: 'bat', ttLyka: 'croc', arErdaSpirit: 'ghost', arMemoryGuard: 'statue', arMysticErda: 'bubble', arVanishSoul: 'ghost', arTrueErda: 'bubble',
    // 까미 · 보스
    masteryMimic: 'chest', expNuri: 'ghost', essenceSlime: 'slime', kingMimic: 'chest', kingNuri: 'ghost', kingSlime: 'slime',
    onyxDusk: 'ghost', onyxDunkel: 'fighter', onyxWill: 'mage', onyxLucid: 'mage', onyxHilla: 'mage', onyxSeren: 'fighter', onyxBlackMage: 'mage',
    grottoWarden: 'mushroom', kelpHydra: 'slime', anchorWraith: 'mushroom', magmaKraken: 'demon', templeOracle: 'mage', abyssSovereign: 'fighter', ventColossus: 'statue', starfallSeraph: 'clock',
};
export const monsterShape = (id: string): MonsterShape => MONSTER_SHAPES[id] ?? 'slime';
/** 모양 표가 빠뜨린 몬스터(테스트가 비어 있는지 확인합니다). */
export const unmappedMonsters = () => MONSTERS.filter(f => !(f.id in MONSTER_SHAPES)).map(f => f.id);
