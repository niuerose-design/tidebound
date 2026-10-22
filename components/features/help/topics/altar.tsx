import { Fish, Flame, Gauge, Sparkles, Swords, Target } from 'lucide-react';
import { BALANCE, DUNGEON_MODES } from '@/game/data/balance';
import { percent } from '@/game/data/progression';
import { ECONOMY } from '@/game/data/economy';
import { DEPTH_SCALE } from '@/game/data/world';
import { ALTAR, BLESSINGS, RAID, RAIDS, raidRespawnMs, respawnLabel } from '@/game/data/altar';
import { MIMIC } from '@/game/data/mimic';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { ESSENCE_SLIME } from '@/game/data/essence-slime';
import { KING } from '@/game/data/king';
import { WHISTLE, WHISTLE_TARGETS } from '@/game/data/whistle';
import { TIDE_CHALLENGE } from '@/game/systems/meta';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function AltarTopic({ secret }: { secret: boolean }) {
    return (
    <Topic icon={<Flame size={19}/>} title="제단 · 난이도 · 특수 몬스터" note="모두가 함께 채우는 제단, 사냥터·던전 난이도, 까미와 누리.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Flame size={19}/>} title="제단 · 축복"
                effect={`골드·세계석·정수를 바치면 기여도(골드 ${ALTAR.goldPerPoint.toLocaleString()} = 1 · 세계석 1 = ${ALTAR.pearlPoints} · 정수 1 = ${ALTAR.essencePoints})가 고른 게이지에 쌓입니다. 축복 게이지가 차면 모든 모험가에게 ${BLESSINGS[0].hours}시간 동안 효과가 켜집니다: ${BLESSINGS.map(b => b.name).join(' · ')}.`}
                condition="게이지는 서버 전체가 공유합니다. 혼자 다 채울 필요가 없고, 바친 만큼 주간 기여 순위에 오릅니다(익명 선택 가능)."
                limit={`축복은 6단계까지 겹쳐 세지고 시간이 지나면 꺼집니다. 1·2·3단계는 열거나 올릴 때마다 지금부터 ${BLESSINGS[0].hours}시간 유지되고, 기본 비용 ×2씩(풍요 1,200만 · 2,400만 · 4,800만 골드), 4·5·6단계는 골드 3,000억 · 1조 · 3조 상당이고 각각 4시간 · 2시간 · 1시간만 유지된 뒤 3단계로 내려와 12시간 이어집니다(6단계 연장도 같은 값·같은 시간). 바치기에서 목표 단계를 고르면 그 단계까지의 총 비용을 한 번에 바쳐 점핑할 수 있습니다. 3단계에서는 싼 연장이 없어 축복이 끝나면 1단계부터 다시 채웁니다. 바치기 간격 ${ALTAR.offerCooldownMs / 1000}초.`}/>
            <Rule icon={<Swords size={19}/>} title="신 소환 · 신의 자리 · 탄핵"
                effect={`신 소환 게이지(기여도 ${ALTAR.godCost.toLocaleString()})가 차면 신이 ${ALTAR.godLifetimeMs / 3600_000}시간 깨어납니다. 신을 처음 쓰러뜨린 모험가가 신의 자리에 앉아 다른 모험가가 바치는 재화의 ${ALTAR.titheRate * 100}%를 거둡니다.`}
                condition={`도전 간격 ${ALTAR.challengeCooldownMs / 60_000}분. 신 카드에 최대 체력과 공격이 보이니 결투 전투력과 비교해 보세요. 신이 없을 때는 자리 주인을 ‘탄핵’할 수 있습니다: 주인이 신을 격파하던 당시의 능력치·스킬 그대로와 겨뤄 이기면 자리가 빕니다.`}
                limit={`임기는 ${ALTAR.throneTermMs / 86_400_000}일. 자리가 비면 다음 신은 다시 ${ALTAR.firstGod.name}이고, 앉으려면 그 신을 쓰러뜨려야 합니다.`}/>
            <Rule icon={<Swords size={19}/>} title="월드보스"
                effect={`소환 탭의 월드보스 게이지(${RAIDS.map(r => `${r.name} ${r.cost.toLocaleString()}`).join(' · ')})가 차면 그 보스가 나타납니다(${RAIDS.map(r => `${r.name} ${r.lifetimeHours}시간`).join(' · ')} 머물고, 격파 뒤 다음 소환까지 ${RAIDS.map(r => `${r.name} ${respawnLabel(raidRespawnMs(r))}`).join(' · ')} 대기). 소환 게이지에는 세계석 · 정수만 바칠 수 있습니다(골드는 축복 게이지만). 체력은 서버가 함께 쓰는 하나의 값이라 모든 모험가의 피해가 누적되고, 0이 되면 격파입니다.`}
                condition={`도전은 ${RAID.cooldownMs / 60_000}분에 한 번, 한 번에 최대 ${RAID.maxTurns}턴. 격파하면 한 번이라도 때린 모험가 전원이 세계석(·SP)을 다음 동기화 때 받고, 마지막 일격은 보너스를 더 받습니다. 피해 순위는 제단의 월드보스 카드에서 봅니다.`}
                limit="한 번에 한 마리만 나타납니다. 시간 안에 못 잡으면 떠나고 게이지는 다시 채워야 합니다. 신 소환과는 별개입니다."/>
            {/* v3.103 사냥터 개편: 입장 환생 · 적정 환생 */}
            <Rule icon={<Target size={19}/>} title="사냥터 입장 · 적정 환생"
                effect="사냥터 카드의 ‘Lv. N+ · 환생 N회’는 입장 조건이고, ‘적정 환생 M’은 잘 키운 몸(자기 직업 패시브 · 그 환생에 맞는 장비 · 연구)이 난이도 0에서 무리 없이 사냥하는 환생입니다(서식지는 시간당 사망 5회 이하). 적정 환생이 입장 조건과 같으면 따로 적지 않습니다."
                condition="다른 직업 패시브를 많이 빌린 몸은 적정 환생보다 훨씬 일찍 갈 수 있습니다. 적정 환생에 닿은 뒤의 실제 어려움은 사냥터 난이도가 정합니다."
                limit="자동 따라가기(승천)는 적정 환생에 닿은 사냥터 중 가장 높은 곳으로 옮깁니다."/>
            <Rule icon={<Gauge size={19}/>} title="사냥터 난이도 · 던전 난이도"
                effect={`사냥터 난이도는 환생 횟수 + 도전 보너스만큼(최대 ${ECONOMY.tideCap}) 올릴 수 있습니다. 도전 보너스(v3.313): 지역 던전 7곳의 나이트메어 최고 단계 합에 비례해 최대 +${TIDE_CHALLENGE.nightmareMax}(모두 10단계), 무릉도장 최고 층 × ${TIDE_CHALLENGE.abyssPerFloor}(최대 +${TIDE_CHALLENGE.abyssMax}). 몬스터 체력·공격이 오르는 대신 골드·경험치 배율과 장비 레벨이 오르고, 드롭 장비의 상위 등급 비율이 조금씩 오르며${secret ? '' : '(난이도 100에서 태초 0.6% → 1%)'}, 난이도 ${BALANCE.tideLoot.essenceMinTier}부터 처치마다 정수가 떨어집니다${secret ? '' : `(확률 난이도 × ${BALANCE.tideLoot.essenceChancePerTier * 100}%, 양 1 + 난이도 ÷ ${BALANCE.tideLoot.essenceEveryTiers})`}. 난이도 ${MIMIC.minTier}부터 저레벨 사냥터의 몬스터도 내 레벨 근처까지 올라와 어느 사냥터든 보상이 비슷해집니다.`}
                condition={`일반 던전은 입장할 때 ${DUNGEON_MODES.map(m => m.name).join(' · ')} 중 하나를 고릅니다. 헬은 사냥터 난이도 ${DUNGEON_MODES[1].tier}급, 나이트메어는 ${DUNGEON_MODES[2].tier}급이고 몬스터 레벨도 내 레벨까지 올라옵니다. 깊이 계수(v3.9): 사냥터·지역 던전은 입장 레벨 순서마다 체력·공격·골드·경험치 +${DEPTH_SCALE * 100}%라 뒤로 갈수록 조금 더 어렵고 조금 더 줍니다(무릉도장·까미·누리 제외).`}
                limit={`수식(난이도 t): 몬스터 체력 ×(1 + 0.35t + 0.006×(t−20)²) · 공격 ×(1 + 0.18t + 0.002×(t−20)²) · 몬스터 레벨은 난이도 5에서 내 레벨(사냥터 최고 레벨 + 6까지)까지 상승 · 골드 ×(1 + 0.5t, 난이도 30부터 16 + 1.5√(t−30)) · 경험치 ×(1 + 0.3t + 0.005×(t−20)², 난이도 30부터 10.5 + 1.5√(t−30)) · 처치 후 회복 ${percent(BALANCE.healAfterKill)} ÷ (1 + t ÷ ${BALANCE.healAfterKillTideScale}) · 드롭 장비 레벨 +5t(내 레벨 + ${BALANCE.dropLevelOver}까지)${secret ? '' : ` · 상위 등급 가중 (1 + ${BALANCE.tideLoot.rarityPerTier}t)^(등급−1) · 정수 확률 ${BALANCE.tideLoot.essenceChancePerTier * 100}% × t, 양 1 + t ÷ ${BALANCE.tideLoot.essenceEveryTiers}(난이도 ${BALANCE.tideLoot.essenceMinTier}부터)`}. 무릉도장은 층 수가 난이도이고, 사냥터 난이도는 던전에 영향을 주지 않습니다.`}/>
            <Rule icon={<Fish size={19}/>} title="숙련의 까미 · 경험의 누리"
                effect={`까미: 사냥터 난이도 ${MIMIC.minTier} 이상 · Lv.${MIMIC.minLevel} 이상 · 누적 ${MIMIC.minKills}마리부터 드물게 나오고(확률은 난이도와 뒤쪽 사냥터일수록 오르다가 난이도 ${MIMIC.tierCap} · 리프레 용의 둥지에서 최대), 잡으면 현재 직업 숙련을 한 번에 줍니다(${MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()}`).join(' · ')}). 누리: 난이도 ${EXP_NURI.minTier} 이상 · Lv.${EXP_NURI.minLevel} 이상 · 누적 ${EXP_NURI.minKills.toLocaleString()}마리부터 나오고(확률은 난이도 ${EXP_NURI.tierCap}까지 오름), 잡으면 지금 레벨 필요 경험치의 ${EXP_NURI.tiers.map(t => `${t.pct * 100}%`).join('·')}와 이 사냥터 출현 ${EXP_NURI.tiers.map(t => Math.round(t.pct * EXP_NURI.encountersPerPct)).join('·')}회분 경험치 중 큰 쪽을 한 번에 줍니다(Lv.100부터는 출현 몫).`}
                condition="둘 다 체력이 많고 거의 아프지 않습니다. 무리 서식지에서도 무리 대신 한 마리로 나옵니다(까미 확률은 그 지역 마지막 일반 사냥터와 같음). 제단의 까미·누리 축복 · 운영 이벤트 · 행운의 편지 · 직업 보너스가 출현 확률을 올립니다(보너스끼리는 더함)."
                limit="보상은 배율 보너스를 받지 않고, 던전에서는 나오지 않습니다. 사냥터 몬스터 목록·도감과는 별개입니다."/>
            <Rule icon={<Fish size={19}/>} title="정수의 슬라임 · 대왕 시리즈"
                effect={`정수의 슬라임: 사냥터 난이도 ${ESSENCE_SLIME.minTier} 이상 · Lv.${ESSENCE_SLIME.minLevel} 이상 · 누적 ${ESSENCE_SLIME.minKills}마리부터 드물게 나오고(누리와 같은 식으로 난이도 ${ESSENCE_SLIME.tierCap}까지 오를수록 자주), 잡으면 그 난이도의 정수 묶음(1 + ⌊난이도 ÷ ${ESSENCE_SLIME.bundleTiers}⌋)에 ${ESSENCE_SLIME.tiers.map(t => `${t.label} ×${t.mul}`).join(' · ')}을 곱한 정수를 줍니다. 대왕 까미 · 대왕 누리 · 대왕 정수 슬라임: 작은 녀석을 ${KING.minBookKills}마리 잡은 뒤부터 그 녀석이 나올 자리에 드물게 대신 나타나며, 잡으면 ‘대’ 당첨의 ×${KING.rewardMul}이 확정입니다(숙련 ${(100000 * KING.rewardMul).toLocaleString()} · 경험치 ${Math.round(EXP_NURI.tiers[2].pct * KING.rewardMul * 100)}% 또는 출현 ${Math.round(EXP_NURI.tiers[2].pct * KING.rewardMul * EXP_NURI.encountersPerPct)}회분 · 정수 묶음 ×${ESSENCE_SLIME.tiers[2].mul * KING.rewardMul}).`}
                condition={`대왕은 체력이 작은 녀석의 ×${KING.hp}, 공격이 그 사냥터 최강 몬스터의 ×${KING.attack}이고 ${KING.turns}턴(${Math.round(KING.turns * 2 / 60)}분) 안에 못 잡으면 달아납니다(보상 없음). 난이도를 낮추면 더 잘 잡힙니다. 호루라기로는 부를 수 없습니다.`}
                limit="특별 도감에 따로 실리고 일반 도감 수에는 들지 않습니다. 황금 개체 · 변종이 되지 않고 던전에서는 나오지 않습니다."/>
            {/* v3.160 호루라기 · v3.162 정수의 슬라임(전투 화면 장면 구석 버튼) */}
            <Rule icon={<Sparkles size={19}/>} title="호루라기"
                effect={`전투 화면 장면 오른쪽 아래의 작은 버튼. SP ${WHISTLE.sp}를 내면 다음 사냥터 출현이 고른 특별 몬스터로 정해집니다: ${WHISTLE_TARGETS.map(t => t.name).join(' · ')}. 보상은 자연 등장과 같습니다(${WHISTLE_TARGETS.map(t => `${t.name} ${t.reward}`).join(' / ')}).`}
                condition={`하루 ${WHISTLE.perDay}번(한국 시간 자정 초기화). 부를 조건은 자연 등장의 레벨 · 누적 처치와 같고(${WHISTLE_TARGETS.map(t => `${t.name} Lv.${t.minLevel} · ${t.minKills.toLocaleString()}마리`).join(', ')}) 사냥터 난이도 조건은 보지 않습니다. 한 번에 하나만 불어 둘 수 있고, 다음 출현에 쓰입니다.`}
                limit="던전에서는 불 수 없고 불어 둔 것도 쓰이지 않습니다(던전에서 나온 뒤 사냥터 출현에 씀). 대왕 까미 · 대왕 누리 · 대왕 정수 슬라임은 부를 수 없습니다. 부재중 정산 판정 수에는 들지 않습니다."/>
        </div>
    </Topic>
    );
}
