'use client';
/**
 * v3.396 세계의 제단(새 토대). 모든 모험가가 함께 채우는 게이지(축복 셋 · 신 소환 · 월드보스 소환), 공물 바치기, 기여 순위, 신 · 신의 자리, 월드보스.
 * 서버 API(/api/altar: offer · challenge · impeach · harvest · raid)와 정보 구조는 전과 같습니다. 정보는 화면을 열 때와 버튼을 누른 뒤에만 읽습니다(새로고침 버튼 별도).
 */
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Crown, Flame, Skull, Sparkles, Trophy, Coins, Gem, Droplets, EyeOff, Swords, RefreshCw, X } from 'lucide-react';
import type { State } from '@/game/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SectionHeader, StatBar, ChoiceChips, FoldSection, formatExact } from '@/components/ui/game';
import { formatRemaining } from '@/components/game/shared';
import { ALTAR, josa, altarCooldownMs, BLESSINGS, BLESSING_MAX_LEVEL, BLESSING_HIGH_FROM, BLESSING_HIGH_MINUTES, RAID, RAIDS, RAID_STAGE, RAID_STAGE_REWARD, SUMMON_GAUGE_IDS, raidRespawnMs, respawnLabel, gaugeTakesGold, isRaidGauge, offeringPoints, blessingJumpCost, type AltarGaugeId, type BlessingId, type RaidHitSummary, raidById } from '@/game/data/altar';
import { power, stats } from '@/game/systems/stats';
import type { AltarInfo, AltarResult } from '@/components/game/use-game';
import { cn } from '@/lib/utils';

type Props = { s: State; busy: boolean; info: AltarInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean>; result: AltarResult | null; clearResult: () => void };
const fmt = formatExact;
const remaining = (ms: number) => formatRemaining(ms, 0);
/** v3.284 신의 자리 임기(최대 7일)는 ‘n일 n시간’으로. */
const termLeft = (ms: number) => { const h = Math.max(0, Math.ceil(ms / 3600_000)); return h >= 24 ? `${Math.floor(h / 24)}일${h % 24 ? ` ${h % 24}시간` : ''}` : remaining(ms); };
const stamp = () => Date.now();
const num = (v: string) => Math.max(0, Math.floor(Number(v.replace(/[^0-9]/g, '')) || 0));
const QUICK = [10, 25, 50, 100];
const Card = ({ title, icon, aside, children, id, className }: { title: ReactNode; icon?: ReactNode; aside?: ReactNode; children: ReactNode; id?: string; className?: string }) => <section id={id} className={cn('grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1', className)}>
    <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="inline-flex items-center gap-1.5 font-display text-m font-bold">{icon}{title}</h2>{aside && <span className="text-xs text-ink-3">{aside}</span>}</header>{children}</section>;
const Note = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('text-xs leading-relaxed text-ink-3', className)}>{children}</p>;
const Primary = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" {...p} className={cn('bg-accent text-accent-ink hover:bg-accent/90', p.className)}/>;
const Secondary = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" variant="outline" {...p}/>;
/** 전투 기록을 접어 두는 결과 상자(신 · 월드보스 공용). */
function ResultBox({ win, title, logs, turns, onClose }: { win: boolean; title: string; logs: string[]; turns: number; onClose: () => void }) {
    return <div className={cn('grid gap-2 rounded-m border p-3', win ? 'border-ok/50 bg-ok/10' : 'border-danger/50 bg-danger/10')} role="status">
        <div className="flex items-start justify-between gap-2"><strong className="text-s">{title}</strong><Button type="button" size="icon-xs" variant="ghost" aria-label="닫기" onClick={onClose}><X size={14}/></Button></div>
        <LogFold label={`전투 기록 (${turns}턴)`} logs={logs}/>
    </div>;
}
function LogFold({ label, logs, defaultOpen }: { label: string; logs: string[]; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(!!defaultOpen);
    return <Collapsible open={open} onOpenChange={setOpen}><CollapsibleTrigger className="min-h-9 text-xs text-ink-2 underline-offset-2 hover:underline">{open ? '접기' : label}</CollapsibleTrigger><CollapsibleContent><ol className="mt-1 max-h-64 list-decimal overflow-auto rounded-s bg-surface-1 p-2 pl-6 text-xs leading-relaxed text-ink-2">{logs.map((l, i) => <li key={i}>{l}</li>)}</ol></CollapsibleContent></Collapsible>;
}

/**
 * v27.44 바칠 양: 좌우 슬라이더 · 빠른 비율 버튼 · 직접 입력. unit을 주면(골드 1,000 = 기여도 1) 그 배수로 내려 맞춰 자투리가 버려지지 않습니다.
 * v27.51 슬라이더·비율 버튼의 100%는 보유량이 아니라 '고른 게이지를 채우는 데 필요한 양'(cap, 보유량 이하)입니다. 직접 입력하면 그보다 더 바칠 수 있습니다.
 */
function AmountRow({ icon, label, have, cap, value, setValue, unit = 1, basis = 'need', most = Infinity }: { icon: ReactNode; label: string; have: number; cap: number; value: string; setValue: (v: string) => void; unit?: number; /** v3.19 한 번에 바칠 수 있는 최대(서버 상한). */ most?: number; /** v3.16 비율 기준: 채우는 데 필요한 양(need) 또는 내 보유량(have). */ basis?: 'need' | 'have' }) {
    const limit = basis === 'have' ? Infinity : cap;
    const top = Math.max(0, Math.min(Math.floor(have), limit, most)), fine = top <= 1000, n = Math.min(num(value), top), max = fine ? top : 1000;
    const set = (amount: number) => { const up = Math.ceil(Math.max(0, Math.min(top, amount)) / unit) * unit, v = up > top ? Math.floor(top / unit) * unit : up; setValue(v ? v.toLocaleString() : ''); };
    return <div className="grid gap-2 rounded-m bg-surface-1 p-3">
        <label className="grid gap-1 text-xs text-ink-3"><span className="inline-flex items-center gap-1 text-s text-ink-1">{icon}{label}</span>
            <input inputMode="numeric" className="h-10 w-full rounded-m border border-line bg-surface-0 px-2 font-num text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40" value={value} placeholder="0" onChange={e => setValue(e.target.value)}/>
            <small>보유 {fmt(Math.floor(have))}{limit < have ? ` · 채우기 ${fmt(top)}` : most < have ? ` · 한 번에 최대 ${fmt(most)}` : ''}</small></label>
        <div className="flex items-center gap-2">
            <input type="range" className="h-11 min-w-0 flex-1 accent-[var(--accent)]" min={0} max={max || 1} step={1} value={top ? (fine ? n : Math.round(n / top * 1000)) : 0} disabled={!top} aria-label={`${label} 바칠 양`} onChange={e => set(fine ? Number(e.target.value) : top * Number(e.target.value) / 1000)}/>
            <span className="w-10 text-right font-num text-xs text-ink-2">{top ? Math.round(n / top * 100) : 0}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">{QUICK.map(p => <Secondary key={p} size="xs" className="pointer-coarse:min-h-11" disabled={!top} onClick={() => set(top * p / 100)}>{p === 100 ? (limit < have ? '채우기' : '최대') : `${p}%`}</Secondary>)}<Button type="button" size="xs" variant="ghost" className="pointer-coarse:min-h-11" disabled={!value} onClick={() => setValue('')}>비우기</Button></div>
    </div>;
}

/** v3.84 월드보스 피해 순위의 최근 도전 기록: 출처별 피해 요약과 전투 기록(누르면 서버에서 불러옴). */
function RaidHitLog({ raidId, rank, last }: { raidId: string; rank: number; last?: RaidHitSummary }) {
    const [logs, setLogs] = useState<string[] | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
    const total = last ? last.sources.reduce((n, x) => n + x.value, 0) || 1 : 1;
    const fetchLogs = async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/altar?raidLog=${encodeURIComponent(raidId)}&rank=${rank}`, { cache: 'no-store' }), body = await res.json() as { logs?: string[]; error?: string };
            if (!res.ok) throw new Error(body.error || '기록을 불러오지 못했습니다.');
            setLogs(body.logs || []);
        } catch (e) { setError(e instanceof Error ? e.message : '기록을 불러오지 못했습니다.'); }
        finally { setLoading(false); }
    };
    return <div className="grid gap-2 py-1">
        {last ? <>
            <Note>최근 도전 · 피해 <b className="text-ink-1">{fmt(last.dealt)}</b> · {last.turns}턴{last.died ? ' · 쓰러짐' : ''} · {last.job} · 전투력 {fmt(last.power)}</Note>
            {last.sources.map(x => <StatBar key={x.label} size="s" tone="exp" value={x.value} max={total} label={`${x.label} ${fmt(x.value)} (${Math.round(x.value / total * 100)}%)`}/>)}
        </> : <Note>최근 도전 기록이 없습니다(기록 기능이 생기기 전의 도전).</Note>}
        {logs ? <LogFold label={`전투 기록 (끝 ${logs.length}줄)`} logs={logs} defaultOpen/> : <Secondary size="xs" className="justify-self-start pointer-coarse:min-h-11" disabled={loading} onClick={() => void fetchLogs()}>{loading ? '불러오는 중…' : '전투 기록 보기'}</Secondary>}
        {error && <Note className="text-danger">{error}</Note>}
    </div>;
}

const Board = ({ rows, cols, empty }: { rows: { rank: number; name: string; self: boolean; cells: ReactNode[] }[]; cols: string[]; empty: string }) => rows.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead>{cols.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{rows.map(r => <TableRow key={r.rank} className={cn(r.self && 'bg-accent-soft')}><TableCell className="font-num">{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell>{r.cells.map((c, i) => <TableCell key={i} className="font-num">{c}</TableCell>)}</TableRow>)}</TableBody></Table> : <Note>{empty}</Note>;

export function AltarScreen({ s, busy, info, error, load, act, result, clearResult }: Props) {
    const [gold, setGold] = useState(''), [pearls, setPearls] = useState(''), [essence, setEssence] = useState('');
    const [gauge, setGauge] = useState<AltarGaugeId>('gold'), [anonymous, setAnonymous] = useState(!!s.altar?.anonymous), [now, setNow] = useState(() => Date.now()), [pane, setPane] = useState<'offer' | 'board' | 'total'>('offer');
    // v27.91 게이지는 축복 / 소환(신 + 월드보스 셋) 탭으로 나눠 봅니다. 고른 게이지가 다른 탭에 있으면 탭을 따라갑니다.
    const [gaugeTab, setGaugeTab] = useState<'bless' | 'summon'>('bless');
    const [raidTab, setRaidTab] = useState<string>(RAIDS[0].id);
    // v3.193 신 · 신의 자리는 한 칸에서 탭으로 봅니다.
    const [godTab, setGodTab] = useState<'god' | 'throne'>('god');
    // v3.84 피해 순위에서 펼친 모험가의 최근 도전 기록('보스:순위').
    const [openHit, setOpenHit] = useState('');
    // v3.16 슬라이더·비율 버튼 기준: 고른 게이지를 채우는 데 필요한 양 / 내 보유량(수천억 골드를 한 번에 바칠 때).
    const [basis, setBasis] = useState<'need' | 'have'>('need');
    // v3.16 단계 점핑: 축복 게이지에서 목표 단계를 고르면 그 단계까지의 총 비용이 '채우는 데 필요한 양'이 됩니다. 0 = 다음 단계만.
    const [jump, setJump] = useState(0);
    const pickGauge = (id: AltarGaugeId) => { setGauge(id); setJump(0); setGaugeTab(SUMMON_GAUGE_IDS.includes(id) ? 'summon' : 'bless'); };
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    useEffect(() => { const t = setInterval(() => setNow(stamp), 30_000); return () => clearInterval(t); }, []);
    const offer = { gold: gaugeTakesGold(gauge) ? num(gold) : 0, pearls: num(pearls), essence: num(essence) }, points = offeringPoints(offer);
    // v27.51 고른 게이지가 가득 찰 때까지 남은 기여도. 다른 칸에 넣은 양을 빼고 각 재화로 환산한 만큼이 슬라이더의 100%입니다.
    const target = info?.gauges.find(g => g.id === gauge), isBless = !!target && BLESSINGS.some(b => b.id === gauge), live = target && target.until > now ? target.level : 0;
    const jumpTo = isBless && jump > live + 1 ? Math.min(jump, BLESSING_MAX_LEVEL) : 0, totalCost = target ? (jumpTo ? blessingJumpCost(gauge as BlessingId, live, jumpTo) : target.cost) : 0;
    const need = target ? Math.max(0, totalCost - target.points) : Infinity;
    const rest = (except: keyof typeof offer) => need === Infinity || need <= 0 ? Infinity : Math.max(0, need - offeringPoints({ ...offer, [except]: 0 }));
    const caps = { gold: rest('gold') * ALTAR.goldPerPoint, pearls: Math.ceil(rest('pearls') / ALTAR.pearlPoints), essence: Math.ceil(rest('essence') / ALTAR.essencePoints) };
    // v3.312 소환 게이지에는 골드 칸을 숨기고 골드를 0으로 보냅니다.
    const takesGold = gaugeTakesGold(gauge);
    const short = offer.gold > s.gold || offer.pearls > s.pearls || offer.essence > (s.essence || 0);
    // v3.19 직접 입력도 한 번에 바칠 수 있는 상한을 넘으면 버튼에서 알려 줍니다(서버는 넘으면 거절).
    const over = offer.gold > ALTAR.maxGold || offer.pearls > ALTAR.maxPearls || offer.essence > ALTAR.maxEssence;
    const submit = async () => { if (await act({ action: 'offer', ...offer, gauge, anonymous })) { setGold(''); setPearls(''); setEssence(''); setNow(stamp); } };
    const myPower = power(stats(s)), wait = (s.altar?.challengeAt || 0) + altarCooldownMs(s) - now;
    const god = info?.god, throne = info?.throne;
    const godLocked = gauge === 'god' && !!throne;
    // v3.22 월드보스 탭(발록·자쿰·혼테일): 보스마다 소환·전투·도전 간격이 따로입니다. 고른 탭에 보스가 없으면 그 보스의 소환 게이지를 보여 줍니다.
    const raid = info?.raids.find(r => r.id === raidTab), raidGauge = info?.gauges.find(g => g.id === raidTab), raidWait = (s.altar?.raidAtBy?.[raidTab] || 0) + RAID.cooldownMs - now;
    const header = <SectionHeader as="h1" eyebrow="ALTAR OF THE WORLD" title="세계의 제단" description="모든 모험가가 함께 채우는 제단입니다. 골드·세계석·정수를 바쳐 서버 전체에 축복을 열거나, 신을 깨워 그 자리를 차지하세요."
        actions={<Secondary disabled={busy} onClick={() => { setNow(stamp); void load(); }}><RefreshCw size={14}/>새로고침</Secondary>}/>;
    if (!info) return <div className="grid gap-5 text-ink-1">{header}{error ? <p className="rounded-m border border-danger/50 bg-danger/10 px-3 py-2 text-s" role="alert">{error}</p> : <Note>불러오는 중…</Note>}</div>;
    return <div className="grid gap-5 text-ink-1">
        {header}
        {error && <p className="rounded-m border border-danger/50 bg-danger/10 px-3 py-2 text-s" role="alert">{error}</p>}
        <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card title="제단의 게이지" icon={<Flame size={16} className="text-accent"/>} aside={`누적 기여도 ${fmt(info.totals.points)}`}>
                <Tabs value={gaugeTab} onValueChange={v => setGaugeTab(v as typeof gaugeTab)}><TabsList><TabsTrigger value="bless" className="pointer-coarse:min-h-11"><Sparkles size={14}/> 축복</TabsTrigger><TabsTrigger value="summon" className="pointer-coarse:min-h-11"><Skull size={14}/> 소환</TabsTrigger></TabsList></Tabs>
                {/* v3.279 신의 자리에 주인이 있으면 신이 깨어나지 않는 이유 · 남은 임기 · 탄핵 길을 소환 탭 위에 알립니다. */}
                {gaugeTab === 'summon' && throne && <div className="flex items-start gap-2 rounded-m border border-gold-ink/40 bg-surface-1 p-3 text-xs" role="status"><Crown size={16} className="shrink-0 text-gold-ink"/><div className="grid gap-1">
                    <strong className="text-s">{throne.mine ? '당신이 신의 자리에 앉아 있습니다' : `${josa(throne.name, '이가')} 신의 자리에 앉아 있습니다`}</strong>
                    <span className="text-ink-3">자리에 주인이 있는 동안에는 신이 깨어나지 않고 신 소환 게이지도 닫힙니다. 임기 {termLeft(throne.since + ALTAR.throneTermMs - now)} 남음{throne.mine ? '' : ' · 탄핵에 성공하면 자리가 비고 다시 소환할 수 있습니다'}.</span>
                    {!throne.mine && <Secondary size="xs" className="justify-self-start pointer-coarse:min-h-11" onClick={() => { setGodTab('throne'); requestAnimationFrame(() => document.getElementById('altar-god')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>신의 자리 보기</Secondary>}
                </div></div>}
                <div className="grid gap-2">{info.gauges.filter(g => (gaugeTab === 'summon') === SUMMON_GAUGE_IDS.includes(g.id)).map(g => {
                    const open = g.until > now, summon = SUMMON_GAUGE_IDS.includes(g.id), on = gauge === g.id;
                    // v3.276 신의 자리에 앉아 있으면 신 소환 게이지는 고를 수 없습니다(서버도 거절).
                    const locked = g.id === 'god' && !!info.throne;
                    return <button key={g.id} type="button" className={cn('grid gap-1.5 rounded-m border p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:opacity-60', on ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1 hover:bg-surface-3/60')} onClick={() => pickGauge(g.id)} aria-pressed={on} disabled={locked} title={locked ? '신의 자리에 주인이 있는 동안에는 신이 깨어나지 않습니다' : undefined}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><strong className="inline-flex items-center gap-1 text-s">{g.id === 'god' ? <Skull size={14}/> : isRaidGauge(g.id) ? <Swords size={14}/> : <Sparkles size={14}/>} {g.name}{open && g.level ? ` · ${g.level}단계` : ''}</strong>{open ? <em className="text-xs not-italic text-ok">진행 중 · {g.desc} · {remaining(g.until - now)} 남음</em> : <small className="text-xs text-ink-3">{g.desc}</small>}</div>
                        <StatBar value={Math.min(g.points, g.cost)} max={g.cost} tone={summon ? 'warn' : 'accent'} size="s" showText={false}/>
                        <small className="font-num text-xs text-ink-3">{fmt(g.points)} / {fmt(g.cost)}{locked ? ` · 신의 자리가 비어야 바칠 수 있음(임기 ${termLeft(info.throne!.since + ALTAR.throneTermMs - now)} 남음)` : g.points >= g.cost && g.id === 'god' ? ' · 신이 떠나면 바로 깨어납니다' : g.id !== 'god' ? ` · ${g.next}` : ''}</small>
                    </button>;
                })}</div>
                <Note>{gaugeTab === 'bless' ? `축복은 최대 ${BLESSING_MAX_LEVEL}단계 · 최대 ${ALTAR.blessingCapMs / 3600_000}시간까지 쌓이고, 끝나면 단계는 처음으로 돌아갑니다.` : `게이지가 차면 바로 나타납니다. ${RAIDS.map(r => `${r.name} ${r.lifetimeHours}시간`).join(' · ')} 머물고, 쓰러지면 ${RAIDS.map(r => `${r.name} ${respawnLabel(raidRespawnMs(r))}`).join(' · ')} 뒤에 다시 소환할 수 있습니다. 신은 ${ALTAR.godLifetimeMs / 3600_000}시간. 소환 게이지에는 골드를 바칠 수 없습니다.`}</Note>
            </Card>
            <Card title={pane === 'offer' ? <>공물 → {target?.name}</> : pane === 'total' ? '누적 기여 순위' : `이번 주 기여 순위 · ${info.week}`} icon={<Coins size={16} className="text-accent"/>} aside={pane === 'total' ? `내 누적 기여도 ${fmt(info.total?.points || 0)}${info.total?.rank ? ` · ${info.total.rank}위` : ''}` : `내 기여도 ${fmt(info.me.points)}${info.me.rank ? ` · ${info.me.rank}위` : ''}`}>
                <Tabs value={pane} onValueChange={v => setPane(v as typeof pane)}><TabsList className="h-auto flex-wrap"><TabsTrigger value="offer" className="pointer-coarse:min-h-11"><Coins size={14}/> 공물 바치기</TabsTrigger><TabsTrigger value="board" className="pointer-coarse:min-h-11"><Trophy size={14}/> 이번 주 순위</TabsTrigger><TabsTrigger value="total" className="pointer-coarse:min-h-11"><Trophy size={14}/> 누적 순위</TabsTrigger></TabsList></Tabs>
                {pane === 'offer' ? <>
                    {isBless && <div className="grid gap-1.5"><ChoiceChips label="목표 단계" value={String(jumpTo || live + 1)} onChange={v => { const lv = Number(v); setJump(lv === live + 1 ? 0 : lv); }} options={Array.from({ length: BLESSING_MAX_LEVEL }, (_, i) => i + 1).map(lv => ({ value: String(lv), label: `${lv}단계${lv > BLESSING_HIGH_FROM ? ` · ${BLESSING_HIGH_MINUTES[lv - BLESSING_HIGH_FROM - 1] / 60}시간` : ''}`, disabled: lv <= live, title: lv <= live ? '이미 도달' : `${lv}단계까지 총 기여도 ${fmt(blessingJumpCost(gauge as BlessingId, live, lv))}` }))}/>
                        <Note>{jumpTo ? `${live ? `${live}단계에서 ` : ''}${jumpTo}단계까지 한 번에 · 총 기여도 ${fmt(totalCost)} (골드 ${fmt(totalCost * ALTAR.goldPerPoint)} 상당) · 지금 게이지 ${fmt(target!.points)} 포함` : `다음 단계(${live + 1}단계)만 · 더 높은 단계를 고르면 그 단계까지의 총 비용을 한 번에 바칩니다`}</Note></div>}
                    <div className="grid gap-1.5"><ChoiceChips label="비율 기준" value={basis} onChange={v => setBasis(v as typeof basis)} options={[{ value: 'need', label: '채우는 데 필요한 양' }, { value: 'have', label: '내 보유량' }]}/><Note>{basis === 'need' ? '100% = 고른 게이지를 채우는 양(보유량 이하)' : '100% = 지금 가진 전부 · 남는 기여도는 다음 단계로 이어집니다'}</Note></div>
                    {takesGold && <AmountRow icon={<Coins size={14}/>} label="골드" have={s.gold} cap={caps.gold} value={gold} setValue={setGold} unit={ALTAR.goldPerPoint} basis={basis} most={ALTAR.maxGold}/>}
                    <AmountRow icon={<Gem size={14}/>} label="세계석" have={s.pearls} cap={caps.pearls} value={pearls} setValue={setPearls} basis={basis} most={ALTAR.maxPearls}/>
                    <AmountRow icon={<Droplets size={14}/>} label="정수" have={s.essence || 0} cap={caps.essence} value={essence} setValue={setEssence} basis={basis} most={ALTAR.maxEssence}/>
                    <label className="flex min-h-11 items-center gap-2 text-s"><Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="익명으로 기여"/><EyeOff size={14}/> 익명으로 기여 (순위표에 ‘익명의 모험가’로 표시)</label>
                    <Primary className="h-10 w-full" disabled={busy || points < 1 || short || over || godLocked} onClick={() => void submit()}>{godLocked ? '신의 자리에 주인이 있는 동안에는 신 소환에 바칠 수 없습니다' : over ? `한 번에 골드 ${fmt(ALTAR.maxGold)} · 세계석 ${fmt(ALTAR.maxPearls)} · 정수 ${fmt(ALTAR.maxEssence)}까지` : short ? '보유량이 부족합니다' : `바치기 · 기여도 +${fmt(points)}`}</Primary>
                    <Note>기여도: {takesGold ? `골드 ${ALTAR.goldPerPoint.toLocaleString()} = 1 · ` : ''}세계석 1 = {ALTAR.pearlPoints} · 정수 1 = {ALTAR.essencePoints}.{takesGold ? '' : ' 신 · 월드보스 소환에는 골드를 바칠 수 없습니다(축복만).'} 바친 재화는 돌아오지 않습니다(신의 자리 주인에게 {ALTAR.titheRate * 100}%가 돌아갑니다).</Note>
                </> : pane === 'total' ? <>
                    {/* v3.19 누적 기여 순위: 모든 주의 기여를 합친 순위(이름·익명은 가장 최근 기록). */}
                    <Board rows={(info.allTime || []).map(r => ({ rank: r.rank, name: r.name, self: r.self, cells: [<b key="p">{fmt(r.points)}</b>] }))} cols={['누적 기여도']} empty="아직 바친 모험가가 없습니다."/>
                    <Note>주간 순위와 달리 초기화되지 않습니다. 익명 여부와 이름은 가장 최근에 바친 주의 설정을 따릅니다.</Note>
                </> : <>
                    <Board rows={info.board.map(r => ({ rank: r.rank, name: r.name, self: r.self, cells: [<b key="p">{fmt(r.points)}</b>] }))} cols={['기여도']} empty="이번 주에 바친 모험가가 아직 없습니다."/>
                    <Note>순위는 월요일 0시(한국 시간)에 새로 시작합니다. 축복 {BLESSINGS.length}종 · 신 소환은 순위와 상관없이 함께 채웁니다.</Note>
                </>}
            </Card>
            <Card id="altar-god" title="신" icon={<Skull size={16} className="text-accent"/>} aside={god ? `${god.gen}번째 신` : undefined}>
                <Tabs value={godTab} onValueChange={v => setGodTab(v as typeof godTab)}><TabsList><TabsTrigger value="god" className="pointer-coarse:min-h-11"><Skull size={14}/> 신{god?.alive ? ' · 깨어남' : ''}</TabsTrigger><TabsTrigger value="throne" className="pointer-coarse:min-h-11"><Crown size={14}/> 신의 자리{throne ? ` · ${throne.name}` : ''}</TabsTrigger></TabsList></Tabs>
                {godTab === 'god' ? <>
                    {god?.alive ? <>
                        <div className="grid gap-0.5 rounded-m bg-surface-1 p-3"><strong className="font-display text-m">{god.name}</strong><span className="text-xs text-ink-2">Lv.{god.level} · 최대 체력 {fmt(god.hp)} · 공격 {fmt(god.attack)} · 전투력 {fmt(god.power)}</span><small className="text-xs text-ink-3">떠나기까지 {remaining(god.until - now)} · 내 전투력 {fmt(myPower)}</small></div>
                        {god.mine ? <Note>지금 깨어난 신은 당신을 본뜬 모습입니다. 다른 모험가가 쓰러뜨리면 자리를 빼앗깁니다.</Note>
                            : <Primary className="h-10" disabled={busy || wait > 0} onClick={() => void act({ action: 'challenge' })}>{wait > 0 ? `${remaining(wait)} 뒤 다시 도전` : '신에게 도전'}</Primary>}
                        <Note>가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉습니다. 도전은 {ALTAR.challengeCooldownMs / 60000}분에 한 번, 무릉도장처럼 끝까지(최대 {ALTAR.godMaxTurns}턴) 겨룹니다.</Note>
                    </> : <Note>{god ? '신이 잠들어 있습니다.' : '아직 깨어난 신이 없습니다.'}{throne ? ` 지금은 ${throne.mine ? '당신이' : josa(throne.name, '이가')} 신의 자리에 있어 임기(${termLeft(throne.since + ALTAR.throneTermMs - now)} 남음)가 끝나거나 탄핵되기 전까지 신이 깨어나지 않습니다.` : ''} 신 소환 게이지({fmt(ALTAR.godCost)})가 차면 신이 깨어납니다. 깨어나는 신은 {ALTAR.firstGod.name}(무릉도장 {ALTAR.firstGod.depth}층 보스급)입니다. 신의 자리에 주인이 있는 동안에는 신이 깨어나지 않습니다(임기가 끝나거나 탄핵되면 다시 소환).</Note>}
                </> : <>
                    {throne ? <>
                        <div className="grid gap-1 rounded-m bg-surface-1 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-display text-m">{throne.name}{throne.mine ? ' (나)' : ''}</strong>{!throne.mine && !god?.alive && <Secondary size="xs" className="pointer-coarse:min-h-11" disabled={busy || wait > 0} title={`신이 된 ${throne.name}(최대 체력 ${fmt(throne.hp)} · 전투력 ${fmt(throne.power)})과 겨뤄 이기면 자리에서 내려옵니다. 자리는 비고, 다시 앉으려면 신을 소환해 쓰러뜨려야 합니다.`} onClick={() => void act({ action: 'impeach' })}>{wait > 0 ? `탄핵 · ${remaining(wait)} 뒤` : '탄핵'}</Secondary>}</div><small className="text-xs text-ink-3">{new Date(throne.since).toLocaleString('ko-KR')}부터 · 임기 {termLeft(throne.since + ALTAR.throneTermMs - now)} 남음(지나면 자리와 몫이 비고 다음 신은 {ALTAR.firstGod.name})</small></div>
                        {throne.mine && throne.tithe && <>
                            <p className="font-num text-s">쌓인 몫 · {fmt(throne.tithe.gold)} G · 세계석 {fmt(throne.tithe.pearls)} · 정수 {fmt(throne.tithe.essence)}</p>
                            <Primary className="h-10" disabled={busy || !(throne.tithe.gold || throne.tithe.pearls || throne.tithe.essence)} onClick={() => void act({ action: 'harvest' })}>몫 거두기</Primary>
                            <Note>자리를 빼앗기면 거두지 않은 몫은 사라집니다. 자주 거두세요.</Note>
                        </>}
                    </> : <Note>비어 있습니다. 신을 쓰러뜨린 첫 모험가가 앉습니다.</Note>}
                    <Note>신의 자리 주인은 다른 모험가가 바치는 골드·세계석·정수의 {ALTAR.titheRate * 100}%를 거둡니다.</Note>
                </>}
                {result && result.dealt === undefined && <ResultBox win={result.winner === 'player'} turns={result.turns} logs={result.logs} onClose={clearResult} title={result.winner === 'player' ? result.impeached ? '승리 · 탄핵 성공, 신의 자리가 비었습니다' : result.claimed ? '승리 · 신의 자리에 앉았습니다!' : '승리 · 하지만 한발 늦었습니다' : result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '패배'}/>}
            </Card>
            <Card title="월드보스" icon={<Swords size={16} className="text-accent"/>} aside={raid ? `오늘 ${raid.stage}단계 · 참여 ${raid.participants}명` : undefined}>
                <Tabs value={raidTab} onValueChange={setRaidTab}><TabsList className="h-auto flex-wrap">{RAIDS.map(r => { const x = info.raids.find(y => y.id === r.id); return <TabsTrigger key={r.id} value={r.id} className="pointer-coarse:min-h-11">{r.name}{x?.alive ? ` · ${x.stage > 1 ? `${x.stage}단계 ` : ''}출현` : x?.slain ? ' · 격파' : ''}</TabsTrigger>; })}</TabsList></Tabs>
                {raid ? <>
                    <div className="grid gap-1.5 rounded-m bg-surface-1 p-3"><strong className="font-display text-m">{raid.name}{raid.stage > 1 ? ` · ${raid.stage}단계` : ''}</strong><span className="text-xs text-ink-2">Lv.{raid.level} · 공격 {fmt(raid.attack)} · 방어 {fmt(raid.defense)} · 전투력 {fmt(raid.power)}{raid.immune ? ` · 석상의 가호: ${raid.immune === 'magic' ? '마법' : '물리'} 피해 면역` : ''}{(s.raidBest?.[raid.id] || 0) > 0 ? ` · 내 최고 격파 ${s.raidBest![raid.id]}단계` : ''}</span>
                        <StatBar value={raid.hp} max={raid.hpMax} tone={raid.alive ? 'hp' : 'warn'} label={`공유 체력 ${fmt(raid.hp)} / ${fmt(raid.hpMax)}`}/>
                        <small className="text-xs text-ink-3">{raid.alive ? `떠나기까지 ${remaining(raid.until - now)} · 모든 모험가의 피해가 함께 쌓입니다` : `격파! 마지막 일격 ${raid.slayer || '—'} · 참여한 모험가는 다음 동기화 때 보상을 받습니다`}</small></div>
                    {raid.alive && <Primary className="h-10" disabled={busy || raidWait > 0} onClick={() => void act({ action: 'raid', id: raid.id })}>{raidWait > 0 ? `${remaining(raidWait)} 뒤 다시 도전` : '월드보스에게 도전'}</Primary>}
                    <FoldSection level={3} title="규칙" className="bg-surface-1">
                        <Note>도전은 {RAID.cooldownMs / 60000}분에 한 번, 한 번에 최대 {RAID.maxTurns}턴. 깎은 체력은 그대로 남아 다음 모험가가 이어서 때립니다. 같은 날 격파된 뒤 다시 나타나면 한 단계 올라(체력 ×{RAID_STAGE.hp} · 공격 ×{RAID_STAGE.attack}, 최대 {RAID_STAGE.max}단계) 점점 잡기 어려워지고, 첫 소환부터 하루가 지나면 1단계로 돌아갑니다. 지속 피해의 체력 비례분은 1단계 체력 기준입니다. 격파 보상 · 세계석 +{raid.reward.pearls}{raid.reward.sp ? ` · SP +${raid.reward.sp}` : ''} (한 번이라도 때린 모험가 전원, 단계마다 세계석 +{RAID_STAGE_REWARD.pearlsPerStage}) · 마지막 일격 세계석 +{raid.slayerBonus.pearls}{raid.slayerBonus.sp ? ` · SP +${raid.slayerBonus.sp}` : ''} 추가({RAID_STAGE_REWARD.slayerSpFrom}단계부터 SP +1).{raid.immune ? ` 석상의 가호: 이번 소환은 ${raid.immune === 'magic' ? '마법 공격(직접 피해 · 추가타 · 그 공격이 거는 출혈 · 중독 · 화상 · 넘친 회복)' : '물리 공격(직접 피해 · 추가타 · 그 공격이 거는 출혈 · 중독 · 화상 · 반격)'}을 전혀 받지 않습니다. 복합 피해 공격은 절반이 들어가고 상태이상도 겁니다. 석상의 심판에 쓰러지면 無로도 버티지 못합니다.` : ''}</Note>
                    </FoldSection>
                    {result && result.dealt !== undefined && <ResultBox win={!!result.slain} turns={result.turns} logs={result.logs} onClose={clearResult} title={result.slain ? result.slayer ? '격파 · 마지막 일격!' : '격파 · 함께 쓰러뜨렸습니다' : `피해 ${fmt(result.dealt)} · 남은 체력 ${fmt(result.remaining || 0)}`}/>}
                    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="inline-flex items-center gap-1 text-s font-semibold"><Trophy size={14}/> 피해 순위</h3><span className="text-xs text-ink-3">{raid.me.dealt ? `내 피해 ${fmt(raid.me.dealt)} · ${raid.me.rank}위 · ${raid.me.hits}회` : '아직 때리지 않음'}</span></div>
                    {raid.board.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>피해</TableHead><TableHead>횟수</TableHead></TableRow></TableHeader>
                        <TableBody>{raid.board.map(r => { const key = `${raid.id}:${r.rank}`, open = openHit === key; return <Fragment key={r.rank}><TableRow className={cn(r.self && 'bg-accent-soft')}><TableCell className="font-num">{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''} <button type="button" className="ml-1 min-h-9 text-xs text-accent underline-offset-2 hover:underline" aria-expanded={open} onClick={() => setOpenHit(open ? '' : key)}>{open ? '접기' : '기록'}</button></TableCell><TableCell className="font-num"><b>{fmt(r.dealt)}</b></TableCell><TableCell className="font-num">{r.hits}</TableCell></TableRow>
                            {open && <TableRow><TableCell colSpan={4}><RaidHitLog key={`${raid.gen}:${r.rank}:${r.last?.at || 0}`} raidId={raid.id} rank={r.rank} last={r.last}/></TableCell></TableRow>}</Fragment>; })}</TableBody></Table>
                        : <Note>아직 아무도 때리지 않았습니다. 첫 피해를 넣어 보세요.</Note>}
                </> : <Note>{raidById(raidTab)?.name}은(는) 지금 나타나 있지 않습니다. 소환 게이지 {fmt(raidGauge?.points || 0)} / {fmt(raidGauge?.cost || 0)} · {raidGauge?.next || ''}. 보스마다 따로 소환되고(발록 6 · 자쿰 12 · 혼테일 24시간 머묾), 여러 보스가 동시에 나타날 수 있습니다. 모든 모험가의 피해가 하나의 체력에 쌓이고, 격파하면 때린 모험가 전원이 보상을 받습니다.</Note>}
            </Card>
        </div>
    </div>;
}
