'use client';
import { Button } from '@/components/ui/button';
import { FoldSection } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { Primary, Sm, HELP, muted, field, TABS } from './parts';
import { useAdmin } from './use-admin';
import { LifeTab } from './tabs/life';
import { EventsTab } from './tabs/events';
import { ClosuresTab } from './tabs/closures';
import { StatsTab } from './tabs/stats';
import { IncomeTab } from './tabs/income';
import { NewsTab } from './tabs/news';
import { MarketTab } from './tabs/market';

/** v27.26 운영 도구: 모험가 이름·아이디로 찾아 이번 생을 처음 상태로 되돌립니다(환생 횟수·세계석·연구·유물·도감 유지). */
/** v3.413 상태 · 서버 호출은 use-admin.ts, 공용 조각은 parts.tsx, 탭 화면은 tabs/*.tsx 로 나눴습니다. 화면과 동작은 그대로입니다. */
export default function AdminPage() {
    const a = useAdmin();
    const { key, setKey, query, setQuery, tab, events, closures, stats, income, incomeQuery, setIncomeQuery, news, done, error, busy, search, loadEvents, loadStats, loadClosures, market, loadMarket, loadIncome, loadNews, openTab } = a;
    const reload = (label: string, run: () => unknown) => <Sm disabled={busy || !key} onClick={() => void run()}>{label}</Sm>;
    return <main className="mx-auto grid max-w-4xl gap-3 px-4 py-6 text-ink-1">
        <header className="flex flex-wrap items-center justify-between gap-2.5">
            <h1 className="font-display text-xl font-bold">운영 도구</h1>
            <input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="운영자 키(TIDEBOUND_ADMIN_KEY)" aria-label="운영자 키" className={cn(field, 'max-w-80 flex-[1_1_220px]')}/>
        </header>
        <nav className="flex flex-wrap gap-1.5" aria-label="운영 메뉴">{TABS.map(([id, label]) => <Button key={id} type="button" size="sm" variant="outline" className={cn('pointer-coarse:min-h-11', tab === id && 'border-transparent bg-accent text-accent-ink hover:bg-accent/90')} aria-pressed={tab === id} onClick={() => openTab(id)}>{label}</Button>)}</nav>
        <FoldSection level={3} title="도움말"><p className="text-s leading-relaxed text-ink-3">{HELP[tab]}</p></FoldSection>
        <div className="flex flex-wrap items-center gap-2">
            {tab === 'life' && <form onSubmit={e => { e.preventDefault(); search(); }} className="flex flex-1 gap-2">
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="모험가 이름(일부) 또는 로그인 아이디" className={cn(field, 'flex-1')}/>
                <Primary disabled={busy || !key || !query.trim()}>찾기</Primary>
            </form>}
            {tab === 'events' && reload(events ? '새로고침' : '이벤트 불러오기', loadEvents)}
            {tab === 'stats' && reload(stats ? '새로고침' : '통계 불러오기', loadStats)}
            {tab === 'closures' && reload(closures ? '새로고침' : '목록 불러오기', loadClosures)}
            {tab === 'news' && reload(news ? '새로고침' : '최근 소식 불러오기', loadNews)}
            {tab === 'market' && reload(market ? '새로고침' : '상태 불러오기', loadMarket)}
            {tab === 'income' && <form onSubmit={e => { e.preventDefault(); void loadIncome(); }} className="flex flex-1 gap-2">
                <input value={incomeQuery} onChange={e => setIncomeQuery(e.target.value)} placeholder="모험가 이름·아이디 (비우면 전체)" className={cn(field, 'flex-1')}/>
                <Primary disabled={busy || !key}>{income ? '새로고침' : '불러오기'}</Primary>
            </form>}
            {!key && <small className={muted}>운영자 키를 먼저 넣어 주세요.</small>}
        </div>
        {error && <p role="alert" className="text-s text-danger">{error}</p>}
        {done && <p role="status" className="text-s text-ok">{done}</p>}
        {tab === 'events' && <EventsTab a={a}/>}
        {tab === 'stats' && <StatsTab a={a}/>}
        {tab === 'income' && <IncomeTab a={a}/>}
        {tab === 'news' && <NewsTab a={a}/>}
        {tab === 'market' && <MarketTab a={a}/>}
        {tab === 'closures' && <ClosuresTab a={a}/>}
        {tab === 'life' && <LifeTab a={a}/>}
    </main>;
}
