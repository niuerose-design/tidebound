'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** v3.19 알림이 여럿이면 한 번에 하나씩, 이 간격마다 다음 알림으로 넘깁니다. */
const ROTATE_MS = 6000;

/**
 * v27.88 알림 묶음 → v3.19 순환 표시. 알림이 둘 이상이면 맨 위부터 하나씩 보여 주고 ROTATE_MS마다 다음 알림으로 넘깁니다
 * (마우스를 올리거나 펼친 동안은 멈춤). ‘모두 보기’로 한꺼번에 펼칠 수 있습니다. 자식 컴포넌트가 null을 돌려주면(닫은 알림 등) 세지 않습니다.
 * 자식은 임의의 컴포넌트라 클래스를 줄 수 없어, 지금 보이지 않는 알림에 data-notice-off 속성만 붙입니다(React가 관리하지 않는 속성).
 */
export function NoticeStack({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState(0), [open, setOpen] = useState(false), [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        const update = () => setCount(el.children.length);
        update();
        const observer = new MutationObserver(update); observer.observe(el, { childList: true });
        return () => observer.disconnect();
    }, []);
    const active = count ? index % count : 0;
    useEffect(() => {
        if (open || paused || count < 2) return;
        const t = setInterval(() => setIndex(i => (i + 1) % Math.max(1, count)), ROTATE_MS);
        return () => clearInterval(t);
    }, [open, paused, count]);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        Array.from(el.children).forEach((c, i) => { if (!open && count > 1 && i !== active) c.setAttribute('data-notice-off', ''); else c.removeAttribute('data-notice-off'); });
    }, [active, open, count, children]);
    return <div className={`notice-stack ${open ? 'open' : 'folded'} ${count > 1 ? 'rotating' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="notice-stack-list" ref={ref} aria-live="polite">{children}</div>
        {count > 1 && <div className="notice-stack-bar">
            {!open && <span className="notice-stack-dots" aria-hidden="true">{Array.from({ length: count }, (_, i) => <button key={i} type="button" tabIndex={-1} className={i === active ? 'on' : ''} onClick={() => setIndex(i)}/>)}</span>}
            <button type="button" className="notice-stack-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? '알림 접기' : `알림 ${count}개 모두 보기`}<ChevronDown size={14}/></button>
        </div>}
    </div>;
}
