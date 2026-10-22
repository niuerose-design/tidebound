import { Crosshair, Shield, Sparkles, Swords, Target, Zap, Droplets } from 'lucide-react';
import { BALANCE, SKILL_FORMULA } from '@/game/data/balance';
import { FoldSection } from '@/components/ui/game';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function CombatTopic() {
    return (
    <Topic icon={<Swords size={19}/>} title="전투" note="빠른 쪽이 먼저, 더 빠르면 한 턴에 여러 번 움직입니다.">
        <div className="grid gap-2 sm:grid-cols-5 [&>div]:grid [&>div]:gap-0.5 [&>div]:rounded-m [&>div]:bg-surface-1 [&>div]:p-3 [&>div>b]:font-num [&>div>b]:text-xs [&>div>b]:text-accent [&>div>strong]:text-s">
            <div><b>1</b><strong>상태 처리</strong><p>상태이상 남은 턴, 회복, 기절을 먼저 처리합니다.</p></div>
            <div><b>2</b><strong>스킬 선택</strong><p>장착한 액티브를 위에서부터 조건·대기·마나·확률 순으로 확인하고, 모두 실패하면 기본 공격입니다.</p></div>
            <div><b>3</b><strong>명중 판정</strong><p>공격마다 한 번 판정합니다.</p></div>
            <div><b>4</b><strong>피해 계산</strong><p>공격 × 스킬 배율에 상대 방어·관통·치명타를 적용합니다.</p></div>
            <div><b>5</b><strong>추가타</strong><p>추가타가 있는 스킬은 같은 행동 안에서 이어집니다.</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Zap size={19}/>} title="속도 · 연속 행동"
                effect={`상대보다 빠르면 행동할 때마다 확률로 한 번 더 움직입니다. 확률 = ${BALANCE.chainCoefficient} × log₂(내 속도 ÷ 상대 속도).`}
                condition={`${[1.5, 2, 4].map(r => `속도 ${r}배 ${Math.round(Math.min(1, BALANCE.chainCoefficient * Math.log2(r)) * 100)}%`).join(' · ')}. 추가 행동도 온전한 행동이라 대기·회복·지속 피해가 한 칸씩 진행됩니다.`}
                limit={`한 턴에 최대 ${BALANCE.chainMaxActions}번. 속도에 상한은 없지만 효과는 4배에서 멈춥니다.`}/>
            <Rule icon={<Crosshair size={19}/>} title="명중 · 회피"
                effect="실제 적중률 = 내 명중 − 상대 회피 + 속도 보정(최대 ±6%p). 마법 기술·마력 평타는 상대 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다."
                condition="명중·회피 수치는 확률이 아닙니다. 몬스터별 실제 적중률은 도감에서 봅니다."
                limit="적중률은 1~99.5%. 기민을 뺀 회피 소스(패시브·장비·연구·직업)는 합쳐서 60%p까지만 세고, 기민 회피는 그 위에 더합니다. 회피는 50%를 넘으면 효율이 줄어 90%에 수렴합니다."/>
            <Rule icon={<Shield size={19}/>} title="반격 · 무리 사냥"
                effect={`맞을 때마다 (내 방어 × 반격 계수)를 돌려줍니다. 물리 공격을 맞으면 물리 방어, 마법 공격을 맞으면 마법 방어 기준입니다. 공격자 방어는 ${Math.round((1 - SKILL_FORMULA.thornsPierce) * 100)}%만 적용합니다. 무리 ×N을 상대하면 반격이 (1 + log₂N)배: ×5 약 3.3배 · ×100 약 7.6배 · ×500 ${SKILL_FORMULA.swarmThornsCap}배.`}
                condition="탱커 계보 패시브는 반격과 함께 무리 조우 확률을 올립니다(+30~120%). 탱커는 1:1이 느린 대신 무리를 반격으로 갈아 마리 수만큼 보상을 받는 길입니다."
                limit="반격은 흡혈이 2배로 적용되고, 피해 없는 상태이상 기술에는 발동하지 않습니다."/>
        </div>
        <FoldSection level={3} title={<span className="inline-flex flex-wrap items-center gap-2 [&_svg]:size-4 [&_svg]:text-accent [&_span]:text-xs [&_span]:font-normal [&_span]:text-ink-3"><Sparkles size={15}/> 피해의 종류 <span>물리 · 마법 · 복합 · 지속(고정) · 마력 평타 · 능력치 비례</span></span>}>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                <Rule icon={<Swords size={19}/>} title="물리 피해"
                    effect="물리 공격 × 스킬 배율. 상대의 물리 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 물리 방어 × 2)."
                    condition="명중은 기본 공식 그대로(회피 전부 적용). 기본 공격과 대부분의 검·격투 계열 기술이 여기에 속합니다."
                    limit={`방어 관통은 출처끼리 곱연산으로 합칩니다(스킬 보너스까지 합계 최대 85%). 관통만큼 상대 방어를 무시합니다.`}/>
                <Rule icon={<Droplets size={19}/>} title="지속 피해 (고정 피해)"
                    effect="출혈·중독·화상·부식은 물리도 마법도 아닌 고정 피해입니다(메카닉의 메탈아머 전탄발사도 고정 피해). 걸릴 때 시전자의 공격력으로 틱 피해가 정해지고, 그 뒤로는 걸린 쪽이 행동할 때마다 그 값이 체력에서 그대로 빠집니다."
                    condition="물리·마법 방어, 방어 관통, 회피, 반격, 몬스터 연구 효과, 흡혈이 모두 적용되지 않습니다. 기절 중에도 들어갑니다."
                    limit="면역(풀린 뒤 1턴), 정화 기술, 無처럼 쓰러지지 않는 장치로만 막을 수 있습니다. 중독은 중첩마다, 출혈은 한 번만 최대 체력 1%분을 더합니다."/>
                <Rule icon={<Sparkles size={19}/>} title="마법 피해"
                    effect="마법 공격 × 스킬 배율. 상대의 마법 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 마법 방어 × 2). 마나를 씁니다."
                    condition="상대 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다. 단단한 껍질(물리 방어 높음) 몬스터에 유리하고, 마력 생물(마법 방어 높음)에는 불리합니다."
                    limit="마나가 모자라면 그 기술은 건너뛰고 다음 기술이나 기본 공격으로 넘어갑니다."/>
                <Rule icon={<Shield size={19}/>} title="복합 피해"
                    effect={`원시 피해를 물리 ${Math.round(SKILL_FORMULA.splitPhysical * 100)}% · 마법 ${Math.round((1 - SKILL_FORMULA.splitPhysical) * 100)}%로 나누어 각각의 방어를 따로 적용한 뒤 더합니다.`}
                    condition="명중·치명타 판정은 한 번만 합니다. 한쪽 방어만 높은 몬스터에게 안정적입니다."
                    limit="명중은 물리 규칙을 따릅니다(마법의 회피 절반 보정 없음)."/>
                <Rule icon={<Zap size={19}/>} title="마력 평타"
                    effect={`마법 직업의 기본 공격이 확률로 마력 평타(마법 공격 × ${SKILL_FORMULA.arcaneStrikeRatio}, 3차부터 +${Math.round(SKILL_FORMULA.arcaneRatioByTier[3] * 100)}~${Math.round(SKILL_FORMULA.arcaneRatioByTier[5] * 100)}%p)로 바뀝니다. 마나를 쓰지 않는 마법 피해입니다.`}
                    condition="마법 피해라서 회피 절반 보정을 받고 마법 방어로 줄어듭니다. 몬스터의 마법 평타(마력 생물)도 같은 규칙으로 나를 때립니다."
                    limit="스킬이 하나도 나가지 않은 행동에서만 발생합니다."/>
                <Rule icon={<Target size={19}/>} title="능력치 · 기록 비례"
                    effect="외길 계보는 공격력 대신 배분 능력치 × 비율을 기준값으로 씁니다. 도감·사냥·골드 비례 기술은 기본 피해에 기록 배율을 곱합니다."
                    condition="피해 유형(물리/마법)은 기술에 표시된 대로 따르며, 방어·명중 규칙도 그 유형을 따릅니다. 아크 계열은 반대 공격력을 기준값으로 쓰는 ‘교차’ 기술입니다."
                    limit="장비·버프로 오른 공격력은 능력치 비례 기준값에 들어가지 않습니다."/>
            </div>
        </FoldSection>
    </Topic>
    );
}
