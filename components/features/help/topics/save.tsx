import { Gauge } from 'lucide-react';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function SaveTopic() {
    return (
    <Topic icon={<Gauge size={19}/>} title="저장 데이터" note="초기화 규칙.">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <Rule icon={<Gauge size={19}/>} title="데이터 초기화"
                effect="이름만 남기고 레벨·환생·장비·도감·길드·랭킹 등록까지 새 게임으로 돌아갑니다."
                condition="환생 화면 ‘저장 데이터 관리’에서 자동 사냥과 던전을 멈춘 뒤 실행합니다."
                limit="되돌릴 수 없습니다."/>
        </div>
    </Topic>
    );
}
