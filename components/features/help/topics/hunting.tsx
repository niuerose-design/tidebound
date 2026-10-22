import { DUNGEON_COINS, DAILY_BONUS } from '@/game/data/dungeon-shop';
import { Fish, Flame, Heart, Swords, TrendingUp } from 'lucide-react';
import { MARKET, MARKET_TICK_MS, STOCKS } from '@/game/data/market';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, DUNGEON_STAGE } from '@/game/data/balance';
import { percent } from '@/game/data/progression';
import { offlineCapSeconds, inventoryCap } from '@/game/data/economy';
import { victoryHealRate } from '@/game/systems/encounter';
import type { State } from '@/game/types';
import { SWARM_UNLOCK } from '@/game/data/world';
import { VARIANTS, VARIANT_BOOK_MIN } from '@/game/data/variants';
import { ABYSS_SP_MILESTONES } from '@/game/data/long-term';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function HuntingTopic({ s, secret, swarm }: { s?: State; secret: boolean; swarm: (typeof VARIANTS)[number] }) {
    return (
    <Topic icon={<Fish size={19}/>} title="사냥 · 던전 · 생존" note="변종, 던전 반복, 회복과 방치 진행.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Fish size={19}/>} title="변종"
                effect={<>같은 몬스터인데 특이한 개체입니다. {VARIANTS.filter(v => v.id !== 'swarm').map(v => <span key={v.id}><br/>{v.mark} <b>{v.name}</b>{secret ? '' : ` ${percent(v.chance, 1)}`} · {v.desc}</span>)}<br/>✦ <b>황금 개체</b> · 처치 순간 따로 판정, 그 한 마리 골드 10배. 섀도어 계보 패시브(메소 마스터리·메소 가드·섀도우 파트너·메소 익스플로전 강화)가 확률을 올립니다.</>}
                condition={`사냥터에서 그 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 판정합니다. 버섯숲 연못 테마 +10%. 섀도어 계보 패시브가 확률을 올립니다(픽파킷 +20% · 무리 감지 +50% · 메소 익스플로전 강화 +100% 등).`}
                limit={secret ? '던전과 보스에는 변종이 없습니다. 확률은 공개하지 않습니다.' : '던전과 보스에는 변종이 없습니다. 지금 확률은 능력치 화면 아래 ‘변종 조우 확률’에서 봅니다.'}/>
            <Rule icon={<Fish size={19}/>} title="무리 변종"
                effect={`${secret ? '' : `처치당 ${percent(swarm.chance, 1)}. `}무리 전체를 체력 ×N인 한 개체로 상대하고, 처치하면 경험치·골드·도감을 마리 수만큼 받습니다(×500은 경험치·골드 1.5배). 숙련과 계급 경험치는 싸운 턴 수 × 규모별 값(숙련 ×5 2 · ×100 10 · ×500 20, 마리 수가 상한)입니다. 장비 드롭은 √N번만 판정하고(×500은 2배) 남는 몫은 정수로 받습니다.`}
                condition={`규모는 도감 처치 수로 정해집니다. ${SWARM_UNLOCK[5]}회 ×5, ${SWARM_UNLOCK[100].toLocaleString()}회 ×100. ×500 도전 무리는 무리 서식지에서만 나옵니다.`}
                limit="적 방어는 한 마리와 같고, 공격은 ×500에서만 490배입니다. 처치 전에 쓰러지면 보상이 없습니다."/>
            <Rule icon={<Swords size={19}/>} title="던전 · 무릉도장"
                effect={`던전에서는 처치마다 골드 · 경험치 · 숙련 · 장비가 나오지 않고, 정복하면 던전 주화를 받습니다. 지역 던전은 하루(한국 시간 자정) 처음 ${DAILY_BONUS.clears}번의 정복이 보너스(노말 ${DAILY_BONUS.coins.normal} · 헬 ${DAILY_BONUS.coins.hell} · 나이트메어 ${DAILY_BONUS.coins.nightmare}, 던전 공용 · 이월 없음)이고 그 뒤는 ${DUNGEON_COINS.normal} · ${DUNGEON_COINS.hell} · ${DUNGEON_COINS.nightmare}입니다. 무릉도장은 1 + 10층마다 1(보너스 없음). 보너스 정복에서는 드물게 그 던전 보스의 기술을 이어받는 보스 코어가 나오고, 오래 못 받으면 확정입니다. 보스 코어 칸에 하나를 끼면 효과 100%, 나머지 코어는 10%(턴 연장 제외)이고, 다시 얻으면 각성합니다. 환생 · 승천해도 남습니다. 주화는 던전 화면의 주화 상점에서 칠흑 장신구 · 장비 상자 · 포식자 각인으로 바꿉니다. 정해진 횟수 또는 실패할 때까지 자동으로 다시 도전합니다. 무릉도장은 10층마다 보너스 세계석, ${ABYSS_SP_MILESTONES.join('·')}층 첫 돌파에 SP 1.`}
                condition="던전 카드에서 반복을 고른 뒤 도전합니다. 입장 후 6초 준비가 끝나면 체력·마나가 회복됩니다."
                limit={`던전에서는 처치 후 회복이 ${percent(MONSTER_TUNING.dungeonHealAfterKill)}입니다. 반복이 끝나면 사냥터로 돌아옵니다.`}/>
            {/* v3.312 던전 화면에 있던 난이도 · 나이트메어 단계 설명을 여기로 옮겼습니다. */}
            <Rule icon={<Flame size={19}/>} title="던전 난이도 · 나이트메어 단계"
                effect={`지역 던전은 노말 · 헬 · 나이트메어 중 고릅니다. 헬: ${DUNGEON_MODES[1].note} 나이트메어: ${DUNGEON_MODES[2].note} 나이트메어는 1~${DUNGEON_STAGE.max}단계가 있고, 단계마다 몬스터 체력 ×${DUNGEON_STAGE.hp} · 공격 ×${DUNGEON_STAGE.attack}(월드보스 소환 단계와 같은 식). 지속 피해의 체력 비례분은 1단계 체력 기준입니다.`}
                condition={`(k−1)단계를 정복해야 k단계가 열립니다. 던전마다 최고 정복 단계를 기록하고, 반복 설정 ‘단계 오르기 · 실패까지’를 고르면 정복할 때마다 한 단계씩 올라갑니다. 명예 업적 ‘나이트메어 3 · 5 · 10단계’, 지역 던전 모두 5 · 10단계 칭호.`}
                limit={`보상: 하루 보너스 주화 +${DUNGEON_STAGE.coinsPerStage} × (단계 − 1), 보너스 뒤 주화 3 × 단계, 보스 코어 드롭률 × (1 + ${DUNGEON_STAGE.lootPerStage} × (단계 − 1)). 세계석은 주지 않습니다. 무릉도장에는 단계가 없습니다.`}/>
            <Rule icon={<TrendingUp size={19}/>} title="주화 증권거래소"
                effect={`왼쪽 메뉴의 증권거래소에서 던전 주화로 가상 종목 ${STOCKS.length}개를 사고팝니다. 시세는 모든 모험가가 같고 ${MARKET_TICK_MS / 60_000}분마다 바뀌고, 길게 보면 기준가 주변으로 돌아옵니다. 시황 소문은 다음 시세의 방향을 자주 맞히지만 틀릴 때도 있습니다.`}
                condition={`매수 · 매도마다 수수료 ${MARKET.fee * 100}%(최소 1주화), 가진 던전 주화만큼 살 수 있고 거래 횟수 제한은 없습니다.`}
                limit="잃을 수도 있습니다. 환생해도 보유 주식은 남고, 승천하면 주식도 사라집니다. 차트 · 거래 내역은 이 기기에만 남습니다."/>
            <Rule icon={<Heart size={19}/>} title="생존 · 방치 진행"
                effect={`처치 후 최대 체력의 ${percent(BALANCE.healAfterKill)}를 회복합니다${s ? `(지금 ${percent(victoryHealRate({ ...s, dungeon: null }))})` : ''}. 사냥터 난이도가 오를수록 줄어듭니다: 기본 ÷ (1 + 난이도 ÷ ${BALANCE.healAfterKillTideScale}) — 난이도 10에서 10%, 30에서 5%, 최저 ${percent(BALANCE.healAfterKillMin)}. 응급처치 패시브는 행동할 때마다 체력을 조금 회복합니다.`}
                condition={`패배하면 잃는 것 없이 ${BALANCE.recoveryTurns}턴 회복한 뒤 다시 싸웁니다. 자리를 비운 시간도 서버가 턴으로 계산합니다.`}
                limit={`방치 정산은 기본 ${BALANCE.offlineCapSeconds / 3600}시간${s ? `(지금 ${offlineCapSeconds(s) / 3600}시간)` : ''}, 가방은 기본 ${BALANCE.inventoryCap}칸${s ? `(지금 ${inventoryCap()}칸)` : ''}. 둘 다 세계석 연구로 늘어납니다.`}/>
        </div>
    </Topic>
    );
}
