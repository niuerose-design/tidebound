import { Swords, Target } from 'lucide-react';
import { ATTRIBUTES } from '@/game/data/progression';
import { JOB_TREES, LINEAGES } from '@/game/data/classes';
import { Rule, Topic } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function AttributesTopic() {
    return (
    <Topic icon={<Target size={19}/>} title="능력치" note="기본치 + 레벨 성장 + 직접 배분. 직업·장비·스킬이 더해집니다.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{ATTRIBUTES.map(a => <article className="grid gap-1 rounded-m border border-line bg-surface-1 p-3" key={a.id}><strong className="text-s">{a.code} · {a.name}</strong><p>{a.description}</p></article>)}</div>
        <Rule icon={<Swords size={19}/>} title="계보와 전직"
            effect={<>직업은 일곱 계열({JOB_TREES.filter(t => t.id !== 'mystery').map(t => t.name).join(' · ')} · ???)의 {LINEAGES.filter(l => !l.id.endsWith('independent') && l.tree !== 'mystery').length}개 계보로 이어집니다. 1차는 Lv.10에 열리고, 계보를 따라 5차까지 올라갑니다.<br/>자주 가는 길: <b>아처</b>(근력·기민, 관통·치명 물리) · <b>매지션</b>(지능·정신, 폭발 주문과 회복) · <b>검사</b>(체질·근력, 방어·기절) · <b>매지션(불,독)</b>(기민·지능, 중독을 쌓는 상태이상) · <b>데몬슬레이어 (1차)</b>(근력·지능, 물리+마법 복합) · <b>엔젤릭버스터 (1차)</b>(행운·정신, 가속·경험치 보조).</>}
            condition="전직 화면의 계보 카드와 항로도에서 다음 직업의 조건을 보고, 숙달한 직업은 조건 없이 다시 전직합니다."
            limit="능력치 재분배는 무료이며 자동 사냥 중에는 할 수 없습니다. ??? 계열의 히든 직업은 숨은 조건(플레이 기록)을 만족하면 드러나고, 한 번 만족한 조건은 계속 유지됩니다."/>
        <p className="text-xs leading-relaxed text-ink-3"><b>표기</b> +10%: 비율 보너스(같은 종류끼리 합산) · +1%p: 확률에 그대로 더함 · ×1.2: 곱하는 배율. 능력치 화면의 수치를 누르면 기여 내역이 열립니다.</p>
    </Topic>
    );
}
