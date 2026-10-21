'use client';
/**
 * v3.374 디자인 시스템 나열(개발 전용, 재설계 브리프 10절): 토큰과 게임 범용 컴포넌트를 한 화면에 두고 디자인 검토 · 접근성 점검(44pt · 11px · 대비)을 합니다.
 * 운영 빌드(production)에서는 404입니다. 주소: /dev/ui
 */
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Sword, Shield, Gem, Inbox } from 'lucide-react';
import { StatBar, NumberTicker, ItemSlot, RichTooltip, RarityTag, RARITY_KEYS, ElementIcon, TierBadge, LogFeed, ProgressRing, EmptyState, SectionHeader, KeyValueList, type LogFeedItem } from '@/components/ui/game';

const TOKENS = {
    바탕: ['surface-0', 'surface-1', 'surface-2', 'surface-3'],
    글자: ['ink-1', 'ink-2', 'ink-3'],
    선과강조: ['line', 'line-strong', 'accent', 'accent-soft', 'gold-ink'],
    등급: RARITY_KEYS.map(r => `rarity-${r}`),
    피해: ['dmg-physical', 'dmg-magic', 'dmg-split', 'dmg-fixed'],
    상태: ['ok', 'warn', 'danger', 'info'],
};

export default function DevUi() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <DevUiInner/>;
}

function DevUiInner() {
    const [hp, setHp] = useState(2870), [gold, setGold] = useState(1_234_567), [tick, setTick] = useState(0);
    const [logs, setLogs] = useState<LogFeedItem[]>(() => Array.from({ length: 500 }, (_, i) => line(i)));
    useEffect(() => { const t = setInterval(() => { setTick(n => n + 1); setHp(h => Math.max(200, h + (Math.random() < .5 ? -Math.round(Math.random() * 400) : Math.round(Math.random() * 250)))); setGold(g => g + Math.round(Math.random() * 20000)); setLogs(l => [...l.slice(-999), line(l.length)]); }, 2000); return () => clearInterval(t); }, []);
    return <main className="mx-auto grid max-w-5xl gap-10 px-4 py-8 text-ink-1 bg-surface-0 min-h-screen">
        <SectionHeader as="h1" eyebrow="Design system" title="판게아 UI 토대 (v3.374)" description="토큰과 게임 범용 컴포넌트. 새 화면은 이 조각만 조합해 만듭니다(docs/design-system.md)." actions={<span className="text-s text-ink-3">틱 {tick}</span>}/>

        <section className="grid gap-4"><SectionHeader title="토큰" description="색 · 간격 · 둥글기 · 그림자 · 모션. 값은 app/styles/tokens.css."/>
            {Object.entries(TOKENS).map(([group, names]) => <div key={group} className="grid gap-2"><h3 className="text-s font-semibold text-ink-2">{group}</h3><div className="flex flex-wrap gap-2">{names.map(n => <div key={n} className="grid w-28 gap-1"><div className="h-10 rounded-m border border-line" style={{ background: `var(--${n})` }}/><code className="text-xs text-ink-3">{n}</code></div>)}</div></div>)}
            <div className="flex flex-wrap items-end gap-3 text-ink-2">{['text-xs', 'text-s', 'text-m', 'text-l', 'text-xl', 'text-2xl'].map(t => <span key={t} className={t}>{t} 가나다 Abc 123</span>)}</div>
            <div className="flex flex-wrap gap-3">{['radius-s', 'radius-m', 'radius-l'].map(r => <div key={r} className="grid h-16 w-24 place-items-center border border-line-strong bg-surface-2 text-xs text-ink-3" style={{ borderRadius: `var(--${r})` }}>{r}</div>)}<div className="grid h-16 w-24 place-items-center rounded-m bg-surface-2 text-xs text-ink-3" style={{ boxShadow: 'var(--shadow-1)' }}>shadow-1</div><div className="grid h-16 w-24 place-items-center rounded-m bg-surface-2 text-xs text-ink-3" style={{ boxShadow: 'var(--shadow-2)' }}>shadow-2</div></div>
        </section>

        <section className="grid gap-4"><SectionHeader title="StatBar · NumberTicker · ProgressRing" description="2초마다 값이 바뀝니다. 줄면 잔상, 늘면 번쩍."/>
            <div className="grid gap-3 sm:grid-cols-2">
                <StatBar label="체력" value={hp} max={3200} tone="hp"/><StatBar label="마나" value={820} max={820} tone="mp" size="s"/>
                <StatBar label="경험치" value={(tick * 9137) % 77693} max={77693} tone="exp" size="l"/><StatBar label="경고" value={1} max={4} tone="danger" showText={false}/>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xl"><span>골드 <NumberTicker value={gold} suffix=" G" className="text-gold-ink"/></span><span>세계석 <NumberTicker value={911}/></span><span className="text-s">정확: <NumberTicker value={gold} digits={2}/></span>
                <ProgressRing value={(tick % 10) / 10} label="숙련"/><ProgressRing value={.66} size={64} stroke={7} color="var(--gold-ink)" label="쿨다운">6s</ProgressRing>
            </div>
        </section>

        <section className="grid gap-4"><SectionHeader title="RarityTag · ElementIcon · TierBadge"/>
            <div className="flex flex-wrap gap-2">{RARITY_KEYS.map(r => <RarityTag key={r} rarity={r}/>)}<RarityTag rarity="legendary" size="m" label="전설 · 대왕"/></div>
            <div className="flex flex-wrap gap-4">{(['physical', 'magic', 'split', 'fixed'] as const).map(k => <ElementIcon key={k} kind={k} withLabel/>)}</div>
            <div className="flex flex-wrap gap-2">{[0, 1, 2, 3, 4, 5, 6].map(t => <TierBadge key={t} tier={t}/>)}<TierBadge tier={5} label="초월"/></div>
        </section>

        <section className="grid gap-4"><SectionHeader title="ItemSlot · RichTooltip" description="마우스는 올리기, 키보드는 Tab, 터치는 길게 누르기."/>
            <div className="flex flex-wrap items-end gap-3">
                <RichTooltip title="별빛 작살" rarity="epic" kicker="무기 · 아처 계보" flavor="별이 떨어진 밤에 벼린 작살." effects={['물리 공격 +48', '치명타 확률 +3.5%', '출혈 지속 피해 +12%']} source="획득: 협곡 · 별빛 개체"><ItemSlot rarity="epic" label="별빛 작살" onClick={() => {}}><Sword size={20}/></ItemSlot></RichTooltip>
                <ItemSlot rarity="legendary" count={12} label="전설 방어구 12개" onClick={() => {}}><Shield size={20}/></ItemSlot>
                <ItemSlot rarity="primal" locked selected label="태초 보석(잠금 · 선택)" onClick={() => {}}><Gem size={20}/></ItemSlot>
                <ItemSlot empty label="빈 칸"/><ItemSlot rarity="rare" size="s" label="작은 칸"><Gem size={14}/></ItemSlot><ItemSlot rarity="mythic" size="l" count={99999} label="큰 칸" onClick={() => {}}><Sword size={28}/></ItemSlot>
            </div>
        </section>

        <section className="grid gap-4"><SectionHeader title="LogFeed" description="1,000줄까지 보이는 줄만 그립니다. 위로 올리면 따라가기가 멈추고 ‘새 기록’ 버튼이 뜹니다."/>
            <LogFeed items={logs} kinds={[{ id: 'battle', label: '전투' }, { id: 'reward', label: '획득' }, { id: 'system', label: '시스템' }]}/>
        </section>

        <section className="grid gap-4 sm:grid-cols-2"><div className="grid gap-3"><SectionHeader as="h3" title="KeyValueList"/><KeyValueList columns={1} items={[{ key: '물리 공격', value: '3,074' }, { key: '물리 방어', value: '996' }, { key: '치명타', value: '40%', tone: 'ok' }, { key: '회피', value: '0.8%', tone: 'warn', hint: '기민으로 오릅니다' }, { key: '사망', value: '12', tone: 'danger' }]}/></div>
            <div className="grid gap-3"><SectionHeader as="h3" title="EmptyState"/><EmptyState icon={<Inbox size={28}/>} title="아직 장비가 없습니다" description="사냥터에서 몬스터를 처치하면 장비가 떨어집니다." action={<button type="button" className="min-h-11 rounded-m bg-accent px-4 text-s font-semibold text-accent-ink">사냥 시작</button>}/></div></section>
    </main>;
}
function line(i: number): LogFeedItem {
    const kind = i % 7 === 0 ? 'system' : i % 3 === 0 ? 'reward' : 'battle';
    return { id: i, kind, node: <div className="flex gap-2 py-0.5"><span className="font-num text-xs tabular-nums text-ink-3">{String(i).padStart(4, '0')}</span><span className={kind === 'reward' ? 'text-gold-ink' : kind === 'system' ? 'text-ok' : 'text-ink-1'}>{kind === 'battle' ? `달팽이에게 ${120 + (i * 37) % 900} 피해 (물리)` : kind === 'reward' ? `골드 +${(i * 91) % 5000} · 경험치 +${(i * 13) % 300}` : '자동 사냥을 시작했습니다.'}</span></div> };
}
