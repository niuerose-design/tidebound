'use client';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, type ReactNode } from 'react';
import { Fish, Anchor, Zap, Heart, Shield, Swords, Target, Waves, Coins, Gem, ShoppingBag, Sword, Diamond, Feather } from 'lucide-react';
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
    const Icon = id === 'breath' || id === 'spring' || id === 'vital' ? Heart : id === 'scales' || id === 'fortress' ? Shield : id === 'wave' ? Waves : id === 'focus' ? Target : id === 'anchor' ? Anchor : id === 'hook' || id === 'pierce' ? Swords : Zap;
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
export const format = (n: number) => n.toLocaleString('ko-KR');
/** 큰 수는 짧게(1.2만, 3.4억) 표시합니다. 정확한 값은 Num의 title(마우스 올리기·길게 누르기)로 확인합니다. */
export function short(n: number) {
    const a = Math.abs(n), f = (v: number) => (Math.floor(v * 10) / 10).toLocaleString('ko-KR');
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
        <div><ShoppingBag size={22}/><span>장비 가방<strong>{s.inventory.length} <small>/ {inventoryCap(s)}</small></strong></span></div>
        {extra}
    </section>;
}
