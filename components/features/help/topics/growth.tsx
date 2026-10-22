import { SPROUT, sproutExp } from '@/game/data/sprout';
import { BOOK_ECOLOGY } from '@/game/data/book-traits';
import { ASCENSION } from '@/game/data/ascension';
import { BookOpen, Coins, RefreshCw, Sparkles, Target } from 'lucide-react';
import { BALANCE, XP_SCALING } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { ECONOMY, RESEARCH_RESET, RELIC_GROWTH, HEIR_GROWTH, PRIMAL_INHERIT, APPRAISAL_PITY } from '@/game/data/economy';
import { STARFORCE } from '@/game/data/starforce';
import type { State } from '@/game/types';
import { ONYX } from '@/game/data/onyx';
import { RANKS, RANK_PERKS, RANK_TOTAL_POINTS } from '@/game/data/rank';
import { TAILWIND_EXP, tailwindExp, xpWall, LEVEL_GATE_FREE_REBIRTHS } from '@/game/systems/meta';
import { OVER_TARGET } from '@/game/data/balance';
import { AffixGlossaryList } from '@/components/game/affix-glossary';
import { Rule, Topic, pctOf, GLOSSARY_AFFIXES } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function GrowthTopic({ s, secret }: { s?: State; secret: boolean }) {
    return (
    <Topic icon={<RefreshCw size={19}/>} title="성장 · 재화" note="환생, 세계석 연구, 도감, 상점.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<RefreshCw size={19}/>} title="환생"
                effect="세계석 = 레벨 ÷ 10 + 환생 횟수 보상 + 연구·스킬 보너스. 영구 보너스(체력·공격·방어)는 2.5% × √환생 횟수, 영구 경험치는 환생마다 +25%."
                condition={`요구 레벨은 30에서 환생마다 +${ECONOMY.rebirthLevelStep}(Lv.${ECONOMY.rebirthLevelLateFrom}까지), 그 뒤로는 환생마다 +${ECONOMY.rebirthLevelLateStep}(최대 Lv.${ECONOMY.rebirthLevelCap}). 환생 ${LEVEL_GATE_FREE_REBIRTHS}회부터는 사냥터·던전에 레벨 제한이 없습니다. 환생한 뒤에는 직전 생에 도달한 최고 레벨까지 경험치 +${Math.round((s ? tailwindExp(s) : TAILWIND_EXP) * 100)}%(순풍, 경험치 보너스에 합연산). 요구 레벨부터는 필요 경험치가 레벨마다 ×${(s ? xpWall(s).growth : OVER_TARGET.growth).toFixed(2)}씩 거듭 붙습니다(역풍). 환생 ${SPROUT.expUntil}회 전까지는 새싹의 축복으로 경험치 ×${sproutExp(0)}(환생할 때마다 ${SPROUT.expPerRebirth}씩 줄어듦), 환생 ${SPROUT.survivalUntil}회 전까지는 쓰러진 뒤 회복 대기 절반·처치 후 회복 +${Math.round(SPROUT.healBonus * 100)}%p.`}
                limit={`횟수 보상은 20회까지 회당 세계석 1·경험치 +25%, 이후 완만해집니다. 필요 경험치는 환생 20회까지 회당 크게, 그 뒤로도 꾸준히 오르고, 환생 50회와 100회에 벽이 있습니다(그 회차부터 필요 경험치 ×${XP_SCALING.rebirthWalls.map(([, x]) => x).join(' · ×')}). 환생 ${XP_SCALING.lateWallGrowth[0][0]}회부터는 Lv.${XP_SCALING.wallLevel} 이후 레벨마다 필요 경험치가 ×${XP_SCALING.lateWallGrowth[0][1]}씩 붙는 통곡의 벽이 더 세집니다. 환생 AP 최대 ${ECONOMY.rebirthAPCap}, 사냥터 난이도 최대 ${ECONOMY.tideCap}. 칭호는 업적(환생 횟수·도전·무릉도장)을 달성하면 얻고, 능력치 화면의 ‘칭호’에서 장착하거나 숨깁니다.`}/>
            <Rule icon={<Sparkles size={19}/>} title="승천"
                effect={`환생 ${ASCENSION.requirements[0]}회부터 원할 때 승천할 수 있고, 승천할 때마다 필요한 환생 횟수가 ${ASCENSION.requirements.join(' → ')}로 오릅니다. 승천하면 환생·장비·연구가 처음으로 돌아가고, 직업·스킬 숙련과 업적·계급장·칭호·기록은 남습니다. 승천 1회마다 숙련 획득 +${ASCENSION.masteryPer * 100}%(${ASCENSION.masteryCap}회까지, 숙련의 까미 당첨분 포함) · 서약 보상 ×${1 + ASCENSION.vowPer}씩(${ASCENSION.vowCap}회까지).`}
                condition={`승천 직후: 업적 보상 세계석·SP를 다시 받고(영구 효과는 그대로), 편의 연구(지겨운 환생·가방·긴 휴식·청산·자동 정리·자동 강화·불굴의 의지)와 서약 1단계가 열립니다. 환생 ${ASCENSION.earlyExpUntil}회 전까지 경험치 ×${ASCENSION.earlyExp}(새싹의 축복 대신), 까미·누리는 사냥터 난이도 0부터 나옵니다. 행운의 편지 6~10단계를 살 수 있습니다.`}
                limit={`지워지는 것: 골드·세계석·연구·SP·정수, 스킬 한계 돌파와 극한 단계(전용 연출은 유지), SP로 올린 스킬 단계, 장비(유물 포함, 칠흑 장신구는 남음), 도감, 무릉도장 기록(최고층은 승천 기록에 남음), 계정 금고의 세계석 · 정수(다른 분신 몫 포함), 서약. 결투·이번 주 무릉도장 기록판에서 바로 빠집니다. 환생은 ${ASCENSION.rebirthCap}회까지이고 ${ASCENSION.researchLockAt}회부터는 세계석 연구를 살 수 없습니다.`}/>
            <Rule icon={<Target size={19}/>} title="계급장"
                effect={`처치한 마릿수로만 오르는 별도 계급(이등병 → 중장, ${RANKS.length}단계). 환생·분신과 무관하게 유지됩니다. 무리는 마리 수 대신 싸운 턴 수 × 규모별 값(×5 1.1 · ×100 1.32 · ×500 1.98, 마리 수가 상한)으로 셉니다. 진급마다 진급 포인트(병 1 · 부사관 2 · 장교 3 · 장성 4, 합계 ${RANK_TOTAL_POINTS})를 받아 특전을 삽니다. 특전은 단계당 1P이고 단계마다 효과가 같은 폭으로 늘어납니다: ${RANK_PERKS.map(p => `${p.name} — 단계당 ${p.id === 'tally' ? '처치 1마리를 계급 경험치 +1마리로 더 셈' : p.id === 'drill' ? '처치 숙련 기본 +1(직업·장착 스킬, 배율과 무관한 고정값)' : p.id === 'medal' ? '사냥터 처치마다 SP 드롭 +0.1%' : '사냥터 처치마다 세계석 드롭 +0.1%'}, 최대 ${p.max}단계(${p.desc(p.max)})`).join(' · ')}.`}
                condition={`일병까지 ${RANKS[1].need.toLocaleString()}마리, 그 뒤 계급마다 약 ×1.38로 늘고, 부사관·장교·장성으로 넘어갈 때 크게 뜁니다(병 ×1 · 부사관 ×10 · 장교 ×100 · 장성 ×80). 중장까지 합계 약 ${(RANKS.reduce((a, r) => a + r.need, 0) / 1e8).toFixed(2)}억 마리로, 몇 해를 두고 오르는 초장기 기록입니다. 능력치 · 치장 화면의 ‘계급’에서 봅니다.`}
                limit="특전은 언제든 무료로 초기화해 다시 배분합니다. SP·세계석 특전은 사냥터 처치에만 적용되고 던전에서는 나오지 않습니다."/>
            <Rule icon={<Target size={19}/>} title="참모 계보 · 분신 지원"
                effect="(전직 화면 세계 목차의 아제로스 장, 아제로스 규칙으로 숙련 단계 ×10) 계급장 하사 · Lv.40 · 숙달한 직업 3개면 어느 직업에서든 3차 ‘보급관’ 또는 ‘군의관’으로 전직합니다. 지원 스킬을 장착하면 같은 계정의 다른 분신이 강해집니다(지원 스킬 숙련 단계에 따라): 보급관은 경험치 · 골드 · 숙련 +3~8%, 군의관은 최대 체력 · 최대 마나 +2~5% · 턴당 체력 회복 +5~15%. 계급장 소위가 되면 보급관 또는 군의관 숙련 300으로 4차 ‘작전참모’(장착 AP +1~2 · 보스 피해 +2~5% · 계급 경험치 +3~6%) 또는 ‘화력참모’(방어 관통 +2~5%p · 치명 피해 +5~15%p)로 전직합니다. 계급장 대령 · 환생 10이면 작전참모 또는 화력참모 숙련 300으로 5차 ‘총사령관’(총동원령: 공격 · 체력 +2~4%, 지휘 계통: 자기가 주는 다른 지원 ×1.10~1.25, AP 제외) 또는 AP 특화 ‘군수사령관’(전군 편제: 장착 AP +2~3, 경량 편제: 자기 지원 스킬 AP -1)으로 전직합니다. 지휘 체계 계열 패시브는 장착한 지원 스킬 1개마다 자기 두 공격 +4%(5차 +5%)."
                condition="지원은 지원하는 분신의 현재 직업이 참모 계보일 때만, 마지막으로 저장한 장착 상태 기준입니다(접속하지 않아도 유지). 여러 분신이 같은 효과를 주면 가장 높은 하나만 받습니다. 승천한 캐릭터도 받습니다."
                limit="자기 자신에게는 지원이 들어가지 않습니다. 다른 분신에는 최대 10분 뒤 반영되고, 결투에는 들어가지 않습니다(제단 신 · 월드보스는 받음). 같은 효과는 가장 높은 지원 하나만, 장착 AP 지원은 최대 +3입니다."/>
            <Rule icon={<Sparkles size={19}/>} title="세계석 연구"
                effect="세계석으로 영구 능력을 올립니다. 환생해도 유지되며 전투·유틸·골드 탭으로 나뉩니다."
                condition="단계가 오를수록 비용이 커집니다. 일부 연구는 정해진 환생 횟수 뒤에 열립니다."
                limit={`탭별 재분배는 언제나 무료이며 쓴 세계석의 ${RESEARCH_RESET.refund * 100}%를 돌려받습니다. 자동 사냥·던전 중에는 할 수 없습니다.`}/>
            <Rule icon={<BookOpen size={19}/>} title="몬스터 도감"
                effect={`종별 연구 ${BALANCE.bookMilestones.map(n => n.toLocaleString()).join(' · ')}회 처치. 4·5·6단계에 SP. 6단계는 그 몬스터를 난이도 ${BALANCE.bookTierReq[5]} 이상에서 처치해야 열립니다. 2단계부터 연구 효과가 붙습니다(아래 ‘몬스터 연구 효과’). 지역의 모든 몬스터가 연구 1·2·3단계면 지역 연구 1·2·3단계입니다. 1단계에 지역 첫 보너스(예전 장소 테마)가 붙고, 단계마다 지역 효과가 쌓입니다. 지역마다 자주 나오는 변종이 다르고, 지역 끝의 무리 서식지에서는 몬스터가 전부 ×100·×500 무리로 나옵니다.`}
                condition={`${PROGRESSION.monsterComplete}회 처치하면 완성이고 적 정보가 열립니다. 사냥터(장소)의 모든 종을 완성하면 업적 ‘지역 연구 N곳 완성’에서 장착 AP +1.`}
                limit={`보상은 도감에서 직접 받고 각 단계는 한 번만 줍니다. 합계는 도감 ‘연구 보너스’ 탭에서 봅니다. 칠흑의 보스(v3.12): 무리 서식지 출현마다 ${secret ? '드물게' : `${Math.round(ONYX.chance * 1000) / 10}%로`} 지역 보스가 나오고(${ONYX.turns}턴 안에 못 잡으면 떠남), 처치하면 ${secret ? '낮은 확률(오래 못 얻으면 확정)' : `${Math.round(ONYX.drop * 1000) / 10}%(${ONYX.dropPity}번째 연속 미획득은 확정)`}로 환생해도 남는 칠흑 장신구를 받습니다(레벨은 그 서식지 레벨과 내 레벨 중 높은 쪽). 이미 가진 칠흑을 같은 확률로 다시 얻으면 각성(최대 ${ONYX.awakenMax}단계, 고유 옵션 단계당 +${Math.round(ONYX.awakenStep * 100)}%)하고, 착용하지 않은 칠흑도 고유 옵션의 ${Math.round(ONYX.resonance * 100)}%를 공명으로 줍니다. 환생 50 · 100회에 닿으면 무작위 칠흑을 하나씩 받습니다(캐릭터마다 한 번, 승천 뒤 다시 받지 않음, 가진 종이면 각성). 도감 ‘칠흑의 보스’에서 세트 보너스와 각성 · 공명을 봅니다.`}/>
            {/* v3.96 도감 카드 · 보너스 탭은 한 줄 요약만 보이고, 단계별 수치는 여기서 봅니다. */}
            <Rule icon={<BookOpen size={19}/>} title="몬스터 연구 효과"
                effect={`그 몬스터를 많이 잡을수록 그 몬스터 상대로 강해집니다. 연구 ${BOOK_ECOLOGY.fromStage}~${BALANCE.bookMilestones.length}단계에 오를 때마다 주는 피해가 오르고 받는 공격 피해가 줄어듭니다.`}
                condition={BOOK_ECOLOGY.dealt.map((d, i) => `연구 ${i + BOOK_ECOLOGY.fromStage}단계(${BALANCE.bookMilestones[i + BOOK_ECOLOGY.fromStage - 1].toLocaleString()}회) +${pctOf(d)}% / -${pctOf(BOOK_ECOLOGY.taken[i])}%`).join(' · ')}
                limit={`6단계 누적 주는 피해 +${pctOf(BOOK_ECOLOGY.dealt.reduce((a, n) => a + n, 0))}% · 받는 공격 피해 -${pctOf(BOOK_ECOLOGY.taken.reduce((a, n) => a + n, 0))}%. 그 몬스터를 상대할 때만 적용되고, 받는 피해 감소는 지속 피해에는 들지 않습니다. 6단계는 난이도 ${BALANCE.bookTierReq[5]} 이상에서 처치해야 열립니다.`}/>
            <Rule icon={<Coins size={19}/>} title="상점 · 장비"
                effect={`뽑기는 희귀 이상을 보장하고, 신화·고대·태초는 천장(${APPRAISAL_PITY.map(p => `${p.count}회`).join('·')})이 있습니다. 가격은 레벨과 환생 횟수를 따릅니다(환생 100까지 10^(환생/60)배, 그 위로는 완만하게). 랜덤 뽑기는 모든 부위가 나오고, 저격 뽑기는 부위와 옵션 하나를 골라 반드시 붙이며, 자동 뽑기는 가진 골드·정수로 목표 등급까지 반복합니다. 강화는 스타포스(v3.0): 전설 이상 ${STARFORCE.max}성 · 영웅 이하 ${STARFORCE.maxLow}성까지, 1~${STARFORCE.gainHighFrom}성 +${STARFORCE.gainLow * 100}%/성 · 그 위 +${STARFORCE.gainHigh * 100}%/성. 성마다 성공률이 정해져 있고(${STARFORCE.gainHighFrom}성부터 30%), ${STARFORCE.dropFrom}성부터 실패 시 1성 하락(${STARFORCE.safeStars.join('·')}성 유지), 15성부터 파괴 확률(일반 장비는 소멸, 유물 · 계승 · 칠흑은 ${STARFORCE.relicResetStar}성으로, 22성 이상이면 ${STARFORCE.relicResetHigh}성으로). v3.241 22→23 · 23→24 · 24→25성은 성공 3 · 2 · 1%, 파괴 19.4 · 29.4 · 39.6%의 극한 구간입니다. 하락 2번 연속이면 찬스 타임(100%), 수동 강화의 스타캐치(별이 가운데 올 때 누르기)는 성공률 +10%p(22성부터는 ×1.05), ${STARFORCE.safeguardStars.join('·')}성은 파괴 방지(비용 ×2)를 고를 수 있습니다. 비용은 12성까지 전과 같고 13성부터 성마다 ×${STARFORCE.growth}.`}
                condition="판매가는 등급·레벨에 비례하고 강화 비용의 30%를 돌려받습니다. 분해는 골드 대신 정수를 줍니다. 옵션 재설정(옵션 종류를 바꿈)은 골드만 들고(환생할수록 비쌈, 같은 장비에서 할 때마다 +10%·상한 없음), 수치 재련(종류는 그대로 수치만 다시 굴림)은 정수만 듭니다(같은 장비에서 할 때마다 ×1.08). 원시 고대 · 계승 태초 · 칠흑은 세계석 999로 재설정 · 재련 비용을 처음으로 되돌릴 수 있지만, 별이 0성이 되고 추가 옵션을 새로 굴립니다(최고 수치)."
                limit={`부위는 무기·방어구·장신구·망토(v3.5: 회피·체력, 망토 전용 옵션 ‘불굴’이 몬스터 상태이상을 저항). v3.129 체력·두 방어는 방어구·망토·장신구에 나뉘어 붙습니다(방어구 체력 3.5 · 방어 .6 · 마방 .3, 망토 체력 2.5, 장신구 체력 2 · 방어 .4 · 마방 .2). 레벨 올리기(+10, 내 레벨까지)는 위력을 올리고 별을 0으로 되돌리며, 유물 별 상한은 12 + 레벨 ÷ 10입니다. 구매·옵션 변경 비용은 돌려받지 않습니다. 일반 장비는 환생 때 정리됩니다(판매/분해는 설정에서 고름). 유물은 남고 위력 = (레벨 + 2) × 환생 배율(환생 ${HEIR_GROWTH.toRebirth}회까지 오름), 같은 부위 장비를 소비해 옵션을 ${RELIC_GROWTH.imprintSlots}줄까지 이식합니다(별·이식 옵션 유지). 고대는 정수로 원시 각성, 태초는 분해 게이지 ${PRIMAL_INHERIT.gauge}로 계승하면 환생해도 남고 환생마다 강해집니다(부위마다 종류별 1개, 승천하면 사라짐).`}/>
            {/* v3.323 옵션 이름(황금 · 탐색 등)만 보고는 뜻을 알기 어렵다는 의견: 상점의 ‘옵션 설명’ 버튼과 같은 목록. */}
            <Rule icon={<Coins size={19}/>} title="장비 옵션 이름"
                effect={<AffixGlossaryList affixes={GLOSSARY_AFFIXES}/>}
                condition="저격 뽑기에서는 그 부위에 붙는 옵션만 고를 수 있고, ◆ 규칙 옵션 · 고대 이상 전용 옵션은 고를 수 없습니다. ◆ 규칙 옵션은 어느 줄에나 몇 줄이든 붙을 수 있고(v3.336, 장비당 1줄 제한 해제), 재설정으로도 나옵니다. 칠흑 장신구의 고유 옵션 줄만 바꿀 수 없습니다. 상점의 ‘옵션 설명’ 버튼으로도 볼 수 있습니다."/>
        </div>
    </Topic>
    );
}
