// 밸런스 점검 스크립트가 함께 쓰는 시뮬레이션 도우미: 시드 난수, 누적 경험치, 장비 점수, 관리형 빌드 운영, 사냥터 선택.
import { loadGame } from './game-modules.mjs';

const { load } = loadGame();
const { tick, act } = await load('systems/engine');
const { canChangeJob, canUse, validLoadout, attributes, lineage } = await load('systems/progression');
const { itemStats } = await load('systems/equipment');
const { STAGES } = await load('data/world');
const { SKILLS } = await load('data/skills');
const { xpNeeded } = await load('data/balance');
const { xpWall } = await load('systems/meta');

/** 명령줄 옵션: `--key 값`이 있으면 그 값, 없으면 기본값. */
export const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
/** 중앙값(비어 있으면 0). */
export const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length ? v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2 : 0; };
/** 큰 수를 억 · 만 단위로. */
export const fmtKo = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${Math.round(n / 1e4)}만` : `${Math.round(n)}`;
/** 레벨 L · 경험치 E에서 지금 상태까지 번 누적 경험치. */
export const expBetween = (s, L, E) => { let n = s.exp - E; for (let l = L; l < s.level; l++) n += xpNeeded(l, s.rebirths, xpWall(s)); return n; };
/** 직업 점검용 편성: 자기 직업 → 계보(선행 직업) → 공용(피해 유형 일치 · 패시브 우선) 순서로 AP가 허락하는 만큼. */
export function loadout(s, j, magic) {
    const line = lineage(j.id);
    const rank = sk => sk.job === j.id ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? (sk.damageType === 'magic') === magic || sk.type === 'passive' ? 2 : 3 : 9;
    const pool = SKILLS.filter(sk => canUse(s, sk.id) && rank(sk) < 9).sort((a, b) => rank(a) - rank(b) || b.level - a.level);
    s.skills = [];
    for (const sk of pool) if (validLoadout(s, [...s.skills, sk.id])) s.skills.push(sk.id);
}

/** mulberry32 계열 시드 난수. */
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const totalXP = s => s.exp + Array.from({ length: s.level - 1 }, (_, i) => xpNeeded(i + 1, s.rebirths || 0)).reduce((a, b) => a + b, 0);
export function gearScore(item, magic) { const v = itemStats(item); return (v[magic ? 'magic' : 'attack'] || 0) * 4 + (v.hp || 0) * .22 + (v.defense || 0) * 1.5 + (v.resist || 0) * 1.2 + (v.accuracy || 0) * 150 + (v.crit || 0) * 150; }

/**
 * 관리형 빌드 운영: 능력치 배분 → 전직 → 스킬 편성 → (선택) 장비 교체 → 낚시 시작.
 * secondary/primary: 보조(기민·정신)와 주 능력치(근력·지능) 목표치. skillFilter로 편성 후보를 거를 수 있습니다.
 */
export function manage(s, { magic, rng, secondary = 10, primary = 12, gear = true, skillFilter = () => true }) {
    const actNow = a => act(s, a, s.turn * 2000, rng);
    while (s.statPoints) { const v = attributes(s); const id = magic ? (v.wis < secondary ? 'wis' : v.int < primary ? 'int' : s.statPoints % 4 === 0 ? 'vit' : 'int') : (v.dex < secondary ? 'dex' : v.str < primary ? 'str' : s.statPoints % 4 === 0 ? 'vit' : 'str'); actNow({ type: 'attribute', id }); }
    for (const id of magic ? ['tide', 'tempest'] : ['harpoon', 'whaler']) if (s.job !== id && !s.unlockedJobs.includes(id) && canChangeJob(s, id)) actNow({ type: 'job', id });
    const score = sk => (sk.job === s.job ? 10 : 0) + (sk.damageType === 'magic' === magic ? 2 : 0);
    const priority = SKILLS.filter(sk => canUse(s, sk.id) && skillFilter(sk)).sort((a, b) => score(a) - score(b)).reverse();
    s.skills = []; for (const sk of priority) if (validLoadout(s, [...s.skills, sk.id])) s.skills.push(sk.id);
    if (gear) for (const item of [...s.inventory]) if (gearScore(item, magic) > gearScore(s.equipment[item.slot] || { slot: item.slot, power: 0, rarity: 0, level: 0 }, magic)) actNow({ type: 'equip', id: item.id });
    s.running = true;
}

/** 입장 가능한 낚시터를 180턴씩 미리 돌려 경험치 효율이 가장 높은 곳으로 옮깁니다. */
export function chooseStage(s, seed) {
    let best = s.stage, rate = -1;
    for (const st of STAGES.filter(x => x.level <= s.level && x.rebirth <= s.rebirths)) {
        const t = structuredClone(s); t.stage = st.id; t.enemy = null; t.running = true; const start = totalXP(t); const rng = random(seed); for (let n = 0; n < 180; n++) tick(t, rng); const gain = totalXP(t) - start; if (gain > rate) { rate = gain; best = st.id; }
    }
    if (best !== s.stage) act(s, { type: 'stage', id: best }, s.turn * 2000, random(seed));
}
