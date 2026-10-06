'use client';
import { Fragment, useEffect, useState } from 'react';
import { Crown, Flame, Skull, Sparkles, Trophy, Coins, Gem, Droplets, EyeOff, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PanelProps } from './panel-props';
import { Heading, Meter, format, formatRemaining } from './shared';
import { ALTAR, BLESSINGS, BLESSING_MAX_LEVEL, BLESSING_HIGH_FROM, BLESSING_HIGH_MINUTES, RAID, RAIDS, SUMMON_GAUGE_IDS, isRaidGauge, offeringPoints, blessingJumpCost, type AltarGaugeId, type BlessingId, type RaidHitSummary } from '@/game/data/altar';
import { power, stats } from '@/game/systems/stats';
import type { AltarInfo, AltarResult } from './use-game';

type Props = PanelProps & { info: AltarInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean>; result: AltarResult | null; clearResult: () => void };
const remaining = (ms: number) => formatRemaining(ms, 0);
const stamp = () => Date.now();
const num = (v: string) => Math.max(0, Math.floor(Number(v.replace(/[^0-9]/g, '')) || 0));
const QUICK = [10, 25, 50, 100];
/**
 * v27.44 바칠 양: 좌우 슬라이더 · 빠른 비율 버튼 · 직접 입력. unit을 주면(골드 1,000 = 기여도 1) 그 배수로 내려 맞춰 자투리가 버려지지 않습니다.
 * v27.51 슬라이더·비율 버튼의 100%는 보유량이 아니라 '고른 게이지를 채우는 데 필요한 양'(cap, 보유량 이하)입니다. 직접 입력하면 그보다 더 바칠 수 있습니다.
 */
function AmountRow({ icon, label, have, cap, value, setValue, unit = 1, basis = 'need', most = Infinity }: { icon: React.ReactNode; label: string; have: number; cap: number; value: string; setValue: (v: string) => void; unit?: number; /** v3.19 한 번에 바칠 수 있는 최대(서버 상한). 넘으면 서버가 ‘수량을 확인하세요’로 거절하던 문제. */ most?: number; /** v3.16 비율 기준: 채우는 데 필요한 양(need) 또는 내 보유량(have). */ basis?: 'need' | 'have' }) {
    const limit = basis === 'have' ? Infinity : cap;
    const top = Math.max(0, Math.min(Math.floor(have), limit, most)), fine = top <= 1000, n = Math.min(num(value), top), max = fine ? top : 1000;
    const set = (amount: number) => { const up = Math.ceil(Math.max(0, Math.min(top, amount)) / unit) * unit, v = up > top ? Math.floor(top / unit) * unit : up; setValue(v ? v.toLocaleString() : ''); };
    return <div className="altar-amount">
        <label className="altar-input">{icon}<span>{label}</span><input inputMode="numeric" value={value} placeholder="0" onChange={e => setValue(e.target.value)}/><small>보유 {format(Math.floor(have))}{limit < have ? ` · 채우기 ${format(top)}` : most < have ? ` · 한 번에 최대 ${format(most)}` : ''}</small></label>
        <div className="altar-slide">
            <input type="range" min={0} max={max || 1} step={1} value={top ? (fine ? n : Math.round(n / top * 1000)) : 0} disabled={!top} aria-label={`${label} 바칠 양`}
                onChange={e => set(fine ? Number(e.target.value) : top * Number(e.target.value) / 1000)}/>
            <span className="altar-pct">{top ? Math.round(n / top * 100) : 0}%</span>
        </div>
        <div className="altar-quick">{QUICK.map(p => <button key={p} type="button" className="secondary small" disabled={!top} onClick={() => set(top * p / 100)}>{p === 100 ? (limit < have ? '채우기' : '최대') : `${p}%`}</button>)}<button type="button" className="text-button" disabled={!value} onClick={() => setValue('')}>비우기</button></div>
    </div>;
}

/**
 * v3.84 월드보스 피해 순위의 최근 도전 기록: 출처별 피해(기술 · 지속 피해 · 반격 등) 요약과 전투 기록(누르면 서버에서 불러옴).
 * 다른 모험가가 얼마나 · 어떻게 넣었는지 볼 수 있습니다.
 */
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
    return <div className="altar-raid-log">
        {last ? <>
            <p className="micro">최근 도전 · 피해 <b>{format(last.dealt)}</b> · {last.turns}턴{last.died ? ' · 쓰러짐' : ''} · {last.job} · 전투력 {format(last.power)}</p>
            {last.sources.map(x => <Meter key={x.label} value={x.value} max={total} label={`${x.label} ${format(x.value)} (${Math.round(x.value / total * 100)}%)`} color="gold"/>)}
        </> : <p className="micro">최근 도전 기록이 없습니다(기록 기능이 생기기 전의 도전).</p>}
        {logs ? <details open><summary>전투 기록 (끝 {logs.length}줄)</summary><ol>{logs.map((l, i) => <li key={i}>{l}</li>)}</ol></details>
            : <button type="button" className="secondary small" disabled={loading} onClick={() => void fetchLogs()}>{loading ? '불러오는 중…' : '전투 기록 보기'}</button>}
        {error && <p className="footnote">{error}</p>}
    </div>;
}

/**
 * v27.43 제단. 모든 모험가가 함께 채우는 게이지(축복 셋 · 신 소환), 신 도전, 신의 자리와 몫, 이번 주 기여 순위.
 * 정보는 화면을 열 때와 버튼을 누른 뒤에만 읽습니다(새로고침 버튼 별도). 서버 쪽 공용 정보는 15초 캐시입니다.
 */
export function Altar({ s, busy, info, error, load, act, result, clearResult }: Props) {
    const [gold, setGold] = useState(''), [pearls, setPearls] = useState(''), [essence, setEssence] = useState('');
    const [gauge, setGauge] = useState<AltarGaugeId>('gold'), [anonymous, setAnonymous] = useState(!!s.altar?.anonymous), [now, setNow] = useState(() => Date.now()), [pane, setPane] = useState<'offer' | 'board' | 'total'>('offer');
    // v27.91 게이지는 축복 / 소환(신 + 월드보스 셋) 탭으로 나눠 봅니다. 고른 게이지가 다른 탭에 있으면 탭을 따라갑니다.
    const [gaugeTab, setGaugeTab] = useState<'bless' | 'summon'>('bless');
    const [raidTab, setRaidTab] = useState<string>(RAIDS[0].id);
    // v3.84 피해 순위에서 펼친 모험가의 최근 도전 기록('보스:순위').
    const [openHit, setOpenHit] = useState('');
    // v3.16 슬라이더·비율 버튼 기준: 고른 게이지를 채우는 데 필요한 양 / 내 보유량(수천억 골드를 한 번에 바칠 때).
    const [basis, setBasis] = useState<'need' | 'have'>('need');
    // v3.16 단계 점핑: 축복 게이지에서 목표 단계를 고르면 그 단계까지의 총 비용이 '채우는 데 필요한 양'이 됩니다(서버는 기여도가 닿는 만큼 한 번에 올림). 0 = 다음 단계만.
    const [jump, setJump] = useState(0);
    const pickGauge = (id: AltarGaugeId) => { setGauge(id); setJump(0); setGaugeTab(SUMMON_GAUGE_IDS.includes(id) ? 'summon' : 'bless'); };
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    useEffect(() => { const t = setInterval(() => setNow(stamp), 30_000); return () => clearInterval(t); }, []);
    const offer = { gold: num(gold), pearls: num(pearls), essence: num(essence) }, points = offeringPoints(offer);
    // v27.51 고른 게이지가 가득 찰 때까지 남은 기여도. 다른 칸에 넣은 양을 빼고 각 재화로 환산한 만큼이 슬라이더의 100%입니다.
    const target = info?.gauges.find(g => g.id === gauge), isBless = !!target && BLESSINGS.some(b => b.id === gauge), live = target && target.until > now ? target.level : 0;
    const jumpTo = isBless && jump > live + 1 ? Math.min(jump, BLESSING_MAX_LEVEL) : 0, totalCost = target ? (jumpTo ? blessingJumpCost(gauge as BlessingId, live, jumpTo) : target.cost) : 0;
    const need = target ? Math.max(0, totalCost - target.points) : Infinity;
    const rest = (except: keyof typeof offer) => need === Infinity || need <= 0 ? Infinity : Math.max(0, need - offeringPoints({ ...offer, [except]: 0 }));
    const caps = { gold: rest('gold') * ALTAR.goldPerPoint, pearls: Math.ceil(rest('pearls') / ALTAR.pearlPoints), essence: Math.ceil(rest('essence') / ALTAR.essencePoints) };
    const short = offer.gold > s.gold || offer.pearls > s.pearls || offer.essence > (s.essence || 0);
    // v3.19 직접 입력도 한 번에 바칠 수 있는 상한을 넘으면 버튼에서 알려 줍니다(서버는 넘으면 거절).
    const over = offer.gold > ALTAR.maxGold || offer.pearls > ALTAR.maxPearls || offer.essence > ALTAR.maxEssence;
    const submit = async () => { if (await act({ action: 'offer', ...offer, gauge, anonymous })) { setGold(''); setPearls(''); setEssence(''); setNow(stamp); } };
    const myPower = power(stats(s)), wait = (s.altar?.challengeAt || 0) + ALTAR.challengeCooldownMs - now;
    const god = info?.god, throne = info?.throne;
    // v3.22 월드보스 탭(발록·자쿰·혼테일): 보스마다 소환·전투·도전 간격이 따로입니다. 고른 탭에 보스가 없으면 그 보스의 소환 게이지를 보여 줍니다.
    const raid = info?.raids.find(r => r.id === raidTab), raidGauge = info?.gauges.find(g => g.id === raidTab), raidWait = (s.altar?.raidAtBy?.[raidTab] || 0) + RAID.cooldownMs - now;
    if (!info) return <><Heading eyebrow="ALTAR OF THE WORLD" title="제단" description="불러오는 중…"/>{error && <p className="login-error" role="alert">{error}</p>}</>;
    return <>
        <Heading eyebrow="ALTAR OF THE WORLD" title="세계의 제단" description="모든 모험가가 함께 채우는 제단입니다. 골드·세계석·정수를 바쳐 서버 전체에 축복을 열거나, 신을 깨워 그 자리를 차지하세요.">
            <button className="secondary" disabled={busy} onClick={() => { setNow(stamp); void load(); }}>새로고침</button>
        </Heading>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="altar-grid">
            <section className="panel altar-gauges">
                <div className="section-title"><h2><Flame size={16}/> 제단의 게이지</h2><span className="micro">누적 기여도 {format(info.totals.points)}</span></div>
                <Tabs value={gaugeTab} onValueChange={v => setGaugeTab(v as typeof gaugeTab)}><TabsList className="game-tabs altar-tabs"><TabsTrigger value="bless"><Sparkles size={14}/> 축복</TabsTrigger><TabsTrigger value="summon"><Skull size={14}/> 소환</TabsTrigger></TabsList></Tabs>
                {info.gauges.filter(g => (gaugeTab === 'summon') === SUMMON_GAUGE_IDS.includes(g.id)).map(g => {
                    const open = g.until > now, summon = SUMMON_GAUGE_IDS.includes(g.id);
                    return <button key={g.id} type="button" className={`altar-gauge ${gauge === g.id ? 'selected' : ''} ${summon ? 'god' : ''}`} onClick={() => pickGauge(g.id)} aria-pressed={gauge === g.id}>
                        <div className="altar-gauge-head"><strong>{g.id === 'god' ? <Skull size={14}/> : isRaidGauge(g.id) ? <Swords size={14}/> : <Sparkles size={14}/>} {g.name}{open && g.level ? ` · ${g.level}단계` : ''}</strong>{open ? <em className="altar-open">진행 중 · {g.desc} · {remaining(g.until - now)} 남음</em> : <small>{g.desc}</small>}</div>
                        <Meter value={Math.min(g.points, g.cost)} max={g.cost} color={g.id === 'god' ? 'gold' : 'teal'}/>
                        <small className="micro">{format(g.points)} / {format(g.cost)}{g.points >= g.cost && g.id === 'god' ? ' · 신이 떠나면 바로 깨어납니다' : g.id !== 'god' ? ` · ${g.next}` : ''}</small>
                    </button>;
                })}
                <p className="footnote">{gaugeTab === 'bless' ? `축복은 최대 ${BLESSING_MAX_LEVEL}단계 · 최대 ${ALTAR.blessingCapMs / 3600_000}시간까지 쌓이고, 끝나면 단계는 처음으로 돌아갑니다.` : `게이지가 차면 바로 나타납니다. ${RAIDS.map(r => `${r.name} ${r.lifetimeHours}시간`).join(' · ')} 머물고, 쓰러지면 ${RAID.respawnMs / 3600_000}시간 뒤에 다시 소환할 수 있습니다. 신은 ${ALTAR.godLifetimeMs / 3600_000}시간.`}</p>
            </section>
            <section className="panel altar-offer">
                <Tabs value={pane} onValueChange={v => setPane(v as typeof pane)}><TabsList className="game-tabs altar-tabs"><TabsTrigger value="offer"><Coins size={14}/> 공물 바치기</TabsTrigger><TabsTrigger value="board"><Trophy size={14}/> 이번 주 기여 순위</TabsTrigger><TabsTrigger value="total"><Trophy size={14}/> 누적 기여 순위</TabsTrigger></TabsList></Tabs>
                {pane === 'offer' ? <>
                <div className="section-title"><h2>→ {info.gauges.find(g => g.id === gauge)?.name}</h2><span className="micro">내 기여도 {format(info.me.points)}{info.me.rank ? ` · ${info.me.rank}위` : ''}</span></div>
                {isBless && <div className="altar-jump" role="tablist" aria-label="목표 단계"><span>목표 단계</span>{Array.from({ length: BLESSING_MAX_LEVEL }, (_, i) => i + 1).map(lv => { const reached = lv <= live, nextOne = lv === live + 1, on = jumpTo ? lv === jumpTo : nextOne; return <button key={lv} type="button" role="tab" aria-selected={on} disabled={reached} className={on ? 'primary small' : 'secondary small'} title={reached ? '이미 도달' : `${lv}단계까지 총 기여도 ${format(blessingJumpCost(gauge as BlessingId, live, lv))}`} onClick={() => setJump(nextOne ? 0 : lv)}>{lv}단계{lv > BLESSING_HIGH_FROM ? ` · ${BLESSING_HIGH_MINUTES[lv - BLESSING_HIGH_FROM - 1] / 60}시간` : ''}</button>; })}<small>{jumpTo ? `${live ? `${live}단계에서 ` : ''}${jumpTo}단계까지 한 번에 · 총 기여도 ${format(totalCost)} (골드 ${format(totalCost * ALTAR.goldPerPoint)} 상당) · 지금 게이지 ${format(target!.points)} 포함` : `다음 단계(${live + 1}단계)만 · 더 높은 단계를 고르면 그 단계까지의 총 비용을 한 번에 바칩니다`}</small></div>}
                <div className="altar-basis" role="tablist" aria-label="비율 기준"><span>비율 기준</span><button type="button" role="tab" aria-selected={basis === 'need'} className={basis === 'need' ? 'primary small' : 'secondary small'} onClick={() => setBasis('need')}>채우는 데 필요한 양</button><button type="button" role="tab" aria-selected={basis === 'have'} className={basis === 'have' ? 'primary small' : 'secondary small'} onClick={() => setBasis('have')}>내 보유량</button><small>{basis === 'need' ? '100% = 고른 게이지를 채우는 양(보유량 이하)' : '100% = 지금 가진 전부 · 남는 기여도는 다음 단계로 이어집니다'}</small></div>
                <AmountRow icon={<Coins size={14}/>} label="골드" have={s.gold} cap={caps.gold} value={gold} setValue={setGold} unit={ALTAR.goldPerPoint} basis={basis} most={ALTAR.maxGold}/>
                <AmountRow icon={<Gem size={14}/>} label="세계석" have={s.pearls} cap={caps.pearls} value={pearls} setValue={setPearls} basis={basis} most={ALTAR.maxPearls}/>
                <AmountRow icon={<Droplets size={14}/>} label="정수" have={s.essence || 0} cap={caps.essence} value={essence} setValue={setEssence} basis={basis} most={ALTAR.maxEssence}/>
                <label className="altar-anon"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)}/><EyeOff size={14}/> 익명으로 기여 (순위표에 ‘익명의 모험가’로 표시)</label>
                <button className="primary" disabled={busy || points < 1 || short || over} onClick={() => void submit()}>{over ? `한 번에 골드 ${format(ALTAR.maxGold)} · 세계석 ${format(ALTAR.maxPearls)} · 정수 ${format(ALTAR.maxEssence)}까지` : short ? '보유량이 부족합니다' : `바치기 · 기여도 +${format(points)}`}</button>
                <p className="footnote">기여도: 골드 {ALTAR.goldPerPoint.toLocaleString()} = 1 · 세계석 1 = {ALTAR.pearlPoints} · 정수 1 = {ALTAR.essencePoints}. 바친 재화는 돌아오지 않습니다(신의 자리 주인에게 {ALTAR.titheRate * 100}%가 돌아갑니다).</p>
                </> : pane === 'total' ? <>
            {/* v3.19 누적 기여 순위: 모든 주의 기여를 합친 순위(이름·익명은 가장 최근 기록). */}
            <div className="section-title"><h2><small className="micro">지금까지 모든 주 합계</small></h2><span className="micro">내 누적 기여도 {format(info.total?.points || 0)}{info.total?.rank ? ` · ${info.total.rank}위` : ''}</span></div>
            {info.allTime?.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>누적 기여도</TableHead></TableRow></TableHeader>
                <TableBody>{info.allTime.map(r => <TableRow key={r.rank} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell><TableCell><b>{format(r.points)}</b></TableCell></TableRow>)}</TableBody></Table>
                : <p className="footnote">아직 바친 모험가가 없습니다.</p>}
            <p className="footnote">주간 순위와 달리 초기화되지 않습니다. 익명 여부와 이름은 가장 최근에 바친 주의 설정을 따릅니다.</p>
                </> : <>
            <div className="section-title"><h2><small className="micro">{info.week}</small></h2><span className="micro">내 기여도 {format(info.me.points)}{info.me.rank ? ` · ${info.me.rank}위` : ''}</span></div>
            {info.board.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>기여도</TableHead></TableRow></TableHeader>
                <TableBody>{info.board.map(r => <TableRow key={r.rank} className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''}</TableCell><TableCell><b>{format(r.points)}</b></TableCell></TableRow>)}</TableBody></Table>
                : <p className="footnote">이번 주에 바친 모험가가 아직 없습니다.</p>}
            <p className="footnote">순위는 월요일 0시(한국 시간)에 새로 시작합니다. 축복 {BLESSINGS.length}종 · 신 소환은 순위와 상관없이 함께 채웁니다.</p>
                </>}
            </section>
            <section className="panel altar-god">
                <div className="section-title"><h2><Skull size={16}/> 신</h2>{god && <span className="micro">{god.gen}번째 신</span>}</div>
                {god?.alive ? <>
                    <div className="altar-god-card"><strong>{god.name}</strong><span>Lv.{god.level} · 최대 체력 {format(god.hp)} · 공격 {format(god.attack)} · 전투력 {format(god.power)}</span><small>떠나기까지 {remaining(god.until - now)} · 내 전투력 {format(myPower)}</small></div>
                    {god.mine ? <p className="footnote">지금 깨어난 신은 당신을 본뜬 모습입니다. 다른 모험가가 쓰러뜨리면 자리를 빼앗깁니다.</p>
                        : <button className="primary" disabled={busy || wait > 0} onClick={() => void act({ action: 'challenge' })}>{wait > 0 ? `${remaining(wait)} 뒤 다시 도전` : '신에게 도전'}</button>}
                    <p className="footnote">가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉습니다. 도전은 {ALTAR.challengeCooldownMs / 60000}분에 한 번, 무릉도장처럼 끝까지(최대 {ALTAR.godMaxTurns}턴) 겨룹니다.</p>
                </> : <p className="footnote">{god ? '신이 잠들어 있습니다.' : '아직 깨어난 신이 없습니다.'} 신 소환 게이지({format(ALTAR.godCost)})가 차면 신이 깨어납니다. 처음 깨어나는 신은 {ALTAR.firstGod.name}(무릉도장 {ALTAR.firstGod.depth}층 보스급), 그 뒤로는 신의 자리 주인을 본뜬 신이 깨어납니다.</p>}
                {result && result.dealt === undefined && <div className={`altar-result ${result.winner === 'player' ? 'win' : 'lose'}`}>
                    <strong>{result.winner === 'player' ? result.impeached ? '승리 · 탄핵 성공, 신의 자리가 비었습니다' : result.claimed ? '승리 · 신의 자리에 앉았습니다!' : '승리 · 하지만 한발 늦었습니다' : result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '패배'}</strong>
                    <details><summary>전투 기록 ({result.turns}턴)</summary><ol>{result.logs.map((l, i) => <li key={i}>{l}</li>)}</ol></details>
                    <button className="text-button" onClick={clearResult}>닫기</button>
                </div>}
            </section>
            <section className="panel altar-raid">
                <div className="section-title"><h2><Swords size={16}/> 월드보스</h2>{raid && <span className="micro">{raid.gen}번째 · 참여 {raid.participants}명</span>}</div>
                <Tabs value={raidTab} onValueChange={setRaidTab}><TabsList className="game-tabs altar-tabs">{RAIDS.map(r => { const x = info.raids.find(y => y.id === r.id); return <TabsTrigger key={r.id} value={r.id}>{r.name}{x?.alive ? ' · 출현' : x?.slain ? ' · 격파' : ''}</TabsTrigger>; })}</TabsList></Tabs>
                {raid ? <>
                    <div className="altar-god-card"><strong>{raid.name}</strong><span>Lv.{raid.level} · 공격 {format(raid.attack)} · 방어 {format(raid.defense)} · 전투력 {format(raid.power)}</span>
                        <Meter value={raid.hp} max={raid.hpMax} label={`공유 체력 ${format(raid.hp)} / ${format(raid.hpMax)}`} color={raid.alive ? 'enemy' : 'gold'}/>
                        <small>{raid.alive ? `떠나기까지 ${remaining(raid.until - now)} · 모든 모험가의 피해가 함께 쌓입니다` : `격파! 마지막 일격 ${raid.slayer || '—'} · 참여한 모험가는 다음 동기화 때 보상을 받습니다`}</small></div>
                    {raid.alive && <button className="primary" disabled={busy || raidWait > 0} onClick={() => void act({ action: 'raid', id: raid.id })}>{raidWait > 0 ? `${remaining(raidWait)} 뒤 다시 도전` : '월드보스에게 도전'}</button>}
                    <p className="footnote">도전은 {RAID.cooldownMs / 60000}분에 한 번, 한 번에 최대 {RAID.maxTurns}턴. 깎은 체력은 그대로 남아 다음 모험가가 이어서 때립니다. 격파 보상 · {format(raid.reward.gold)} G · 세계석 +{raid.reward.pearls}{raid.reward.sp ? ` · SP +${raid.reward.sp}` : ''} (한 번이라도 때린 모험가 전원) · 마지막 일격 세계석 +{raid.slayerBonus.pearls}{raid.slayerBonus.sp ? ` · SP +${raid.slayerBonus.sp}` : ''} 추가 · 서버 전체 축복.</p>
                    {result && result.dealt !== undefined && <div className={`altar-result ${result.slain ? 'win' : 'lose'}`}>
                        <strong>{result.slain ? result.slayer ? '격파 · 마지막 일격!' : '격파 · 함께 쓰러뜨렸습니다' : `피해 ${format(result.dealt)} · 남은 체력 ${format(result.remaining || 0)}`}</strong>
                        <details><summary>전투 기록 ({result.turns}턴)</summary><ol>{result.logs.map((l, i) => <li key={i}>{l}</li>)}</ol></details>
                        <button className="text-button" onClick={clearResult}>닫기</button>
                    </div>}
                    <div className="section-title"><h2><Trophy size={14}/> 피해 순위</h2><span className="micro">{raid.me.dealt ? `내 피해 ${format(raid.me.dealt)} · ${raid.me.rank}위 · ${raid.me.hits}회` : '아직 때리지 않음'}</span></div>
                    {raid.board.length ? <Table><TableHeader><TableRow><TableHead>순위</TableHead><TableHead>모험가</TableHead><TableHead>피해</TableHead><TableHead>횟수</TableHead></TableRow></TableHeader>
                        <TableBody>{raid.board.map(r => <Fragment key={r.rank}><TableRow className={r.self ? 'self' : ''}><TableCell>{r.rank}</TableCell><TableCell>{r.name}{r.self ? ' (나)' : ''} <button type="button" className="text-button" aria-expanded={openHit === `${raid.id}:${r.rank}`} onClick={() => setOpenHit(openHit === `${raid.id}:${r.rank}` ? '' : `${raid.id}:${r.rank}`)}>{openHit === `${raid.id}:${r.rank}` ? '접기' : '기록'}</button></TableCell><TableCell><b>{format(r.dealt)}</b></TableCell><TableCell>{r.hits}</TableCell></TableRow>
                            {openHit === `${raid.id}:${r.rank}` && <TableRow><TableCell colSpan={4}><RaidHitLog key={`${raid.gen}:${r.rank}:${r.last?.at || 0}`} raidId={raid.id} rank={r.rank} last={r.last}/></TableCell></TableRow>}</Fragment>)}</TableBody></Table>
                        : <p className="footnote">아직 아무도 때리지 않았습니다. 첫 피해를 넣어 보세요.</p>}
                </> : <p className="footnote">{RAIDS.find(r => r.id === raidTab)?.name}은(는) 지금 나타나 있지 않습니다. 소환 게이지 {format(raidGauge?.points || 0)} / {format(raidGauge?.cost || 0)} · {raidGauge?.next || ''}. 보스마다 따로 소환되고(발록 6 · 자쿰 12 · 혼테일 24시간 머묾), 여러 보스가 동시에 나타날 수 있습니다. 모든 모험가의 피해가 하나의 체력에 쌓이고, 격파하면 때린 모험가 전원이 보상을 받습니다.</p>}
            </section>
            <section className="panel altar-throne">
                <div className="section-title"><h2><Crown size={16}/> 신의 자리</h2></div>
                {throne ? <>
                    <div className="altar-god-card"><strong>{throne.name}{throne.mine ? ' (나)' : ''}{!throne.mine && !god?.alive && <button className="secondary small altar-impeach" disabled={busy || wait > 0} title={`신이 된 ${throne.name}(최대 체력 ${format(throne.hp)} · 전투력 ${format(throne.power)})과 겨뤄 이기면 자리에서 내려옵니다. 자리는 비고, 다시 앉으려면 신을 소환해 쓰러뜨려야 합니다.`} onClick={() => void act({ action: 'impeach' })}>{wait > 0 ? `탄핵 · ${remaining(wait)} 뒤` : '탄핵'}</button>}</strong><small>{new Date(throne.since).toLocaleString('ko-KR')}부터 · 임기 {remaining(throne.since + ALTAR.throneTermMs - now)} 남음(지나면 자리와 몫이 비고 다음 신은 {ALTAR.firstGod.name})</small></div>
                    {throne.mine && throne.tithe && <>
                        <p className="altar-tithe">쌓인 몫 · {format(throne.tithe.gold)} G · 세계석 {format(throne.tithe.pearls)} · 정수 {format(throne.tithe.essence)}</p>
                        <button className="primary" disabled={busy || !(throne.tithe.gold || throne.tithe.pearls || throne.tithe.essence)} onClick={() => void act({ action: 'harvest' })}>몫 거두기</button>
                        <p className="footnote">자리를 빼앗기면 거두지 않은 몫은 사라집니다. 자주 거두세요.</p>
                    </>}
                </> : <p className="footnote">비어 있습니다. 신을 쓰러뜨린 첫 모험가가 앉습니다.</p>}
                <p className="footnote">신의 자리 주인은 다른 모험가가 바치는 골드·세계석·정수의 {ALTAR.titheRate * 100}%를 거둡니다.</p>
            </section>
        </div>
    </>;
}
