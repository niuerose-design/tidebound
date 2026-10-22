import { Gauge } from 'lucide-react';
import { STATUS_GUIDE, STATUS_TUNING } from '@/game/data/balance';
import { Topic, STATUS_GROUPS } from '../parts';

/** v3.413 도움말 주제(help-screen.tsx 에서 분리). 내용은 그대로입니다. */
export function StatusTopic() {
    return (
    <Topic icon={<Gauge size={19}/>} title="상태이상" note={`${STATUS_GUIDE.length}종. PvE와 결투에 같은 규칙입니다.`}>
        {STATUS_GROUPS.map(g => <div className="grid gap-2" key={g.title}>
            <h3 className="text-s font-semibold">{g.title}</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{STATUS_GUIDE.filter(st => (g.ids as readonly string[]).includes(st.id)).map(status => <article className="grid gap-1 rounded-m border border-line bg-surface-1 p-3" key={status.id}>
                <div className="flex items-baseline justify-between gap-2"><strong className="text-s">{status.name}</strong><span className="text-xs text-ink-3">{status.kind}</span></div>
                <p>{status.description}</p>
                <small className="text-xs text-ink-3">{status.detail}</small>
            </article>)}</div>
        </div>)}
        <p className="text-xs leading-relaxed text-ink-3"><b>공통</b> 이미 걸린 상태이상은 다시 걸지 않고 그 기술을 건너뜁니다(중독은 계속 쌓임). 망토의 ‘불굴’ 옵션은 몬스터가 거는 상태이상을 그 확률로 저항합니다(최대 50%). 풀린 뒤 기절 {STATUS_TUNING.immuneTurns.stun}턴, 그 밖 {STATUS_TUNING.immuneTurns.slow}턴은 같은 상태이상에 면역입니다.</p>
    </Topic>
    );
}
