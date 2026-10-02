import { CalendarDays, History } from 'lucide-react';
import { UPDATE_LOG } from '@/game/data/update-log';
import { Heading } from './shared';

export function UpdateLog() {
    return <>
        <Heading eyebrow="PATCH NOTES" title="업데이트 내역" description="추가된 콘텐츠와 규칙 변경을 버전별로 확인하세요." />
        <div className="update-log-list">
            {UPDATE_LOG.map(entry => <article className="panel update-card" key={entry.version}>
                <div className="update-card-top">
                    <span className="badge">v{entry.version}</span>
                    <span><CalendarDays size={14}/>{entry.date}</span>
                </div>
                <h2>{entry.title}</h2>
                <p className="update-summary">{entry.summary}</p>
                <ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
                <div className="update-tags">{entry.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
            </article>)}
        </div>
        <div className="panel update-history-note"><History size={19}/><span>이 화면은 게임 플레이 데이터와 분리된 패치 기록입니다. 환생이나 저장 데이터에는 영향을 주지 않습니다.</span></div>
    </>;
}
