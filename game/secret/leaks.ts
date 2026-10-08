/**
 * v3.57 정보 비공개 6단계(docs/concept.md 10.3-6): 해커 ‘정보 해킹’이 알아내는 비밀 조각(서버 전용).
 * 조각은 데이터에서 자동으로 만듭니다: 드롭·확률 수치(odds.ts) · 몬스터 출현 가중치 · 히든 직업의 전직 조건 · 숨은 조건(v3.62, 옛 발견의 문).
 * 퍼뜨리기는 기존 기능(방송 탈취·채팅)으로 합니다. 해커가 이미 아는 조각과 이미 들어가 본 직업은 빼고 고릅니다.
 */
// 서버 전용 표식: 화면(클라이언트) 번들이 이 파일을 가져가면 빌드가 실패합니다(docs/concept.md 10.2-1).
import 'server-only';
import type { State } from '../types';
import { SERVER_ODDS } from './odds';
import { SECRET_JOBS } from './jobs';
import { RARITIES } from '../data/balance';
import { VARIANTS } from '../data/variants';
import { FISH, HABITAT } from '../data/world';
import { APPRAISAL } from '../data/economy';
import { jobById } from '../data/classes';
import { jobRequirements } from '../systems/progression';

export type Leak = { id: string; text: string };
const pct = (x: number) => `${Math.round(x * 100_000) / 1000}%`;
/** 숨은 조건의 정확한 문장(정확한 조건은 여기서만). secret/unlocks.ts의 test와 같은 내용입니다. */
export const UNLOCK_CONDITIONS: Record<string, string> = {
    undead: '10번 쓰러지기', clockmaker: '사냥터에서 10시간 보내기',
    krakenkin: '보스 10마리 처치', poorMonk: 'Lv.15 이상인데 골드 100 미만', journeyman: '직업 3개 끝까지 숙달',
    // 표에 없는 숨은 조건 직업이 생기면 tests/odds.test.mjs가 알려 줍니다.
};

/** 드롭·확률 조각(고정). */
function oddsLeaks(): Leak[] {
    const o = SERVER_ODDS, fish = (id: string) => FISH.find(f => f.id === id)?.name || id;
    return [
        { id: 'drop:base', text: `장비 드롭 기본 확률은 처치당 ${pct(o.drop.chance)}, 상한 ${pct(o.drop.cap)}입니다(드롭 보너스는 이 확률에 곱해짐).` },
        { id: 'drop:rarity', text: `장비 등급 분포: ${o.drop.rarity.map((w, i) => `${RARITIES[i].name} ${pct(w)}`).join(' · ')}.` },
        { id: 'drop:tide', text: `사냥터 난이도 1마다 희귀 이상 등급 가중치가 (1 + ${o.drop.tideRarityPerTier})^(등급−1)로 늘어납니다.` },
        { id: 'drop:essence', text: `정수는 처치마다 난이도 × ${pct(o.drop.essenceChancePerTier)} 확률로, 양은 1 + 난이도 ÷ ${o.drop.essenceEveryTiers}입니다.` },
        { id: 'drop:dungeon', text: `던전 반복 정복의 확률 장비(예전 ${pct(o.drop.dungeonRepeat)})는 v3.188에 없어졌고, 던전 코인샵의 희귀 이상 장비 상자가 대신합니다.` },
        { id: 'drop:golden', text: `황금 개체 기본 확률은 처치마다 ${pct(o.drop.goldenBase)}입니다.` },
        { id: 'mimic:chance', text: `숙련의 까미: 출현마다 ${pct(o.mimic.chance)} + 난이도 1당 ${pct(o.mimic.perTier)}p, 사냥터 순서마다 ×${o.mimic.stageStep}씩 더 곱합니다.` },
        { id: 'mimic:tiers', text: `까미 당첨: 소 ${pct(o.mimic.tiers[0])} · 중 ${pct(o.mimic.tiers[1])} · 대 ${pct(o.mimic.tiers[2])}(행운의 편지 8단계부터 대 ${pct(o.mimic.letterJackpot)}).` },
        { id: 'nuri:chance', text: `경험의 누리: 출현마다 ${pct(o.nuri.chance)} + 난이도 1당 ${pct(o.nuri.perTier)}p.` },
        { id: 'nuri:tiers', text: `누리 당첨: 소 ${pct(o.nuri.tiers[0])} · 중 ${pct(o.nuri.tiers[1])} · 대 ${pct(o.nuri.tiers[2])}.` },
        { id: 'onyx:spawn', text: `칠흑의 보스: 무리 서식지 출현마다 ${pct(o.onyx.chance)} × (1 + 난이도 × ${o.onyx.perTier}), ${o.onyx.pity.toLocaleString()}번 못 보면 확정.` },
        { id: 'onyx:drop', text: `칠흑 장신구: 격파마다 ${pct(o.onyx.drop)}, ${o.onyx.dropPity}번째 연속 미획득 격파는 확정.` },
        { id: 'variant:chance', text: `변종 기본 확률: ${VARIANTS.map(v => `${v.name} ${pct(o.variant.chance[v.id] ?? 0)}`).join(' · ')}.` },
        { id: 'variant:swarm', text: `무리 규모 가중치 ×5 : ×100 : ×500 = ${o.variant.swarmWeights.join(' : ')}, 무리 서식지의 ×${HABITAT.sizes[1]}은 ${pct(o.variant.habitatBig)}.` },
        ...Object.entries(o.variant.region).map(([region, row]) => ({ id: `variant:region:${region}`, text: `${region}의 변종 배율: ${VARIANTS.map(v => `${v.name} ×${row[v.id] ?? 1}`).join(' · ')}.` })),
        { id: 'appraisal', text: `상점 감정 등급 확률: ${APPRAISAL.map((r, i) => `${RARITIES[r.rarity].name} ${pct(o.appraisal[i])}`).join(' · ')}.` },
        ...Object.entries(o.spawn).filter(([, w]) => w > 0).map(([id, w]) => ({ id: `spawn:${id}`, text: `희귀 몬스터 ${fish(id)}의 출현 가중치는 ×${w}(보통 몬스터 ×1)입니다.` })),
    ];
}
/** 히든 직업 조각: 숨은 조건 또는 전직 조건. 이미 들어가 본 직업은 뺍니다. */
function jobLeaks(s: State): Leak[] {
    return SECRET_JOBS.filter(raw => !s.unlockedJobs.includes(raw.id)).map(raw => {
        const j = jobById(raw.id) || raw;
        if (UNLOCK_CONDITIONS[j.id]) return { id: `job:${j.id}`, text: `${j.name}: 숨은 조건은 ‘${UNLOCK_CONDITIONS[j.id]}’입니다.` };
        const need = jobRequirements(s, j).map(r => r.label).join(' · ');
        return { id: `job:${j.id}`, text: `${j.name}: ${j.parent ? `${jobById(j.parent)?.name ?? j.parent}에서 전직, ` : ''}조건은 ${need}입니다.` };
    });
}
/** 이 해커가 아직 모르는 조각들. */
export function leakPool(s: State, known: Set<string>) {
    return [...oddsLeaks(), ...jobLeaks(s)].filter(l => !known.has(l.id));
}
