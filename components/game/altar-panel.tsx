'use client';
import { useEffect, useState } from 'react';
import { Crown, Flame, Skull, Sparkles, Trophy, Coins, Gem, Droplets, EyeOff } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PanelProps } from './panel-props';
import { Heading, Meter, format } from './shared';
import { ALTAR, BLESSINGS, BLESSING_MAX_LEVEL, BLESSING_LEVEL_STEP, offeringPoints, type AltarGaugeId } from '@/game/data/altar';
import { power, stats } from '@/game/systems/stats';
import type { AltarInfo, AltarResult } from './use-game';

type Props = PanelProps & { info: AltarInfo | null; error: string; load: () => Promise<void>; act: (body: Record<string, unknown>) => Promise<boolean>; result: AltarResult | null; clearResult: () => void };
const left = (ms: number) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
const stamp = () => Date.now();
const num = (v: string) => Math.max(0, Math.floor(Number(v.replace(/[^0-9]/g, '')) || 0));
const QUICK = [10, 25, 50, 100];
/**
 * v27.44 바칠 양: 좌우 슬라이더 · 빠른 비율 버튼 · 직접 입력. unit을 주면(골드 1,000 = 기여도 1) 그 배수로 내려 맞춰 자투리가 버려지지 않습니다.
 * v27.51 슬라이더·비율 버튼의 100%는 보유량이 아니라 '고른 게이지를 채우는 데 필요한 양'(cap, 보유량 이하)입니다. 직접 입력하면 그보다 더 바칠 수 있습니다.
 */
function AmountRow({ icon, label, have, cap, value, setValue, unit = 1 }: { icon: React.ReactNode; label: string; have: number; cap: number; value: string; setValue: (v: string) => void; unit?: number }) {
    const top = Math.max(0, Math.min(have, cap)), fine = top <= 1000, n = Math.min(num(value), top), max = fine ? top : 1000;
    const set = (amount: number) => { const up = Math.ceil(Math.max(0, Math.min(top, amount)) / unit) * unit, v = up > top ? Math.floor(top / unit) * unit : up; setValue(v ? v.toLocaleString() : ''); };
    return <div className="altar-amount">
        <label className="altar-input">{icon}<span>{label}</span><input inputMode="numeric" value={value} placeholder="0" onChange={e => setValue(e.target.value)}/><small>보유 {format(have)}{cap < have ? ` · 채우기 ${format(top)}` : ''}</small></label>
        <div className="altar-slide">
            <input type="range" min={0} max={max || 1} step={1} value={top ? (fine ? n : Math.round(n / top * 1000)) : 0} disabled={!top} aria-label={`${label} 바칠 양`}
                onChange={e => set(fine ? Number(e.target.value) : top * Number(e.target.value) / 1000)}/>
            <span className="altar-pct">{top ? Math.round(n / top * 100) : 0}%</span>
        </div>
        <div className="altar-quick">{QUICK.map(p => <button key={p} type="button" className="secondary small" disabled={!top} onClick={() => set(top * p / 100)}>{p === 100 ? (cap < have ? '채우기' : '최대') : `${p}%`}</button>)}<button type="button" className="text-button" disabled={!value} onClick={() => setValue('')}>비우기</button></div>
    </div>;
}

/**
 * v27.43 제단. 모든 모험가가 함께 채우는 게이지(축복 셋 · 신 소환), 신 도전, 신의 자리와 몫, 이번 주 기여 순위.
 * 정보는 화면을 열 때와 버튼을 누른 뒤에만 읽습니다(새로고침 버튼 별도). 서버 쪽 공용 정보는 15초 캐시입니다.
 */
export function Altar({ s, busy, info, error, load, act, result, clearResult }: Props) {
    const [gold, setGold] = useState(''), [pearls, setPearls] = useState(''), [essence, setEssence] = useState('');
    const [gauge, setGauge] = useState<AltarGaugeId>('gold'), [anonymous, setAnonymous] = useState(!!s.altar?.anonymous), [now, setNow] = useState(() => Date.now()), [pane, setPane] = useState<'offer' | 'board'>('offer');
    useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
    useEffect(() => { const t = setInterval(() => setNow(stamp), 30_000); return () => clearInterval(t); }, []);
    const offer = { gold: num(gold), pearls: num(pearls), essence: num(essence) }, points = offeringPoints(offer);
    // v27.51 고른 게이지가 가득 찰 때까지 남은 기여도. 다른 칸에 넣은 양을 빼고 각 재화로 환산한 만큼이 슬라이더의 100%입니다.
    const target = info?.gauges.find(g => g.id === gauge), need = target ? Math.max(0, target.cost - target.points) : Infinity;
    const rest = (except: keyof typeof offer) => need === Infinity || need <= 0 ? Infinity : Math.max(0, need - offeringPoints({ ...offer, [except]: 0 }));
    const caps = { gold: rest('gold') * ALTAR.goldPerPoint, pearls: Math.ceil(rest('pearls') / ALTAR.pearlPoints), essence: Math.ceil(rest('essence') / ALTAR.essencePoints) };
    const short = offer.gold > s.gold || offer.pearls > s.pearls || offer.essence > (s.essence || 0);
    const submit = async () => { if (await act({ action: 'offer', ...offer, gauge, anonymous })) { setGold(''); setPearls(''); setEssence(''); setNow(stamp); } };
    const myPower = power(stats(s)), wait = (s.altar?.challengeAt || 0) + ALTAR.challengeCooldownMs - now;
    const god = info?.god, throne = info?.throne;
    if (!info) return <><Heading eyebrow="ALTAR OF THE WORLD" title="제단" description="불러오는 중…"/>{error && <p className="login-error" role="alert">{error}</p>}</>;
    return <>
        <Heading eyebrow="ALTAR OF THE WORLD" title="세계의 제단" description="모든 모험가가 함께 채우는 제단입니다. 골드·세계석·정수를 바쳐 서버 전체에 축복을 열거나, 신을 깨워 그 자리를 차지하세요.">
            <button className="secondary" disabled={busy} onClick={() => { setNow(stamp); void load(); }}>새로고침</button>
        </Heading>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="altar-grid">
            <section className="panel altar-gauges">
                <div className="section-title"><h2><Flame size={16}/> 제단의 게이지</h2><span className="micro">누적 기여도 {format(info.totals.points)}</span></div>
                {info.gauges.map(g => {
                    const open = g.until > now;
                    return <button key={g.id} type="button" className={`altar-gauge ${gauge === g.id ? 'selected' : ''} ${g.id === 'god' ? 'god' : ''}`} onClick={() => setGauge(g.id)} aria-pressed={gauge === g.id}>
                        <div className="altar-gauge-head"><strong>{g.id === 'god' ? <Skull size={14}/> : <Sparkles size={14}/>} {g.name}{open && g.level ? ` · ${g.level}단계` : ''}</strong>{open ? <em className="altar-open">진행 중 · {g.desc} · {left(g.until - now)} 남음</em> : <small>{g.desc}</small>}</div>
                        <Meter value={Math.min(g.points, g.cost)} max={g.cost} color={g.id === 'god' ? 'gold' : 'teal'}/>
                        <small className="micro">{format(g.points)} / {format(g.cost)}{g.points >= g.cost && g.id === 'god' ? ' · 신이 떠나면 바로 깨어납니다' : g.id !== 'god' ? ` · ${g.next}` : ''}</small>
                    </button>;
                })}
                <p className="footnote">바칠 게이지를 고른 뒤 아래에서 재화를 바치세요. 축복이 진행 중일 때 게이지를 다시 채우면 단계가 오릅니다(최대 {BLESSING_MAX_LEVEL}단계, 다음 단계 비용 ×{BLESSING_LEVEL_STEP}, 채울 때마다 +1시간, 최대 {ALTAR.blessingCapMs / 3600_000}시간). 축복이 끝나면 단계는 처음으로 돌아갑니다. 축복과 이벤트 배율은 화면을 띄워 두고 사냥하는 동안 그대로 적용되고, 오프라인 정산(창을 닫거나 탭을 백그라운드로 둔 시간)에는 절반만 적용됩니다.</p>
            </section>
            <section className="panel altar-offer">
                <Tabs value={pane} onValueChange={v => setPane(v as typeof pane)}><TabsList className="game-tabs altar-tabs"><TabsTrigger value="offer"><Coins size={14}/> 공물 바치기</TabsTrigger><TabsTrigger value="board"><Trophy size={14}/> 이번 주 기여 순위</TabsTrigger></TabsList></Tabs>
                {pane === 'offer' ? <>
                <div className="section-title"><h2>→ {info.gauges.find(g => g.id === gauge)?.name}</h2><span className="micro">내 기여도 {format(info.me.points)}{info.me.rank ? ` · ${info.me.rank}위` : ''}</span></div>
                <AmountRow icon={<Coins size={14}/>} label="골드" have={s.gold} cap={caps.gold} value={gold} setValue={setGold} unit={ALTAR.goldPerPoint}/>
                <AmountRow icon={<Gem size={14}/>} label="세계석" have={s.pearls} cap={caps.pearls} value={pearls} setValue={setPearls}/>
                <AmountRow icon={<Droplets size={14}/>} label="정수" have={s.essence || 0} cap={caps.essence} value={essence} setValue={setEssence}/>
                <label className="altar-anon"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)}/><EyeOff size={14}/> 익명으로 기여 (순위표에 ‘익명의 모험가’로 표시)</label>
                <button className="primary" disabled={busy || points < 1 || short} onClick={() => void submit()}>바치기 · 기여도 +{format(points)}</button>
                <p className="footnote">기여도: 골드 {ALTAR.goldPerPoint.toLocaleString()} = 1 · 세계석 1 = {ALTAR.pearlPoints} · 정수 1 = {ALTAR.essencePoints}. 바친 재화는 돌아오지 않습니다(신의 자리 주인에게 {ALTAR.titheRate * 100}%가 돌아갑니다).</p>
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
                    <div className="altar-god-card"><strong>{god.name}</strong><span>Lv.{god.level} · 전투력 {format(god.power)}</span><small>떠나기까지 {left(god.until - now)} · 내 전투력 {format(myPower)}</small></div>
                    {god.mine ? <p className="footnote">지금 깨어난 신은 당신을 본뜬 모습입니다. 다른 모험가가 쓰러뜨리면 자리를 빼앗깁니다.</p>
                        : <button className="primary" disabled={busy || wait > 0} onClick={() => void act({ action: 'challenge' })}>{wait > 0 ? `${left(wait)} 뒤 다시 도전` : '신에게 도전'}</button>}
                    <p className="footnote">가장 먼저 쓰러뜨린 모험가가 신의 자리에 앉습니다. 도전은 {ALTAR.challengeCooldownMs / 60000}분에 한 번, 무릉도장처럼 끝까지(최대 {ALTAR.godMaxTurns}턴) 겨룹니다.</p>
                </> : <p className="footnote">{god ? '신이 잠들어 있습니다.' : '아직 깨어난 신이 없습니다.'} 신 소환 게이지({format(ALTAR.godCost)})가 차면 신이 깨어납니다. 처음 깨어나는 신은 {ALTAR.firstGod.name}(무릉도장 {ALTAR.firstGod.depth}층 보스급), 그 뒤로는 신의 자리 주인을 본뜬 신이 깨어납니다.</p>}
                {result && <div className={`altar-result ${result.winner === 'player' ? 'win' : 'lose'}`}>
                    <strong>{result.winner === 'player' ? result.claimed ? '승리 · 신의 자리에 앉았습니다!' : '승리 · 하지만 한발 늦었습니다' : result.winner === 'draw' ? `${result.turns}턴 안에 쓰러뜨리지 못했습니다` : '패배'}</strong>
                    <details><summary>전투 기록 ({result.turns}턴)</summary><ol>{result.logs.map((l, i) => <li key={i}>{l}</li>)}</ol></details>
                    <button className="text-button" onClick={clearResult}>닫기</button>
                </div>}
            </section>
            <section className="panel altar-throne">
                <div className="section-title"><h2><Crown size={16}/> 신의 자리</h2></div>
                {throne ? <>
                    <div className="altar-god-card"><strong>{throne.name}{throne.mine ? ' (나)' : ''}</strong><small>{new Date(throne.since).toLocaleString('ko-KR')}부터 · 임기 {left(throne.since + ALTAR.throneTermMs - now)} 남음(지나면 자리와 몫이 비고 다음 신은 {ALTAR.firstGod.name})</small></div>
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
