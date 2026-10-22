import { Shield } from 'lucide-react';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function JobsTopic() {
    return (
    <Topic icon={<Shield size={19}/>} title="직업" note="숙달하면 그 직업의 보너스가 커집니다.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Shield size={19}/>} title="직업 숙달"
                effect="직업별 숙련 목표를 채우면 그 직업의 체력·공격·방어 보너스가 강화됩니다. 전직 화면에서 전후를 비교할 수 있습니다. 3차부터 목표가 크게 늘어(3차 ×3 · 4차 30만~45만 · 5차 150만), 5차 전직에는 선행 직업 숙달이 필요합니다."
                condition="그 직업을 쓰는 동안만 적용됩니다. 숙달한 직업은 조건 없이 다시 전직할 수 있습니다."
                limit="페널티·치명타·경험치 보너스는 숙달로 변하지 않습니다."/>
        </div>
    </Topic>
    );
}
