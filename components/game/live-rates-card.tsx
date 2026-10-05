'use client';
/** v3.13 실시간 효율 카드: 지난 5분 실측(시간당 경험치·골드·처치·숙련, DPS)과 1·6·24시간 예상치. 전투 화면(접을 수 있음)과 통계 화면에 같은 카드를 씁니다. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Activity, ChevronDown, Coins, Fish, Sparkles, Swords, Zap } from 'lucide-react';
import type { State } from '@/game/types';
import type { RecentKill } from '@/game/systems/live-rates';
import { projectLevel, msToCap, LEVEL_CAP } from '@/game/systems/live-rates';
import { xpNeeded } from '@/game/data/balance';
const xpNeededSafe = (level: number, rebirths: number) => level >= LEVEL_CAP ? 1 : xpNeeded(level, rebirths);
import { short, format } from './shared';
import { recentKill, RATE_WINDOW_MS, useLiveRates } from './live-rates';
const FOLD_KEY = 'tidebound.liveRates';
type Recent = RecentKill | null;
/** 마지막 처치 획득량. 로그가 밀려나도 남고, 화면을 오가도 유지됩니다(앱 전체 하나). */
const recentStore = (() => { let value: Recent = null; const subs = new Set<() => void>(); return { get: () => value, set: (v: Recent) => { value = v; subs.forEach(fn => fn()); }, subscribe: (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; } }; })();
const HORIZONS: [label: string, hours: number][] = [['1시간', 1], ['6시간', 6], ['24시간', 24]];
const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const span = (ms: number) => { const m = Math.round(ms / 60_000); return m < 60 ? `${m}분` : m < 1440 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${Math.floor(m / 1440)}일 ${Math.floor(m % 1440 / 60)}시간`; };
export function LiveRatesCard({ s, compact = false }: { s: State; compact?: boolean }) {
    const r = useLiveRates();
    const [open, setOpen] = useState(true);
    useEffect(() => { if (!compact) return; const t = setTimeout(() => { try { if (localStorage.getItem(FOLD_KEY) === 'folded') setOpen(false); } catch { /* 저장소 없음 */ } }, 0); return () => clearTimeout(t); }, [compact]);
    const toggle = () => setOpen(v => { try { localStorage.setItem(FOLD_KEY, v ? 'folded' : 'open'); } catch { /* 저장소 없음 */ } return !v; });
    // 최근 처치 한 줄: 같은 턴의 처치·누리·숙련 줄을 한 처치로 묶은 값(v3.23). 로그가 밀려나도 마지막 값은 남겨 둡니다.
    const latest = recentKill(s.logs, s.name);
    const recent = useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.get);
    useEffect(() => { if (latest && (!recent || latest.id !== recent.id)) recentStore.set(latest); }, [latest, recent]);
    // 경험치는 '지금 레벨 필요량의 %' 대신 시간당 몇 레벨, 최대 레벨까지 얼마나 걸리는지로 보여 줍니다(환생 직후 %가 수천이 되던 문제).
    const after1h = projectLevel(s.level, s.exp, s.rebirths, r.perHour.exp), capMs = msToCap(s.level, s.exp, s.rebirths, r.perHour.exp), atCap = s.level >= LEVEL_CAP;
    const levelGain = after1h.level + after1h.progress - (s.level + s.exp / xpNeededSafe(s.level, s.rebirths));
    const window = Math.min(r.elapsedMs, RATE_WINDOW_MS);
    const status = !r.ready ? `측정 중 ${clock(r.elapsedMs)} · 30초 뒤부터 표시` : `지난 ${clock(window)} 실측${s.running || s.dungeon ? '' : ' · 사냥 멈춤'}`;
    const tiles: { Icon: typeof Zap; label: string; value: string; sub?: string; tone: string }[] = [
        { Icon: Zap, label: '경험치 / 시간', value: short(r.perHour.exp), sub: atCap ? `Lv.${LEVEL_CAP} 도달 · 환생 가능` : capMs === Infinity ? '레벨 변화 없음' : levelGain >= 1 ? `시간당 +${levelGain.toFixed(levelGain >= 10 ? 0 : 1)}레벨 · Lv.${LEVEL_CAP}까지 ${span(capMs)}` : `다음 레벨까지 ${span((xpNeededSafe(s.level, s.rebirths) - s.exp) / r.perHour.exp * 3_600_000)}`, tone: 'exp' },
        { Icon: Coins, label: '골드 / 시간', value: short(r.perHour.gold), tone: 'gold' },
        { Icon: Fish, label: '처치 / 시간', value: short(r.perHour.kills), sub: `${(r.perHour.kills / 60).toFixed(1)}마리 / 분`, tone: 'kills' },
        { Icon: Sparkles, label: '숙련 / 시간', value: short(r.perHour.mastery), sub: '직업·장착 스킬 숙련', tone: 'mastery' },
        { Icon: Swords, label: 'DPS', value: short(r.dps), sub: '내가 준 피해 / 초', tone: 'dps' },
    ];
    return <section className={`panel live-rates ${compact ? 'compact' : ''} ${open ? '' : 'folded'} ${r.ready ? 'ready' : 'warming'}`} aria-label="실시간 효율">
        <div className="section-title">
            <h2><Activity size={16}/> 실시간 효율 <span className="micro">{status}</span></h2>
            {recent && <span className="live-recent" key={recent.id} title="가장 최근 처치로 얻은 양(경험의 누리·숙련의 까미 당첨분 포함)">최근 처치 <b>+{format(recent.exp)} EXP</b><b>+{format(recent.gold)} G</b>{recent.mastery > 0 && <b>숙련 +{format(recent.mastery)}</b>}</span>}
            {compact && <button type="button" className="log-fold" aria-expanded={open} onClick={toggle} title={open ? '접기' : '펼치기'}><ChevronDown size={16}/></button>}
        </div>
        {open && <>
            <div className="live-body"><div className="live-tiles">{tiles.map(t => <div key={t.label} className={`live-tile tone-${t.tone}`}><t.Icon size={15}/><span>{t.label}</span><strong>{r.ready ? t.value : '—'}</strong>{t.sub && <small>{r.ready ? t.sub : ' '}</small>}</div>)}</div>
            <table className="live-forecast"><colgroup><col className="head"/><col/><col className="lv"/><col/><col/><col/></colgroup><thead><tr><th>예상</th><th>경험치</th><th>레벨</th><th>골드</th><th>처치</th><th>숙련</th></tr></thead>
                <tbody>{HORIZONS.map(([label, h]) => { const p = projectLevel(s.level, s.exp, s.rebirths, r.perHour.exp * h); return <tr key={label}><th>{label}</th><td title={r.ready ? format(Math.round(r.perHour.exp * h)) : ''}>{r.ready ? short(r.perHour.exp * h) : '—'}</td><td><em>{r.ready ? (p.capped ? `Lv.${LEVEL_CAP} ✓` : `Lv.${p.level}`) : '—'}</em></td><td title={r.ready ? format(Math.round(r.perHour.gold * h)) : ''}>{r.ready ? short(r.perHour.gold * h) : '—'}</td><td>{r.ready ? short(r.perHour.kills * h) : '—'}</td><td>{r.ready ? short(r.perHour.mastery * h) : '—'}</td></tr>; })}</tbody></table></div>
            {!compact && <p className="footnote"><Sparkles size={12}/> 브라우저가 이미 받는 전투 기록으로 계산하므로 서버에 부담이 없습니다. 5분 창의 실측 평균이며, 탭을 숨기거나 부재중 정산이 들어오면 창을 새로 시작합니다. 레벨 예상은 지금 속도가 이어진다고 보고 셉니다(몬스터·난이도를 바꾸면 달라짐). 숙련은 직업 단련치 합의 증가분입니다.</p>}
        </>}
    </section>;
}
