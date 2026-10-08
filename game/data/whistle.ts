/**
 * v3.160 호루라기: SP를 내고 다음 사냥터 출현을 고른 특별 몬스터로 정합니다(하루 WHISTLE.perDay번, 던전 · 랜덤게임 제외).
 * v3.162 정수의 슬라임도 부를 수 있고, 전투 화면 장면 구석의 작은 버튼으로 옮겼습니다(규칙은 도움말 ‘사냥 규칙’). 대왕 시리즈는 부를 수 없습니다.
 */
import { MIMIC, WHISTLE } from './mimic';
import { EXP_NURI } from './exp-nuri';
import { ESSENCE_SLIME } from './essence-slime';
export { WHISTLE };
export type WhistleKind = 'mimic' | 'nuri' | 'slime';
export type WhistleTarget = { id: WhistleKind; name: string; /** 메뉴용 짧은 이름. */ short: string; minLevel: number; minKills: number; /** 한 줄 보상 설명(도움말). */ reward: string };
export const WHISTLE_TARGETS: readonly WhistleTarget[] = [
    { id: 'mimic', name: '숙련의 까미', short: '까미', minLevel: MIMIC.minLevel, minKills: MIMIC.minKills, reward: `숙련 로또 ${MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()}`).join(' · ')}` },
    { id: 'nuri', name: '경험의 누리', short: '누리', minLevel: EXP_NURI.minLevel, minKills: EXP_NURI.minKills, reward: `경험치 로또 Lv 필요량 ${EXP_NURI.tiers.map(t => `${t.label} ${Math.round(t.pct * 100)}%`).join(' · ')}(또는 출현 ${EXP_NURI.tiers.map(t => Math.round(t.pct * EXP_NURI.encountersPerPct)).join(' · ')}회분)` },
    { id: 'slime', name: '정수의 슬라임', short: '정수 슬라임', minLevel: ESSENCE_SLIME.minLevel, minKills: ESSENCE_SLIME.minKills, reward: `정수 로또 난이도 묶음 ${ESSENCE_SLIME.tiers.map(t => `${t.label} ×${t.mul}`).join(' · ')}` },
];
export const whistleTarget = (id: string) => WHISTLE_TARGETS.find(t => t.id === id);
/** 그 몬스터를 부를 조건(자연 등장과 같은 레벨 · 누적 처치. 사냥터 난이도 조건은 호루라기가 대신합니다). */
export const whistleOk = (s: { level: number; kills: number }, t: WhistleTarget) => s.level >= t.minLevel && s.kills >= t.minKills;
