import { BookOpen, Sparkles, Target, Zap } from 'lucide-react';
import { STATUS_TUNING, SKILL_FORMULA } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { CORE_PASSIVE, CORE_TRANSCEND } from '@/game/systems/progression';
import { CORE_REWORK } from '@/game/data/core-passive';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function SkillsTopic() {
    return (
    <Topic icon={<Zap size={19}/>} title="스킬" note="발동, 습득·계승, 숙련과 극한돌파.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Zap size={19}/>} title="액티브"
                effect="전투 중 발동 확률에 따라 자동으로 씁니다. 편성 순서대로 판정해 처음 성공한 하나만 사용합니다."
                condition="마나·재사용 대기·스킬별 조건(체력 비율 등)을 채워야 합니다."
                limit={`장착 개수 제한은 없고 총 AP만 제한합니다. 추가타는 최대 ${STATUS_TUNING.maxExtraAttacks}회. 추가 판정(세계석 연구 ‘시스템 파괴 I’, 장착 AP ${SKILL_FORMULA.extraRoll.ap[0]})을 켜면 액티브가 발동한 행동에서 그 아래 액티브로 한 번 더 판정해 ${Math.round(SKILL_FORMULA.extraRoll.power[0] * 100)}% 위력으로 함께 씁니다. 동시 시전 묶음으로 나간 행동에서는 대신 묶음 최대 개수가 1 늘어납니다(${SKILL_FORMULA.multicast.max} → ${SKILL_FORMULA.multicast.max + 1}).`}/>
            <Rule icon={<Sparkles size={19}/>} title="각성기 (5차)"
                effect="5차 이상 직업의 액티브는 각성기입니다. 행동마다가 아니라 턴마다 따로 판정해 일반 액티브와 같은 턴에 함께 나갑니다. 연속 행동은 턴으로 세지 않고, 확정 추가 행동은 한 턴으로 셉니다."
                condition={`대기 ${SKILL_FORMULA.awaken.cooldown}턴. 결투·제단·월드보스 전투, 던전 입장, 쓰러짐, 전직 뒤에는 대기가 꽉 찬 채로 시작합니다(사냥 중에는 다음 몬스터로 이어짐). 판정에 실패할 때마다 다음 판정 확률에 기본 발동률을 더합니다(최대 100%).`}
                limit={`한 턴에 각성기는 하나만. 각성기로 쓰러뜨리면 대기가 ${SKILL_FORMULA.awaken.kill}턴만 돌고, 대기 초기화 효과는 ${SKILL_FORMULA.awaken.reset}턴을 줄입니다. 거는 상태이상은 덜 자주 걸리는 만큼 오래 갑니다.`}/>
            <Rule icon={<Sparkles size={19}/>} title="습득 · 계승 · 강화"
                effect="전직하면 그 직업의 기술을 Lv.0으로 얻습니다. 장착한 채 처치해 첫 숙련을 채우면 다른 직업에서도 씁니다. 3차 이상 스킬은 숙련 단계가 높습니다(3차 ×3 · 4차 ×10 · 5차 ×25)."
                condition="해금한 기술에 한해 계승·강화에 각각 1 SP."
                limit="SP는 도감 최종 연구, 업적(던전 첫 정복 포함), 무릉도장 이정표에서 얻습니다."/>
            <Rule icon={<Target size={19}/>} title="숙련 · 극한돌파"
                effect="사냥터에서 처치할 때마다 현재 직업과 장착한 스킬의 숙련이 기본 1 오릅니다(난이도와 무관, 던전에서는 오르지 않음). 난이도 5 이상에서 나오는 숙련의 까미가 큰 숙련을 줍니다. 기본 숙련을 마치면 한계돌파(SP · 세계석 연구) 3단계, 그 뒤로 숙련 1억을 쌓으면 극한돌파: 전용 연출(極)이 열리고, 1억 · 2억 · 4억 · 7억 · 10억마다 그 스킬의 최종 피해 +2%(최대 +10%)."
                condition={`조건부 숙련 스킬은 지정한 적을 이겼을 때만 더 줍니다. 처치 1회당 최대 ${PROGRESSION.maxMasteryPerVictory}.`}
                limit="극한돌파는 SP로 건너뛸 수 없습니다. 숙련과 극한돌파 연출은 환생과 전직 뒤에도 남고, 극한 단계는 승천하면 승천 뒤 쌓은 숙련으로 다시 오릅니다."/>
            {/* v3.317 핵심 패시브 설명을 스킬 카드에서 줄이고 계산 방식은 여기로. */}
            <Rule icon={<Sparkles size={19}/>} title="핵심 패시브 · 초월"
                effect={`4차 · 5차 직업마다 패시브 하나가 핵심 패시브입니다. 4차는 고정 수치(배율 전에 더함), 5차는 배율(직업 보정처럼 최종 능력치에 곱함, 공격 최대 +${Math.round(CORE_REWORK.cap.attack * 100)}% · 체력 +${Math.round(CORE_REWORK.cap.hp * 100)}%). 처음엔 ${Math.round(CORE_PASSIVE.base * 100)}%, 숙련 단계마다 올라 마지막 단계에서 100%.`}
                condition={`다른 계보 직업이 4 · 5차 패시브를 계승해 쓰면 핵심 패시브를 포함한 그 패시브의 모든 수치가 ${Math.round(CORE_PASSIVE.borrowed * 100)}%(아제로스 · 이계 핵심은 계보 전용). 여러 핵심 패시브의 배율은 더한 뒤 한 번 곱합니다.`}
                limit={`초월(5차 핵심): 한계돌파 ${PROGRESSION.limitBreak.max}단계 뒤 숙련이 마지막 이정표 ×${CORE_TRANSCEND.multipliers.join(' · ×')}에 닿으면 1 · 2단계, 단계마다 핵심 효과 ×${1 + CORE_TRANSCEND.step}. 자기 계보에서만 적용되고 계승에는 없습니다(액티브의 극한돌파에 해당하는 패시브 쪽 장기 목표).`}/>
            <Rule icon={<BookOpen size={19}/>} title="경험치 배율"
                effect="경험치 배율 = 1 + 환생 + 세계석 연구 + 직업 + 장착 스킬."
                condition="사냥터 난이도를 올리면 적이 강해지는 대신 골드 배율·장비 레벨·정수·장비 등급이 오릅니다. 경험치 배율은 1 + 0.1√난이도로 작습니다(난이도 100 ×2)."/>
        </div>
    </Topic>
    );
}
