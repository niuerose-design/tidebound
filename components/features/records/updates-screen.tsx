/** v3.399 업데이트 내역(새 토대): 최근 3개 버전 카드. */
import { CalendarDays, History } from 'lucide-react';
import { UPDATE_LOG } from '@/game/data/update-log';
import { SectionHeader } from '@/components/ui/game';

export function UpdatesScreen() {
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="PATCH NOTES" title="업데이트 내역" description="추가된 콘텐츠와 규칙 변경을 버전별로 확인하세요."/>
        {UPDATE_LOG.map(entry => <article className="grid gap-2 rounded-l border border-line bg-surface-2 p-4 shadow-1" key={entry.version}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3"><span className="rounded-s bg-accent px-1.5 py-0.5 font-num font-semibold text-accent-ink">v{entry.version}</span><span className="inline-flex items-center gap-1"><CalendarDays size={13}/>{entry.date}</span></div>
            <h2 className="font-display text-m font-bold">{entry.title}</h2>
            <p className="text-s leading-relaxed text-ink-2">{entry.summary}</p>
            <ul className="grid list-disc gap-1 pl-5 text-xs leading-relaxed text-ink-2">{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
            <div className="flex flex-wrap gap-1">{entry.tags.map(tag => <span key={tag} className="rounded-s border border-line px-1.5 py-0.5 text-xs text-ink-3">#{tag}</span>)}</div>
        </article>)}
        <p className="inline-flex items-center gap-2 rounded-m bg-surface-1 px-3 py-2 text-xs text-ink-3"><History size={16}/>이 화면은 게임 플레이 데이터와 분리된 패치 기록입니다. 환생이나 저장 데이터에는 영향을 주지 않습니다.</p>
    </div>;
}
