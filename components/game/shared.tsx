'use client';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, type ReactNode } from 'react';
import { Fish, Anchor, Zap, Heart, Shield, Swords, Target, Waves, Coins, Gem, ShoppingBag, Sword, Diamond, Feather, ChevronDown } from 'lucide-react';
import type { State } from '@/game/types';
import { inventoryCap } from '@/game/data/economy';
import { skillArtSrc } from '@/game/data/art';
import { SKILL_ART } from '@/game/data/art-manifest';
export function Meter({ value, max, label, color = 'teal' }: {
    value: number;
    max: number;
    label?: string;
    color?: string;
}) {
    return <div className={`meter ${color}`}>{label && <div className="meter-label">
        <span>{label}</span>
        <span>{Math.ceil(value).toLocaleString()} / {max.toLocaleString()}</span>
        </div>}<Progress value={Math.max(0, Math.min(100, value / max * 100))} aria-label={label || '진행도'}/>
    </div>;
}
export function Heading({ eyebrow, title, description, children }: {
    eyebrow: string;
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return <div className="page-heading">
    <div>
    <div className="eyebrow">{eyebrow}</div>
    <h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}
export function SkillIcon({ id, size = 24 }: {
    id: string;
    size?: number;
}) {
    // v27.40 아이콘 이미지가 있으면 도트를 살려 그리고, 없거나 못 불러오면 기본 아이콘을 씁니다.
    const [broken, setBroken] = useState(false);
    // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일(목록에 있는 것만 요청)
    if (SKILL_ART.has(id) && !broken) return <img className="skill-art" src={skillArtSrc(id)} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setBroken(true)}/>;
    const Icon = id === 'breath' || id === 'spring' || id === 'innerBreath' ? Heart : id === 'temperedSkin' ? Shield : id === 'wave' ? Waves : id === 'focus' ? Target : id === 'anchor' ? Anchor : id === 'hook' || id === 'pierce' ? Swords : Zap;
    return <Icon size={size}/>;
}
export function SlotIcon({ slot, size = 24 }: {
    slot: string;
    size?: number;
}) { const Icon = slot === 'rod' ? Sword : slot === 'coat' ? Shield : slot === 'cape' ? Feather : Diamond; return <Icon size={size}/>; }
export function Empty({ title, description }: {
    title: string;
    description: string;
}) {
    return <div className="empty">
    <Fish size={32}/>
    <h3>{title}</h3>
    <p>{description}</p>
    </div>;
}
/** v3.93 숫자 표시: 매번 새 포매터를 만드는 toLocaleString 대신 하나를 함께 씁니다(결과는 같음). */
const KO_NUMBER = new Intl.NumberFormat('ko-KR');
export const format = (n: number) => KO_NUMBER.format(n);
/** 걸린 시간(분 버림): '2일 3시간' · '5시간 12분' · '37분'. */
export function formatDuration(ms: number) {
    const m = Math.max(0, Math.floor(ms / 60_000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d ? `${d}일 ${h % 24}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`;
}
/** 남은 시간(분 올림): '3시간 5분' · '42분'. 끝나 가도 min분 아래로는 내려가지 않습니다. */
export const formatRemaining = (ms: number, min = 1) => { const m = Math.max(min, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
/** 큰 수는 짧게(1.2만, 3.4억) 표시합니다. 정확한 값은 Num의 title(마우스 올리기·길게 누르기)로 확인합니다. */
export function short(n: number) {
    const a = Math.abs(n), f = (v: number) => KO_NUMBER.format(Math.floor(v * 10) / 10);
    return a >= 1e8 ? `${f(n / 1e8)}억` : a >= 1e4 ? `${f(n / 1e4)}만` : format(Math.floor(n));
}
export function Num({ n }: { n: number }) { return <span className="num-short" title={format(n)}>{short(n)}</span>; }
/** 1초마다 갱신되는 현재 시각. 렌더 중 Date.now()를 직접 부르지 않기 위한 훅입니다. */
export function useNow(ms = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(timer); }, [ms]);
    return now;
}

/** 장비 보관함·상점 공용 재화 막대: 보유 골드·정수·장비 가방. extra는 맨 끝에 붙습니다. */
export function WalletBar({ s, label, extra }: { s: State; label: string; extra?: ReactNode }) {
    return <section className="panel port-resource-bar" aria-label={label}>
        <div><Coins size={22}/><span>보유 골드<strong><Num n={s.gold}/> <small>G</small></strong></span></div>
        <div><Gem size={22}/><span>보유 정수<strong>{format(s.essence || 0)}</strong></span></div>
        <div><ShoppingBag size={22}/><span>장비 가방<strong>{s.inventory.length} <small>/ {inventoryCap()}</small></strong></span></div>
        {extra}
    </section>;
}

/**
 * v3.79 접었다 펴는 구역(제목 줄을 누르면 접힘). 접은 상태는 이 기기에 기억합니다(localStorage, 못 쓰면 기본값).
 * 처음 그릴 때는 기본값으로 그리고, 화면에 붙은 뒤 저장된 값을 읽어 서버 렌더와 어긋나지 않게 합니다.
 */
export function Fold({ id, title, note, defaultOpen = true, className = '', children }: { id: string; title: ReactNode; note?: ReactNode; defaultOpen?: boolean; className?: string; children: ReactNode }) {
    const key = `fold:${id}`;
    const [open, setOpen] = useState(defaultOpen);
    useEffect(() => { const t = setTimeout(() => { try { const v = localStorage.getItem(key); if (v === '1' || v === '0') setOpen(v === '1'); } catch { /* 저장소 없음 */ } }, 0); return () => clearTimeout(t); }, [key]);
    const toggle = (next: boolean) => { if (next === open) return; setOpen(next); try { localStorage.setItem(key, next ? '1' : '0'); } catch { /* 저장소 없음 */ } };
    return <details className={`fold ${className}`} open={open} onToggle={e => toggle(e.currentTarget.open)}>
        <summary className="fold-summary"><span className="section-title"><h2>{title}</h2>{note !== undefined && <span>{note}</span>}</span><ChevronDown size={18} className="fold-chevron" aria-hidden/></summary>
        {children}
    </details>;
}


/**
 * v3.93 처음 펼칠 때 내용을 그리는 접기 칸. 닫힌 칸의 내용(도감 카드 등)은 그리지 않아 화면 전체 다시 그리기가 가벼워집니다.
 * 한 번 펼친 뒤에는 접어도 내용을 유지합니다(다시 펼칠 때 바로 보이도록). children은 함수로 넘겨 닫혀 있는 동안 계산하지 않습니다.
 */
export function LazyDetails({ className, defaultOpen = false, summary, children }: { className?: string; defaultOpen?: boolean; summary: ReactNode; children: () => ReactNode }) {
    const [opened, setOpened] = useState(defaultOpen);
    return <details className={className} open={defaultOpen} onToggle={e => { if (e.currentTarget.open) setOpened(true); }}>{summary}{opened || defaultOpen ? children() : null}</details>;
}
